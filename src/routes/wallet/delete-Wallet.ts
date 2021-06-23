/** delete-Wallet.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Function that deletes a wallet
 */
import { AmqpMessage } from 'tow96-amqpwrapper';
import DbWallets from '../../database/schemas/dbWallets';

// Models
import { Wallet } from '../../Models';

// Utils
import Validator from '../../utils/validator';

const deleteWallet = async (message: Wallet): Promise<AmqpMessage> => {
  try {
    const walletValid = await Validator.walletOwnership(message.user_id, message._id);
    if (!walletValid.valid) return AmqpMessage.errorMessage('Authentication Error', 403, walletValid.errors);

    const deletedWallet = await DbWallets.delete(message._id);
    return new AmqpMessage(deletedWallet, 'delete-Wallet', 200);
  } catch (err: any) {
    return AmqpMessage.errorMessage('Unexpected error', 500, err);
  }
};

export default deleteWallet;
