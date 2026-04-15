require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const customQuestions = require('./custom_hard_questions.json');

const seedCustomDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // We don't clear existing questions here to avoid deleting what you already have
    // If you want to clear them first, uncomment the line below:
    // await Question.deleteMany();

    await Question.insertMany(customQuestions);
    console.log(`Successfully seeded ${customQuestions.length} custom hard questions.`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
};

seedCustomDB();
