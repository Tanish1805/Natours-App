// Making a frontend to backend request using axios to book the tours on clicking the book tours
/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
const Stripe = require('stripe');
const stripe = Stripe(
  'pk_test_51Q9RUb2Mf6C4YQmWudRjGWKWfGcbhg7LiuR6AZ0rDIWLyackEmW3er4mjYszhBUHNEMGnD4Cpco7BdQx76VX5HmD00j9fsi4rE'
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    // This code will create a backend request to create a checkout session
    const session = await axios({
      method: 'GET',
      // Frontend and backend are running ont the same origin, so the url is relative starting from /api/
      url: `/api/v1/bookings/checkout-session/${tourId}`,
    });
    console.log(session);

    // 2) Create checkout form + charge credit card
    // Now this code will redirect to the checkout page
    const checkoutPageUrl = session.data.session.url;
    window.location.assign(checkoutPageUrl);
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
