const mongoose = require('mongoose');
const Question = require('../models/Question');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tcs-nqt';

const analyzeQuestions = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const sections = ['numerical', 'reasoning', 'verbal', 'advanced', 'technical'];
    for (const section of sections) {
      const count = await Question.countDocuments({ section: section });
      console.log(`Section ${section}: ${count} questions`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

analyzeQuestions();
