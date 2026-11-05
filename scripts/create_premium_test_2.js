const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tcs-nqt';

const createPremiumTest2 = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Remove existing Premium Hard Mock Exam 2 if it exists
    await Test.deleteOne({ title: "Premium Hard Mock Exam 2" });
    console.log('Removed existing Premium Hard Mock Exam 2 (if any)');

    // 2. Select questions
    const sections = {
      numerical: 25,
      verbal: 25,
      reasoning: 15,
      advanced: 14
    };
    
    let selectedQuestions = [];
    for (const [section, count] of Object.entries(sections)) {
      const questions = await Question.aggregate([
        { $match: { section: section } },
        { $sample: { size: count } }
      ]);
      selectedQuestions.push(...questions);
    }
    
    console.log(`Selected ${selectedQuestions.length} questions`);

    // 3. Create Test
    const testData = {
      title: "Premium Hard Mock Exam 2",
      type: "full_mock",
      section: "advanced",
      topic: "Comprehensive Aptitude",
      totalQuestions: selectedQuestions.length,
      duration: 7110, // Keep same duration
      isPremium: true,
      isActive: true,
      questions: selectedQuestions.map(q => q._id)
    };
    
    await Test.create(testData);
    console.log('Successfully created Premium Hard Mock Exam 2 with 79 questions');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createPremiumTest2();
