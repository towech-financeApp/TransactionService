/** index.ts
 * Copyright (c) 2022, Towechlabs
 * Main file for the worker of the user service
 *
 */
// Imports the environment variables
import dotenv from 'dotenv';
dotenv.config();

// Libraries
import express from 'express';
import logger from 'tow96-logger';
import mongoose from 'mongoose';
import Queue from 'tow96-amqpwrapper';

// Utils
import MessageProcessor from './MessageProcessor';

// Decalres the class
class TransactionService {
  // Gets some values from the env, if not present, uses default values
  private queueName = process.env.QUEUE_NAME || 'transactionQueue';
  private databaseUrl = process.env.DATABASE_URL || '';
  private httpPort = process.env.PORT || 3000;
  private serviceName = process.env.NAME || 'TransactionService';

  // Connect to database function
  connectToMongo = (): void => {
    mongoose
      .connect(this.databaseUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      })
      .then(() => logger.info('Connected to database'))
      .catch((err) => {
        if (this.databaseUrl !== '') {
          logger.error(`${err}`);
          logger.info('Process exited with code 1');
        } else {
          logger.error('No Mongo url provided, exiting with error 1');
        }
        process.exit(1);
      });
  };

  // Worker Main function
  runWorker = async (): Promise<void> => {
    this.connectToMongo();

    // Connects to rabbitMQ and sets a channel up
    const connection = await Queue.startConnection();
    const channel = await Queue.setUpChannelAndExchange(connection);

    // Asserts and binds the queue that all workers of this type will user
    const userQ = await channel.assertQueue(this.queueName, { durable: false });
    channel.bindQueue(userQ.queue, Queue.exchangeName, this.queueName);

    // Begins to listen for messages on the queue
    logger.info(`Listening for messages on queue ${this.queueName}`);

    // Using the channel cosume, the program enters a loop that will check continously
    channel.consume(
      this.queueName,
      async (msg) => {
        if (!msg) return; // If there is no message, finishes and checks again, this allows for faster iterations

        // Handles the message
        try {
          // Processes the message
          const content = await MessageProcessor.process(JSON.parse(msg.content.toString()));

          // reply if necessary
          if (msg.properties.replyTo)
            Queue.respondToQueue(channel, msg.properties.replyTo, msg.properties.correlationId, content);

          // Acknowledges the message
          channel.ack(msg);
        } catch (err: any) {
          logger.error(err);
        }
      },
      { noAck: false },
    );
  };

  // Start Server: Starts a simple HTTP server to report that the worker is alive
  startServer = async (): Promise<void> => {
    const app = express();
    app.set('port', this.httpPort);

    app.get('/', (_, res) => {
      res.send(`${this.serviceName} is running`);
    });

    // Starts the server
    app.listen(app.get('port'), () => {
      logger.info(`Server running on port: ${app.get('port')}`);
    });
  };
}

const service = new TransactionService();

// Starts the service
service.runWorker().catch((err) => {
  logger.error(err);
});

service.startServer().catch((err: any) => {
  logger.error(err);
  logger.error('Exiting app with code 1');
  process.exit(1);
});
