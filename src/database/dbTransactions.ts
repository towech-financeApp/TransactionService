/** dbTransactions.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Schema that describes the Transaction Schema and functions that use it
 */
import mongoose from 'mongoose';
mongoose.set('returnOriginal', false);

import { Objects } from '../Models';
import DbWallets from './dbWallets';

interface editResponse {
  old: Objects.Transaction[];
  new: Objects.Transaction[];
}

const CategorySchema = new mongoose.Schema({
  parent_id: String,
  name: String,
  user_id: String,
  type: String,
});

const TransactionSchema = new mongoose.Schema({
  user_id: String,
  wallet_id: String,
  transfer_id: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Categories' },
  concept: String,
  amount: Number,
  excludeFromReport: { type: Boolean, default: undefined },
  transactionDate: Date,
  createdAt: Date,
});

const transactionCollection = mongoose.model<Objects.Transaction>('Transactions', TransactionSchema);
const categoryCollection = mongoose.model<Objects.Category>('Categories', CategorySchema);

// Functions to communicate with the collection ID
export default class DbTransactions {
  /** add
   * Adds a transaction to the DB
   *
   * @param {string} userId
   * @param {string} walletId
   * @param {string} concept
   * @param {number} amount
   * @param {Date} transactionDate in YYYY-MM-DD format
   *
   * @returns The inserted transaction
   */
  static add = async (
    userId: string,
    walletId: string,
    concept: string,
    amount: number,
    transactionDate: Date,
    category_id: string,
    excludeFromReport?: boolean,
  ): Promise<Objects.Transaction> => {
    const response = await new transactionCollection({
      user_id: userId,
      wallet_id: walletId,
      concept: concept,
      amount: Math.abs(amount),
      transactionDate: transactionDate,
      category: category_id,
      excludeFromReport: excludeFromReport,
      createdAt: new Date(),
    }).save();

    await response.populate('category');

    // Also updates the amount value of the wallet
    await DbWallets.updateAmount(walletId, amount, response.category.type);

    return response as Objects.Transaction;
  };

  /** delete
   * Deletes a transaction and recalculates the wallet
   *
   * @param {string} transId
   *
   * @returns The deleted transaction as confirmation
   */
  static delete = async (transId: string): Promise<Objects.Transaction[]> => {
    const changes = [];

    const response: Objects.Transaction =
      (await transactionCollection.findByIdAndDelete({ _id: transId }).populate('category')) ||
      ({} as Objects.Transaction);

    await DbWallets.updateAmount(response.wallet_id, response.amount * -1, response.category.type);
    changes.push(response);

    // If the deleted transaction is a transfer, deletes the partner transaction
    if (response.transfer_id) {
      const transfer: Objects.Transaction =
        (await transactionCollection.findByIdAndDelete({ _id: response.transfer_id }).populate('category')) ||
        ({} as Objects.Transaction);

      transfer.transactionDate = new Date(transfer.transactionDate);

      await DbWallets.updateAmount(transfer.wallet_id, transfer.amount * -1, transfer.category.type);
      changes.push(transfer);
    }

    return changes;
  };

  /** deleteAll
   * Deletes all the transactions of a wallet
   *
   * @param {string} walletId
   *
   * @returns The deleted transaction as confirmation
   */
  static deleteAll = async (walletId: string): Promise<void> => {
    await transactionCollection.deleteMany({ wallet_id: walletId });
  };

  /** getById
   * Gets the transaction from a given id
   *
   * @param {string} transId
   *
   * @returns The transaction from the DB with the userId attached
   */
  static getById = async (transId: string): Promise<Objects.Transaction> => {
    const response = await transactionCollection.findOne({ _id: transId }).populate('category');
    return response as Objects.Transaction;
  };

  /** getAll
   * Gets all the transactions of a wallet
   *
   * @param {string} walletId
   * @param {string} userId
   * @param {string} dataMonth
   *
   * @returns The transactions of the wallet
   */
  static getAll = async (walletId: string, userId: string, dataMonth: string): Promise<Objects.Transaction[]> => {
    const startDate = new Date(
      Date.UTC(parseInt(dataMonth.substring(0, 4)), parseInt(dataMonth.substring(4, 6)) - 1, 1),
    );
    const endDate = new Date(Date.UTC(parseInt(dataMonth.substring(0, 4)), parseInt(dataMonth.substring(4, 6)), 1));

    endDate.setSeconds(endDate.getSeconds() - 1);

    // Creates the filter that will be used
    const filter: mongoose.FilterQuery<any> = {
      user_id: userId,
      transactionDate: {
        $gte: startDate.toISOString(),
        $lt: endDate.toISOString(),
      },
    };
    if (walletId !== '-1') filter.wallet_id = walletId;

    const response = await transactionCollection.find(filter).populate('category');

    return response as Objects.Transaction[];
  };

  /** getCategory
   * Gets a category, used for validation
   *
   * @param {string} category_id
   *
   * @returns The category if it exists
   */
  static getCategory = async (category_id: string): Promise<Objects.Category> => {
    const response = await categoryCollection.findById(category_id);
    return response as Objects.Category;
  };

  /** update
   * Updates the contents of the given transaction.
   *
   * @param {Transaction} previous the old transaction
   * @param {Transaction} contents new content
   *
   * @returns The updated transaction
   */
  static update = async (old: Objects.Transaction, contents: Objects.Transaction): Promise<editResponse> => {
    const finalChanges: any = contents;
    let unlinkTransfer = false;

    const oldTransactions = [];
    const newTransactions = [];

    // If the changed transaction is a transfer, the category can't be changed, it also sends the changes to the other transaction
    if (old.transfer_id) {
      const transfer = await DbTransactions.getById(old.transfer_id);

      // If there is no transfer_id, it unlinks the transaction
      if (transfer === null) {
        unlinkTransfer = true;
      } else {
        finalChanges.category = undefined;
        const nuTransfer: Objects.Transaction =
          (await transactionCollection
            .findByIdAndUpdate(transfer._id, { $set: { ...finalChanges } })
            .populate('category')) || ({} as Objects.Transaction);

        DbWallets.updateAmount(transfer.wallet_id, transfer.amount * -1, transfer.category.type);
        DbWallets.updateAmount(nuTransfer.wallet_id, nuTransfer.amount, nuTransfer.category.type);

        oldTransactions.push(transfer);
        newTransactions.push(nuTransfer);
      }
    }

    const changes: mongoose.QueryOptions = {
      $set: { ...finalChanges },
    };

    if (unlinkTransfer) changes.$unset = { transfer_id: '' };

    const response: Objects.Transaction =
      (await transactionCollection.findByIdAndUpdate(old._id, changes).populate('category')) ||
      ({} as Objects.Transaction);

    // Updates the old and new wallets
    DbWallets.updateAmount(old.wallet_id, old.amount * -1, old.category.type);
    DbWallets.updateAmount(response.wallet_id, response.amount, response.category.type);

    oldTransactions.push(old);
    newTransactions.push(response);

    return { old: oldTransactions, new: newTransactions };
  };
}
