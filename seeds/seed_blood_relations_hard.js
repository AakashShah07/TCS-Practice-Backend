require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const questions = require('./blood_relations_hard.json');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Upgrade existing easy questions to medium
    const upgraded = await Question.updateMany(
      { topic: 'Blood Relations', difficulty: 'easy' },
      { $set: { difficulty: 'medium' } }
    );
    console.log(`Upgraded ${upgraded.modifiedCount} easy questions to medium`);

    // Insert new questions, skipping duplicates
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
    console.log(`Inserted ${inserted} new hard Blood Relations questions (${skipped} duplicates skipped)`);

    // Show summary
    const total = await Question.countDocuments({ topic: 'Blood Relations' });
    const hard = await Question.countDocuments({ topic: 'Blood Relations', difficulty: 'hard' });
    const medium = await Question.countDocuments({ topic: 'Blood Relations', difficulty: 'medium' });
    const easy = await Question.countDocuments({ topic: 'Blood Relations', difficulty: 'easy' });
    console.log(`\nTotal Blood Relations questions in DB: ${total}`);
    console.log(`  Hard: ${hard}, Medium: ${medium}, Easy: ${easy}`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error.message);
    process.exit(1);
  }
};

seed();
