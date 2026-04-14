require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');

// Data
const numericalData = require('./numerical.json');
const reasoningData = require('./reasoning.json');
const verbalData = require('./verbal.json');
const advancedData = require('./advanced.json');

const seedDB = async () => {
  try {
    // Connect to DB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Clear existing questions
    await Question.deleteMany();
    console.log('Cleared existing questions...');

    // Combine all data
    const allQuestions = [
      ...numericalData,
      ...reasoningData,
      ...verbalData,
      ...advancedData,
    ];

    // Insert data
    await Question.insertMany(allQuestions);
    console.log(`Successfully seeded ${allQuestions.length} questions.`);

    // Close connection
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();
