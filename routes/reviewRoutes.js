const express = require('express');

const reviewController = require('../controllers/reviewController.js');
const authController = require('../controllers/authController.js');

// By default each router has access to params of their specific routes only. So we need to enable mergeParams to access tourId from router.use('/:tourId/reviews', reviewRouter)(in tourRoutes)
const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  // We will only let a user create reviews
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  // A user and admin both are allowed to update or delete a review
  .delete(
    authController.restrictTo('admin', 'user'),
    reviewController.deleteReview
  )
  .patch(
    authController.restrictTo('admin', 'user'),
    reviewController.updateReview
  );

module.exports = router;
