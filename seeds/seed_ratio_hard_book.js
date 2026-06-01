require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const questions = require('./ratio_hard_book.json');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Insert new hard ratio questions (skip duplicates)
    let inserted = 0;
    let skipped = 0;
    for (const q of questions) {
      const exists = await Question.findOne({ text: q.text, topic: q.topic });
      if (!exists) {
        await Question.create(q);
        inserted++;
      } else {
        skipped++;
      }
    }
    console.log(`Inserted ${inserted} new hard Ratio questions (${skipped} skipped as duplicates)`);

    const total = await Question.countDocuments({ topic: 'Ratio & Percentage' });
    const hardCount = await Question.countDocuments({ topic: 'Ratio & Percentage', difficulty: 'hard' });
    console.log(`Total Ratio & Percentage questions in DB: ${total}`);
    console.log(`  Hard: ${hardCount}`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error.message);
    process.exit(1);
  }
};

seed();
