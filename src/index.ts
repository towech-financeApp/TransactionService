/** index.ts
 *
 * Main file for the worker of the user service
 *
 */
// Imports the environment variables
import dotenv from 'dotenv';
dotenv.config();

// Libraries
import Queue from 'tow96-amqpwrapper';
import express from 'express';
import logger from 'tow96-logger';
import connectToMongo from './database/mongo';
import processMessage from './routes';

// Gets some values from the env, if not present, uses default values
const queueName = process.env.QUEUE_NAME || 'userQueue';

// It's declared as function so it can be asynchronous
const runWorker = async () => {
  connectToMongo();

  // Connects to rabbitMQ and sets a channel up
  const connection = await Queue.startConnection();
  const channel = await Queue.setUpChannelAndExchange(connection);

  // Asserts and binds the queue that all workers of this type will user
  const userQ = await channel.assertQueue(queueName, { durable: false });
  channel.bindQueue(userQ.queue, Queue.exchangeName, queueName);

  // Begins to listen for messages on the queue
  logger.info(`Listening for messages on queue ${queueName}`);

  // Using the channel cosume, the program enters a loop that will check continously
  channel.consume(
    queueName,
    async (msg) => {
      if (!msg) return; // If there is no message, finsihes and checks again, this allows for faster iterations

      // Handles the message
      try {
        // Processes the message
        const content = await processMessage(JSON.parse(msg.content.toString()));

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

// Sets up the server which is just a front-page that reports status (required for heroku)
const startServer = async () => {

  const app = express();
  app.set('port', process.env.PORT || 3000);

  app.get('/', (_, res) => {
    res.send(`${process.env.NAME} is running`);
  });

  // Starts the server
  app.listen(app.get('port'), () => {
    logger.info(`Server running on port: ${app.get('port')}`);
  });
}


// Runs the worker and front page
runWorker().catch((err) => {
  logger.error(err);
});

startServer().catch((err: any) => {
  logger.error(err);
  logger.error('Exiting app with code 1');
  process.exit(1);
});

