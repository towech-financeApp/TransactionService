/** get-Wallet.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Function that returns a specific wallet to a user
 */
import { AmqpMessage } from 'tow96-amqpwrapper';

// Models
import { Wallet } from '../../Models';

// Utils
import Validator from '../../utils/validator';

const getWallet = async (message: Wallet): Promise<AmqpMessage> => {
  try {
    const walletValid = await Validator.walletOwnership(message.user_id, message._id);
    if (!walletValid.valid) return AmqpMessage.errorMessage('Authentication Error', 403, walletValid.errors);

    return new AmqpMessage(walletValid.wallet, 'get-wallet', 200);
  } catch (err: any) {
    return AmqpMessage.errorMessage('Unexpected error', 500, err);
  }
};

export default getWallet;
