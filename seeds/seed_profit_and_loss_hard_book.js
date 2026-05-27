require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');
const questions = require('./profit_and_loss_hard_book.json');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Insert questions
    const inserted = await Question.insertMany(questions);
    console.log(`Inserted ${inserted.length} Profit & Loss (hard book) questions`);

    const total = await Question.countDocuments({ topic: 'Profit & Loss' });
    console.log(`Total Profit & Loss questions in DB: ${total}`);

    // Remove existing Profit & Loss topic_practice tests and recreate
    await Test.deleteMany({ topic: 'Profit & Loss', type: 'topic_practice' });

    const allQuestions = await Question.find({ topic: 'Profit & Loss' }).select('_id');
    const test = await Test.create({
      title: 'Profit & Loss Challenge',
      type: 'topic_practice',
      section: 'numerical',
      topic: 'Profit & Loss',
      questions: allQuestions.map(q => q._id),
      totalQuestions: 50,
      duration: 55 * 60, // 55 minutes
      sectionLocked: false,
      isActive: true,
    });

    console.log(`\nCreated test: ${test.title} (${test._id})`);
    console.log(`  Questions pool: ${allQuestions.length}, per test: ${test.totalQuestions}`);
    console.log(`  Duration: ${test.duration / 60} minutes`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error.message);
    process.exit(1);
  }
};

seed();
