const Question = require('../models/Question');
const Test = require('../models/Test');
const User = require('../models/User');
const TestAttempt = require('../models/TestAttempt');
const Result = require('../models/Result');
const QuestionGroup = require('../models/QuestionGroup');
const { revokeSession } = require('../utils/session');

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
    const questions = Array.isArray(req.body.questions) ? req.body.questions : [];
    const groups = Array.isArray(req.body.groups) ? req.body.groups : [];

    if (questions.length === 0 && groups.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one question or group is required' });
    }

    req.body.totalQuestions = await countTestQuestions(questions, groups);
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
    if (req.body.questions || req.body.groups) {
      const existing = await Test.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Test not found' });
      }
      const questions = req.body.questions || existing.questions;
      const groups = req.body.groups || existing.groups;
      req.body.totalQuestions = await countTestQuestions(questions, groups);
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

// Count standalone questions plus the expanded children of any referenced groups.
async function countTestQuestions(questions = [], groups = []) {
  let total = questions.length;
  if (groups.length > 0) {
    const groupDocs = await QuestionGroup.find({ _id: { $in: groups } }).select('questions');
    total += groupDocs.reduce((sum, g) => sum + (g.questions ? g.questions.length : 0), 0);
  }
  return total;
}

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

// @desc    Revoke a user's active session (Admin only)
// @route   PUT /api/admin/users/:id/revoke-session
exports.revokeUserSession = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const sid = user.activeSessionId || null;
    await revokeSession(user._id, sid, 'admin_revoked');

    res.json({
      success: true,
      message: sid ? 'User session revoked' : 'User had no active session',
      data: { userId: user._id, sessionRevoked: Boolean(sid) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user premium status (Admin only)
// @route   PUT /api/admin/users/:id/premium
exports.updateUserPremium = async (req, res, next) => {
  try {
    const { isPremium, subscriptionType } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isPremium = isPremium !== undefined ? isPremium : user.isPremium;
    user.subscriptionType = subscriptionType || user.subscriptionType;
    if (user.isPremium) {
      // Default to 1 year if becoming premium
      user.subscriptionExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); 
    } else {
      user.subscriptionExpiry = null;
    }

    await user.save();
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ===== QUESTION GROUP MANAGEMENT =====

// @desc    Create a question group (shared stimulus for grouped questions)
// @route   POST /api/admin/question-groups
exports.createQuestionGroup = async (req, res, next) => {
  try {
    const { questions, ...rest } = req.body;
    const group = await QuestionGroup.create(rest);

    if (Array.isArray(questions) && questions.length > 0) {
      const ids = await validateQuestionIds(questions);
      group.questions = ids;
      await group.save();
      await Question.updateMany({ _id: { $in: ids } }, { groupId: group._id });
    }

    res.status(201).json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};

// @desc    List question groups
// @route   GET /api/admin/question-groups
exports.getQuestionGroups = async (req, res, next) => {
  try {
    const { type, section, topic, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (section) filter.section = section;
    if (topic) filter.topic = topic;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [groups, total] = await Promise.all([
      QuestionGroup.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      QuestionGroup.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: groups.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: groups,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single question group (with ordered child questions)
// @route   GET /api/admin/question-groups/:id
exports.getQuestionGroup = async (req, res, next) => {
  try {
    const group = await QuestionGroup.findById(req.params.id).populate({
      path: 'questions',
      select: 'text options correctAnswer section topic difficulty questionType media optionMedia groupId',
    });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Question group not found' });
    }
    res.json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a question group (metadata/stimulus)
// @route   PUT /api/admin/question-groups/:id
exports.updateQuestionGroup = async (req, res, next) => {
  try {
    const { questions, ...rest } = req.body;
    if (questions !== undefined) {
      // Order/child management goes through the dedicated endpoints.
      return res.status(400).json({
        success: false,
        message: 'Use the child-question endpoints to manage group questions',
      });
    }

    const group = await QuestionGroup.findByIdAndUpdate(req.params.id, rest, {
      new: true,
      runValidators: true,
    });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Question group not found' });
    }
    res.json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a question group safely (detach children, unlink from tests)
// @route   DELETE /api/admin/question-groups/:id
exports.deleteQuestionGroup = async (req, res, next) => {
  try {
    const group = await QuestionGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Question group not found' });
    }

    await Question.updateMany({ groupId: group._id }, { $set: { groupId: null } });
    await Test.updateMany({ groups: group._id }, { $pull: { groups: group._id } });
    await Test.updateMany({ questions: group._id }, { $pull: { questions: group._id } });
    await QuestionGroup.findByIdAndDelete(group._id);

    res.json({ success: true, message: 'Question group deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Add child question(s) to a group (appended in order)
// @route   POST /api/admin/question-groups/:id/questions
exports.addGroupQuestions = async (req, res, next) => {
  try {
    const raw = req.body.questionIds || (req.body.questionId ? [req.body.questionId] : []);
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ success: false, message: 'questionIds array is required' });
    }

    const group = await QuestionGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Question group not found' });
    }

    const ids = await validateQuestionIds(raw);
    const existing = new Set(group.questions.map(String));
    for (const id of ids) {
      const s = String(id);
      if (!existing.has(s)) {
        group.questions.push(id);
        existing.add(s);
      }
    }
    await group.save();
    await Question.updateMany({ _id: { $in: ids } }, { groupId: group._id });

    res.json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a child question from a group
// @route   DELETE /api/admin/question-groups/:id/questions/:questionId
exports.removeGroupQuestion = async (req, res, next) => {
  try {
    const group = await QuestionGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Question group not found' });
    }

    group.questions = group.questions.filter((q) => String(q) !== String(req.params.questionId));
    await group.save();
    await Question.updateOne(
      { _id: req.params.questionId, groupId: group._id },
      { $set: { groupId: null } }
    );

    res.json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder child questions (must reference exactly the current children)
// @route   PUT /api/admin/question-groups/:id/questions/reorder
exports.reorderGroupQuestions = async (req, res, next) => {
  try {
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds)) {
      return res.status(400).json({ success: false, message: 'questionIds array is required' });
    }

    const group = await QuestionGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Question group not found' });
    }

    const current = new Set(group.questions.map(String));
    const incoming = new Set(questionIds.map(String));
    if (current.size !== incoming.size || [...current].some((id) => !incoming.has(id))) {
      return res.status(400).json({
        success: false,
        message: 'questionIds must contain exactly the current child questions',
      });
    }

    group.questions = questionIds;
    await group.save();
    res.json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};

// @desc    Attach (or clear) media on a group stimulus
// @route   PUT /api/admin/question-groups/:id/media
exports.attachGroupMedia = async (req, res, next) => {
  try {
    const { media } = req.body;
    if (media !== null && (!media || typeof media !== 'object')) {
      return res.status(400).json({ success: false, message: 'media object (or null) is required' });
    }

    const group = await QuestionGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Question group not found' });
    }

    group.stimulus = group.stimulus || { text: '', media: null };
    group.stimulus.media = media === null ? null : {
      type: media.type || 'image',
      url: media.url || '',
      alt: media.alt || '',
    };
    await group.save();

    res.json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};

// Validate a list of question ids and return the existing subset (in input order).
async function validateQuestionIds(ids) {
  const unique = [...new Set(ids.map(String))];
  const found = await Question.find({ _id: { $in: unique } }).select('_id');
  const foundSet = new Set(found.map((q) => String(q._id)));
  const missing = unique.filter((id) => !foundSet.has(id));
  if (missing.length > 0) {
    const err = new Error(`Question(s) not found: ${missing.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
  return unique;
}
