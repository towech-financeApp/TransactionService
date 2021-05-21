/** index.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 * 
 * HTTP Route index, holds all the routes
 */
const express = require("express");

// Routes
const wallet = require("./wallet");
const transaction = require("./transaction");

// Utils
const { checkAuth } = require("../utils/checkAuth");

const router = express.Router();

router.use("/wallet", checkAuth, wallet);

router.use("/transaction", checkAuth, transaction);

// The rest of the Routes will return a 404 error
router.use('*', (_, res) => {
  res.status(404).send("NOT FOUND");
});

module.exports = router