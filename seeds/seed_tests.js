require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Test = require('../models/Test');

const seedTests = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Clear only tests collection
    await Test.deleteMany();
    console.log('Cleared existing tests...');

    // Group existing questions by section
    const sections = ['numerical', 'reasoning', 'verbal', 'advanced'];
    const sectionQuestions = {};

    for (const section of sections) {
      const questions = await Question.find({ section }).select('_id');
      sectionQuestions[section] = questions.map((q) => q._id);
      console.log(`Found ${questions.length} ${section} questions`);
    }

    // Create section tests
    const sectionNames = {
      numerical: 'Numerical Ability Test',
      reasoning: 'Logical Reasoning Test',
      verbal: 'Verbal Ability Test',
      advanced: 'Advanced Quantitative & Reasoning Test',
    };

    const questionsPerTest = 25;
    const durationPerTest = 30 * 60; // 30 minutes

    for (const section of sections) {
      if (sectionQuestions[section].length > 0) {
        await Test.create({
          title: sectionNames[section],
          type: 'section_test',
          section,
          questions: sectionQuestions[section],
          totalQuestions: questionsPerTest,
          duration: durationPerTest,
          isActive: true,
        });
        console.log(`Created: ${sectionNames[section]} (pool: ${sectionQuestions[section].length}, per test: ${questionsPerTest})`);
      }
    }

    // Create full mock test with all questions
    const allIds = Object.values(sectionQuestions).flat();
    if (allIds.length > 0) {
      const mockQuestionsPerSection = 25;
      const mockTotalQuestions = mockQuestionsPerSection * sections.length;
      await Test.create({
        title: 'TCS NQT Full Mock Test',
        type: 'full_mock',
        questions: allIds,
        totalQuestions: mockTotalQuestions,
        duration: 30 * 60 * sections.length,
        sectionLocked: true,
        isActive: true,
      });
      console.log(`Created: TCS NQT Full Mock Test (${mockTotalQuestions} questions, pool: ${allIds.length})`);
    }

    console.log('\n--- Test seeding complete ---');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding tests:', error);
    process.exit(1);
  }
};

seedTests();
