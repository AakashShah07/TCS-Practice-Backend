require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Get all Blood Relations questions
    const questions = await Question.find({ topic: 'Blood Relations' }).select('_id');
    console.log(`Found ${questions.length} Blood Relations questions`);

    // Remove existing Blood Relations test if any
    await Test.deleteMany({ topic: 'Blood Relations', type: 'topic_practice' });

    // Create the test with 50 questions, 60 minutes
    const test = await Test.create({
      title: 'Blood Relations Challenge',
      type: 'topic_practice',
      section: 'reasoning',
      topic: 'Blood Relations',
      questions: questions.map(q => q._id),
      totalQuestions: 50,
      duration: 60 * 60, // 60 minutes in seconds
      sectionLocked: false,
      isActive: true,
    });

    console.log(`Created test: ${test.title} (${test._id})`);
    console.log(`  Questions pool: ${questions.length}, per test: ${test.totalQuestions}`);
    console.log(`  Duration: ${test.duration / 60} minutes`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

seed();
