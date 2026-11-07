const TestAttempt = require('../models/TestAttempt');
const Test = require('../models/Test');
const Question = require('../models/Question');
const QuestionGroup = require('../models/QuestionGroup');
const {
  selectQuestionIds,
  buildQuestionAssemblies,
} = require('../utils/questionSelection');

// Grace period (seconds) allowed beyond the configured duration before an
// attempt is treated as expired. Matches the existing resume logic.
const ATTEMPT_GRACE_SECONDS = 30;

const isExpired = (attempt, now = Date.now()) =>
  (now - attempt.startedAt.getTime()) / 1000 > attempt.duration + ATTEMPT_GRACE_SECONDS;

// @desc    Start a test attempt
// @route   POST /api/attempts/start/:testId
exports.startAttempt = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test || !test.isActive) {
      return res.status(404).json({ success: false, message: 'Test not found or inactive' });
    }

    // Premium tests require an active premium membership (checked against the DB, not client claims)
    if (test.isPremium && !req.user.isPremium) {
      return res.status(403).json({ success: false, code: 'PREMIUM_REQUIRED', message: 'Premium subscription required' });
    }

    // Check for existing in-progress attempt
    const existing = await TestAttempt.findOne({
      user: req.user._id,
      test: test._id,
      status: 'in_progress',
    });
    if (existing) {
      if (isExpired(existing) || req.body.forceNew) {
        // Mark old attempt as timed_out so a fresh one can be created
        existing.status = 'timed_out';
        existing.submittedAt = new Date();
        await existing.save();
      } else {
        return res.json({
          success: true,
          message: 'Resuming existing attempt',
          data: existing,
        });
      }
    }

    // Select questions according to the test's strategy (fixed | random | auto).
    // Fixed selection preserves configured order and expands groups into their
    // ordered children, so a child question is never returned without its group.
    const selectedQuestionIds = await selectQuestionIds(test);

    if (!selectedQuestionIds || selectedQuestionIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No questions available for this test' });
    }

    const responses = selectedQuestionIds.map((qId) => ({
      question: qId,
      selectedAnswer: null,
      status: 'not_visited',
      timeSpent: 0,
    }));

    const attempt = await TestAttempt.create({
      user: req.user._id,
      test: test._id,
      duration: test.duration,
      responses,
      currentSection: test.section || null,
    });

    res.status(201).json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attempt state (for resume)
// @route   GET /api/attempts/:id/state
exports.getAttemptState = async (req, res, next) => {
  try {
    const attempt = await TestAttempt.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate({
        path: 'test',
        select: 'title type section totalQuestions duration sectionLocked selectionMode',
      })
      .populate({
        // Never expose correctAnswer or explanation during an active attempt.
        path: 'responses.question',
        select: 'text options section topic difficulty questionType media optionMedia groupId',
      })
      .lean();

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    const questionDocs = (attempt.responses || []).map((r) => r.question).filter(Boolean);
    const groupIds = [...new Set(questionDocs.map((q) => q.groupId).filter(Boolean).map(String))];
    const groups = groupIds.length
      ? await QuestionGroup.find({ _id: { $in: groupIds } }).lean()
      : [];

    const { questionMode, questionGroups } = buildQuestionAssemblies(questionDocs, groups);
    attempt.questionMode = questionMode;
    attempt.questionGroups = questionGroups;

    res.json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};

// @desc    Save/update answer for a question
// @route   PUT /api/attempts/:id/answer
exports.saveAnswer = async (req, res, next) => {
  try {
    const { questionIndex, selectedAnswer, timeSpent } = req.body;

    if (!Number.isInteger(questionIndex)) {
      return res.status(400).json({ success: false, message: 'questionIndex must be an integer' });
    }

    const attempt = await TestAttempt.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'in_progress',
    });

    if (!attempt) {
      return res.status(400).json({ success: false, message: 'No active attempt found' });
    }

    // Server-side timer enforcement — never trust the client.
    if (isExpired(attempt)) {
      attempt.status = 'timed_out';
      attempt.submittedAt = new Date();
      await attempt.save();
      return res.status(400).json({ success: false, code: 'ATTEMPT_EXPIRED', message: 'Attempt time has expired' });
    }

    if (questionIndex < 0 || questionIndex >= attempt.responses.length) {
      return res.status(400).json({ success: false, message: 'Invalid question index' });
    }

    // Validate the answer against the actual option count of the referenced question.
    const response = attempt.responses[questionIndex];
    const question = await Question.findById(response.question).select('options');
    if (!question) {
      return res.status(400).json({ success: false, message: 'Question no longer available' });
    }

    if (selectedAnswer !== null) {
      const optionCount = question.options.length;
      if (!Number.isInteger(selectedAnswer) || selectedAnswer < 0 || selectedAnswer >= optionCount) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_ANSWER',
          message: `selectedAnswer must be an integer between 0 and ${optionCount - 1}, or null`,
        });
      }
    }

    if (timeSpent !== undefined && (!Number.isFinite(timeSpent) || timeSpent < 0)) {
      return res.status(400).json({ success: false, message: 'timeSpent must be a non-negative number' });
    }

    response.selectedAnswer = selectedAnswer;
    response.status = selectedAnswer !== null ? 'answered' : 'not_answered';
    if (timeSpent) {
      response.timeSpent += timeSpent;
    }

    await attempt.save();
    res.json({ success: true, data: { questionIndex, status: response.status } });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark question for review
