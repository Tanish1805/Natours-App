// const nodemailer = require('nodemailer');

// const sendEmail = async (options) => {
//   // 1) We need to create a transporter
//   // We will use a service like gmail to send emails
//   // const transporter = nodemailer.createTransport({
//   //     service: 'Gmail',
//   //     auth: {
//   //         user: process.env.EMAIL_USERNAME,
//   //         pass: process.env.EMAIL_PASSWORD
//   //     }
//   // })
//   // Activate in gmail "less secure app" option
//   // Gmail is not at all a good service for a production app to send gmails.
//   // Right now we will use a development service which fakes to send emails to real addresses. But in reality these emails end up trapped in a development inbox, so that we can take a look at how they will look in production
//   // Service is called mailtrap.io
//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     PORT: process.env.EMAIL_PORT,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });

//   // 2) We need to define the email options
//   const mailOptions = {
//     from: 'Tanish Chugh <hello@tanish.io>',
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//     // html: options.html,
//   };

//   // 3) Actually send the email
//   await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;

// The above code was a simple example of how to send email using nodemailer
// Below we are making a a class,which we will basically call in our frontend whenever we want to send an email
const nodemailer = require('nodemailer');
const pug = require('pug');
const { convert } = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `<${process.env.EMAIL_FROM}>`;
  }

  // This method is to create a new transporter
  newTransport() {
    // If we are in production we will send real emails using Brevo
    // Using SMTP relay and Brevo service
    // For Now BREVO-SERVICE IS NOT Working, we'll figure this out later
    // For now for production, we Will use the mailtrappper only
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        host: process.env.BREVO_HOST,
        port: process.env.BREVO_PORT,
        auth: {
          user: process.env.BREVO_LOGIN,
          pass: process.env.BREVO_PASSWORD,
        },
      });
    }

    // If we are in development then simple we will send fake emails using mail trapper, instead of going into a real mail address the mails will be caught in a mailtrap inbox
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Send the actual email
  // This send method will send a template and a subject to the user
  // This subject will be the name of the email, that user sees on his mail box.
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      // Basically we are passing this data in our pug templates
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) Define email options
    const mailOptions = {
      from: `tanishchugh05@gmail.com`,
      to: this.to,
      subject,
      // We are basically sending the rendered html in the email
      html,
      // It's a good practice to send all the text from the html
      text: convert(html, {
        wordwrap: 130,
      }),
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  // These below two methods are simple calling the bove send method by passing in the pug templates and subjects
  async sendWelcome() {
    // This welcome is a pug template that we are gonna send via mail
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  // Here we are sending a passwordReset pug template to the user via mail
  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};
