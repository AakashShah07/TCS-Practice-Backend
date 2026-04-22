require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const questions = require('./time_and_work.json');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const inserted = await Question.insertMany(questions);
    console.log(`Inserted ${inserted.length} Time & Work questions`);

    const total = await Question.countDocuments({ topic: 'Time & Work' });
    console.log(`Total Time & Work questions in DB: ${total}`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error.message);
    process.exit(1);
  }
};

seed();
