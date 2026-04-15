require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');

const seedMore = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const questions = require('./more_questions.json');
    const inserted = await Question.insertMany(questions);
    console.log(`Successfully seeded ${inserted.length} more questions.`);

    // Show breakdown by section
    const sections = {};
    for (const q of inserted) {
      sections[q.section] = (sections[q.section] || 0) + 1;
    }
    console.log('Breakdown:', sections);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
};

seedMore();
