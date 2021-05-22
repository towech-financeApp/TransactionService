/** wallets.js
 * Copyright (c) 2020, Jose Tow
 * All rights reserved.
 * 
 * Contains all the functions to communicate to the wallets table
 */
const client = require('../pg');

/** add
 * Adds a wallet to the DB
 * 
 * @param userId
 * @param name
 * 
 * @returns The inserted values
 */
module.exports.add = async (userId, name) => {
  const response = await client.query(`INSERT INTO Wallets(userId, name) VALUES(${userId}, '${name}') RETURNING *`);
  return response.rows[0];
};

/** delete
 * Deletes a wallet and all the transactions within
 * 
 * @param walletId
 * 
 * @returns The deleted transaction as confirmation and the count of deleted transactions
 */
module.exports.delete = async (walletId) => {
  // Deletes the transactions
  const transaction = await client.query(`DELETE FROM Transactions WHERE walletId = ${walletId} RETURNING *`);
  const wallet = await client.query(`DELETE FROM Wallets WHERE walletId = ${walletId} RETURNING *`);

  return {
    wallet: wallet.rows[0],
    transactions: transaction.rowCount,
  };
};

/** existsById
 * Checks if a given walletId exists 
 * 
 * @param userId
 * @param walletId
 * 
 * @returns Boolean indicating that exists
 */
module.exports.existsById = async (userId, walletId) => {
  const response = await client.query(`SELECT * FROM Wallets WHERE WalletID = ${walletId} and UserId = ${userId}`);
  return response.rowCount > 0;
};

/** existsByName
 * Checks if a given walletId exists by giving its name
 * 
 * @param userId
 * @param name
 * 
 * @returns Boolean indicating that exists
 */
module.exports.existsByName = async (userId, name) => {
  const response = await client.query(`SELECT * FROM Wallets WHERE UserID = ${userId} and Name = '${name}'`);
  return response.rowCount > 0;
};

/** getById
 * Gets the wallet from a given id
 * 
 * @param walletID
 * 
 * @returns The wallet from the DB
 */
module.exports.getById = async (walletId) => {
  const response = await client.query(`SELECT * FROM Wallets WHERE walletID = ${walletId}`);
  if (response.rowCount == 0) return null;
  return response.rows[0];
};

/** getUserWallets
 * Gets all the wallets of a user
 * @param userId
 * 
 * @returns All the Wallets that belong to a user
 */
module.exports.getUserWallets = async (userId) => {
  const response = await client.query(`SELECT * FROM Wallets where userId = ${userId}`);
  return response.rows;
};

/** getTransactions
 * Gets the transactions from a wallet
 * @param walletID
 * 
 * @returns All the transactions that belong to a wallet
 */
module.exports.getTransactions = async (walletId) => {
  const response = await client.query(`SELECT * FROM Transactions where walletId = ${walletId} ORDER BY transactiondate DESC`);
  return response.rows;
}

/** recalculate
 * Updates the redundant "money" value in the wallet by adding all it's transactions
 * 
 * @param walletId
 * 
 * @returns The updated wallet
 */
module.exports.recalculate = async (walletId) => {
  const response = await client.query(`UPDATE Wallets SET money = (SELECT sum(amount) as money FROM transactions WHERE walletId = ${walletId}) WHERE walletId = ${walletId} RETURNING *`);
  return response.rows[0];
};

/** update
 * Updates the contents of the given wallet.
 * 
 * IMPORTANT: THE "MONEY" ATTRIBUTE MUST NOT BE UPDATED HERE
 * 
 * @param walletId
 * @param con
 * 
 * @returns The updated wallet
 */
module.exports.update = async (walletId, contents) => {
  // Creates the string for values to set
  var values = '';
  if (contents.name) values += ` name = '${contents.name}',`;

  // Updates the wallet
  const response = await client.query(`UPDATE Wallets SET ${values.slice(1, -1)} WHERE walletId = ${walletId} RETURNING *`);
  
  return response.rows[0];
};
