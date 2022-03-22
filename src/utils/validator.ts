/** validator.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Contains functions that validate data
 */

import DbWallets from '../database/dbWallets';
import DbTransactions from '../database/dbTransactions';

import { Objects } from '../Models';

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

    const amountNum = parseFloat(amount.toString());

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

  /** validateCategory
   * Checks if a given category is valid
   *
   * @param {string} category_id
   * @param {string} user_id
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   */
  static validateCategory = async (category_id: string, user_id: string): Promise<{ valid: boolean; errors: any }> => {
    const errors: any = {};

    const dbCategory = await DbTransactions.getCategory(category_id);

    if (!dbCategory) {
      errors.category = "Category doesn't exist";
    } else if (dbCategory.user_id !== '-1' && dbCategory.user_id !== user_id) {
      errors.category = 'Category does not belong to the user';
    }

    return {
      errors,
      valid: Object.keys(errors).length < 1,
    };
  };

  /** validateConcept
   * Checks if a given concept is valid
   *
   * @param {string} amount
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
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

  /** validateCurrency
   * Checks if a given currency is valid
   *
   * @param {string} currency
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   * @returns output: String that contains the corrected currency
   */
  static validateCurrency = async (
    currency: string,
    parent: string,
  ): Promise<{ valid: boolean; errors: any; output: string }> => {
    const errors: any = {};
    let output = currency;

    if (currency === null) errors.currency = 'Currency must not be empty';
    else {
      output = output.trim();

      if (output === '') errors.currency = 'Currency must not be empty';
      else if (output.length !== 3) errors.currency = 'Currency must be a 3 letter acronym';

      if (parent !== '-1') {
        const wallet = await DbWallets.getById(parent);

        if (wallet.currency !== output) errors.currency = 'Currency must match its parent';
      }
    }

    return {
      errors,
      valid: Object.keys(errors).length < 1,
      output,
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
      let day;
      let year;

      // Checks the month-date
      switch (splitDate[1]) {
        case '02':
          day = parseInt(splitDate[2], 10);

          if (day > 29) {
            errors.date = 'Invalid date';
          } else if (day === 29) {
            year = parseInt(splitDate[0], 10);

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

  /** setIconId
   * Rather than checking that the icon id is valid, as it is managed by the frontend rather than the db, it just ensures that it is a positive integer
   *
   * @param {number} icon_id
   *
   * @returns corrected icon_id
   */
  static setIconId = (icon_id: number): number => {
    let ico = icon_id || '';
    ico = parseInt(ico.toString(), 10);
    if (isNaN(ico) || ico < 0) ico = 0;
    return ico;
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
  static transactionOwnership = async (
    userId: string,
    transactionId: string,
  ): Promise<{ valid: boolean; errors: any; transaction: Objects.Transaction }> => {
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

  /** walletLineage
   *  Checks if the user is the owner of the parent wallet and if
   *  that wallet is not a subwallet already
   *
   * @param {string} user_Id
   * @param {string} parent_Id
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   * @returns parent: String contained the trimmed parent_walletId
   */
  static walletLineage = async (
    user_Id: string,
    parent_Id: string,
  ): Promise<{ valid: boolean; errors: any; parent: string }> => {
    const errors: any = {};
    const parent = parent_Id.trim() || '-1';

    if (parent !== '-1') {
      const wallet = await DbWallets.getById(parent);

      if (wallet.user_id !== user_Id) errors.parent_id = 'User does not own parent wallet';
      else if (wallet.parent_id && wallet.parent_id !== '-1')
        errors.parent_id = 'Only one generation of subwallets is allowed';
    }

    return {
      errors,
      valid: Object.keys(errors).length < 1,
      parent,
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
  static walletOwnership = async (
    userId: string,
    walletId: string,
  ): Promise<{ valid: boolean; errors: any; wallet: Objects.Wallet }> => {
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
