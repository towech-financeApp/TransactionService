/** dbWallets.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Schema that describes the Wallet Schema and functions that use it
 */
import mongoose from 'mongoose';
mongoose.set('returnOriginal', false);

import { Objects } from '../Models';
import DbTransactions from './dbTransactions';

const WalletSchema = new mongoose.Schema({
  user_id: String,
  icon_id: Number,
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallets', default: null },
  child_id: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Wallets', default: null }],
  name: String,
  currency: String,
  money: Number,
  createdAt: Date,
});

const walletCollection = mongoose.model<Objects.Wallet>('Wallets', WalletSchema);

// Functions to communicate with the collection ID
export default class DbWallets {
  /** add
   * Adds a wallet to the DB
   *
   * @param {string} userId
   * @param {string} name
   * @param {number} icon_id
   * @param {string} currency
   * @param {string} parent_id
   *
   * @returns The inserted wallet
   */
  static add = async (
    userId: string,
    name: string,
    icon_id: number,
    currency: string,
    parent_id: string,
  ): Promise<Objects.Wallet> => {
    const response = new walletCollection({
      user_id: userId,
      icon_id,
      currency,
      name,
      money: 0,
      parent_id: parent_id === '-1' ? null : parent_id,
      createdAt: new Date().toISOString(),
    }).save();

    return response;
  };

  /** addChild
   * Adds a subwallet to a wallet
   *
   * @param {string} parent_id
   * @param {string} child_id
   *
   */
  static addChild = async (parent_id: string, child_id: string): Promise<void> => {
    await walletCollection.findByIdAndUpdate(parent_id, { $push: { child_id: child_id } });
  };

  /** delete
   * Deletes a wallet and all the transactions within
   *
   * @param {string} walletId
   *
   * @returns The deleted transaction as confirmation
   */
  static delete = async (walletId: string): Promise<Objects.Wallet> => {
    // Convert transactions that aren't transfers from family to the parent
    await DbTransactions.migrateToParent(walletId);

    // Gets the wallet
    const wallet = await DbWallets.getById(walletId);

    // Delete child transactions and wallets
    wallet.child_id?.map(async (w: Objects.Wallet) => {
      await DbTransactions.deleteAll(w._id);
      walletCollection.findByIdAndDelete(w._id);
    });

    // Deletes the transactions
    await DbTransactions.deleteAll(walletId);

    // Unlinks the wallet from it's parent
    if (wallet.parent_id !== null && wallet.parent_id !== undefined) {
      DbWallets.removeChild(wallet.parent_id, wallet._id);
    }

    // Deletes the wallet
    const deletedWallet = await walletCollection.findByIdAndDelete(walletId);

    return deletedWallet as Objects.Wallet;
  };

  /** getByName
   * Returns a wallet if the name and userId match
   *
   * @param {string} userId
   * @param {string} name
   *
   * @returns The wallet from the DB
   */
  static getByName = async (userId: string, name: string): Promise<Objects.Wallet> => {
    const response = await walletCollection.findOne({ user_id: userId, name });
    return response as Objects.Wallet;
  };

  /** getById
   * Gets the wallet from a given id
   *
   * @param walletID
   *
   * @returns The wallet from the DB
   */
  static getById = async (walletId: string): Promise<Objects.Wallet> => {
    const response = await walletCollection.findOne({ _id: walletId });
    return response as Objects.Wallet;
  };

  /** getWallets
   * Gets the user with the given userId
   *
   * @param {string} userId
   *
   * @returns {Wallet[]} All the Wallets that belong to the user
   */
  static getWallets = async (userId: string): Promise<Objects.Wallet[]> => {
    // const response = await walletCollection.find({ user_id: userId, parent_id: { $or: [ {$exists: false} ] }}).populate('child_id');
    const filter: mongoose.FilterQuery<any> = {
      $and: [
        { user_id: userId },
        {
          $or: [{ parent_id: { $exists: false } }, { parent_id: { $exists: true, $in: [null] } }],
        },
      ],
    };
    const response = await walletCollection.find(filter).populate('child_id');

    return response as Objects.Wallet[];
  };

  /** removeChild
   * Removes a subwallet from a wallet
   *
   * @param {string} parent_id
   * @param {string} child_id
   *
   */
  static removeChild = async (parent_id: string, child_id: string): Promise<void> => {
    await walletCollection.findByIdAndUpdate(parent_id, { $pull: { child_id: child_id } });
  };

  /** update
   * Updates the contents of the given wallet.
   *
   * IMPORTANT: THE "MONEY" ATTRIBUTE CAN'T BE UPDATED HERE, IT GETS DELETED BEFORE CHANGES ARE APPLIED
   * @param {string} walletId Id of the wallet
   * @param {Wallet} contents new content
   *
   * @returns The updated wallet
   */
  static update = async (wallet_Id: string, content: Objects.Wallet): Promise<Objects.Wallet> => {
    const cleanedWallet: any = content;
    cleanedWallet.money = undefined;

    const response = await walletCollection
      .findByIdAndUpdate(
        wallet_Id,
        {
          $set: { ...cleanedWallet },
        },
        { new: true },
      )
      .populate('child_id');

    return response as Objects.Wallet;
  };

  /** updateAmount
   * Adds the given amount to a wallet
   *
   * @param {string} walletId
   * @param {number} amount number that will be added to the wallet
   *
   */
  static updateAmount = async (
    walletId: string,
    amount: number,
    type: 'Income' | 'Expense',
    unlinked = false,
  ): Promise<void> => {
    const value = type == 'Income' ? amount : amount * -1;

    // Updates the wallet
    const updatedWallet = await walletCollection.findOneAndUpdate({ _id: walletId }, { $inc: { money: value } });

    // If the wallet has a parent, also updates its amount
    if (updatedWallet?.parent_id !== null && updatedWallet?.parent_id !== undefined && !unlinked) {
      await walletCollection.findByIdAndUpdate({ _id: updatedWallet?.parent_id }, { $inc: { money: value } });
    }
  };
}
