// Importing Tour model
const Tour = require('../models/tourModel.js');
// Importing APIFeatures
const APIFeatures = require('../utils/apiFeatures.js');
// Import catchAsync
const catchAsync = require('../utils/catchAsync.js');
const AppError = require('../utils/appError.js');
// Import handler
const factory = require('./handlerFactory.js');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// exports.getAllTours = catchAsync(async (req, res, next) => {
//   // console.log(req.query);

//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();

//   const tours = await features.query;

//   // Send Response
//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours,
//     },
//   });
// });

// exports.getTour = catchAsync(async (req, res, next) => {
//   // const tour = await Tour.findById(req.params.id).populate({
//   //   path: 'guides',
//   //   select: '-__v -passwordChangedAt',
//   // });
//   /// We have used a process called populate in order to get access to the referenced tour guides(user) whenever we query for a certain tour.
//   // Now refractor this code into query middlware in tourModel so that we don't have to use it again in get all tours, it automatically populates the

//   // Lect 157:- populating the virtual field reviews which we created in our tour model
//   // Now you'll see that it is ideal to populate tour with reviews, and we can skip the part where we populate reviews with tour(Because we don't really need to see the tour details in the reviews as that makes the review data shown very complex). Let's only populate reviews with the user, so go to reviewModel middleware and we can comment out the part where we populate reviews with tour.
//   const tour = await Tour.findById(req.params.id).populate('reviews');
//    Now we don't add this populate also into the query middlware in tourModel because then in getAllTours also the reviews will be populated and we don't want that, we want to populate the reviews in our getTour only

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }
//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
// });

// Refractoring the getAll, get, delete, create and update functionality into handle factory

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.addTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: '$difficulty',
        numTours: { $sum: 1 },
        totalRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        totalToursStart: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { totalToursStart: -1 },
    },
    // {
    //   $limit: 12,
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// Geospetial Queries and Geospetial Aggregation
// This is to provide a search functionality for tours within a certain distance of a specified point. In order to do geoSpatial queries we first need to attribute an index to the field where geospatial data that we're searching for is stored(Basically startLocation)
// Route:- /tours-within/:distance/centre/:latlng/unit/:unit
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // radius is in radians
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        404
      )
    );
  }

  // Implementing geoSpecial Queries
  // Remember we want to query for the start Location because that holds the geospatial point where each tour starts. geoWithin operator finds documents within a certain geometry. We want to find them at a sphere with centre at lat, lng and radius as distance.
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }, //MongoDb accepts this radius in radians
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

// Now let's use gespatial aggregation in order to calculate distances to all the tours from a certain point
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitutr and longitude in the format lat,lng.',
        400
      )
    );
  }

  // For gespatial aggregation there is only one simple stage geoNear(Always needs to be the first stage). If in our document there's only one field with geoSpatial index(startLocation), it will automatically use that index in order to perform the calculation
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        // near is the point from which to calculate the distances. All the distances will be calculated from lng lat to all the startLocations
        near: {
          // Specify in geoJson
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        // Converts the distance to Miles or Kilometer based on the unit specified in the url
        distanceMultiplier: multiplier,
      },
    },
    // This will only give distances and names of the tours
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
