const express = require('express');
const tourController = require('../controllers/tourController.js');
const authController = require('../controllers/authController.js');
const reviewController = require('../controllers/reviewController.js');
const reviewRouter = require('../routes/reviewRoutes.js');

const router = express.Router();

// Untill now we manually passed in the tour ID and user ID when we created a new review. But this is not how it's gonna work in development.
// user ID should ideally come from cuurrently logged in user(Basically in req.user.id) and tour ID from current tour. So tour ID should be present in the url where request is made(ex:- POST /tour/ID_of_that_Tour/reviews)
// /tour/ID_of_that_Tour/reviews this is a nested route.

// (Nested routes with Express)
// We have specified that for /:tourId/reviews just use reviewRouter
router.use('/:tourId/reviews', reviewRouter);
// Right now this reviewRouter doesn't have access to this :tourId param. So now we need to enable that. See usage of merge params in reviewRoute

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

// Geospetial Queries and Geospetial Aggregation
// This is to provide a search functionality for tours within a certain distance of a specified point.
router
  .route('/tours-within/:distance/centre/:latlng/unit/:unit')
  .get(tourController.getToursWithin);

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

// Protecting tourRoutes Basically only allowing logged in users to addTour or other requests. Basically before running tourController.addTour we will authenticate the user

router
  .route('/')
  // We want to allow all users to get All Tours
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.addTour
  );

// We have created one more middleware function restrictTo in our authController for authorizing based on userroles
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
