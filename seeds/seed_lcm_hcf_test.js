require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Upgrade existing easy/medium questions to hard
    const upgraded = await Question.updateMany(
      { topic: 'LCM & HCF', difficulty: { $in: ['easy', 'medium'] } },
      { $set: { difficulty: 'hard' } }
    );
    console.log(`Upgraded ${upgraded.modifiedCount} easy/medium questions to hard`);

    // Get only hard LCM & HCF questions
    const questions = await Question.find({ topic: 'LCM & HCF', difficulty: 'hard' }).select('_id');
    console.log(`Found ${questions.length} hard LCM & HCF questions`);

    // Remove existing LCM & HCF test if any
    await Test.deleteMany({ topic: 'LCM & HCF', type: 'topic_practice' });

    // Create the test with 35 questions, 45 minutes (hard only)
    const test = await Test.create({
      title: 'LCM & HCF Practice',
      type: 'topic_practice',
      section: 'numerical',
      topic: 'LCM & HCF',
      questions: questions.map(q => q._id),
      totalQuestions: 35,
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
