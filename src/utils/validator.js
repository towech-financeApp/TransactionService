/** validator.js
 * Copyright (c) 2020, Jose Tow
 * All rights reserved.
 * 
 * Contains functions that validate data
 */

// database
const wallets = require('../database/models/wallets');

/** validateDate
 * Checks that a given date is in the YYYY-MM-DD format
 * 
 * @param date
 * 
 * @returns Valid: Boolean that confirms validity
 * @returns errors: Object with all the errors
 */
module.exports.validateDate = (date) => {
  const errors = {};

  const formatRegex = /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[1-2]\d|3[0-1])$/;
  if (!formatRegex.test(date)) { errors.date = 'The date must be in YYYY-MM-DD format'; }
  else {
    // Checks if it is a valid date
    const splitDate = date.split("-");

    // Checks the month-date
    switch (splitDate[1]) {
      case '02':
        const day = parseInt(splitDate[2]);

        if (day > 29) { errors.date = 'Invalid date'; }
        else if (day == 29) {
          const year = parseInt(splitDate[0]);

          if (!((year % 400 == 0) || (year % 4 == 0 && !(year % 100 == 0)))) { 
            errors.date = 'Invalid date'; 
          }

        }

        break;
      case '04':
      case '06':
      case '09':
      case '11':
        if (splitDate[2] == '31') { errors.date = 'Invalid date'; }
        break;
      default:
      // Regex already filtered invalid dates
    }
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  }
};

/** validateWalletName
 * Checks if a given string can be used as a wallet name
 * 
 * @param walletName
 * @param userId
 * 
 * @returns Valid: Boolean that confirms validity
 * @returns errors: Object with all the errors
 */
module.exports.validateWalletName = async (walletName, userId) => {
  // Creates an object that will hold all the errors
  const errors = {};

  // Checks if the wallet name is not empty
  if (!walletName || walletName.trim() === '') { errors.name = 'Wallet name must not be empty'; }

  // Checks in the Database to see if the user has not a wallet with the same name already
  const walletExists = await wallets.existsByName(userId, walletName);
  if (walletExists) { errors.name = 'Wallet name already exists' }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  }
};

/** validateAmount
 * Checks if a given amount is a number and rounds it to 2 digits
 * 
 * @param amount
 * 
 * @returns Valid: Boolean that confirms validity
 * @returns errors: Object with all the errors
 * @returns rounded: Rounded amount to 2 decimal places
 */
module.exports.validateAmount = (amount) => {
  // Creates an object that will hold all the errors
  const errors = {};

  const amountNum = parseFloat(amount)

  if (isNaN(amountNum)) { errors.amount = 'Amount is not a number'; }
  const rounded = Math.round((amountNum + Number.EPSILON) * 100) / 100

  return {
    errors,
    valid: Object.keys(errors).length < 1,
    rounded,
  }
};
