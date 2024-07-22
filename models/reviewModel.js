// Modelling reviews Model
const mongoose = require('mongoose');
const Tour = require('./tourModel.js');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  // Virtual properties are basically a field that is not stored in the db actually but calculated using some other value
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Setting the tour and user as compound index so that they both are unique together.
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Populating the tour reference and user reference in the reviews Model
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    // We will display name and photo of the user assosciated with the review
    select: 'name photo',
  });
  next();
});

// Calculating average rating for tours when a review is created, updated or deleted
reviewSchema.statics.calAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        // add one to the each document
        nRating: { $sum: 1 },
        // Calculate the average of the ratings
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  this.constructor.calAverageRatings(this.tour);
});

// Important:- In a document middleware this refers to the current document and in a query middleware this referes to the current query
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // The goal is to get access to the current review document, this points to the current query
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  this.r.constructor.calAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
