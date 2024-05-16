const AppError = require('../utils/appError.js');

const handleCastErrorDB = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (error) => {
  const errors = Object.values(error.errors).map((val) => val.message);
  const message = `Invalid fields: ${errors.join(', ')}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (error) => {
  const message = `Duplicate field value: ${error.value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleJsonWebTokenErrorDB = (err, res) => {
  const message = `Invalid token: ${err.message}`;
  return new AppError(message, 401);
};

const handleTokenExpiredErrorDB = (err, res) => {
  const message = `Token has expired. Please login again!`;
  return new AppError(message, 401);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational error that we created
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  // Programming error
  else {
    // 1) log error so that us developers can know
    console.error('ERROR 💥', err);
    // 2) send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500; // 500 means internal server error
  err.status = err.status || 'error'; // for 500 it's error, for 400 it's fail
  if (process.env.NODE_ENV.trim() === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV.trim() === 'production') {
    //  In JavaScript, error objects have certain non-enumerable properties, which means they do not get copied over when using the spread operator. name and message are examples of such properties on error objects.
    let error = { ...err };

    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    // Hnadling programming error when the token has been manipulated
    if (err.name === 'JsonWebTokenError')
      error = handleJsonWebTokenErrorDB(error);
    // Hnadling programming error when the token has expired
    if (err.name === 'TokenExpiredError')
      error = handleTokenExpiredErrorDB(error);

    sendErrorProd(error, res);
  }
};
