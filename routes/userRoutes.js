const express = require('express');
const userController = require('../controllers/userController.js');
const authController = require('../controllers/authController.js');

const router = express.Router();

// We have created authController seperately for authetification purposes. This Controller doesn't follow rest Format
router.route('/signup').post(authController.signup);
router.route('/login').post(authController.login);

router.route('/forgotPassword').post(authController.forgotPassword);
router.route('/resetPassword/:token').patch(authController.resetPassword);

// This will protect all the routes below and only logged in users will be allowed
router.use(authController.protect);

router.route('/updateMyPassword').patch(authController.updatePassword);

router.route('/me').get(userController.getMe, userController.getUser);
router.route('/updateMe').patch(userController.updateMe);
router.route('/deleteMe').delete(userController.deleteMe);

// This will allow only admins to access below routes
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
