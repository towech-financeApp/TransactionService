/** root_walletid.js
 * Copyright (c) 2020, Jose Tow
 * All rights reserved
 * 
 * all methods for wallet/:walletid
 */
const express = require("express");

// Database
const wallets = require("../../database/models/wallets");

// Utils
const errorHandler = require("../../utils/errorhandler");
const { validateWalletName } = require("../../utils/validator");

const router = express.Router({ mergeParams: true });

// Get the wallet by it's ID
router.get("/", async (req, res) => {
  try {
    res.send(req.wallet);
  } catch (exception) { errorHandler.sendHttpError(res, exception); }
});

// Change the wallet's data (except the money it holds)
router.patch("/", async (req, res) => {
  const { id: userId } = req.token;
  const { name } = req.body;
  const { walletId } = req.params;

  var errors = {};
  const content = {};

  try {
    // The validation doesn't use the exact same code as the creation of a wallet
    // since the parameters are optional in this case
    if (name) {
      if (req.wallet.name !== name.trim()) {
        const { valid: validName, errors: errorsName } = await validateWalletName(name, userId);
        if (!validName) errors = { ...errors, ...errorsName };

        content.name = name.trim();
      }
    }

    // If there aren't any changes, returns a 304 code
    if (Object.keys(content).length < 1) return res.sendStatus(304);

    // If there is an error, throws it
    if (Object.keys(errors).length > 0) throw errorHandler.userInputError("Invalid Fields", errors);

    // Updates the wallet
    const updated_wallet = await wallets.update(walletId, content);
    res.send(updated_wallet);
  } catch (exception) { errorHandler.sendHttpError(res, exception); }
});

// Delete a wallet and its transactions
router.delete("/", async (req, res) => {
  try {
    const deleted_wallet = await wallets.delete(req.wallet.walletid);

    res.send(deleted_wallet);
  } catch (exception) { errorHandler.sendHttpError(res, exception); }
});

// Gets the wallet and it's transactions
router.get("/transactions", async (req, res) => {
  try {

    // Gets all the transactions of the wallet
    const transactions = await wallets.getTransactions(req.wallet.walletid);

    res.send({
      wallet: req.wallet,
      transactions: transactions,
    });
  } catch (exception) { errorHandler.sendHttpError(res, exception); }
});

module.exports = router;
