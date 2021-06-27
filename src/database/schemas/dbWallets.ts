/** dbWallets.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Schema that describes the Wallet Schema and functions that use it
 */
import mongoose from 'mongoose';
mongoose.set('returnOriginal', false);

import { Wallet } from '../../Models';
import DbTransactions from './dbTransactions';

const WalletSchema = new mongoose.Schema({
  user_id: String,
  name: String,
  money: Number,
  createdAt: Date,
});

const walletCollection = mongoose.model('Wallets', WalletSchema);

// Functions to communicate with the collection ID
export default class DbWallets {
  /** add
   * Adds a wallet to the DB
   *
   * @param {string} userId
   * @param {string} name
   *
   * @returns The inserted wallet
   */
  static add = async (userId: string, name: string): Promise<Wallet> => {
    const response = new walletCollection({
      user_id: userId,
      name,
      money: 0,
      createdAt: new Date().toISOString(),
    }).save();

    return response as Wallet;
  };

  /** delete
   * Deletes a wallet and all the transactions within
   *
   * @param {string} walletId
   *
   * @returns The deleted transaction as confirmation
   */
  static delete = async (walletId: string): Promise<Wallet> => {
    // Deletes the transactions
    await DbTransactions.deleteAll(walletId);

    // Deletes the wallet
    const deletedWallet = await walletCollection.findByIdAndDelete(walletId);

    return deletedWallet as Wallet;
  };

  /** getByName
   * Returns a wallet if the name and userId match
   *
   * @param {string} userId
   * @param {string} name
   *
   * @returns The wallet from the DB
   */
  static getByName = async (userId: string, name: string): Promise<Wallet> => {
    const response = await walletCollection.findOne({ user_id: userId, name });
    return response as Wallet;
  };

  /** getById
   * Gets the wallet from a given id
   *
   * @param walletID
   *
   * @returns The wallet from the DB
   */
  static getById = async (walletId: string) => {
    const response = await walletCollection.findOne({ _id: walletId });
    return response as Wallet;
  };

  /** getWallets
   * Gets the user with the given userId
   *
   * @param {string} userId
   *
   * @returns {Wallet[]} All the Wallets that belong to the user
   */
  static getWallets = async (userId: string): Promise<Wallet[]> => {
    const response = await walletCollection.find({ user_id: userId });
    return response as Wallet[];
  };

  /** update
   * Updates the contents of the given wallet.
   *
   * IMPORTANT: THE "MONEY" ATTRIBUTE MUST NOT BE UPDATED HERE
   *
   * @param {string} walletId Id of the wallet
   * @param {Wallet} contents new content
   *
   * @returns The updated wallet
   */
  static update = async (walletId: string, contents: Wallet): Promise<Wallet> => {
    const response: Wallet = await walletCollection.findByIdAndUpdate(walletId, { $set: { ...contents } });

    return response;
  };

  /** updateAmount
   * Adds the given amount to a wallet
   *
   * @param {string} walletId
   * @param {number} amount number that will be added to the wallet
   *
   */
  static updateAmount = async (walletId: string, amount: number): Promise<void> => {
    await walletCollection.findOneAndUpdate({ _id: walletId }, { $inc: { money: amount } });
  };
}
