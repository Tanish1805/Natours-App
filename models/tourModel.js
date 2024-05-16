const mongoose = require('mongoose');
const slugify = require('slugify');
// const validator = require('validator');

// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal then 40 characters'],
      minlength: [10, 'A tour name must have more or equal then 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      // Setter is called whenver ratingsAverage is changed or created, her the function basically rounds the value to 1 decimals
      set: (val) => Math.round(val * 10) / 10, /// 4.666666, 46.6666. 47. 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this only points to current doc on NEW document creation
          // This custom validator only works on .CREATE OR .SAVE!!!, So when we update a tour we have to also save to use these validators
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    // Lec:- 150:- We will have the sstartLocations data for our tours
    startLocation: {
      // GeoJSON
      // This object is really an embedded object and in here we can define a couple of properties and schemas for the object
      type: {
        type: String,
        default: 'Point',
        enum: {
          values: ['Point'],
          message: 'Location type is only Point',
        },
      },
      coordinates: [Number],
      address: String,
      description: String,
    },

    // In order to really create a new document and embedd them into another document, we actually need to create an array
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: {
            values: ['Point'],
            message: 'Location type is only Point',
          },
        },
        coordinates: [Number],
        address: String,
        description: String,
        // Day of tour at which people will go to this location
        day: Number,
      },
    ],

    // Let's embedd user documents to tour documents(though later we will use child referencing and populate method).  // Now there are drawback of embedding the user data, suppose the user changes it's email, then we will have to update the tour also. So we will follow the practice of child referencing
    // The idea is when creating a new tour document, the user will simply add an array of user IDs; and we can then get user documents based on these Ids and then add them to our tour documents(embedd them). Now once user adds these id's then we will use a pre-save middleware to embedd the user documents in this tour documents before the tour is created. See in document middleware
    // guides: Array,
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],

    // Now in our db we will only see ObjectId in guides and not user data for that we will use a process called populate. Let's now use a process called populate in order to get access to the referenced tour guides whenever we query for a certain tour. We implement this in tourControlller in getTour.
  },
  // So basiaclly we have set a list of options basically means that we want our virtual fields to be shown in the output when client request the data
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Improving read performance with indexes
// Basically mongoDB by default itself has __id as the index. Let's say we also set the index as Price. So when we getAll tours by setting the query as price<1000 it searches this ordered list of prices instead of all documents(Before settting the price as index it searched for 9 documents and returned 3, but it only searches 3 documents as prices are alreadt in the ordered list). This is pretty smart. Important:- We will only create indexes for those fields which are most commonly queried(Like price).
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
// In order to do geoSpatial queries we first need to attribute an index to the field where geospatial data that we're searching for is stored(Basically startLocation). Here we are basically telling mongoDb that startLocation should be indexed to a 2dSphere
tourSchema.index({ startLocation: '2dsphere' });

// Virtual properties are basically fields which we can define in the schema but they will not be saved in the db in order to save us some space there. .get:- This virtual property will be created each time when we get some data from the database(basically call the get http method). This get function here is called a getter
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual Populate:- Tours and Reviews
// Virtual populate, with this we can actually populate tour with it's reviews without keeping an array of ID's of the reviews on the tour. Basically it will create an araay of ID's of the reviews virtually in our tour database.
tourSchema.virtual('reviews', {
  // 1.) Name of the model that we want to reference in our virtual populate
  ref: 'Review',
  // 2.) Now we need to specify the name of the fields of the ids of the tour in both models in order to connect 2 data sets
  //(Name of the field in tourModel) in this case it is __id of the tour
  localField: '_id',
  //(Name of the field in reviewModel), in this case it is tour where id of tour is being stored
  foreignField: 'tour',
});
// Now go ahead and populate this virtual field reviews only when we get a single tour(We don't want to populate it when we are showing all tours)(in tourController under getById)

// See guides: Array in our schema and read the text above it
// tourSchema.pre('save', async function (next) {
//   // async (id) => await User.findById(id) this will only give promises so guidesPromises will be an array of promises
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save', function(next) {
//   console.log('Will save document...');
//   next();
// });

// tourSchema.post('save', function(doc, next) {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE
// /^find/ means that this middleware will run for all querys realted to tour.find
// Here this refers to the query, example:- document.find()
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

// Here we can't use this because the query has already been executed
tourSchema.post(/^find/, function (docs, next) {
  console.log(`Find Query took ${Date.now() - this.start} milliseconds!`);
  next();
});

// Let's also populate the data with guides(user) information.(Which contains a reference to user object in our schema)
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

// AGGREGATION MIDDLEWARE
// // this refers to the aggregation object
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

//   // console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
