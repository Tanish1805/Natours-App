// Building a factory function(handler) that returns another function for creating, updating and deleting
const catchAsync = require('../utils/catchAsync.js');
const AppError = require('../utils/appError.js');
const APIFeatures = require('../utils/apiFeatures.js');

exports.deleteOne = function (Model) {
  return catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndDelete(req.params.id);

    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
};

exports.updateOne = function (Model) {
  return catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(201).json({
      status: 'success',
      data: {
        data: document,
      },
    });
  });
};

exports.createOne = function (Model) {
  return catchAsync(async (req, res, next) => {
    const document = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: document,
      },
    });
  });
};

// Passing a model and populate options as params
exports.getOne = function (Model, popOptions) {
  return catchAsync(async (req, res, next) => {
    // populating the fields according to the popOptions
    let query = Model.findById(req.params.id);
    if (popOptions) {
      query = query.populate(popOptions);
    }
    const document = await query;

    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: document,
      },
    });
  });
};

exports.getAll = function (Model) {
  return catchAsync(async (req, res, next) => {
    // This is for getAllReviews
    // To get reviews based on tourId, on GET /tours/:tourId/reviews
    let filter = {};
    if (req.params.tourId) {
      filter = { tour: req.params.tourId };
    }

    //  This is for getAllTours
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const document = await features.query;

    // Send Response
    res.status(200).json({
      status: 'success',
      results: document.length,
      data: {
        data: document,
      },
    });
  });
};
