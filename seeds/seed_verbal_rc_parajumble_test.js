require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // --- Para Jumble Test ---
    const pjQuestions = await Question.find({ topic: 'Para Jumble' }).select('_id');
    console.log(`Found ${pjQuestions.length} Para Jumble questions`);

    await Test.deleteMany({ topic: 'Para Jumble', type: 'topic_practice' });

    const pjTest = await Test.create({
      title: 'Para Jumble Practice',
      type: 'topic_practice',
      section: 'verbal',
      topic: 'Para Jumble',
      questions: pjQuestions.map(q => q._id),
      totalQuestions: 15,
      duration: 20 * 60, // 20 minutes
      sectionLocked: false,
      isActive: true,
    });

    console.log(`Created test: ${pjTest.title} (${pjTest._id})`);
    console.log(`  Questions pool: ${pjQuestions.length}, per test: ${pjTest.totalQuestions}`);
    console.log(`  Duration: ${pjTest.duration / 60} minutes`);

    // --- Reading Comprehension Test ---
    const rcQuestions = await Question.find({ topic: 'Reading Comprehension' }).select('_id');
    console.log(`Found ${rcQuestions.length} Reading Comprehension questions`);

    await Test.deleteMany({ topic: 'Reading Comprehension', type: 'topic_practice' });

    const rcTest = await Test.create({
      title: 'Reading Comprehension Practice',
      type: 'topic_practice',
      section: 'verbal',
      topic: 'Reading Comprehension',
      questions: rcQuestions.map(q => q._id),
      totalQuestions: 30,
      duration: 45 * 60, // 45 minutes
      sectionLocked: false,
      isActive: true,
    });

    console.log(`Created test: ${rcTest.title} (${rcTest._id})`);
    console.log(`  Questions pool: ${rcQuestions.length}, per test: ${rcTest.totalQuestions}`);
    console.log(`  Duration: ${rcTest.duration / 60} minutes`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

seed();
