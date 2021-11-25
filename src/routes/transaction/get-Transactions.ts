/** get-Transactions.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Function that returns all the transactions of a wallet
 */
import { AmqpMessage } from 'tow96-amqpwrapper';
import logger from 'tow96-logger';

// Database
import DbTransactions from '../../database/schemas/dbTransactions';

// Models
import { Wallet } from '../../Models';

// Utils
import Validator from '../../utils/validator';

interface payload extends Wallet {
  datamonth: string;
}

const getTransactions = async (message: payload): Promise<AmqpMessage> => {
  try {
    logger.http(`Get transactions: ${JSON.stringify(message)}`);

    // If a walletId was provided, verifies that the requester actually owns the wallet.
    if (message._id !== '-1') {
      const walletValid = await Validator.walletOwnership(message.user_id, message._id);
      if (!walletValid.valid) return AmqpMessage.errorMessage('Authentication Error', 403, walletValid.errors);
    }

    // Validates the datamonth if invalid, returns the current
    let datamonth = message.datamonth;
    if (
      !message.datamonth ||
      message.datamonth === '-1' ||
      message.datamonth.length !== 6 ||
      isNaN(parseInt(message.datamonth))
    ) {
      datamonth = `${new Date().getFullYear()}${new Date().getMonth() + 1}`;
    }

    const transactions = await DbTransactions.getAll(message._id, message.user_id, datamonth);

    return new AmqpMessage({ transactions }, 'get-Transactions', 200);
  } catch (err: any) {
    logger.error(err);
    return AmqpMessage.errorMessage('Unexpected error', 500, err);
  }
};

export default getTransactions;
