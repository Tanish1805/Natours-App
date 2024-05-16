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
  // So basically we have set a list of options basically means that we want our virtual fields to be shown in the output when client request the data
  // Virtual properties are basically a field that is not stored in the db actually but calculated using some other value
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Setting the tour and user as compound index so that they both are unique together, basically means a user can write only 1 review for a tour and a tour can have only 1 review from a user. Basically the combination of tour and user is unique
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// (Nested routes) /tour/ID_of_that_Tour/reviews this is a nested route. See it's implementation in tour Route

// Populating the tour reference and user reference in the reviews Model
reviewSchema.pre(/^find/, function (next) {
  //   this.populate({
  //     path: 'tour',
  //     select: 'name',
  //   }).populate({
  //     path: 'user',
  //     // We will display name and photo of the user assosciated with the review
  //     select: 'name photo',
  //   });

  // Go to getTour in tour controller to understand why we did this
  // Now you'll see that it is ideal to populate tour with reviews, and we can skip the part where we populate reviews with tour. Let's only populate reviews with the user, so go to reviewModel middleware and we can comment out the part where we populate reviews with tour
  this.populate({
    path: 'user',
    // We will display name and photo of the user assosciated with the review
    select: 'name photo',
  });
  next();
});

// Virtual Populate:- Tours and Reviews
// In above we implemented that we will see the user and tour assosciated with the review, But how are we then gonna implement this other way aorund. Let's say I got a tour but I also want to show the reviews assosciated with that tour to my client, How are we gonna implement that?
// This problem arises beacuse we did parent referencing on the reviews, But we also want the tour(Parent) to also know about it's reviews(Child).
// Solution:- 1) Manually query for reviews each time we quesry for tours, 2):- Also do child referencing on the tours(But we already ruled out doing this in the begining)
// Go to tourModel.js in virtual moddleware, there I have implemented virtualPopulate

// Calculating average rating for tours when a review is created, updated or deleted
// Step 1:) We are gonna create a function which will take in the tourId and calculate the average rating and the number of ratings that exists in our collection for that exact tour
// Step 2:) Then in the end the function will even update the corresponding tour Document.
// Step 3:) Then in order to use this function we will use a middleware to call this function whenever a new review is created, updated or deleted

// Step 1:-
reviewSchema.statics.calAverageRatings = async function (tourId) {
  // this here points to the model, that is why we are uding statics method on our reviewSchema instead of instance method
  const stats = await this.aggregate([
    // Selecting all the reviews with the tour that matches tourId
    {
      $match: { tour: tourId },
    },
    // We will group all the revies together by tour(Basically reviews will be grouped according to different tours) and then we will calculate the average ratings of the tours
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

  // Step 2:-
  // First we require the tourModel
  // console.log(stats);
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

// Step 3):-
// post middleware doesn't gets access to next
reviewSchema.post('save', function () {
  // this points to the current review document
  // We want to call the above function like Review.calAvergaeRatings(this.tour) Basically we called this function on the Review model and passed in the tourId, But Review is declared later, so we can't use it here
  // So solution is that this.constructor will point to the model who created that document
  this.constructor.calAverageRatings(this.tour);
});

// Important:- In a document middleware this refers to the current document and in a query middleware this referes to the current query
// Now we know that a review is updated or deleted using findByIdAndUpdate and findByIdAndDelete, so the above document middleware is not gonna work. For these we will have query middleware but in that we don't actually have access to the document(this), so we can't use this.constructor.calAvergaeRatings(this.tour);
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // The goal is to get access to the current review document, this points to the current query
  this.r = await this.findOne();
  // But this is a pre middleware so if we were to use calAvergaeRatings at this point of time it will calculate using the non Updated data
  // Here we can't change pre to post directly because we then can't execute the query using await this.findOne() because it has already been executed before the post middleware is called
  // So we will use a trick to pass the review document from pre Middleware to post middleware by saving the document to this.r
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  this.r.constructor.calAverageRatings(this.r.tour);
});

// Lecture 171-172:- Geospetial Queries and Geospetial Aggregation(See tour Route)

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
