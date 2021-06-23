/** index.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Index that holds all the "routes" of the worker
 */
import { AmqpMessage } from 'tow96-amqpwrapper';

import logger from 'tow96-logger';
import addTransaction from './transaction/add-transaction';
import deleteTransaction from './transaction/delete-Transaction';
import editTransaction from './transaction/edit-Transaction';
import getTransaction from './transaction/get-Transaction';
import addWallets from './wallet/add-Wallet';
import getWallets from './wallet/get-wallets';

// routes

/** processMessage
 * switch functions that calls the approppriate process for the worker
 *
 * @params {AmqpMessage} message containing the request
 *
 * @returns {Promise<AmqpMessage>} Message containing the response
 */
const processMessage = async (message: AmqpMessage): Promise<AmqpMessage> => {
  // Destructures the message
  const { type, payload } = message;
  try {
    // Switches the message to execute the appropriate function
    switch (type) {
      case 'add-Transaction':
        return await addTransaction(payload);
      case 'delete-Transaction':
        return await deleteTransaction(payload);
      case 'edit-Transaction':
        return await editTransaction(payload);
      case 'get-Transaction':
        return await getTransaction(payload);
      case 'add-Wallet':
        return await addWallets(payload);
      case 'get-Wallets':
        return await getWallets(payload);
      default:
        logger.warn(`Unsupported function type: ${type}`);
        return AmqpMessage.errorMessage(`Unsupported function type: ${type}`);
    }
  } catch (e) {
    return AmqpMessage.errorMessage('Unexpected error', 500, e);
  }
};

export default processMessage;
