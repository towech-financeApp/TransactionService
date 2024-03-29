/** dbTransactions.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Schema that describes the Transaction Schema and functions that use it
 */
import mongoose from 'mongoose';
import logger from 'tow96-logger';
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
   */
  static deleteAll = async (walletId: string): Promise<void> => {
    await transactionCollection.deleteMany({ wallet_id: walletId });
  };

  /** deleteUser
   * Deletes all the transactions of a user
   *
   * @param {string} userId
   */
  static deleteUser = async (userId: string): Promise<void> => {
    await transactionCollection.deleteMany({ user_id: userId });
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

    // If a wallet was provided, fetches the subwallets's transactions
    if (walletId !== '-1') {
      const wallet = await DbWallets.getById(walletId);

      const lookup = [wallet._id, ...(wallet.child_id || [])];

      filter.wallet_id = {
        $in: lookup,
      };
    }

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

  static getBasicCategories = async (): Promise<{ in: string; out: string }> => {
    const output = { in: '', out: '' };

    const otherIn: Objects.Category | null = await categoryCollection.findOne({
      parent_id: '-1',
      user_id: '-1',
      name: 'Other',
      type: 'Income',
    });
    const otherOut: Objects.Category | null = await categoryCollection.findOne({
      parent_id: '-1',
      user_id: '-1',
      name: 'Other',
      type: 'Expense',
    });

    if (otherIn === null) {
      const nuCat = await new categoryCollection({
        parent_id: '-1',
        user_id: '-1',
        name: 'Other',
        type: 'Income',
      }).save();
      output.in = nuCat._id;
      logger.info(`Inserted income category`);
    } else {
      output.in = otherIn._id;
    }

    if (otherOut === null) {
      const nuCat = await new categoryCollection({
        parent_id: '-1',
        user_id: '-1',
        name: 'Other',
        type: 'Expense',
      }).save();
      output.out = nuCat._id;
      logger.info(`Inserted expense category`);
    } else {
      output.out = otherOut._id;
    }

    return output;
  };

  /** migrateToParent
   * Moves all the transactions of a wallet to its parent.
   * The money on the parent doesn't need to be updated as the wallets are already linked.
   *
   * @param {string} id the wallet that'll be emptied
   *
   * @returns The updated transaction
   */
  static migrateToParent = async (id: string): Promise<void> => {
    // Gets the wallet
    const wallet = await DbWallets.getById(id);

    // If the wallet doesn't have a parent, finishes
    if (wallet.parent_id === null || wallet.parent_id === undefined) return;

    // Moves all transactions to it's parent
    await transactionCollection.updateMany({ wallet_id: id }, { $set: { wallet_id: wallet.parent_id } });

    // Sets the wallet amount to zero
    await DbWallets.updateAmount(id, wallet.money || 0, 'Expense', true);
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

    // If the changed transaction is a transfer, neither the category nor the wallet_id can be changed, it also sends the changes to the other transaction
    if (old.transfer_id) {
      const transfer = await DbTransactions.getById(old.transfer_id);

      // If there is no transfer_id, it unlinks the transaction
      if (transfer === null) {
        unlinkTransfer = true;
      } else {
        finalChanges.category = undefined;
        finalChanges.wallet_id = undefined;
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
