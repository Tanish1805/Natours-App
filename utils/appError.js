// We actually want all of our AppError objects to then inherit from the built-in error class, so we will use extend
class AppError extends Error {
  constructor(message, statusCode) {
    // When we extend the parent class we call super in order to call the parent constructor
    // Message is the only parameter that the built in error accepts
    super(message);
    // By doing this parent call we are baasically creating a error and we are setting set the message property to our incoming message

    // this here refers to the current object  basically the error object that we created from the parent error class
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    // Since we are using this calss for all the operational errors that are gonna happen in the future, so create a isOperational property and set it to true
    this.isOperational = true;
    // We will also capture the stackTrace basically at what code the error is happening
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
