require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const questions = await Question.find({ topic: 'Profit & Loss' }).select('_id');
    console.log(`Found ${questions.length} Profit & Loss questions`);

    await Test.deleteMany({ topic: 'Profit & Loss', type: 'topic_practice' });

    const test = await Test.create({
      title: 'Profit & Loss Practice',
      type: 'topic_practice',
      section: 'numerical',
      topic: 'Profit & Loss',
      questions: questions.map(q => q._id),
      totalQuestions: 30,
      duration: 40 * 60,
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
