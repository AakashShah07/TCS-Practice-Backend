require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');

const questions = require('./numerical_boost.json');

(async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const inserted = await Question.insertMany(questions);
    console.log(`Added ${inserted.length} numerical questions.\n`);

    // Show breakdown
    const topicCounts = {};
    const diffCounts = { easy: 0, medium: 0, hard: 0 };
    for (const q of inserted) {
      const key = q.topic;
      topicCounts[key] = topicCounts[key] || { easy: 0, medium: 0, hard: 0, total: 0 };
      topicCounts[key][q.difficulty]++;
      topicCounts[key].total++;
      diffCounts[q.difficulty]++;
    }

    console.log('New questions by topic:');
    for (const [topic, c] of Object.entries(topicCounts).sort()) {
      console.log(`  ${topic}: ${c.total} (E:${c.easy} M:${c.medium} H:${c.hard})`);
    }
    console.log(`\nDifficulty split: Easy:${diffCounts.easy} Medium:${diffCounts.medium} Hard:${diffCounts.hard}`);

    // Show updated DB totals for numerical
    const dbTopics = await Question.aggregate([
      { $match: { section: 'numerical' } },
      { $group: { _id: '$topic', count: { $sum: 1 },
        easy: { $sum: { $cond: [{ $eq: ['$difficulty', 'easy'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$difficulty', 'medium'] }, 1, 0] } },
        hard: { $sum: { $cond: [{ $eq: ['$difficulty', 'hard'] }, 1, 0] } }
      }},
      { $sort: { _id: 1 } }
    ]);
    const total = await Question.countDocuments();
    const numTotal = await Question.countDocuments({ section: 'numerical' });

    console.log(`\nUpdated Numerical Section (${numTotal} total):`);
    for (const t of dbTopics) {
      console.log(`  ${t._id}: ${t.count} (E:${t.easy} M:${t.medium} H:${t.hard})`);
    }
    console.log(`\nTotal questions in DB: ${total}`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
