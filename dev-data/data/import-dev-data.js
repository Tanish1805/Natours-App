// We are just creating a script which is gonnna runa t once in the begining to store the dev-data in our db

const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('./../../models/tourModel.js');
const Review = require('./../../models/reviewModel.js');
const User = require('./../../models/userModel.js');

dotenv.config({ path: `${__dirname}/../../config.env` }); // . here is relative to the folder where node application actually started

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

// READ JSON FILE and convert it into js objects
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);

// IMPORT the documents(in our case js objects here) INTO DB
const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Data successfully loaded!');
  } catch (err) {
    console.log(err);
  }
  // this process.exit() will exit the application, it's an aggressive way and not recommended but here it is a small script, doesn't really matters
  process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Data successfully deleted!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// Let's say we run node dev-data/data/import-dev-data.js --import in the termianl
// the console.log(process.argv) will give us an array of [
//   'C:\\Program Files\\nodejs\\node.exe',
//   'D:\\C++, Softwares etc\\WEB DEVELOPMENT\\Complete Backend\\complete-node-bootcamp-master\\4-natours\\starter\\after-section-08\\dev-data\\data\\import-dev-data.js',
//   '--import'
// ]
// console.log(process.argv);
/// So we will sat that if the process.argv[2] === '--import', that means if the user has specified import while running this file, it will call the funciton importData()

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
