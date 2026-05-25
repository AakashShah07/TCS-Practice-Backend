require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const questions = await Question.find({
      topic: 'Percentage',
      difficulty: { $in: ['hard', 'medium'] }
    }).select('_id difficulty');
    console.log(`Found ${questions.length} Percentage questions`);

    const hardCount = questions.filter(q => q.difficulty === 'hard').length;
    const mediumCount = questions.filter(q => q.difficulty === 'medium').length;
    console.log(`  Hard: ${hardCount}, Medium: ${mediumCount}`);

    await Test.deleteMany({ topic: 'Percentage', type: 'topic_practice' });

    const test = await Test.create({
      title: 'Percentage Challenge',
      type: 'topic_practice',
      section: 'numerical',
      topic: 'Percentage',
      questions: questions.map(q => q._id),
      totalQuestions: 40,
      duration: 45 * 60,
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
