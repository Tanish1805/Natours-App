const express = require('express');
const viewsController = require('../controllers/viewsController');

const router = express.Router();

// Rendering our pug templates. It will automatically look for pug files in view folder because of router.set('views', path.join(__dirname, 'views'));
// To pass on the data in the pug files we have to create an object like here(tour and user) and are called locals in the pug file

router.get('/', viewsController.getOverview);

router.get('/tour/:slug', viewsController.getTour);

module.exports = router;
