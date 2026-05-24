const TestAttempt = require('../models/TestAttempt');
const Test = require('../models/Test');
const Question = require('../models/Question');

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// @desc    Start a test attempt
// @route   POST /api/attempts/start/:testId
exports.startAttempt = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test || !test.isActive) {
      return res.status(404).json({ success: false, message: 'Test not found or inactive' });
    }

    // Check for existing in-progress attempt
    const existing = await TestAttempt.findOne({
      user: req.user._id,
      test: test._id,
      status: 'in_progress',
    });
    if (existing) {
      // Check if the existing attempt has expired
      const elapsed = (Date.now() - existing.startedAt.getTime()) / 1000;
      const isExpired = elapsed > existing.duration + 30;

      if (isExpired || req.body.forceNew) {
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

    // Pick random questions from the pool for this attempt
    // Deduplicate by question text to avoid repeated questions from duplicate DB entries
    function dedupeByText(questions) {
      const seen = new Set();
      return questions.filter((q) => {
        if (seen.has(q.text)) return false;
        seen.add(q.text);
        return true;
      });
    }

    let selectedQuestionIds;

    if (test.type === 'full_mock') {
      // For full mock: pick proportionally from each section
      const sectionCounts = { numerical: 25, reasoning: 25, verbal: 25, advanced: 14 };
      selectedQuestionIds = [];
      for (const [section, count] of Object.entries(sectionCounts)) {
        const pool = await Question.find({ section }).select('_id text');
        const unique = dedupeByText(pool);
        const shuffled = shuffle(unique.map((q) => q._id));
        selectedQuestionIds.push(...shuffled.slice(0, Math.min(count, shuffled.length)));
      }
    } else if (test.type === 'topic_practice' && test.topic) {
      // For topic practice: pick from questions matching that specific topic
      const pool = await Question.find({ section: test.section, topic: test.topic }).select('_id text');
      const unique = dedupeByText(pool);
      const shuffled = shuffle(unique.map((q) => q._id));
      selectedQuestionIds = shuffled.slice(0, Math.min(test.totalQuestions, shuffled.length));
    } else if (test.section) {
      // For section tests: pick `totalQuestions` random questions from that section
      const pool = await Question.find({ section: test.section }).select('_id text');
      const unique = dedupeByText(pool);
      const shuffled = shuffle(unique.map((q) => q._id));
      selectedQuestionIds = shuffled.slice(0, Math.min(test.totalQuestions, shuffled.length));
    } else {
      // Fallback: use the test's fixed questions
      selectedQuestionIds = shuffle(test.questions);
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
    }).populate({
      path: 'test',
      select: 'title type section totalQuestions duration sectionLocked',
    }).populate({
      path: 'responses.question',
      select: 'text options section topic',
    });

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

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

    attempt.responses[questionIndex].selectedAnswer = selectedAnswer;
    attempt.responses[questionIndex].status = selectedAnswer !== null ? 'answered' : 'not_answered';
    if (timeSpent) {
      attempt.responses[questionIndex].timeSpent += timeSpent;
    }

    await attempt.save();
    res.json({ success: true, data: { questionIndex, status: attempt.responses[questionIndex].status } });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark question for review
// @route   PUT /api/attempts/:id/mark-review
exports.markForReview = async (req, res, next) => {
  try {
    const { questionIndex } = req.body;
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

    // Update time spent on previous question
    if (previousQuestion !== undefined && timeSpent && previousQuestion < attempt.responses.length) {
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
      { new: true }
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
    const elapsed = (now.getTime() - attempt.startedAt.getTime()) / 1000;

    attempt.submittedAt = now;
    attempt.status = elapsed > attempt.duration + 30 ? 'timed_out' : 'completed';
    await attempt.save();

    // Scoring is handled by the result controller (called separately or triggered here)
    const { calculateAndSaveResult } = require('../utils/scoringEngine');
    const result = await calculateAndSaveResult(attempt);

    res.json({ success: true, data: { attempt, result } });
  } catch (error) {
    next(error);
  }
};
