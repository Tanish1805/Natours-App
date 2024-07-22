const Review = require('../models/reviewModel.js');
const catchAsync = require('../utils/catchAsync.js');
const AppError = require('../utils/appError.js');
const factory = require('./handlerFactory.js');

exports.setTourUserIds = (req, res, next) => {
  // Geting tour ID from req.params
  if (!req.body.tour) {
    req.body.tour = req.params.tourId;
  }
  // Geting user ID from the logged in user present in req.user
  if (!req.body.user) {
    req.body.user = req.user.id;
  }
  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.createReview = factory.createOne(Review);

exports.getReview = factory.getOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
