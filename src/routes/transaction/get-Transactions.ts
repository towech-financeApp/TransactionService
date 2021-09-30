/** get-Transactions.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Function that returns all the transactions of a wallet
 */
import { AmqpMessage } from 'tow96-amqpwrapper';
import DbWallets from '../../database/schemas/dbWallets';
import DbTransactions from '../../database/schemas/dbTransactions';

// Models
import { Wallet } from '../../Models';

// Utils
import Validator from '../../utils/validator';

const getTransactions = async (message: Wallet): Promise<AmqpMessage> => {
  try {
    if (message._id !== '-1') {
      const walletValid = await Validator.walletOwnership(message.user_id, message._id);
      if (!walletValid.valid) return AmqpMessage.errorMessage('Authentication Error', 403, walletValid.errors);
    }

    const transactions = await DbTransactions.getAll(message._id, message.user_id);

    return new AmqpMessage({ transactions }, 'get-Transactions', 200);
  } catch (err: any) {
    return AmqpMessage.errorMessage('Unexpected error', 500, err);
  }
};

export default getTransactions;
