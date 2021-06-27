/** add-Transaction.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Function that creates a transaction for a user
 */
import { AmqpMessage } from 'tow96-amqpwrapper';
import DbTransactions from '../../database/schemas/dbTransactions';

// Models
import { Transaction } from '../../Models';

// Utils
import Validator from '../../utils/validator';

const addTransaction = async (message: Transaction): Promise<AmqpMessage> => {
  // Checks if the requester is the owner of the wallet
  const walletValid = await Validator.walletOwnership(message.user_id, message.wallet_id);
  if (!walletValid.valid) return AmqpMessage.errorMessage('Authentication Error', 403, walletValid.errors);

  let errors = {};

  // Validates that the given amount is a valid number
  const validAmount = Validator.validateAmount(message.amount.toString());
  if (!validAmount.valid) errors = { ...errors, ...validAmount.errors };

  // Validates the transaction date
  const validDate = Validator.validateDate(message.transactionDate.toString());
  if (!validDate.valid) errors = { ...errors, ...validDate.errors };

  // Validates that the concept is not empty
  const validConcept = Validator.validateConcept(message.concept);
  if (!validConcept.valid) errors = { ...errors, ...validConcept.errors };

  // Sends an error response if there is any error
  if (Object.keys(errors).length > 0) return AmqpMessage.errorMessage('Invalid Fields', 422, errors);

  const response = await DbTransactions.add(
    message.user_id,
    message.wallet_id,
    message.concept.trim(),
    validAmount.rounded,
    message.transactionDate,
  );

  return new AmqpMessage(response, 'add-Transaction', 200);
};

export default addTransaction;
