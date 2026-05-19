require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const questions = await Question.find({ topic: 'LCM & HCF' }).select('_id');
    console.log(`Found ${questions.length} LCM & HCF questions`);

    const test = await Test.create({
      title: 'LCM & HCF Practice (30 min)',
      type: 'topic_practice',
      section: 'numerical',
      topic: 'LCM & HCF',
      questions: questions.map(q => q._id),
      totalQuestions: 30,
      duration: 30 * 60,
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
