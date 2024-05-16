const crypto = require('crypto');
const { promisify } = require('util');
const User = require('../models/userModel.js');
// Import catchAsync
const catchAsync = require('../utils/catchAsync.js');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError.js');
const sendEmail = require('../utils/email.js');

const signToken = function (id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = function (user, statusCode, res) {
  const token = signToken(user.id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),

    // httpOnly this will make sure cookie can't be accessed by the browser
    // Cookies will recieve the token, store it and then send it automatically along with every request
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;
  // We do this so that we don't see the password in the response we are sending in
  // Although we have set show to false for when we are quesying a document, but the user when we signup comes from creating a new document, then the password is shown, so thaty is why we are setting it to undefined

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exists
  if (!email || !password) {
    return next(
      new AppError('Please enter your email address and password!', 400)
    );
  }
  // 2) Check if the user exists and password is correct
  const user = await User.findOne({ email }).select('+password');

  // This correctPassword is an instance method so it is availabe on all the user documents, you don't have to import them.
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect Email or Password!', 401));
  }

  // 3) If everything ok, send a jwt to the client
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get the token from the header and check if it's there
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If there is no token sent by the client in the headers, that means he is not logged in
  if (!token) {
    return next(new AppError('You are not logged in!', 401));
  }

  // 2) Check if the token is valid(Basically a token whre no one tried to change the payload(in our case the userId))
  // It will check if the secret matches our JWT_SECRET

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if the user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token does not exist!', 401)
    );
  }

  // 4) Check if the user changed password after the JWT was issued
  // We will create this changedPasswordAfter as an instance method in our instanceMiddleware in user model
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('Your password has changed! Please login again.', 401)
    );
  }
  // 5) If everything ok, set user to req.user and call the next() middleware
  // Remember this req passes from one middleware to next one, so If we add user here in the request, we will be able to access it in the next middlewares, which will be helpful to us in the future to get the id of the logged in user, like we have done in the next middleware
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You are not authorized to perform this action!', 403)
      ); // 403 means forbidden
    }
    next();
  };
};

// 2) The user then sends that token from his email along with a new password to restPassword route in order to update his password.
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1.) Get users based on Posted Email.
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No user with that email was found!', 404));
  }

  // 2.) Generate the random reset token.
  // By using this createPasswordResetToken we just modified the user data, after that we need to save it as well to the db
  const resetToken = user.createPasswordResetToken();

  // validateBeforeSave: false will deactivate all the validators in our schema, Otherwise it will give an error, that confirmPassword is required
  await user.save({ validateBeforeSave: false });

  // 3.) Now we will send this reset token to the user's email
  // We will use nodemailer to send the email, let's create an email Handler function in utils
  // Let's define a reset url(resetPassword url) where the user will be able to click on and then be able to do the request from there
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}`;
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your Password reset token is valid for 10 minutes',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'We have e-mailed your password reset link!',
    });
    // The error due to send Email can't be sent to the global error handler beacuase here we need to reset the passwordResetTokken and passwordResetExpires
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('Something went wrong! Please try again.', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1.) Get user based on the token
  // Now we have our reset token in req.params from the forgotPassword function
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  });

  // 2.) If the token has not expired and there is user, set the new password
  if (!user) {
    return next(
      new AppError('Password reset token is invalid or has expired!', 400)
    );
  }

  // We will send the new password and password confirm via the body itself
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // 3.) Update the changedPasswordAt property for the user
  // That we have done in the pre save middleware in the usermodel

  // Here we will not turn off the validators because we want to validate that the password = password confirm
  // We will always use user.save to save the document in our authentication because we want our validators to run and most importantly save middlewares to run where we encrypt our passwords
  await user.save();

  // 4.) Log the user in, Basically we habve to send JWT TOKEN to the client
  createSendToken(user, 200);
});

// Let's allow user to update password without having to reset it
exports.updatePassword = catchAsync(async function (req, res, next) {
  // 1.) For a security measure we need the user to pass in his current password to verify the logged in user
  const currentPassword = req.body.passwordCurrent;
  // Basically when we logged in the user document was sent into the req.body by the protect middleware function
  const currentUser = await User.findById(req.user.id).select('+password');

  // 2.) Check if the current password is correct
  const isMatch = await currentUser.correctPassword(
    currentPassword,
    currentUser.password
  );
  if (!isMatch) {
    return next(new AppError('Your current password is incorrect!', 401));
  }

  // 3.) Update the password if it is correct
  currentUser.password = req.body.password;
  currentUser.passwordConfirm = req.body.passwordConfirm;
  await currentUser.save();
  // We didn't use currentUser.findByIdAndUpdate because our custom validators defined in our model only run on user.save() and user.create() and also pre save middlewares are not going to work
  // Now this save will automaticaly run the validators, encrypt the password and change the changePasswordAt to date.now() because of the save middleware

  // 4.) Again log the user in by send JWT token to client
  createSendToken(currentUser, 200, res);

  next();
});
