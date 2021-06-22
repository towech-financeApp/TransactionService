import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import logger from 'tow96-logger';

const connectToMongo = () => {
  mongoose
    .connect(process.env.DATABASE_URL as string, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    })
    .then(() => logger.info('Connected to database'))
    .catch((err) => {
      if (process.env.DATABASE_URL) {
        logger.error(`${err}`);
        logger.info('Process exited with code 1');
      } else {
        logger.error('No Mongo url provided, exiting with error 1');
      }
      process.exit(1);
    });
};

export default connectToMongo;
