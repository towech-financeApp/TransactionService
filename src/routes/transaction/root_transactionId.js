/** root_walletid.js
 * Copyright (c) 2020, Jose Tow
 * All rights reserved
 * 
 * all methods for transaction/:transactionid
 */
const express = require("express");

// Database
const transactions = require("../../database/models/transactions");

// Utils
const errorHandler = require("../../utils/errorhandler");
const { isWalletOwner } = require("../../utils/checkAuth");
const { validateAmount, validateDate } = require("../../utils/validator");


const router = express.Router({ mergeParams: true });

// GET: /  Returns the requested transaction
router.get("/", async (req, res) => {
  res.send(req.transaction);
});

// PATCH: / Edits the requested transaction
router.patch("/", async (req, res) => {
  try {
    const { id: userid } = req.token;
    const { walletId, concept, amount, transactionDate } = req.body;

    var errors = {};
    const content = {};

    // validates the wallet
    if (walletId) {
      if (walletId !== parseInt(req.transaction.walletid)) {
        if (!(await isWalletOwner(userid, walletId))) throw errorHandler.userForbiddenError('Invalid Fields', { walletId: 'Invalid Wallet' });
        content.walletId = walletId;
      }
    }

    // The validation doesn't use the exact same code as the creation of a transaction
    // since the parameters are optional in this case
    if (concept) {
      if (req.transaction.concept !== concept.trim()) {
        if (concept.trim() == '') errors.concept = 'Concept must not be empty';
        content.concept = concept.trim();
      }
    }
    
    if (amount) {
      const { valid: validAmount, errors: errorsAmount, rounded } = validateAmount(amount);
      if (!validAmount) errors = { ...errors, ...errorsAmount };
      
      if (parseFloat(req.transaction.amount) !== rounded) { 
        content.amount = rounded;
      }
    }
    
    if (transactionDate) {
      // If the given transaction is different
      if (req.transaction.transactiondate.toISOString().slice(0, 10) !== transactionDate) {
        const { valid: validDate, errors: errorsDate } = validateDate(transactionDate);
        if (!validDate) errors = { ...errors, ...errorsDate }

        content.transactionDate = transactionDate;
      }
    }

    // If there aren't any changes, returns a 304 code
    if (Object.keys(content).length < 1) return res.sendStatus(304);
    
    // If there is an error, throws it
    if (Object.keys(errors).length > 0) throw errorHandler.userInputError("Invalid Fields", errors);

    // Updates the transaction
    const updated_transaction = await transactions.update(req.transaction, content)

    res.send(updated_transaction);
  } catch (exception) { errorHandler.sendHttpError(res, exception) }
});

// DELETE: / Removes a transaction from the DB
router.delete("/", async (req, res) => {
  const deleted_transaction = await transactions.delete(req.transaction.transactionid);

  res.send(deleted_transaction);
});

module.exports = router;
