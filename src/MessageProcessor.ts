/** messageProcessor.ts
 * Copyright (c) 2022, Toweclabs
 * All rights reserved.
 *
 * Class that handles all the valid types of message the service can receive
 */

// Libraries
import { AmqpMessage } from 'tow96-amqpwrapper';
import logger from 'tow96-logger';

// Models
import { Objects, Requests, Responses } from './Models';

// Utils
import Validator from './utils/validator';

// Database
import DbTransactions from './database/dbTransactions';
import DbWallets from './database/dbWallets';

export default class MessageProcessor {
  static process = async (message: AmqpMessage): Promise<AmqpMessage<any>> => {
    // Destructures the message
    const { type, payload } = message;

    // Switches the message type to run the appropriate function
    switch (type) {
      case 'add-Transaction':
        return await TransactionProcessing.add(payload);
      case 'delete-Transaction':
        return await TransactionProcessing.delete(payload);
      case 'edit-Transaction':
        return await TransactionProcessing.edit(payload);
      case 'get-Transaction':
        return await TransactionProcessing.getById(payload);
      case 'get-Transactions':
        return await TransactionProcessing.getAll(payload);
      case 'add-Wallet':
        return await WalletProcessing.add(payload);
      case 'delete-Wallet':
        return await WalletProcessing.delete(payload);
      case 'edit-Wallet':
        return await WalletProcessing.edit(payload);
      case 'get-Wallet':
        return await WalletProcessing.getById(payload);
      case 'get-Wallets':
        return await WalletProcessing.getAll(payload);
      case 'transfer-Wallet':
        return await WalletProcessing.transfer(payload);
      default:
        logger.debug(`Unsupported function type: ${type}`);
        return AmqpMessage.errorMessage(`Unsupported function type: ${type}`);
    }
  };
}

