/** index.ts
 *
 * Main file for the worker of the user service
 *
 */
// Imports the environment variables
import dotenv from 'dotenv';
dotenv.config();

// Libraries
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';
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

runWorker().catch((err) => {
  logger.error(err);
});