// @route   PUT /api/attempts/:id/mark-review
exports.markForReview = async (req, res, next) => {
  try {
    const { questionIndex } = req.body;
    if (!Number.isInteger(questionIndex)) {
      return res.status(400).json({ success: false, message: 'questionIndex must be an integer' });
    }

    const attempt = await TestAttempt.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'in_progress',
    });

    if (!attempt) {
      return res.status(400).json({ success: false, message: 'No active attempt found' });
    }

    if (questionIndex < 0 || questionIndex >= attempt.responses.length) {
      return res.status(400).json({ success: false, message: 'Invalid question index' });
    }

    const current = attempt.responses[questionIndex].markedForReview || false;
    attempt.responses[questionIndex].markedForReview = !current;
    await attempt.save();
    res.json({ success: true, data: { questionIndex, markedForReview: !current } });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear response for a question
// @route   PUT /api/attempts/:id/clear
exports.clearResponse = async (req, res, next) => {
  try {
    const { questionIndex } = req.body;
    if (!Number.isInteger(questionIndex)) {
      return res.status(400).json({ success: false, message: 'questionIndex must be an integer' });
    }

    const attempt = await TestAttempt.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'in_progress',
    });

    if (!attempt) {
      return res.status(400).json({ success: false, message: 'No active attempt found' });
    }

    if (questionIndex < 0 || questionIndex >= attempt.responses.length) {
      return res.status(400).json({ success: false, message: 'Invalid question index' });
    }

    attempt.responses[questionIndex].selectedAnswer = null;
    attempt.responses[questionIndex].status = 'not_answered';
    await attempt.save();
    res.json({ success: true, data: { questionIndex, status: 'not_answered' } });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current question/section navigation
// @route   PUT /api/attempts/:id/navigate
exports.navigate = async (req, res, next) => {
  try {
    const { currentQuestion, currentSection, timeSpent, previousQuestion } = req.body;
    const attempt = await TestAttempt.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'in_progress',
    });

    if (!attempt) {
      return res.status(400).json({ success: false, message: 'No active attempt found' });
    }

    // Update time spent on the previous question (validated index range)
    if (
      previousQuestion !== undefined &&
      Number.isInteger(previousQuestion) &&
      previousQuestion >= 0 &&
      previousQuestion < attempt.responses.length &&
      timeSpent
    ) {
      attempt.responses[previousQuestion].timeSpent += timeSpent;
      if (attempt.responses[previousQuestion].status === 'not_visited') {
        attempt.responses[previousQuestion].status = 'not_answered';
      }
    }

    attempt.currentQuestion = currentQuestion;
    if (currentSection) attempt.currentSection = currentSection;

    await attempt.save();
    res.json({ success: true, data: { currentQuestion, currentSection } });
  } catch (error) {
    next(error);
  }
};

// @desc    Record tab switch
// @route   PUT /api/attempts/:id/tab-switch
exports.recordTabSwitch = async (req, res, next) => {
  try {
    const attempt = await TestAttempt.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: 'in_progress' },
      { $inc: { tabSwitchCount: 1 } },
      { returnDocument: 'after' }
    );

    if (!attempt) {
      return res.status(400).json({ success: false, message: 'No active attempt found' });
    }

    res.json({ success: true, data: { tabSwitchCount: attempt.tabSwitchCount } });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit test
// @route   POST /api/attempts/:id/submit
exports.submitAttempt = async (req, res, next) => {
  try {
    const attempt = await TestAttempt.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'in_progress',
    });

    if (!attempt) {
      return res.status(400).json({ success: false, message: 'No active attempt or already submitted' });
    }

    const now = new Date();
    attempt.submittedAt = now;
    attempt.status = isExpired(attempt, now.getTime()) ? 'timed_out' : 'completed';
    await attempt.save();

    // Scoring is handled by the result controller (called separately or triggered here)
    const { calculateAndSaveResult } = require('../utils/scoringEngine');
    const result = await calculateAndSaveResult(attempt);

    res.json({ success: true, data: { attempt, result } });
  } catch (error) {
    next(error);
  }
};
