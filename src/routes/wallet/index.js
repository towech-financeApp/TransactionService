/** index.js
 * Copyright (c) 2020, Jose Tow
 * All rights reserved
 * 
 * index for all the wallet routes
 */
const express = require("express");

// Database
const wallets = require("../../database/models/wallets");
const transactions = require("../../database/models/transactions");

// routes
const root_walletid = require("./root_walletid");

// Utils
const errorHandler = require("../../utils/errorhandler");
const { validateWalletName, validateAmount } = require("../../utils/validator");
const { checkWalletOwner } = require("../../utils/checkAuth");

const router = express.Router();

// root: creates a new wallet for the soliciting user
router.post("/", async (req, res) => {
  try {
    const { id: userId, } = req.token;
    const { name, money, } = req.body;

    var errors = {};
    // Validates the wallet name
    const { valid: validName, errors: errorsName } = await validateWalletName(name, userId);
    if (!validName) errors = { ...errors, ...errorsName };

    // Validates that the money is a valid number
    const { valid: validAmount, errors: errorsAmount, rounded, } = validateAmount(money);
    if (!validAmount) errors = { ...errors, ...errorsAmount };

    // Sends an error response if there is any error
    if (Object.keys(errors).length > 0) throw errorHandler.userInputError("Invalid Fields", errors);

    const newWallet = await wallets.add(userId, name.trim());

    // Makes the initial transaction
    if (rounded !== 0 && !isNaN(rounded)) {
      newWallet.money = rounded;
      transactions.add(newWallet.walletid, 'Initial transaction', rounded);
    }

    res.send(newWallet);
  }
  catch (exception) { errorHandler.sendHttpError(res, exception); }
});

// root/:walletId 
router.use('/:walletId', checkWalletOwner, root_walletid);


module.exports = router;
