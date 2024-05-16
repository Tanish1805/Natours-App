// Importing Tour model
const Review = require('../models/reviewModel.js');
// Import catchAsync
const catchAsync = require('../utils/catchAsync.js');
const AppError = require('../utils/appError.js');
const factory = require('./handlerFactory.js');

// Lecture:155 Creating reviewController to getAllReviews and createReview

// To get all reviews or to get a review based on tour Id using nested loop
// exports.getAllReviews = catchAsync(async function (req, res, next) {
//   // Let's also modify getAllReviews to also get reviews based on tourId, on GET /tours/:tourId/reviews
//   let filter = {};
//   if (req.params.tourId) {
//     filter = { tour: req.params.tourId };
//   }
//   const reviews = await Review.find(filter);
//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: { reviews },
//   });
// });

// To create a new review based on tour Id using nested loop
// exports.createReview = catchAsync(async function (req, res, next) {
//   // Geting tour ID from req.params
//   // // Lec:- 158:-(Nested routes) /tour/:tourId/reviews this is a nested route. See it's implementation in tour Route
//   if (!req.body.tour) {
//     req.body.tour = req.params.tourId;
//   }
//   // Geting user ID from the logged in user present in req.user
//   if (!req.body.user) {
//     req.body.user = req.user.id;
//   }
//   const newReview = await Review.create(req.body);
//   res.status(201).json({
//     status: 'success',
//     data: { review: newReview },
//   });
// });

// Let's set this Tour ID and User ID in req.body through another middleware and then add this middleware in the review Routes

exports.setTourUserIds = (req, res, next) => {
  // Geting tour ID from req.params
  // /tour/:tourId/reviews this is a nested route. See it's implementation in tour Route
  if (!req.body.tour) {
    req.body.tour = req.params.tourId;
  }
  // Geting user ID from the logged in user present in req.user
  if (!req.body.user) {
    req.body.user = req.user.id;
  }
  next();
};

// Using a factory functions(handler) that returns another function for creating, updating and deleting and get
// To get all reviews or to get a review based on tour Id using nested loop
exports.getAllReviews = factory.getAll(Review);
// To create a new review based on tour Id using nested loop and logged in User
exports.createReview = factory.createOne(Review);
// Getting a review based on the id
exports.getReview = factory.getOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
