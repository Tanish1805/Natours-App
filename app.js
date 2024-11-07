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
const bookingRouter = require('./routes/bookingRoutes.js');
const viewRouter = require('./routes/viewRoutes.js');
const gloabalErrorHandler = require('./controllers/errorController.js');

const app = express();

app.set('view engine', 'pug');

app.set('views', path.join(__dirname, 'views'));

app.set('trust proxy', 1); // trust the first proxy

// 1) Global Middlewares:-
// Implement CORS
// What is CORS, And why we need to implement it?
// Now let's say some other website is trying to access our api, it won't be able to because by default cross origin requests are not allowed
// So using cors, we can allow other origins to access our apps api
// CORS Is basically just a npm package, you can see it's code yourself
// It basically sets Access-Control-Allow-Origin *(To every request)
app.use(cors());
// If we just want to apply cors to a specific api, we could have simple done this app.use('/api/v1/tours', cors(), tourRouter);

// Important:- Now this simple cors() works only for simple request like get, post
// For non simple requests like put, patch, delete, browser first gives a options request to confirm that the request like delete is safe to send or not
// So we need to send Access-Control-Allow-Origin * in the header with the response to options request to let browser knwo cross origin is allowed for delete
// Options is just like other http methods
app.options('*', cors());

// Serving Static files
app.use(express.static(path.join(__dirname, 'public')));

// Set Security HTTP headers
app.use(helmet({ contentSecurityPolicy: false }));

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
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(gloabalErrorHandler);

module.exports = app;
