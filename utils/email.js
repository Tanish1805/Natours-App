const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1) We need to create a transporter
  // We will use a service like gmail to send emails
  // const transporter = nodemailer.createTransport({
  //     service: 'Gmail',
  //     auth: {
  //         user: process.env.EMAIL_USERNAME,
  //         pass: process.env.EMAIL_PASSWORD
  //     }
  // })
  // Activate in gmail "less secure app" option
  // Gmail is not at all a good service for a production app to send gmails.
  // Right now we will use a development service which fakes to send emails to real addresses. But in reality these emails end up trapped in a development inbox, so that we can take a look at how they will look in production
  // Service is called mailtrap.io
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    PORT: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2) We need to define the email options
  const mailOptions = {
    from: 'Tanish Chugh <hello@tanish.io>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: options.html,
  };

  // 3) Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
