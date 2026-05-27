// Re-seeds all topic_practice test definitions with correct totalQuestions and duration.
// Does NOT touch the questions collection — only fixes the Test documents.
require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');

const testDefinitions = [
  { title: 'Ratio & Percentage Practice', section: 'numerical', topic: 'Ratio & Percentage', totalQuestions: 30, duration: 40 * 60 },
  { title: 'Time & Work Practice', section: 'numerical', topic: 'Time & Work', totalQuestions: 30, duration: 45 * 60 },
  { title: 'LCM & HCF Practice', section: 'numerical', topic: 'LCM & HCF', totalQuestions: 35, duration: 45 * 60 },
  { title: 'Speed, Time & Distance Practice', section: 'numerical', topic: 'Speed, Time & Distance', totalQuestions: 30, duration: 45 * 60 },
  { title: 'Simplification Practice', section: 'numerical', topic: 'Simplification', totalQuestions: 30, duration: 45 * 60 },
  { title: 'Approximation Challenge', section: 'numerical', topic: 'Approximation', totalQuestions: 30, duration: 40 * 60 },
  { title: 'Average Practice', section: 'numerical', topic: 'Average', totalQuestions: 30, duration: 40 * 60 },
  { title: 'Profit & Loss Challenge', section: 'numerical', topic: 'Profit & Loss', totalQuestions: 50, duration: 55 * 60 },
  { title: 'Mensuration Practice', section: 'numerical', topic: 'Mensuration', totalQuestions: 30, duration: 45 * 60 },
  { title: 'Percentage Challenge', section: 'numerical', topic: 'Percentage', totalQuestions: 40, duration: 45 * 60 },
  { title: 'Probability, Permutation & Combination Practice', section: 'numerical', topic: 'Probability, Permutation & Combination', totalQuestions: 40, duration: 50 * 60 },
  { title: 'Problems on Ages Challenge', section: 'numerical', topic: 'Problems on Ages', totalQuestions: 40, duration: 50 * 60 },
  { title: 'Blood Relations Challenge', section: 'reasoning', topic: 'Blood Relations', totalQuestions: 30, duration: 35 * 60 },
  { title: 'Coding Decoding Challenge', section: 'reasoning', topic: 'Coding Decoding', totalQuestions: 50, duration: 50 * 60 },
  { title: 'Para Jumble Practice', section: 'verbal', topic: 'Para Jumble', totalQuestions: 15, duration: 20 * 60 },
  { title: 'Reading Comprehension Practice', section: 'verbal', topic: 'Reading Comprehension', totalQuestions: 30, duration: 45 * 60 },
  { title: 'Vocabulary Fill in the Blank Practice', section: 'verbal', topic: 'Vocabulary Fill in the Blank', totalQuestions: 30, duration: 30 * 60 },
  { title: 'Error Detection Practice', section: 'verbal', topic: 'Error Detection', totalQuestions: 30, duration: 35 * 60 },
  { title: 'Passage Fill in the Blank Practice', section: 'verbal', topic: 'Passage Fill in the Blank', totalQuestions: 80, duration: 90 * 60 },
];

const reseed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...\n');

    for (const def of testDefinitions) {
      // Get question IDs for this topic
      const questions = await Question.find({ section: def.section, topic: def.topic }).select('_id');
      const pool = questions.length;

      if (pool === 0) {
        console.log(`SKIP  ${def.title} — no questions in DB for "${def.topic}"`);
        continue;
      }

      // Remove all existing tests for this topic
      const deleted = await Test.deleteMany({ topic: def.topic, type: 'topic_practice' });

      // Cap totalQuestions at actual pool size
      const actualTotal = Math.min(def.totalQuestions, pool);

      const test = await Test.create({
        title: def.title,
        type: 'topic_practice',
        section: def.section,
        topic: def.topic,
        questions: questions.map(q => q._id),
        totalQuestions: actualTotal,
        duration: def.duration,
        sectionLocked: false,
        isActive: true,
      });

      const status = actualTotal < def.totalQuestions ? 'LOW POOL' : 'OK';
      console.log(`${status}  ${test.title} | ${actualTotal}Q (pool: ${pool}, wanted: ${def.totalQuestions}) | ${test.duration / 60}min | deleted ${deleted.deletedCount} old`);
    }

    console.log('\nDone!');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

reseed();
