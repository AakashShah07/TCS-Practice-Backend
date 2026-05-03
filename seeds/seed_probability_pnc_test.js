require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Get all Probability, Permutation & Combination questions
    const questions = await Question.find({ topic: 'Probability, Permutation & Combination' }).select('_id');
    console.log(`Found ${questions.length} Probability, Permutation & Combination questions`);

    // Remove existing test if any
    await Test.deleteMany({ topic: 'Probability, Permutation & Combination', type: 'topic_practice' });

    // Create the test with 40 questions, 50 minutes
    const test = await Test.create({
      title: 'Probability, Permutation & Combination Practice',
      type: 'topic_practice',
      section: 'numerical',
      topic: 'Probability, Permutation & Combination',
      questions: questions.map(q => q._id),
      totalQuestions: 40,
      duration: 50 * 60, // 50 minutes in seconds
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
