require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');

const cleanup = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Find all duplicate questions (same text + topic)
    const duplicates = await Question.aggregate([
      {
        $group: {
          _id: { text: '$text', topic: '$topic' },
          ids: { $push: '$_id' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    console.log(`Found ${duplicates.length} groups of duplicate questions`);

    let totalRemoved = 0;
    for (const dup of duplicates) {
      // Keep the first one, remove the rest
      const idsToRemove = dup.ids.slice(1);
      await Question.deleteMany({ _id: { $in: idsToRemove } });
      totalRemoved += idsToRemove.length;
    }

    console.log(`Removed ${totalRemoved} duplicate questions`);

    const totalQuestions = await Question.countDocuments();
    console.log(`Total questions remaining: ${totalQuestions}`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

cleanup();
