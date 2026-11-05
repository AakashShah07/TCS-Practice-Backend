const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');
const fs = require('fs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tcs-nqt';

const seedPremiumData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Seed Questions
    const questionsData = JSON.parse(fs.readFileSync('./seeds/premium_questions.json', 'utf-8'));
    const createdQuestions = await Question.insertMany(questionsData);
    console.log(`Successfully seeded ${createdQuestions.length} premium questions`);

    // Seed Tests
    const testsData = JSON.parse(fs.readFileSync('./seeds/premium_tests.json', 'utf-8'));
    testsData[0].questions = createdQuestions.map(q => q._id);
    
    await Test.insertMany(testsData);
    console.log('Successfully seeded premium tests');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedPremiumData();
