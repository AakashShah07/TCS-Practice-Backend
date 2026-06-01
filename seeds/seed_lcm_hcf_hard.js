require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const questions = require('./lcm_hcf_hard.json');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const inserted = await Question.insertMany(questions);
    console.log(`Inserted ${inserted.length} hard LCM & HCF questions`);

    const total = await Question.countDocuments({ topic: 'LCM & HCF' });
    console.log(`Total LCM & HCF questions in DB: ${total}`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error.message);
    process.exit(1);
  }
};

seed();
