const Question = require('../models/Question');
const Test = require('../models/Test');
const User = require('../models/User');
const TestAttempt = require('../models/TestAttempt');
const Result = require('../models/Result');

// ===== QUESTION MANAGEMENT =====

// @desc    Add a single question
// @route   POST /api/admin/questions
exports.addQuestion = async (req, res, next) => {
  try {
    const question = await Question.create(req.body);
    res.status(201).json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk add questions
// @route   POST /api/admin/questions/bulk
exports.bulkAddQuestions = async (req, res, next) => {
  try {
    const questions = await Question.insertMany(req.body.questions);
    res.status(201).json({ success: true, count: questions.length, data: questions });
  } catch (error) {
    next(error);
  }
};

// @desc    List questions with filters
// @route   GET /api/admin/questions
exports.getQuestions = async (req, res, next) => {
  try {
    const { section, topic, difficulty, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (section) filter.section = section;
    if (topic) filter.topic = topic;
    if (difficulty) filter.difficulty = difficulty;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [questions, total] = await Promise.all([
      Question.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Question.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: questions.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: questions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a question
// @route   PUT /api/admin/questions/:id
exports.updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    res.json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a question
// @route   DELETE /api/admin/questions/:id
exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    res.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    next(error);
  }
};

// ===== TEST MANAGEMENT =====

// @desc    Create a test
// @route   POST /api/admin/tests
exports.createTest = async (req, res, next) => {
  try {
    const { questions } = req.body;
    req.body.totalQuestions = questions.length;
    const test = await Test.create(req.body);
    res.status(201).json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

// @desc    List all tests (admin view)
// @route   GET /api/admin/tests
exports.getTests = async (req, res, next) => {
  try {
    const tests = await Test.find().sort({ createdAt: -1 });
    res.json({ success: true, count: tests.length, data: tests });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a test
// @route   PUT /api/admin/tests/:id
exports.updateTest = async (req, res, next) => {
  try {
    if (req.body.questions) {
      req.body.totalQuestions = req.body.questions.length;
    }
    const test = await Test.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }
    res.json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a test
// @route   DELETE /api/admin/tests/:id
exports.deleteTest = async (req, res, next) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }
    res.json({ success: true, message: 'Test deleted' });
  } catch (error) {
    next(error);
  }
};

// ===== ADMIN DASHBOARD =====

// @desc    Get platform stats
// @route   GET /api/admin/dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalQuestions, totalTests, totalAttempts, results] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Question.countDocuments(),
      Test.countDocuments(),
      TestAttempt.countDocuments({ status: { $in: ['completed', 'timed_out'] } }),
      Result.find().select('percentage'),
    ]);

    const avgScore = results.length > 0
      ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length
      : 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalQuestions,
        totalTests,
        totalAttempts,
        avgScore: Math.round(avgScore * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all users with stats
// @route   GET /api/admin/users
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find({ role: 'user' }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments({ role: 'user' }),
    ]);

    // Get attempt counts for each user
    const userIds = users.map((u) => u._id);
    const attemptCounts = await TestAttempt.aggregate([
      { $match: { user: { $in: userIds }, status: { $in: ['completed', 'timed_out'] } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(attemptCounts.map((a) => [a._id.toString(), a.count]));

    const data = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      testsCompleted: countMap[u._id.toString()] || 0,
      createdAt: u.createdAt,
    }));

    res.json({ success: true, total, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user detail
// @route   GET /api/admin/users/:id
exports.getUserDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const results = await Result.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('test', 'title type');

    res.json({
      success: true,
      data: {
        user: { _id: user._id, name: user.name, email: user.email, createdAt: user.createdAt },
        recentResults: results,
      },
    });
  } catch (error) {
    next(error);
  }
};
