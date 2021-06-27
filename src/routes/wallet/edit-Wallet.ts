/** edit-Wallet.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Function that changes the contents of a wallet, except for it's money
 */
import { AmqpMessage } from 'tow96-amqpwrapper';
import DbWallets from '../../database/schemas/dbWallets';

// Models
import { Wallet } from '../../Models';

// Utils
import Validator from '../../utils/validator';

const editWallet = async (message: Wallet): Promise<AmqpMessage> => {
  try {
    const walletValid = await Validator.walletOwnership(message.user_id, message._id);
    if (!walletValid.valid) return AmqpMessage.errorMessage('Authentication Error', 403, walletValid.errors);

    // Declares the error and content arrays
    let errors: any = {};
    const content: any = {};

    // Checks if the name is valid
    if (message.name) {
      if (message.name.trim() !== walletValid.wallet.name) {
        const nameValidation = await Validator.validateWalletName(message.name, message.user_id);

        if (!nameValidation.valid) errors = { ...errors, ...nameValidation.errors };
        content.name = message.name.trim();
      }
    }

    // If there aren't any changes, returns a 304 code
    if (Object.keys(content).length < 1) return new AmqpMessage(null, 'edit-Transaction', 304);

    // If there is an error, throws it
    if (Object.keys(errors).length > 0) return AmqpMessage.errorMessage('Invalid Fields', 422, errors);

    // Updates the wallet
    const updatedWallet = await DbWallets.update(walletValid.wallet._id, content);

    return new AmqpMessage(updatedWallet, 'edit-wallet', 200);
  } catch (err: any) {
    return AmqpMessage.errorMessage('Unexpected error', 500, err);
  }
};

export default editWallet;
