const Result = require('../models/Result');

// @desc    Get detailed result for an attempt
// @route   GET /api/results/:attemptId
exports.getResult = async (req, res, next) => {
  try {
    const result = await Result.findOne({
      attempt: req.params.attemptId,
      user: req.user._id,
    }).populate('test', 'title type section duration');

    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Get wrong answers with explanations (review)
// @route   GET /api/results/:attemptId/review
exports.getReview = async (req, res, next) => {
  try {
    const result = await Result.findOne({
      attempt: req.params.attemptId,
      user: req.user._id,
    }).populate({
      path: 'questionDetails.question',
      select: 'text options correctAnswer section topic explanation',
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    // Return all questions with correct/wrong status
    const review = result.questionDetails.map((qd) => ({
      question: qd.question,
      selectedAnswer: qd.selectedAnswer,
      correctAnswer: qd.correctAnswer,
      isCorrect: qd.isCorrect,
      timeSpent: qd.timeSpent,
    }));

    res.json({
      success: true,
      data: {
        score: result.score,
        totalQuestions: result.totalQuestions,
        percentage: result.percentage,
        review,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all past results for user
// @route   GET /api/results/user/history
exports.getHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [results, total] = await Promise.all([
      Result.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('test', 'title type section')
        .select('attempt score totalQuestions percentage correct wrong skipped timeTaken createdAt'),
      Result.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      success: true,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: results,
    });
  } catch (error) {
    next(error);
  }
};
