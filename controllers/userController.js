const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel.js');
const catchAsync = require('../utils/catchAsync.js');
const AppError = require('../utils/appError.js');
const factory = require('./handlerFactory.js');

// Imp:- Images are not directly uploaded into the databse we first upload them in our disk storage or memory then store the links in the db

// Using multer we are storing the user image files
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
// // Getting the extension from file
//     const ext = file.mimetype.split('/')[1];
//
// // We are giving the file name to the user image somthing like this user-767676abc76dba(user_id)-33232376(timestamp).jpeg
//    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

// Instead saving the file to the disk we will just save it to memory
// This way the image will be stored as buffer which will then be availaible as req.file.buffer
const multerStorage = multer.memoryStorage();

// This function filters that the file being uploaded is only image
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// This upload from multer middleware sets the photo in the req, which we will access in the resizeUserPhoto middlware
exports.uploadUserPhoto = upload.single('photo');

// This resizeUserPhoto takes care of iamge processing, it helps in resizing image using sharp package
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  // If no file was uploaded move to next
  if (!req.file) return next();

  // Let's give our file a name
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    // We now finally write the file to our disk storage.
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

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

  console.log(req.file);
  // 2) Update the user document
  const filteredData = filterObj(req.body, 'name', 'email');
  // Till now we only allowed the name and email to be uploaded, now we will also allow the images to be uploaded
  // We only store the filename to our db
  if (req.file) filteredData.photo = req.file.filename;

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
