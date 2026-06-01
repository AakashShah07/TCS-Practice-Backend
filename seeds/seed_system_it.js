require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');
const systemItData = require('./system_it.json');

const seedSystemIt = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const topic = 'ER Model, Entities, Attributes, Relationships';
    const section = 'system';

    // 1. Clear existing questions for this specific topic to avoid duplicates
    const deleteResult = await Question.deleteMany({ section, topic });
    console.log(`Deleted ${deleteResult.deletedCount} existing questions for topic: ${topic}`);

    // 2. Insert the questions
    const insertedQuestions = await Question.insertMany(systemItData);
    console.log(`Inserted ${insertedQuestions.length} questions.`);

    // 3. Create the test
    // Pick 70 random questions from the inserted ones
    const shuffled = insertedQuestions.sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, 70);

    // Remove existing test if it exists
    await Test.deleteMany({ 
        title: 'System IT: ER Model & Relationships',
        section: 'system'
    });

    const test = await Test.create({
      title: 'System IT: ER Model & Relationships',
      type: 'topic_practice',
      section: 'system',
      topic: topic,
      questions: selectedQuestions.map(q => q._id),
      totalQuestions: 70,
      duration: 3600, // 60 minutes
      isActive: true
    });

    console.log(`Test created successfully: ${test.title} with 70 questions.`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding System IT questions:', error);
    process.exit(1);
  }
};

seedSystemIt();
