/** index.js
 * Copyright (c) 2020, Jose Tow
 * All rights reserved
 * 
 * index for all the transaction routes
 */
const express = require("express");

// Database
const transactions = require("../../database/models/transactions");

// Routes
const root_transactionId = require("./root_transactionId");

// Utils
const errorHandler = require("../../utils/errorhandler");
const { checkWalletOwner, checkTransactionOwner } = require("../../utils/checkAuth");
const { validateAmount, validateDate } = require("../../utils/validator");

const router = express.Router();

// POST root: creates a new transaction for the soliciting user's wallet
router.post("/", checkWalletOwner, async (req, res) => {
  try {
    const { walletId, concept, amount, transactionDate } = req.body;
    var errors = {};

    // Validates that the given amount is a valid number
    const { valid: validAmount, errors: errorsAmount, rounded } = validateAmount(amount);
    if (!validAmount) errors = { ...errors, ...errorsAmount };

    // Validates the transaction date
    const { valid: validDate, errors: errorsDate } = validateDate(transactionDate);
    if (!validDate) errors = { ...errors, ...errorsDate };

    // Validates that the concept is not empty
    if (concept == null) errors.concept = 'Concept must not be empty';
    else if (concept.trim() == '') errors.concept = 'Concept must not be empty';

    // Sends an error response if there is any error
    if (Object.keys(errors).length > 0) throw errorHandler.userInputError("Invalid Fields", errors);

    const newTransaction = await transactions.add(walletId, concept, rounded, transactionDate);

    res.send(newTransaction);
  }
  catch (exception) { errorHandler.sendHttpError(res, exception) }
});

// root/:transactionId methodes
router.use("/:transactionId", checkTransactionOwner, root_transactionId);

module.exports = router;
