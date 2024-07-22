const express = require('express');
const userController = require('../controllers/userController.js');
const authController = require('../controllers/authController.js');

const router = express.Router();

router.route('/signup').post(authController.signup);
router.route('/login').post(authController.login);
router.route('/logout').get(authController.logout);

router.route('/forgotPassword').post(authController.forgotPassword);
router.route('/resetPassword/:token').patch(authController.resetPassword);

// Protect all routes after this middlware
router.use(authController.protect);

router.route('/updateMyPassword').patch(authController.updatePassword);

router.route('/me').get(userController.getMe, userController.getUser);

// router.route('/updateMe').patch(userController.updateMe);
// Now we will also allow users to upload images
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);

router.route('/deleteMe').delete(userController.deleteMe);

router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
