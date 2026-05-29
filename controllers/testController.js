const Test = require('../models/Test');
const Question = require('../models/Question');

// @desc    Get all active tests (public)
// @route   GET /api/tests
exports.getTests = async (req, res, next) => {
  try {
    const { type, section } = req.query;
    const filter = { isActive: true };
    if (type) filter.type = type;
    if (section) filter.section = section;

    const tests = await Test.find(filter).select('-questions');
    res.json({ success: true, count: tests.length, data: tests });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single test (without correct answers)
// @route   GET /api/tests/:id
exports.getTest = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id).populate({
      path: 'questions',
      select: 'text options section topic difficulty',
    });

    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    res.json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available topics for a section (with question counts)
// @route   GET /api/tests/topics/:section
exports.getTopicsBySection = async (req, res, next) => {
  try {
    const { section } = req.params;
    const validSections = ['numerical', 'reasoning', 'verbal', 'advanced', 'system'];
    if (!validSections.includes(section)) {
      return res.status(400).json({ success: false, message: 'Invalid section' });
    }

    const topics = await Question.aggregate([
      { $match: { section } },
      {
        $group: {
          _id: '$topic',
          count: { $sum: 1 },
          easy: { $sum: { $cond: [{ $eq: ['$difficulty', 'easy'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$difficulty', 'medium'] }, 1, 0] } },
          hard: { $sum: { $cond: [{ $eq: ['$difficulty', 'hard'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      section,
      data: topics.map((t) => ({
        topic: t._id,
        totalQuestions: t.count,
        easy: t.easy,
        medium: t.medium,
        hard: t.hard,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get questions by topic (for topic-based practice)
// @route   GET /api/tests/practice/:section/:topic
exports.getQuestionsByTopic = async (req, res, next) => {
  try {
    const { section, topic } = req.params;
    const { difficulty, limit = 10 } = req.query;

    const filter = { section, topic };
    if (difficulty) filter.difficulty = difficulty;

    // Get random questions for practice
    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: parseInt(limit) } },
      { $project: { text: 1, options: 1, section: 1, topic: 1, difficulty: 1 } },
    ]);

    if (questions.length === 0) {
      return res.status(404).json({ success: false, message: `No questions found for topic "${topic}" in section "${section}"` });
    }

    res.json({
      success: true,
      section,
      topic,
      count: questions.length,
      data: questions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate a dynamic practice test from a topic
// @route   POST /api/tests/generate-practice
exports.generatePracticeTest = async (req, res, next) => {
  try {
    const { section, topic, difficulty, numberOfQuestions = 10 } = req.body;

    if (!section || !topic) {
      return res.status(400).json({ success: false, message: 'Section and topic are required' });
    }

    // Check if a seeded test already exists for this topic — reuse it
    const existingTest = await Test.findOne({
      type: 'topic_practice',
      section,
      topic,
      isActive: true,
    });

    if (existingTest) {
      const questions = await Question.aggregate([
        { $match: { section, topic } },
        { $sample: { size: existingTest.totalQuestions } },
        { $project: { text: 1, options: 1, section: 1, topic: 1, difficulty: 1 } },
      ]);

      return res.json({
        success: true,
        data: {
          testId: existingTest._id,
          title: existingTest.title,
          topic,
          section,
          totalQuestions: existingTest.totalQuestions,
          duration: existingTest.duration,
          questions: questions.map((q) => ({
            _id: q._id,
            text: q.text,
            options: q.options,
            difficulty: q.difficulty,
          })),
        },
      });
    }

    const filter = { section, topic };
    if (difficulty) filter.difficulty = difficulty;

    // Pick random questions
    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: parseInt(numberOfQuestions) } },
    ]);

    if (questions.length === 0) {
      return res.status(404).json({ success: false, message: `No questions found for "${topic}"` });
    }

    // Create a dynamic practice test
    const test = await Test.create({
      title: `${topic} Practice (${difficulty || 'Mixed'})`,
      type: 'topic_practice',
      section,
      topic,
      questions: questions.map((q) => q._id),
      totalQuestions: questions.length,
      duration: questions.length * 90, // 1.5 min per question
    });

    res.status(201).json({
      success: true,
      data: {
        testId: test._id,
        title: test.title,
        topic,
        section,
        totalQuestions: test.totalQuestions,
        duration: test.duration,
        questions: questions.map((q) => ({
          _id: q._id,
          text: q.text,
          options: q.options,
          difficulty: q.difficulty,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
