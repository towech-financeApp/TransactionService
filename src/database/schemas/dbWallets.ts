/** dbWallets.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Schema that describes the Wallet Schema and functions that use it
 */
import mongoose from 'mongoose';
import logger from 'tow96-logger';
import { Wallet } from '../../Models';

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
   * @returns The inserted values
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

  /** getByName
   * Returns a wallet if the name and userId match
   *
   * @param {string} userId
   * @param {string} name
   *
   * @returns Wallet
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
   * @returns {Wallet[]} All the Wallets that belong to a user
   */
  static getWallets = async (userId: string): Promise<Wallet[]> => {
    const response = await walletCollection.find({ user_id: userId });
    return response as Wallet[];
  };

  /** updateAmount
   * Adds the given amount to a wallet
   *
   * @param {string} walletId
   * @param {number} amount number that will be added to the wallet
   *
   * @returns {Wallet[]} All the Wallets that belong to a user
   */
  static updateAmount = async (walletId: string, amount: number): Promise<void> => {
    await walletCollection.findOneAndUpdate({ _id: walletId }, { $inc: { money: amount } });
  };
}
