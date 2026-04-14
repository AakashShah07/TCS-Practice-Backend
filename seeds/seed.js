require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const User = require('../models/User');
const Test = require('../models/Test');

// Data
const numericalData = require('./numerical.json');
const reasoningData = require('./reasoning.json');
const verbalData = require('./verbal.json');
const advancedData = require('./advanced.json');

const seedDB = async () => {
  try {
    // Connect to DB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Clear existing data
    await Promise.all([
      Question.deleteMany(),
      User.deleteMany(),
      Test.deleteMany(),
    ]);
    console.log('Cleared existing data...');

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@tcsnqt.com',
      password: 'admin123',
      role: 'admin',
    });
    console.log(`Admin created: ${admin.email} / admin123`);

    // Create demo user
    const demo = await User.create({
      name: 'Demo User',
      email: 'demo@tcsnqt.com',
      password: 'demo123',
      role: 'user',
    });
    console.log(`Demo user created: ${demo.email} / demo123`);

    // Seed questions
    const allQuestions = [
      ...numericalData,
      ...reasoningData,
      ...verbalData,
      ...advancedData,
    ];
    const inserted = await Question.insertMany(allQuestions);
    console.log(`Seeded ${inserted.length} questions.`);

    // Create section tests
    const sections = { numerical: [], reasoning: [], verbal: [], advanced: [] };
    for (const q of inserted) {
      if (sections[q.section]) sections[q.section].push(q._id);
    }

    await Test.create({
      title: 'Numerical Ability Test',
      type: 'section_test',
      section: 'numerical',
      questions: sections.numerical,
      totalQuestions: sections.numerical.length,
      duration: 25 * 60,
    });

    await Test.create({
      title: 'Logical Reasoning Test',
      type: 'section_test',
      section: 'reasoning',
      questions: sections.reasoning,
      totalQuestions: sections.reasoning.length,
      duration: 25 * 60,
    });

    await Test.create({
      title: 'Verbal Ability Test',
      type: 'section_test',
      section: 'verbal',
      questions: sections.verbal,
      totalQuestions: sections.verbal.length,
      duration: 25 * 60,
    });

    await Test.create({
      title: 'Advanced Quantitative & Reasoning Test',
      type: 'section_test',
      section: 'advanced',
      questions: sections.advanced,
      totalQuestions: sections.advanced.length,
      duration: 25 * 60,
    });

    // Full mock test
    const allIds = inserted.map((q) => q._id);
    await Test.create({
      title: 'TCS NQT Full Mock Test',
      type: 'full_mock',
      questions: allIds,
      totalQuestions: allIds.length,
      duration: 120 * 60,
      sectionLocked: true,
    });

    console.log('Tests created.');

    console.log('\n--- Seeding Complete ---');
    console.log('Admin:  admin@tcsnqt.com / admin123');
    console.log('Demo:   demo@tcsnqt.com / demo123');

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();
