require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const questions = require('./coding_decoding.json');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const inserted = await Question.insertMany(questions);
    console.log(`Inserted ${inserted.length} Coding Decoding questions`);

    const total = await Question.countDocuments({ topic: 'Coding Decoding' });
    const hardCount = await Question.countDocuments({ topic: 'Coding Decoding', difficulty: 'hard' });
    const mediumCount = await Question.countDocuments({ topic: 'Coding Decoding', difficulty: 'medium' });
    console.log(`Total Coding Decoding questions in DB: ${total}`);
    console.log(`  Hard: ${hardCount}, Medium: ${mediumCount}`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error.message);
    process.exit(1);
  }
};

seed();
