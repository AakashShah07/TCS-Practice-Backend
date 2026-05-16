require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Get all Average questions
    const questions = await Question.find({ topic: 'Average' }).select('_id');
    console.log(`Found ${questions.length} Average questions`);

    // Remove existing Average test if any
    await Test.deleteMany({ topic: 'Average', type: 'topic_practice' });

    // Create the test with 30 questions, 40 minutes
    const test = await Test.create({
      title: 'Average Practice',
      type: 'topic_practice',
      section: 'numerical',
      topic: 'Average',
      questions: questions.map(q => q._id),
      totalQuestions: 30,
      duration: 40 * 60, // 40 minutes in seconds
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
