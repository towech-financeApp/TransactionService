/** transactions.js
 * Copyright (c) 2020, Jose Tow
 * All rights reserved.
 * 
 * Contains all the functions to communicate to the wallets table
 */
const client = require('../pg');

const wallets = require('./wallets');

/** add
 * Adds a transaction to the DB
 * 
 * @param walletId
 * @param concept
 * @param amount
 * @param transactionDate in YYYY-MM-DD format
 * 
 * @returns The inserted transaction
 */
module.exports.add = async (walletId, concept, amount, transactionDate) => {

  // Creates the transaction
  var query = `INSERT INTO Transactions(walletId, concept, amount, transactionDate) VALUES(${walletId}, '${concept}', ${amount}, '${transactionDate}') RETURNING *`;

  if (!transactionDate) query = `INSERT INTO Transactions(walletId, concept, amount) VALUES(${walletId}, '${concept}', ${amount}) RETURNING *`;

  const response = await client.query(query);

  // recalculates the wallet, it is not awaited as this is internal
  wallets.recalculate(walletId);

  return response.rows[0];
};

/** delete
 * Deletes a transaction and recalculates the wallet
 * 
 * @param transId
 * 
 * @returns The deleted transaction as confirmation
 */
module.exports.delete = async (transId) => {
  const response = await client.query(`DELETE FROM transactions WHERE transactionid = ${transId} RETURNING *`);

  // recalculates the wallet
  wallets.recalculate(response.rows[0].walletid);
  return response.rows[0];
};

/** getById
 * Gets the transaction from a given id
 * 
 * @param transId
 * 
 * @returns The transaction from the DB with the userId attached
 */
module.exports.getById = async (transId) => {
  const response = await client.query(
    `SELECT w.userid, t.* 
      from transactions t 
        join Wallets w on t.walletid = w.walletid
      where t.transactionid = ${transId}`
  );

  if (response.rowCount == 0) return null;
  return response.rows[0];
};

/** update
 * Updates the contents of the given transaction.
 * 
 * @param transaction The data of the transaction (transactionId and walletId are used)
 * @param contents
 * 
 * @returns The updated transaction
 */
module.exports.update = async (transaction, contents) => {
  // Creates the string for values to set
  var values = '';
  if (contents.walletId) values += ` walletId = ${contents.walletId},`;
  if (contents.concept) values += ` concept = '${contents.concept}',`;
  if (contents.amount) values += ` amount = ${contents.amount},`;
  if (contents.transactionDate) values += ` transactionDate = '${contents.transactionDate}',`;

  // Updates the transaction
  const response = await client.query(`UPDATE Transactions SET ${values.slice(1, -1)} WHERE transactionid = ${transaction.transactionid} RETURNING *`);

  // If the wallet was changed, recalculates both wallets
  if (contents.walletId) { wallets.recalculate(transaction.walletid) }
  wallets.recalculate(response.rows[0].walletid);

  return response.rows[0];
};
