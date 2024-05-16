const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
    // validate: [validator.isAlpha, 'Tour name must only contain characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email address!'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email address!'],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Enter a valid password!'],
    minlength: 8,
    select: false, // (We don't want to show password to the client)
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Confirm the Password!'],
    // 2) This custom validator only works on .CREATE OR .SAVE!!!
    // currentUser.findByIdAndUpdate() , in this this validator will not work
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'Confirm Password does not match your password',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false, // (We don't want to show this to the client)
  },
});

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
// In DOCUMENT MIDDLEWARE this referes to the current document

// 1) The encryption will happen between the data recieved and data saved
userSchema.pre('save', async function (next) {
  // If the password has not been modified then we don't need to encrypt anything
  if (!this.isModified('password')) {
    return next();
  }
  // Encrypt the password
  this.password = await bcrypt.hash(this.password, 12);

  // We only need the password confirmation for the validation, we don't need to store it in the db
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', async function (next) {
  // If the password has not been updated or modified or the new document is being created basically when new user logs in(WWe don't need to set the passwordChangedAt for that) then we don't need to do anything
  if (!this.isModified('password') || this.isNew) {
    return next();
  }

  // Sometimes it happpens that this save middleware runs after our const token = signToken(user.id);, then the token time issued will be less than passwordChangedAt and a user won't be able to login, for that we have substracted 1 second
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Let's create a query middleware to only show active users
userSchema.pre(/^find/, function (next) {
  // this points to the current user document
  this.find({ active: { $ne: false } });
  next();
});

// Let's create a function here to check if the given password is same to the password that is stored in the DB
// An instance method is a method that is gonna be available on all documents of a certain collection

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compareSync(candidatePassword, userPassword);
};

// We will create changedPasswordAfter as an instance method in our instanceMiddleware in user model:- See auth Controller
// Into this function we wil pass the JWT TimeStamp, the time when jwt was issued
userSchema.methods.changedPasswordAfter = function (JWTtimestamp) {
  // in an instance method this keyword points to the current document on which the changedPasswordAfter function is called
  // Now we have to create a field in schema for a date when the password has changed
  // if passwordChanged exists only then we need to do the comparison, for that we need to convert passwordChangedAt to a timestamp
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTtimestamp < changedTimestamp;
    // if JWTtimestamp < changedTimestamp is true basically means that the password was changed after the tokken was issued
  }
  return false;
};

// Why are we building resetToken:- Basically this token is what we are gonna send to the user and so it's like a reset password really that a user can then use to create a new real password. Only the user will have access to this token
// So obviously if a hacker get's your resettoken he can change the password, so we should never store it in a plain text, we should encrypt it
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // setting passwordResetExpires to 10 minutes
  // Ofcourse we will return resetToken beacause we need to send via email the unencrypted resettoken to the restPassword route so that we can compare it afterwards.
  // Obviously if the tokken that was in the database was the exact same that we coud use to actually change the password then that would be no encryption at all
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

// All of the stuff related to authentication will be in the authentication controller.
