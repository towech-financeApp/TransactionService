/** checkAuth.js
 * Copyright (c) 2020, Jose Tow
 * All rights reserved.
 * 
 * Utility that checks if the received authentication token is valid
 */
const dotenv = require("dotenv");
dotenv.config();

const jwt = require("jsonwebtoken");
const { Console } = require("winston/lib/winston/transports");

// database
const wallets = require("../database/models/wallets");
const transactions = require("../database/models/transactions");

// utils
const errorhandler = require("./errorhandler");
const logger = require("./logger");

// Checks if a jwt Token is valid
const isAuth = (token) => {

  try {
    const decoded_token = jwt.verify(token, process.env.TRANSACTIONSERVICE_AUTH_TOKEN_KEY);
    return decoded_token;
  }
  catch (err) {
    throw errorhandler.authenticationError("Invalid Token", { token: "Invalid Token" });
  }

};

/** isWalletOwner
 * Checks if the user is the owner of a wallet, returns the wallet if valid
 * 
 * @param userId
 * @param walletId
 * 
 * @returns the wallet if the user is the owner
 */
module.exports.isWalletOwner = async (userId, walletId) => {
  const wallet = await wallets.getById(walletId);
  if (!wallet || wallet.userid !== userId) return null;

  return wallet
};

module.exports.checkAuth = async (req, res, next) => {
  try {
    const authorization = req.headers["authorization"];

    if (!authorization) throw errorhandler.authenticationError("Invalid Token", { token: "No token provided" });

    // Check if the authToken is valid
    const decoded_token = isAuth(authorization.split(" ")[1]);

    // The service trusts the userservice that the user still exists
    req.token = decoded_token;

    next();
  } catch (exception) { errorhandler.sendHttpError(res, exception); }
};

module.exports.checkTransactionOwner = async (req, res, next) => {
  try {
    const { id: userId, } = req.token;
    const transId = req.body.transactionId ? req.body.transactionId : req.params.transactionId;
    if (!transId || isNaN(parseInt(transId))) { throw errorhandler.userForbiddenError('Invalid transaction', { transactionId: 'Invalid transaction' }) }

    const transaction = await transactions.getById(transId);
    if (!transaction) { throw errorhandler.userForbiddenError('Invalid transaction', { transactionId: 'Invalid transaction' }) }

    // Checks if the userId and the wallet's owner is the same
    if (transaction.userid !== userId) { throw errorhandler.userForbiddenError('Invalid transaction', { transactionId: 'Invalid transaction' }) }

    req.transaction = transaction;

    next();
  } catch (exception) { errorhandler.sendHttpError(res, exception); }
};

module.exports.checkWalletOwner = async (req, res, next) => {
  try {
    const { id: userId, } = req.token;
    const walletId = req.body.walletId ? req.body.walletId : req.params.walletId;
    if (!walletId) { throw errorhandler.userForbiddenError('Invalid wallet', { walletId: 'Invalid walletId' }) }

    const wallet = await this.isWalletOwner(userId, walletId)
    if (!wallet) { throw errorhandler.userForbiddenError('Invalid wallet', { walletId: 'Invalid walletId' }) }

    req.wallet = wallet;

    next();
  } catch (exception) { errorhandler.sendHttpError(res, exception); }
};
