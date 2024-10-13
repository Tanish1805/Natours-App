const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
// const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// This code will create a checkout session for the current tour
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create checkout session
  //   See pdf for the workflow of payments through stripe
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],

    // Whenever the payment is successfull ont he checkout page, the session ends and the user will automatically go to this page
    // This method now is not secure, because anyone who knows this url could simple access the url, So anyone could simply skip the checkout process and simply open this url and book a tour
    // In production when we will use actual payments, then we can get the session id, and then we will use session id to make this secure
    // Important Basically after the checkout session is successfull on client side, then this route './', will be hit along with some queries, So for calling the createBookingCheckout, see the view Routes, because this route is defined in the view routes, int booking routes all routes start with /api/v1/bookings....
    // This is kind of a temporary solution only
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          },
        },
        quantity: 1,
      },
    ],
  });

  // 3) Send session as response to the client, so that they can access the session id and redirect to the checkout page, see stripe.js in the js folder
  res.status(200).json({
    status: 'success',
    session,
  });
});

// This function will actually create a booking in the database after the user has successfully checked out(Basically the checkout session ends and then the success_url will be called which will then call this function)
// This function is getting called in the ./ route (basically see view routes)(See line 20)
// This is kind of a temporary solutions only
exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying(See line 17)
  const { tour, user, price } = req.query;

  if (!tour && !user && !price) return next();
  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
