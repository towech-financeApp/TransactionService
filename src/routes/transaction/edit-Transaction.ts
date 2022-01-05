/** edit-Transaction.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Function that changes the contents of a transaction
 */
import { AmqpMessage } from 'tow96-amqpwrapper';
import logger from 'tow96-logger';
import DbTransactions from '../../database/schemas/dbTransactions';

// Models
import { Transaction } from '../../Models';

// Utils
import Validator from '../../utils/validator';

const editTransaction = async (message: Transaction): Promise<AmqpMessage> => {
  logger.http(`Edit transaction: ${JSON.stringify(message)}`);

  // Checks if the requester is the owner of the transaction
  const transValid = await Validator.transactionOwnership(message.user_id, message._id);
  if (!transValid.valid) return AmqpMessage.errorMessage('Authentication Error', 403, transValid.errors);

  // The validation doesn't use the exact same code as the creation of a transaction
  // since the parameters are optional in this case
  let errors: any = {};
  const content: any = {};

  // Checks if the requested change of wallet belongs to the user
  if (message.wallet_id) {
    // Verifies the ownership if the given wallet_id is different from the saved one
    if (message.wallet_id !== transValid.transaction.wallet_id) {
      const walletValid = await Validator.walletOwnership(message.user_id, message.wallet_id);
      errors = { ...errors, ...walletValid.errors };
      content.wallet_id = message.wallet_id;
    }
  }

  // Checks if the concept is different to the stored one
  if (message.concept) {
    if (message.concept.trim() !== transValid.transaction.concept) {
      const conceptValid = Validator.validateConcept(message.concept);
      errors = { ...errors, ...conceptValid.errors };
      content.concept = message.concept.trim();
    }
  }

  // Checks if the amount is different
  if (message.amount) {
    const validAmount = Validator.validateAmount(message.amount.toString());

    if (transValid.transaction.amount !== validAmount.rounded) {
      errors = { ...errors, ...validAmount.errors };
      content.amount = validAmount.rounded;
    }
  }

  // Checks for a different transaction Date
  if (message.transactionDate) {
    const date = message.transactionDate as unknown;
    if (transValid.transaction.transactionDate.toISOString().slice(0, 10) !== (date as string)) {
      const validDate = Validator.validateDate(message.transactionDate.toISOString());
      errors = { ...errors, ...validDate.errors };
      content.transactionDate = message.transactionDate;
    }
  }

  // If there is an error, throws it
  if (Object.keys(errors).length > 0) return AmqpMessage.errorMessage('Invalid Fields', 422, errors);

  // If there aren't any changes, returns a 304 code
  if (Object.keys(content).length < 1) return new AmqpMessage(null, 'edit-Transaction', 304);

  // Updates the transaction
  const updatedTransaction = await DbTransactions.update(transValid.transaction, content);

  return new AmqpMessage(updatedTransaction, 'get-Transaction', 200);
};

export default editTransaction;
