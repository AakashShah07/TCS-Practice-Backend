require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');
const questions = require('./passage_fill_in_the_blank.json');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Insert questions (skip duplicates)
    const inserted = await Question.insertMany(questions, { ordered: false }).catch((err) => {
      if (err.code === 11000) {
        const count = err.insertedDocs?.length || err.result?.insertedCount || 0;
        console.log(`Inserted ${count} new questions (skipped duplicates)`);
        return err.insertedDocs || [];
      }
      throw err;
    });
    console.log(`Inserted ${inserted.length} Passage Fill in the Blank questions`);

    // Show summary
    const total = await Question.countDocuments({ topic: 'Passage Fill in the Blank' });
    console.log(`Total Passage FITB questions in DB: ${total}`);

    // Create the test
    const pool = await Question.find({ section: 'verbal', topic: 'Passage Fill in the Blank' }).select('_id');
    console.log(`Found ${pool.length} questions for test`);

    await Test.deleteMany({ topic: 'Passage Fill in the Blank', type: 'topic_practice' });

    const test = await Test.create({
      title: 'Passage Fill in the Blank',
      type: 'topic_practice',
      section: 'verbal',
      topic: 'Passage Fill in the Blank',
      questions: pool.map(q => q._id),
      totalQuestions: 80,
      duration: 40 * 60, // 40 minutes
      sectionLocked: false,
      isActive: true,
    });

    console.log(`Created test: ${test.title} (${test._id})`);
    console.log(`  Pool: ${pool.length} | Per test: ${test.totalQuestions} | Duration: ${test.duration / 60} min`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error.message);
    process.exit(1);
  }
};

seed();
