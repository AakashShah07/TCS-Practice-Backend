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

// @desc    Get available topics for a section
// @route   GET /api/tests/topics/:section
exports.getTopicsBySection = async (req, res, next) => {
  try {
    const { section } = req.params;
    const validSections = ['numerical', 'reasoning', 'verbal', 'advanced'];
    if (!validSections.includes(section)) {
      return res.status(400).json({ success: false, message: 'Invalid section' });
    }

    const topics = await Question.distinct('topic', { section });
    res.json({ success: true, data: topics });
  } catch (error) {
    next(error);
  }
};
