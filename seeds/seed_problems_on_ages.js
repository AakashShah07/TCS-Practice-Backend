require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const questions = require('./problems_on_ages.json');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const inserted = await Question.insertMany(questions);
    console.log(`Inserted ${inserted.length} Problems on Ages questions`);

    // Show summary
    const total = await Question.countDocuments({ topic: 'Problems on Ages' });
    const hardCount = await Question.countDocuments({ topic: 'Problems on Ages', difficulty: 'hard' });
    const mediumCount = await Question.countDocuments({ topic: 'Problems on Ages', difficulty: 'medium' });
    console.log(`Total Problems on Ages questions in DB: ${total}`);
    console.log(`  Hard: ${hardCount}, Medium: ${mediumCount}`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error.message);
    process.exit(1);
  }
};

seed();
