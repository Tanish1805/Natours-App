const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

const app = require('./app.js');

const DB = process.env.DATABASE.replace(
  '<password>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((con) => {
    console.log('DB connection established');
  });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

// Here basically on unhandledrejection we gracefull shut down the app
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  // Usually we first shut down the server and then the application. SMOOTH
  server.close(() => {
    process.exit(1);
  });
});

// Similar to what we did above we'll do the same for our deployment
// Render basically sends a sigterm signal which shuts down the app abruptly, we want to shut down gracefully
// Basically it will first handle the pending request and then shut down gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM RECIEVED, Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated...');
    // Here we do not use process.exit, because the sigterm will automatically shut down the process
  });
});
