/** add-Wallet.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Function that creates a wallet for a user
 */
import { AmqpMessage } from 'tow96-amqpwrapper';
import logger from 'tow96-logger';
import DbWallets from '../../database/schemas/dbWallets';

// Models
import { Wallet } from '../../Models';

// Utils
import Validator from '../../utils/validator';

const addWallets = async (message: Wallet): Promise<AmqpMessage> => {
  try {
    let errors = {};

    // Validates the wallet name
    const walletValidation = await Validator.validateWalletName(message.name, message.user_id);
    if (!walletValidation.valid) errors = { ...errors, ...walletValidation.errors };

    // validates that the given amount is a valid number
    const amountValidation = Validator.validateAmount(message.money.toString());
    if (!amountValidation.valid) errors = { ...errors, ...amountValidation.errors };

    // Sends an error response if there is any error
    if (Object.keys(errors).length > 0) return AmqpMessage.errorMessage('Invalid Fields', 422, errors);

    const newWallet = await DbWallets.add(message.user_id, message.name.trim());

    // TODO: Add initial transaction

    return new AmqpMessage(newWallet, 'add-wallet', 200);
  } catch (err: any) {
    return AmqpMessage.errorMessage('Unexpected error', 500, err);
  }
};

export default addWallets;
