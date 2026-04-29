require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const CodingQuestion = require('../models/CodingQuestion');
const questions = require('./coding_questions.json');

const seedCoding = async () => {
  try {
    await connectDB();

    // Remove existing coding questions
    const deleted = await CodingQuestion.deleteMany({});
    console.log(`Deleted ${deleted.deletedCount} existing coding questions`);

    // Insert new questions
    const inserted = await CodingQuestion.insertMany(questions);
    console.log(`Inserted ${inserted.length} coding questions:`);
    inserted.forEach((q, i) => {
      console.log(`  ${i + 1}. [${q.difficulty}] ${q.title} (${q.topic})`);
    });

    console.log('\nCoding questions seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding coding questions:', error.message);
    process.exit(1);
  }
};

seedCoding();
