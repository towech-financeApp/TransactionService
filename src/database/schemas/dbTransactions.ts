/** dbTransactions.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Schema that describes the Transaction Schema and functions that use it
 */
import mongoose from 'mongoose';
mongoose.set('returnOriginal', false);

import { Transaction } from '../../Models';
import DbWallets from './dbWallets';

const TransactionSchema = new mongoose.Schema({
  user_id: String,
  wallet_id: String,
  concept: String,
  amount: Number,
  transactionDate: Date,
  createdAt: Date,
});

const transactionCollection = mongoose.model('Transactions', TransactionSchema);

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
  ): Promise<Transaction> => {
    const response = new transactionCollection({
      user_id: userId,
      wallet_id: walletId,
      concept,
      amount,
      transactionDate,
      createdAt: new Date().toISOString(),
    }).save();

    // Also updates the amount value of the wallet
    DbWallets.updateAmount(walletId, amount);

    return response as Transaction;
  };

  /** delete
   * Deletes a transaction and recalculates the wallet
   *
   * @param {string} transId
   *
   * @returns The deleted transaction as confirmation
   */
  static delete = async (transId: string): Promise<Transaction> => {
    const response: Transaction = await transactionCollection.findByIdAndDelete({ _id: transId });

    DbWallets.updateAmount(response.wallet_id, response.amount * -1);

    return response;
  };

  /** getById
   * Gets the transaction from a given id
   *
   * @param {string} transId
   *
   * @returns The transaction from the DB with the userId attached
   */
  static getById = async (transId: string): Promise<Transaction> => {
    const response = await transactionCollection.findOne({ _id: transId });
    return response as Transaction;
  };

  /** update
   * Updates the contents of the given transaction.
   *
   * @param {Transaction} previous the old transaction
   * @param {Transaction} contents new content
   *
   * @returns The updated transaction
   */
  static update = async (old: Transaction, contents: Transaction): Promise<Transaction> => {
    const response: Transaction = await transactionCollection.findByIdAndUpdate(old._id, { $set: { ...contents } });

    // Updates the old and new wallets
    DbWallets.updateAmount(old.wallet_id, old.amount * -1);
    DbWallets.updateAmount(response.wallet_id, response.amount);

    return response;
  };
}
