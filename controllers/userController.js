const User = require('../models/userModel.js');
// Import catchAsync
const catchAsync = require('../utils/catchAsync.js');
const AppError = require('../utils/appError.js');
const factory = require('./handlerFactory.js');

// ...allowedFields will create an array of the fields we pass in as an argument
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

// Basically we will set the params id for user bassed on the logged in user and then we can straight away call getUser which will give the user based on the id in the params
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// This middleare function is for loggedIn users to update their details
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user posts password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'Please use /updateMyPassword for updating the password',
        400
      )
    );
  }

  // 2) Update the user document
  // Here we can use User.findByIdAndUpdate because we are not updating the passwords, so we want our custom validators to run and run save middlewares(Since we are not dealing with passwords) which were encrypting the passwords to run.
  // We cannot update everything in the User from the req.body, let's say the user wants to update the role to admin, we can't let them do that. We will only allow name and email to be updated
  const filteredData = filterObj(req.body, 'name', 'email');
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredData, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'Not defined, Please use /signup instead',
  });
};

// Do not Attempt to update the passwords with updateUser use /updateMyPassword for updating the password.
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
