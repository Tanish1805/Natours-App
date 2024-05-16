const path = require('path');
const express = require('express');
const morgan = require('morgan');
// For more secutiry practices
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitizer = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError.js');
const tourRouter = require('./routes/tourRoutes.js');
const userRouter = require('./routes/userRoutes.js');
const reviewRouter = require('./routes/reviewRoutes.js');
const viewRouter = require('./routes/viewRoutes.js');
const gloabalErrorHandler = require('./controllers/errorController.js');

const app = express();

// Telling express what template engine we are gonna use
// We don't need to install pug and require it, all of it happens behind the scenes automatically
app.set('view engine', 'pug');

// After creating a folder views in our folder(We have three components MVC architecture where M is model, C is Controller. Read more about it in theory lectures)
// Pug templates are also called views. Defining where are views are
app.set('views', path.join(__dirname, 'views'));

// 1) Global Middlewares:-

// Serving Static files
// link(rel="stylesheet" href="css/style.css") When a get request is made for static files, it automatically looks in the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Set Security HTTP headers
app.use(helmet());

// Basically, the idea is that there is some policy set in the response header due to app.use(helmet()) that can restrict the sources we can get resources from, which is the CSP (Content-Security-Policy).
// So below middleware is to allow us the use of mapbox resources
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      workerSrc: ["'self'", 'blob:'],
      childSrc: ["'self'", 'blob:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: [
        'https://*.tiles.mapbox.com',
        'https://api.mapbox.com',
        'https://events.mapbox.com',
      ],
      scriptSrc: ['https://api.mapbox.com', "'self'", 'blob:'],
    },
  })
);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// This will allow only 100 request in an hour from an IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Body Parser, reading data from the body into req.body
// When we have a data larger than 10kb it will not be accepted in our body
app.use(express.json({ limit: '10kb' }));

// Data sanitization from req.body to prevent malicious data(against NoSQL query injection)
// Like if in login you will put { "email": { "$gt": "" }, "password": "pass1234" }, this in body it will log you in(damnnn), because "email": { "$gt": "" } this is always true
app.use(mongoSanitizer());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
// Whitelist is an array of preoperties for which we allow dupliactes in the query string
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// 2.) Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3.) Routes:-
// Rendering our pug templates. It will automatically look for pug files in view folder because of app.set('views', path.join(__dirname, 'views'));
// To pass on the data in the pug files we have to create an object like here(tour and user) and are called locals in the pug file
// app.get('/', (req, res) => {
//   res.status(200).render('base', {
//     tour: 'The Forest Hiker',
//     user: 'Jonas',
//   });
// });

// app.get('/overview', (req, res) => {
//   res.status(200).render('overview', {
//     title: 'All Tours',
//   });
// });

// app.get('/tour', (req, res) => {
//   res.status(200).render('tour', {
//     title: 'The Forest Hiker Tour',
//   });
// });

app.use('/', viewRouter);

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(gloabalErrorHandler);

module.exports = app;
