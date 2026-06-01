require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');
const relationalData = require('./relational_model.json');

const seedRelationalModel = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    const topic = 'Relational Model, Keys, Relational Algebra';
    const section = 'system';

    // 1. Clear existing questions for this specific topic
    const deleteResult = await Question.deleteMany({ section, topic });
    console.log(`Deleted ${deleteResult.deletedCount} existing questions for topic: ${topic}`);

    // 2. Insert the questions
    const insertedQuestions = await Question.insertMany(relationalData);
    console.log(`Inserted ${insertedQuestions.length} questions.`);

    // 3. Selection Strategy: Prioritize Hard, then Medium
    const hardQuestions = insertedQuestions.filter(q => q.difficulty === 'hard');
    const mediumQuestions = insertedQuestions.filter(q => q.difficulty === 'medium');

    // Shuffle both
    const shuffle = (array) => array.sort(() => 0.5 - Math.random());
    const shuffledHard = shuffle(hardQuestions);
    const shuffledMedium = shuffle(mediumQuestions);

    // Take all hard, then fill with medium until 40
    let selectedQuestions = [...shuffledHard];
    if (selectedQuestions.length > 40) {
        selectedQuestions = selectedQuestions.slice(0, 40);
    } else if (selectedQuestions.length < 40) {
        const remaining = 40 - selectedQuestions.length;
        selectedQuestions = selectedQuestions.concat(shuffledMedium.slice(0, remaining));
    }

    // 4. Create the test
    await Test.deleteMany({ 
        title: 'System IT: Relational Model & Algebra',
        section: 'system'
    });

    const test = await Test.create({
      title: 'System IT: Relational Model & Algebra',
      type: 'topic_practice',
      section: 'system',
      topic: topic,
      questions: selectedQuestions.map(q => q._id),
      totalQuestions: 40,
      duration: 2100, // 35 minutes
      isActive: true
    });

    console.log(`Test created successfully: ${test.title} with 40 questions.`);
    console.log(`Difficulty breakdown: ${selectedQuestions.filter(q => q.difficulty === 'hard').length} Hard, ${selectedQuestions.filter(q => q.difficulty === 'medium').length} Medium.`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding Relational Model questions:', error);
    process.exit(1);
  }
};

seedRelationalModel();