class TransactionProcessing {
  /** add
   * Adds a transaction to the database
   * @param {Objects.Transaction} message
   *
   * @returns The new transaction
   */
  static add = async (message: Objects.Transaction): Promise<AmqpMessage<Objects.Transaction>> => {
    logger.http(`Add transaction to wallet: ${message.wallet_id}`);

    try {
      // Checks if the requester is the owner of the wallet
      const validWallet = await Validator.walletOwnership(message.user_id, message.wallet_id);
      if (!validWallet.valid) return AmqpMessage.errorMessage('Authentication Error', 403, validWallet.errors);

      let errors = {};

      // Validates if the category is valid
      const validCategory = await Validator.validateCategory(message.category._id, message.user_id);
      if (!validCategory.valid) errors = { ...errors, ...validCategory.errors };

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
        message.category._id,
        message.excludeFromReport,
      );

      return new AmqpMessage(response, 'add-Transaction', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** delete
   * deletes a transaction from the database
   * @param {Objects.Transaction} message
   *
   * @returns The deleted transaction
   */
  static delete = async (message: Objects.Transaction): Promise<AmqpMessage<Objects.Transaction[]>> => {
    logger.http(`deleting transaction: ${message._id}`);

    try {
      // Checks if the requester is the owner of the transaction
      const transValid = await Validator.transactionOwnership(message.user_id, message._id);
      if (!transValid.valid) return AmqpMessage.errorMessage('Authentication Error', 403, transValid.errors);

      // Deletes the transaction
      const transactions = await DbTransactions.delete(transValid.transaction._id);

      return new AmqpMessage(transactions, 'delete-transaction', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** edit
   * Changes the parameters of the given transaction
   * @param {Objects.Transaction} message
   *
   * @returns The edited transaction
   */
  static edit = async (message: Objects.Transaction): Promise<AmqpMessage<Responses.EditTransactionResponse>> => {
    logger.http(`Edit transaction: ${message._id}`);

    try {
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

      // Checks if the category has changed
      if (message.category._id) {
        if (message.category._id !== transValid.transaction.category._id) {
          const categoryValid = await Validator.validateCategory(message.category._id, transValid.transaction.user_id);
          errors = { ...errors, ...categoryValid.errors };
          content.category = message.category._id;
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

      // Checks if the exclude from report flag changed
      if (message.excludeFromReport !== transValid.transaction.excludeFromReport) {
        content.excludeFromReport = message.excludeFromReport;
      }

      // If there is an error, throws it
      if (Object.keys(errors).length > 0) return AmqpMessage.errorMessage('Invalid Fields', 422, errors);

      // If there aren't any changes, returns a 304 code
      if (Object.keys(content).length < 1)
        return new AmqpMessage({} as Responses.EditTransactionResponse, 'edit-Transaction', 204);

      // Updates the transaction
      const updatedTransaction = await DbTransactions.update(transValid.transaction, content);

      return new AmqpMessage(updatedTransaction, 'get-Transaction', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** getAll
   * Returns all transactions from a wallet
   * @param {workerGetTransactions} message
   *
   * @returns An array with the transactions
   */
  static getAll = async (message: Requests.WorkerGetTransactions): Promise<AmqpMessage<Objects.Transaction[]>> => {
    logger.http(`Get transactions: ${JSON.stringify(message)}`);

    try {
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

      return new AmqpMessage(transactions, 'get-Transactions', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** getById
   * gets the requested transaction
   * @param {Objects.Transaction} message
   *
   * @returns The transaction
   */
  static getById = async (message: Objects.Transaction): Promise<AmqpMessage<Objects.Transaction>> => {
    logger.http(`Get transaction: ${message._id}`);

    try {
      // Checks if the requester is the owner of the transaction
      const transValid = await Validator.transactionOwnership(message.user_id, message._id);
      if (!transValid.valid) return AmqpMessage.errorMessage('Authentication Error', 403, transValid.errors);

      return new AmqpMessage(transValid.transaction, 'get-Transaction', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };
}

class WalletProcessing {
  private static otherCategoryId_In = process.env.OTHER_CATEGORYID || '';
  private static otherCategoryId_Out = process.env.OTHER_CATEGORYID_OUT || '';

  /** add
   * Adds a wallet to the database
   * @param {Objects.Wallet} message
   *
   * @returns The new wallet
   */
  static add = async (message: Objects.Wallet): Promise<AmqpMessage<Objects.Wallet>> => {
    logger.http(`Adding wallet for user ${message.user_id}`);

    try {
      let errors = {};

      // Validates the wallet name
      const nameValidation = await Validator.validateWalletName(message.name, message.user_id);
      if (!nameValidation.valid) errors = { ...errors, ...nameValidation.errors };

      // Validates that the given amount is a valid number
      const amountValidation = Validator.validateAmount((message.money || '').toString());
      if (!amountValidation.valid) errors = { ...errors, ...amountValidation.errors };

      // Validates that the currency is valid
      const currencyValidation = await Validator.validateCurrency(message.currency || '', message.parent_id || '-1');
      if (!currencyValidation.valid) errors = { ...errors, ...currencyValidation.errors };

      // if a subwallet is being added, validates that the requester owns the parent wallet and that it isn't a parent wallet already
      const lineageValidation = await Validator.walletLineage(message.user_id, message.parent_id || '-1');
      if (!lineageValidation.valid) errors = { ...errors, ...lineageValidation.errors };

      // If the given Icon id is not an integer greater or equal to zero, it is defaulted to zero
      const icon_id = Validator.setIconId(message.icon_id);

      // Sends an error response if there is any error
      if (Object.keys(errors).length > 0) return AmqpMessage.errorMessage('Invalid Fields', 422, errors);

      // Adds the wallet
      const newWallet = await DbWallets.add(
        message.user_id,
        message.name.trim(),
        icon_id,
        currencyValidation.output,
        lineageValidation.parent,
      );

      // If the added wallet is a subwallet, its id is added to its parent
      if (newWallet.parent_id && newWallet.parent_id !== '-1')
        await DbWallets.addChild(newWallet.parent_id, newWallet._id);

      // Adds the initial transaction if there is money inserted
      if (amountValidation.rounded > 0) {
        DbTransactions.add(
          newWallet.user_id,
          newWallet._id,
          'Initial transaction',
          amountValidation.rounded,
          newWallet.createdAt,
          WalletProcessing.otherCategoryId_In,
        );

        // Updates the wallet info that will be sent (it's already updated in the DB)
        newWallet.money = amountValidation.rounded;
      }

      return new AmqpMessage(newWallet, 'add-Wallet', 200);
      // return new AmqpMessage({ t: "test" }, "addWallet", 200)
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** delete
   * Deletes a wallet from the database
   * @param {Objects.Wallet} message
   *
   * @returns The deleted wallet
   */
  static delete = async (message: Objects.Wallet): Promise<AmqpMessage<Objects.Wallet>> => {
    logger.http(`Deleting wallet ${message._id}`);

    try {
      // Verifies that the request user_id owns the wallet
      const validWallet = await Validator.walletOwnership(message.user_id, message._id);
      if (!validWallet.valid) return AmqpMessage.errorMessage('Authentication Error', 403, validWallet.errors);

      // Deletes the wallet
      const deletedWallet = await DbWallets.delete(message._id);

      return new AmqpMessage(deletedWallet, 'delete-Wallet', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** edit
   * Changes the given parameters of a wallet, the amount can't be changed here
   * @param {Objects.Wallet} message
   *
   * @returns The edited wallet
   */
  static edit = async (message: Objects.Wallet): Promise<AmqpMessage<Objects.Wallet>> => {
    logger.http(`Editing wallet: ${message._id}`);

    try {
      // Checks if the user of the message owns the wallet
      const validWallet = await Validator.walletOwnership(message.user_id, message._id);
      if (!validWallet.valid) return AmqpMessage.errorMessage('Authentication Error', 403, validWallet.errors);

      // Declares the error and content arrays
      let errors: any = {};
      const content: any = {};

      // Checks if the name is valid
      if (message.name) {
        if (message.name.trim() !== validWallet.wallet.name) {
          const nameValidation = await Validator.validateWalletName(message.name, message.user_id);

          if (!nameValidation.valid) errors = { ...errors, ...nameValidation.errors };
          content.name = message.name.trim();
        }
      }

      // Checks if currency is valid
      if (message.currency) {
        if (message.currency.trim() !== validWallet.wallet.currency) {
          const currencyValidation = await Validator.validateCurrency(
            message.currency,
            validWallet.wallet.parent_id || '-1',
          );

          if (!currencyValidation.valid) errors = { ...errors, ...currencyValidation.errors };
          content.currency = currencyValidation.output;
        }
      }

      // Checks if the icon_id is valid
      if (message.icon_id) {
        content.icon_id = Validator.setIconId(message.icon_id);
      }

      // If there aren't any changes, returns a 304 code
      if (Object.keys(content).length < 1) return new AmqpMessage({} as Objects.Wallet, 'edit-Transaction', 204);

      // If there is an error, throws it
      if (Object.keys(errors).length > 0) return AmqpMessage.errorMessage('Invalid Fields', 422, errors);

      // Updates the wallet
      const updatedWallet = await DbWallets.update(validWallet.wallet._id, content);

      return new AmqpMessage(updatedWallet, 'edit-wallet', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** getAll
   * Gets all the wallets of a user
   * @param {Objects.User.BaseUser} message
   *
   * @returns An array containing the wallets
   */
  static getAll = async (message: Objects.User.BaseUser): Promise<AmqpMessage<Objects.Wallet[]>> => {
    logger.http(`Get all wallets of user: ${message._id}`);

    try {
      const wallets = await DbWallets.getWallets(message._id);

      return new AmqpMessage(wallets, 'get-wallets', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** getById
   * Gets the requested Wallet
   * @param {Objects.Wallet} message
   *
   * @returns The requested wallet
   */
  static getById = async (message: Objects.Wallet): Promise<AmqpMessage<Objects.Wallet>> => {
    logger.http(`Get wallet: ${message._id}`);

    try {
      // Checks if the user of the message owns the wallet
      const validWallet = await Validator.walletOwnership(message.user_id, message._id);
      if (!validWallet.valid) return AmqpMessage.errorMessage('Authentication Error', 403, validWallet.errors);

      return new AmqpMessage(validWallet.wallet, 'get-Wallet', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** transfer
   * Adds a pair of transference transactions
   * @param {} message
   *
   * @returns The transaction pair
   */
  static transfer = async (message: Requests.WorkerTransfer): Promise<AmqpMessage<Objects.Transaction[]>> => {
    logger.http(`Transfering from wallet: ${message.from_id} to wallet: ${message.to_id}`);

    try {
      // Checks if the requester is the owner of the origin wallet
      const validFromWallet = await Validator.walletOwnership(message.user_id, message.from_id);
      if (!validFromWallet.valid)
        return AmqpMessage.errorMessage('Authentication Error', 403, { from_id: { ...validFromWallet.errors } });

      // Checks if the requester is the owner of the destination wallet
      const validToWallet = await Validator.walletOwnership(message.user_id, message.to_id);
      if (!validToWallet.valid)
        return AmqpMessage.errorMessage('Authentication Error', 403, { from_id: { ...validFromWallet.errors } });

      let errors = {};

      // If the from and to wallets are the same, returns an error
      if (validFromWallet.wallet._id.toString() === validToWallet.wallet._id.toString())
        errors = { ...errors, to_id: "Destination wallet can't be the same" };

      // Validates that the given amount is a valid number
      const amountValidation = Validator.validateAmount(message.amount.toString());
      if (!amountValidation.valid) errors = { ...errors, ...amountValidation.errors };

      // Validates that the concept is not empty
      const validConcept = Validator.validateConcept(message.concept);
      if (!validConcept.valid) errors = { ...errors, ...validConcept.errors };

      // Validates the transaction date
      const validDate = Validator.validateDate(message.transactionDate.toString());
      if (!validDate.valid) errors = { ...errors, ...validDate.errors };

      // Sends an error response if there is any error
      if (Object.keys(errors).length > 0) return AmqpMessage.errorMessage('Invalid Fields', 422, errors);

      // From transaction
      const fromTransaction = await DbTransactions.add(
        message.user_id,
        message.from_id,
        message.concept,
        amountValidation.rounded,
        message.transactionDate,
        WalletProcessing.otherCategoryId_Out,
        validToWallet.wallet.parent_id === validFromWallet.wallet._id,
      );

      // To transaction
      const toTransaction = await DbTransactions.add(
        message.user_id,
        message.to_id,
        message.concept,
        amountValidation.rounded,
        message.transactionDate,
        WalletProcessing.otherCategoryId_In,
        validFromWallet.wallet.parent_id === validToWallet.wallet._id,
      );

      // Updates the transaction pair to include the id of the other
      const a = await DbTransactions.update(fromTransaction, { transfer_id: toTransaction._id } as Objects.Transaction);
      const b = await DbTransactions.update(toTransaction, { transfer_id: fromTransaction._id } as Objects.Transaction);

      return new AmqpMessage([...a.new, ...b.new], 'get-Wallet', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };
}
