/** register.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Function that returns all the wallets of a user
 */
import { AmqpMessage } from 'tow96-amqpwrapper';
import logger from 'tow96-logger';
import DbWallets from '../../database/schemas/dbWallets';

const getWallets = async (message: any): Promise<AmqpMessage> => {
  const { _id } = message;

  try {
    const wallets = await DbWallets.getWallets(_id);

    return new AmqpMessage({ wallets }, 'get-wallets', 200);
  } catch (err: any) {
    return AmqpMessage.errorMessage('Unexpected error', 500, err);
  }
};

export default getWallets;
