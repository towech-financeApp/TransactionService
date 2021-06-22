/** validator.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Contains functions that validate data
 */

import DbWallets from '../database/schemas/dbWallets';
import DbTransactions from '../database/schemas/dbTransactions';

import { Wallet, Transaction } from '../Models'

export default class Validator {
  /** validateAmount
   * Checks if a given amount is a number and rounds it to 2 digits
   *
   * @param {string} amount
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   * @returns rounded: Rounded amount to 2 decimal places
   */
  static validateAmount = (amount: string): { valid: boolean; errors: any; rounded: number } => {
    // Creates an object that will hold all the errors
    const errors: any = {};

    const amountNum = parseFloat(amount);

    if (isNaN(amountNum)) {
      errors.amount = 'Amount is not a number';
    }
    const rounded = Math.round((amountNum + Number.EPSILON) * 100) / 100;

    return {
      errors,
      valid: Object.keys(errors).length < 1,
      rounded,
    };
  };

  /** validateConcept
   * Checks if a given concept is valid
   *
   * @param {string} amount
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   * @returns rounded: Rounded amount to 2 decimal places
   */
  static validateConcept = (concept: string): { valid: boolean; errors: any } => {
    const errors: any = {};

    if (concept === null) errors.concept = 'Concept must not be empty';
    else if (concept.trim() === '') errors.concept = 'Concept must not be empty';

    return {
      errors,
      valid: Object.keys(errors).length < 1,
    };
  };

  /** validateDate
   * Checks that a given date is in the YYYY-MM-DD format
   *
   * @param {string} date
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   */
  static validateDate = (date: string): { valid: boolean; errors: any } => {
    const errors: any = {};

    const formatRegex = /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[1-2]\d|3[0-1])$/;
    if (!formatRegex.test(date)) {
      errors.date = 'The date must be in YYYY-MM-DD format';
    } else {
      // Checks if it is a valid date
      const splitDate = date.split('-');

      // Checks the month-date
      switch (splitDate[1]) {
        case '02':
          const day = parseInt(splitDate[2], 10);

          if (day > 29) {
            errors.date = 'Invalid date';
          } else if (day === 29) {
            const year = parseInt(splitDate[0], 10);

            if (!(year % 400 === 0 || (year % 4 === 0 && !(year % 100 === 0)))) {
              errors.date = 'Invalid date';
            }
          }

          break;
        case '04':
        case '06':
        case '09':
        case '11':
          if (splitDate[2] === '31') {
            errors.date = 'Invalid date';
          }
          break;
        default:
        // Regex already filtered invalid dates
      }
    }

    return {
      errors,
      valid: Object.keys(errors).length < 1,
    };
  };

  /** validateWalletName
   * Checks if a given string can be used as a wallet name
   *
   * @param {string} walletName
   * @param {string} userId
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   */
  static validateWalletName = async (walletName: string, userId: string): Promise<{ valid: boolean; errors: any }> => {
    // Creates an object that will hold all the errors
    const errors: any = {};

    // Checks if the wallet name is not empty
    if (!walletName || walletName.trim() === '') {
      errors.name = 'Wallet name must not be empty';
    }

    // Checks in the Database to see if the user has not a wallet with the same name already
    const walletExists = await DbWallets.getByName(userId, walletName);
    if (walletExists) {
      errors.name = 'Wallet name already exists';
    }

    return {
      errors,
      valid: Object.keys(errors).length < 1,
    };
  };

  /** transactionOwnership
   *  Checks if the user is the owner of a transaction
   *
   * @param {string} userId
   * @param {string} transactionId
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   */
  static transactionOwnership = async (userId: string, transactionId: string): Promise<{ valid: boolean; errors: any; transaction: Transaction }> => {
    // Creates an object that will hold all the errors
    const errors: any = {};

    const transaction = await DbTransactions.getById(transactionId);

    if (!userId || !transaction || transaction.user_id !== userId) {
      errors.transaction = 'User does not own this transaction';
    }

    return {
      errors,
      valid: Object.keys(errors).length < 1,
      transaction,
    };
  };

  /** walletOwnership
   *  Checks if the user is the owner of a wallet
   *
   * @param {string} userId
   * @param {string} walletId
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   */
  static walletOwnership = async (userId: string, walletId: string): Promise<{ valid: boolean; errors: any; wallet: Wallet }> => {
    // Creates an object that will hold all the errors
    const errors: any = {};

    const wallet = await DbWallets.getById(walletId);

    if (!userId || !wallet || wallet.user_id !== userId) {
      errors.wallet = 'User does not own this wallet';
    }

    return {
      errors,
      valid: Object.keys(errors).length < 1,
      wallet,
    };
  };
}
