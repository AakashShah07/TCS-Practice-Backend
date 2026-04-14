require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');

const hardNumerical = require('./hard_numerical.json');
const hardReasoning = require('./hard_reasoning.json');
const hardVerbal = require('./hard_verbal.json');
const hardAdvanced = require('./hard_advanced.json');

const seedHard = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const allNew = [
      ...hardNumerical,
      ...hardReasoning,
      ...hardVerbal,
      ...hardAdvanced,
    ];

    const inserted = await Question.insertMany(allNew);
    console.log(`Added ${inserted.length} new hard/tricky questions:`);

    // Count by section
    const counts = {};
    for (const q of inserted) {
      counts[q.section] = (counts[q.section] || 0) + 1;
    }
    for (const [sec, count] of Object.entries(counts)) {
      console.log(`  ${sec}: ${count}`);
    }

    // Count by topic
    const topicCounts = {};
    for (const q of inserted) {
      const key = `[${q.section}] ${q.topic}`;
      topicCounts[key] = (topicCounts[key] || 0) + 1;
    }
    console.log('\nBy Topic:');
    for (const [topic, count] of Object.entries(topicCounts).sort()) {
      console.log(`  ${topic}: ${count}`);
    }

    // Total in DB now
    const total = await Question.countDocuments();
    console.log(`\nTotal questions in DB now: ${total}`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

seedHard();
