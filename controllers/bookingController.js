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

    // Whenever the payment is successfull on the checkout page, the session ends and the user will automatically go to ./ page to create the booking see view routes
    // This method now is not secure, because anyone who knows this url could simple access the url, So anyone could simply skip the checkout process and simply open this url and book a tour
    // Important: In production when we will use actual payments, then we can get the session id, and then we will use session id to make this secure(See webhook-checkout at last)
    // Important Basically after the checkout session is successfull on client side, the sucess url redirect to this route './', which will be hit along with some queries(This route is in view routes), So for calling the createBookingCheckout, see the view Routes, because this route is defined in the view routes
    // This is kind of a temporary solution only, because anyone with this success url can skip the checkout process
    // success_url: `${req.protocol}://${req.get('host')}/?tour=${
    //   req.params.tourId
    // }&user=${req.user.id}&price=${tour.price}`,
    success_url: `${req.protocol}://${req.get('host')}/my-tours?alert=booking`,
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
            images: [
              `${req.protocol}://${req.get('host')}/img/tours/${
                tour.imageCover
              }`,
            ],
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
// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   // This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying(See line 17)
//   const { tour, user, price } = req.query;

//   if (!tour && !user && !price) return next();
//   await Booking.create({ tour, user, price });

//   res.redirect(req.originalUrl.split('?')[0]);
// });

// This session here is the same data that we created in the get checkout session and then hit the success url
// We will basically read our data from this to create a booking
const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.display_items[0].amount / 100;
  await Booking.create({ tour, user, price });
};

// Here we are implementing a real payment method using stripe for deployed website
exports.webhookCheckout = (req, res, next) => {
  // Reading the stripe signature out of all headers
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      // We need the req.body in raw format here, that's why we defined the web-checkout route in app.js at line 69
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed')
    createBookingCheckout(event.data.object);

  res.status(200).json({ received: true });
};

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
