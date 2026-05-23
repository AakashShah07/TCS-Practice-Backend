require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Get only hard and medium Blood Relations questions (no easy)
    const questions = await Question.find({
      topic: 'Blood Relations',
      difficulty: { $in: ['hard', 'medium'] }
    }).select('_id difficulty');
    console.log(`Found ${questions.length} hard/medium Blood Relations questions`);

    const hardCount = questions.filter(q => q.difficulty === 'hard').length;
    const mediumCount = questions.filter(q => q.difficulty === 'medium').length;
    console.log(`  Hard: ${hardCount}, Medium: ${mediumCount}`);

    // Remove existing Blood Relations test if any
    await Test.deleteMany({ topic: 'Blood Relations', type: 'topic_practice' });

    // Create the test with 30 questions, 35 minutes
    const test = await Test.create({
      title: 'Blood Relations Challenge',
      type: 'topic_practice',
      section: 'reasoning',
      topic: 'Blood Relations',
      questions: questions.map(q => q._id),
      totalQuestions: 30,
      duration: 35 * 60, // 35 minutes in seconds
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
