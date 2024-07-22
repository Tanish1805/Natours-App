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
  photo: {
    type: String,
    default: 'default.jpg',
  },
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
    // This custom validator only works on .CREATE OR .SAVE!!!
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

// DOCUMENT MIDDLEWARE
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  // Encrypt the password
  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) {
    return next();
  }

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// A query middleware to only show active users
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTtimestamp) {
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

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // setting passwordResetExpires to 10 minutes
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
