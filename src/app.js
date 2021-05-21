/** App.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 * 
 * Main file for the TransactionService, establishes the connections and middleware
 */

const dotenv = require("dotenv");
dotenv.config();
//require("./database/mongoose");
require("./database/pg");

const express = require("express");
const morgan = require("morgan");

const routes = require("./routes/index");

// utils
const logger = require("./utils/logger");

const app = express();

// Settings
app.set("port", process.env.TRANSACTIONSERVICE_PORT || 3000);

// Middleware

// use JSON bodyparser
app.use(express.json());

//morgan: allows the console to provide http protocol logs (only outside of production)
if (process.env.TRANSACTIONSERVICE_NODE_ENV !== "production") { app.use(morgan("dev")); };

// CORS: enabled on the env file
if (process.env.ENABLE_CORS == "true") {
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

    // Provide pre-flight authorization
    if ("OPTIONS" === req.method) { res.sendStatus(204); }
    else { next(); }
  });
  logger.info("CORS enabled");
}

app.use('/', routes);

// Start server
app.listen(app.get("port"), () => {
  logger.info(`Server running on port: ${app.get("port")}`);
});