require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Get hard and medium Problems on Ages questions
    const questions = await Question.find({
      topic: 'Problems on Ages',
      difficulty: { $in: ['hard', 'medium'] }
    }).select('_id difficulty');
    console.log(`Found ${questions.length} hard/medium Problems on Ages questions`);

    const hardCount = questions.filter(q => q.difficulty === 'hard').length;
    const mediumCount = questions.filter(q => q.difficulty === 'medium').length;
    console.log(`  Hard: ${hardCount}, Medium: ${mediumCount}`);

    // Remove existing Problems on Ages test if any
    await Test.deleteMany({ topic: 'Problems on Ages', type: 'topic_practice' });

    // Create the test with 40 questions, 50 minutes
    const test = await Test.create({
      title: 'Problems on Ages Challenge',
      type: 'topic_practice',
      section: 'numerical',
      topic: 'Problems on Ages',
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
