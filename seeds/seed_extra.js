require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');

const extraQuestions = require('./extra_30.json');

const seedExtra = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const inserted = await Question.insertMany(extraQuestions);
    console.log(`Added ${inserted.length} new questions.`);

    const counts = {};
    const topicCounts = {};
    for (const q of inserted) {
      counts[q.section] = (counts[q.section] || 0) + 1;
      const key = `[${q.section}] ${q.topic}`;
      topicCounts[key] = (topicCounts[key] || 0) + 1;
    }

    console.log('\nBy Section:');
    for (const [sec, count] of Object.entries(counts).sort()) {
      console.log(`  ${sec}: ${count}`);
    }
    console.log('\nBy Topic:');
    for (const [topic, count] of Object.entries(topicCounts).sort()) {
      console.log(`  ${topic}: ${count}`);
    }

    const total = await Question.countDocuments();
    console.log(`\nTotal questions in DB now: ${total}`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

seedExtra();
