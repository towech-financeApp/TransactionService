/** add-Wallet.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Function that creates a wallet for a user
 */
import { AmqpMessage } from 'tow96-amqpwrapper';
import DbWallets from '../../database/schemas/dbWallets';
import DbTransactions from '../../database/schemas/dbTransactions';

// Models
import { Wallet } from '../../Models';

// Utils
import Validator from '../../utils/validator';

const addWallets = async (message: Wallet): Promise<AmqpMessage> => {
  try {
    let errors = {};

    // Validates the wallet name
    const nameValidation = await Validator.validateWalletName(message.name, message.user_id);
    if (!nameValidation.valid) errors = { ...errors, ...nameValidation.errors };

    // validates that the given amount is a valid number
    const amountValidation = Validator.validateAmount(message.money.toString());
    if (!amountValidation.valid) errors = { ...errors, ...amountValidation.errors };

    // Sends an error response if there is any error
    if (Object.keys(errors).length > 0) return AmqpMessage.errorMessage('Invalid Fields', 422, errors);

    const newWallet = await DbWallets.add(message.user_id, message.name.trim());

    // Adds the initial transaction if there is money inserted
    if (amountValidation.rounded > 0) {
      DbTransactions.add(
        newWallet.user_id,
        newWallet._id,
        'Initial transaction',
        amountValidation.rounded,
        newWallet.createdAt,
        '61f9cd22f3bcff6edf3afe99',
      );

      // Updates the wallet info that will be sent (it's already updated in the DB)
      newWallet.money = amountValidation.rounded;
    }

    return new AmqpMessage(newWallet, 'add-wallet', 200);
  } catch (err: any) {
    return AmqpMessage.errorMessage('Unexpected error', 500, err);
  }
};

export default addWallets;
