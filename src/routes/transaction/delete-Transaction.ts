/** delete-Transaction.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Function that deletes a transaction for a user
 */
import { AmqpMessage } from 'tow96-amqpwrapper';
import DbTransactions from '../../database/schemas/dbTransactions';

// Models
import { Transaction } from '../../Models';

// Utils
import Validator from '../../utils/validator';

const deleteTransaction = async (message: Transaction): Promise<AmqpMessage> => {
  // Checks if the requester is the owner of the transaction
  const transValid = await Validator.transactionOwnership(message.user_id, message._id);
  if (!transValid.valid) return AmqpMessage.errorMessage('Authentication Error', 403, transValid.errors);

  // Deletes the transaction
  const transaction = await DbTransactions.delete(transValid.transaction._id);

  return new AmqpMessage(transaction, 'delete-transaction', 200);
};

export default deleteTransaction;
