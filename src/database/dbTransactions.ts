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

const CategorySchema = new mongoose.Schema({
  parent_id: String,
  name: String,
  user_id: String,
  type: String,
});

const TransactionSchema = new mongoose.Schema({
  user_id: String,
  wallet_id: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Categories' },
  concept: String,
  amount: Number,
  transactionDate: Date,
  createdAt: Date,
});

const transactionCollection = mongoose.model('Transactions', TransactionSchema);
const categoryCollection = mongoose.model('Categories', CategorySchema);

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
  ): Promise<Objects.Transaction> => {

    const response = await new transactionCollection({
      user_id: userId,
      wallet_id: walletId,
      concept: concept,
      amount: Math.abs(amount),
      transactionDate: transactionDate,
      category: category_id,
      createdAt: new Date().toISOString(),
    }).save()

    await response.populate('category')

    // Also updates the amount value of the wallet
    DbWallets.updateAmount(walletId, amount, response.category.type);

    return response as Objects.Transaction;
  };

  /** delete
   * Deletes a transaction and recalculates the wallet
   *
   * @param {string} transId
   *
   * @returns The deleted transaction as confirmation
   */
  static delete = async (transId: string): Promise<Objects.Transaction> => {
    const response: Objects.Transaction = await transactionCollection
      .findByIdAndDelete({ _id: transId })
      .populate('category');

    DbWallets.updateAmount(response.wallet_id, response.amount * -1, response.category.type);

    return response;
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
    const startDate = new Date(`${dataMonth.substr(0, 4)}-${dataMonth.substr(4, 2)}-1`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

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
  static update = async (old: Objects.Transaction, contents: Objects.Transaction): Promise<Objects.Transaction> => {
    const response: Objects.Transaction = await transactionCollection
      .findByIdAndUpdate(old._id, { $set: { ...contents } })
      .populate('category');

    // Updates the old and new wallets
    DbWallets.updateAmount(old.wallet_id, old.amount * -1, old.category.type);
    DbWallets.updateAmount(response.wallet_id, response.amount, response.category.type);

    return response;
  };
}
