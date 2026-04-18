require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Get all Simplification questions
    const questions = await Question.find({ topic: 'Simplification' }).select('_id');
    console.log(`Found ${questions.length} Simplification questions`);

    // Remove existing Simplification test if any
    await Test.deleteMany({ topic: 'Simplification', type: 'topic_practice' });

    // Create the test with 30 questions, 45 minutes
    const test = await Test.create({
      title: 'Simplification Practice',
      type: 'topic_practice',
      section: 'numerical',
      topic: 'Simplification',
      questions: questions.map(q => q._id),
      totalQuestions: 30,
      duration: 45 * 60, // 45 minutes in seconds
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
