/** validator.js
 * Copyright (c) 2020, Jose Tow
 * All rights reserved.
 * 
 * Contains functions that report errors
 */

const logger = require('./logger');

module.exports.sendHttpError = (res, exception) => {
  logger.http(exception);
  res.status(exception.status ? exception.status : 400).send(exception);
}

// HTTP: 401
module.exports.authenticationError = (message, errors) => {
  const err = {
    message,
    errors,
    status: 401,
  }

  logger.http(message);
  logger.http(JSON.stringify(errors));

  return err
}

// HTTP: 403
module.exports.userForbiddenError = (message, errors) => {
  const err = {
    message,
    errors,
    status: 403,
  }

  logger.http(message);
  logger.http(JSON.stringify(errors));

  return err;
}

// HTTP: 404
module.exports.notFoundError = (message, errors) => {
  const err = {
    message,
    errors,
    status: 404,
  }

  logger.http(message);
  logger.http(JSON.stringify(errors));

  return err
}

// HTTP: 422
module.exports.userInputError = (message, errors) => {
  const err = {
    message,
    errors,
    status: 422,
  }

  logger.http(message);
  logger.http(JSON.stringify(errors));

  return err
}

// HTTP: 500
module.exports.serverError = (message, errors) => {
  const err = {
    message,
    errors,
    status: 500,
  }

  logger.warn(message);
  logger.warn(JSON.stringify(errors));

  return err
}
