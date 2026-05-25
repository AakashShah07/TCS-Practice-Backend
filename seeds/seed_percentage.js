require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const questions = require('./percentage.json');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const deleted = await Question.deleteMany({ topic: 'Percentage' });
    console.log(`Deleted ${deleted.deletedCount} existing Percentage questions`);

    const inserted = await Question.insertMany(questions);
    console.log(`Inserted ${inserted.length} Percentage questions`);

    const total = await Question.countDocuments({ topic: 'Percentage' });
    const hardCount = await Question.countDocuments({ topic: 'Percentage', difficulty: 'hard' });
    console.log(`Total Percentage questions in DB: ${total}`);
    console.log(`  Hard: ${hardCount}`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error.message);
    process.exit(1);
  }
};

seed();
