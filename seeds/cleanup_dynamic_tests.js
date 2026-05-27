// Removes duplicate/dynamically-generated topic_practice tests.
// For each topic, keeps only the test with the highest totalQuestions (the properly seeded one).
require('dotenv').config();
const mongoose = require('mongoose');
const Test = require('../models/Test');

const cleanup = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Find all topic_practice tests grouped by topic
    const tests = await Test.find({ type: 'topic_practice' }).sort({ totalQuestions: -1 });

    const seen = new Map(); // topic -> best test
    const toDelete = [];

    for (const test of tests) {
      const key = `${test.section}:${test.topic}`;
      if (!seen.has(key)) {
        seen.set(key, test);
      } else {
        toDelete.push(test);
      }
    }

    console.log(`\nFound ${tests.length} topic_practice tests across ${seen.size} topics`);
    console.log(`Keeping ${seen.size} tests, removing ${toDelete.length} duplicates\n`);

    console.log('--- Keeping ---');
    for (const [key, test] of seen) {
      console.log(`  ${test.title} | ${test.totalQuestions}Q | ${test.duration / 60}min | ${key}`);
    }

    if (toDelete.length > 0) {
      console.log('\n--- Removing ---');
      for (const test of toDelete) {
        console.log(`  ${test.title} | ${test.totalQuestions}Q | ${test.duration / 60}min | ${test._id}`);
      }

      const ids = toDelete.map(t => t._id);
      const result = await Test.deleteMany({ _id: { $in: ids } });
      console.log(`\nDeleted ${result.deletedCount} duplicate tests`);
    } else {
      console.log('\nNo duplicates found.');
    }

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

cleanup();
