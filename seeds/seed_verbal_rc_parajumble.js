require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const questions = require('./verbal_rc_parajumble.json');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const inserted = await Question.insertMany(questions, { ordered: false }).catch((err) => {
      if (err.code === 11000) {
        const count = err.insertedDocs?.length || err.result?.insertedCount || 0;
        console.log(`Inserted ${count} new questions (skipped duplicates)`);
        return err.insertedDocs || [];
      }
      throw err;
    });
    console.log(`Inserted ${inserted.length} RC & Para Jumble questions`);

    // Show summary
    const rcCount = await Question.countDocuments({ topic: 'Reading Comprehension' });
    const pjCount = await Question.countDocuments({ topic: 'Para Jumble' });
    console.log(`Total Reading Comprehension questions in DB: ${rcCount}`);
    console.log(`Total Para Jumble questions in DB: ${pjCount}`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error.message);
    process.exit(1);
  }
};

seed();
