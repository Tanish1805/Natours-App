const path = require('path');
const express = require('express');
const morgan = require('morgan');
// For more secutiry practices
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitizer = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const compression = require('compression');

const AppError = require('./utils/appError.js');
const tourRouter = require('./routes/tourRoutes.js');
const userRouter = require('./routes/userRoutes.js');
const reviewRouter = require('./routes/reviewRoutes.js');
const viewRouter = require('./routes/viewRoutes.js');
const gloabalErrorHandler = require('./controllers/errorController.js');

const app = express();

app.set('view engine', 'pug');

app.set('views', path.join(__dirname, 'views'));

// 1) Global Middlewares:-

// Serving Static files
app.use(express.static(path.join(__dirname, 'public')));

// Set Security HTTP headers
app.use(helmet({ contentSecurityPolicy: false }));

// const scriptSrcUrls = [
//   'https://api.mapbox.com',
//   "'self'",
//   'blob:',
//   'https://unpkg.com/',
//   'https://tile.openstreetmap.org',
// ];
// const connectSrcUrls = [
//   'https://unpkg.com',
//   'https://tile.openstreetmap.org',
//   'ws://localhost:3000/',
//   'ws://localhost:8000/',
//   'ws://localhost:53553/',
//   'http://127.0.0.1:3000',
//   'https://*.tiles.mapbox.com',
//   'https://api.mapbox.com',
//   'https://events.mapbox.com',
// ];
// const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: [],
//       connectSrc: ["'self'", ...connectSrcUrls],
//       scriptSrc: ["'self'", ...scriptSrcUrls],
//       workerSrc: ["'self'", 'blob:'],
//       objectSrc: [],
//       imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
//       fontSrc: ["'self'", ...fontSrcUrls],
//     },
//   })
// );

app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
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

// When we have a data larger than 10kb it will not be accepted in our body
app.use(express.json({ limit: '10kb' }));

// Parses the data from cookies
app.use(cookieParser());

// Data sanitization from req.body to prevent malicious data(against NoSQL query injection)
app.use(mongoSanitizer());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
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

// This is going to compress all the text sent to client
app.use(compression());

// 2.) Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies)
  next();
});

// 3.) Routes:-
app.use('/', viewRouter);

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(gloabalErrorHandler);

module.exports = app;
