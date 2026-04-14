const UserAnalytics = require('../models/UserAnalytics');
const Result = require('../models/Result');
const { generateRecommendations } = require('../utils/recommendationEngine');

// @desc    Get user analytics dashboard
// @route   GET /api/analytics/dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    const analytics = await UserAnalytics.findOne({ user: req.user._id });

    if (!analytics) {
      return res.json({
        success: true,
        data: {
          totalTests: 0,
          avgScore: 0,
          avgAccuracy: 0,
          totalTimeSpent: 0,
          sectionPerformance: {},
          message: 'No tests taken yet',
        },
      });
    }

    res.json({
      success: true,
      data: {
        totalTests: analytics.totalTests,
        avgScore: analytics.avgScore,
        avgAccuracy: analytics.avgAccuracy,
        totalTimeSpent: analytics.totalTimeSpent,
        sectionPerformance: Object.fromEntries(analytics.sectionPerformance),
        lastUpdated: analytics.lastUpdated,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Section deep-dive
// @route   GET /api/analytics/section/:section
exports.getSectionAnalysis = async (req, res, next) => {
  try {
    const { section } = req.params;
    const analytics = await UserAnalytics.findOne({ user: req.user._id });

    if (!analytics) {
      return res.status(404).json({ success: false, message: 'No analytics data yet' });
    }

    const sectionData = analytics.sectionPerformance.get(section);
    if (!sectionData) {
      return res.json({ success: true, data: null, message: `No data for section "${section}"` });
    }

    // Get topic breakdown for this section
    const topicBreakdown = [];
    for (const [topic, data] of analytics.topicPerformance) {
      // Find topics belonging to this section from results
      const results = await Result.find({ user: req.user._id });
      for (const r of results) {
        const matching = r.topicWise.filter((t) => t.section === section && t.topic === topic);
        if (matching.length > 0) {
          topicBreakdown.push({ topic, ...data });
          break;
        }
      }
    }

    res.json({
      success: true,
      data: {
        section,
        ...sectionData,
        accuracy: sectionData.totalQuestions > 0
          ? Math.round((sectionData.totalCorrect / sectionData.totalQuestions) * 10000) / 100
          : 0,
        topicBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Topic-wise performance table
// @route   GET /api/analytics/topics
exports.getTopicPerformance = async (req, res, next) => {
  try {
    const analytics = await UserAnalytics.findOne({ user: req.user._id });

    if (!analytics) {
      return res.json({ success: true, data: [] });
    }

    const topics = [];
    for (const [topic, data] of analytics.topicPerformance) {
      topics.push({ topic, ...data });
    }

    // Sort by accuracy ascending (weakest first)
    topics.sort((a, b) => a.accuracy - b.accuracy);

    res.json({ success: true, data: topics });
  } catch (error) {
    next(error);
  }
};

// @desc    Time analysis
// @route   GET /api/analytics/time-analysis
exports.getTimeAnalysis = async (req, res, next) => {
  try {
    // Get recent results with question details
    const results = await Result.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: 'questionDetails.question',
        select: 'topic section',
      });

    if (results.length === 0) {
      return res.json({ success: true, data: { insights: [], questions: [] } });
    }

    // Analyze time patterns
    const allQuestions = results.flatMap((r) => r.questionDetails);
    const avgTime = allQuestions.reduce((sum, q) => sum + q.timeSpent, 0) / allQuestions.length;

    const overthinking = allQuestions
      .filter((q) => q.timeSpent > avgTime * 2 && !q.isCorrect)
      .map((q) => ({
        topic: q.question?.topic,
        section: q.question?.section,
        timeSpent: q.timeSpent,
        type: 'overthinking',
      }));

    const guessing = allQuestions
      .filter((q) => q.timeSpent < 15 && !q.isCorrect && q.selectedAnswer !== null)
      .map((q) => ({
        topic: q.question?.topic,
        section: q.question?.section,
        timeSpent: q.timeSpent,
        type: 'guessing',
      }));

    const insights = [];
    if (overthinking.length > 0) {
      const topics = [...new Set(overthinking.map((q) => q.topic).filter(Boolean))];
      insights.push({
        type: 'overthinking',
        count: overthinking.length,
        message: `You spent too much time on ${overthinking.length} questions but still got them wrong.`,
        affectedTopics: topics.slice(0, 5),
      });
    }
    if (guessing.length > 0) {
      const topics = [...new Set(guessing.map((q) => q.topic).filter(Boolean))];
      insights.push({
        type: 'guessing',
        count: guessing.length,
        message: `You answered ${guessing.length} questions too quickly and got them wrong — likely guessing.`,
        affectedTopics: topics.slice(0, 5),
      });
    }

    res.json({
      success: true,
      data: {
        avgTimePerQuestion: Math.round(avgTime * 100) / 100,
        totalQuestionsAnalyzed: allQuestions.length,
        insights,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Smart recommendations
// @route   GET /api/analytics/recommendations
exports.getRecommendations = async (req, res, next) => {
  try {
    const analytics = await UserAnalytics.findOne({ user: req.user._id });
    const recommendations = generateRecommendations(analytics);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    next(error);
  }
};

// @desc    Score & accuracy trends over time
// @route   GET /api/analytics/trends
exports.getTrends = async (req, res, next) => {
  try {
    const analytics = await UserAnalytics.findOne({ user: req.user._id });

    if (!analytics || analytics.scoreHistory.length === 0) {
      return res.json({ success: true, data: { scoreHistory: [] } });
    }

    res.json({
      success: true,
      data: {
        scoreHistory: analytics.scoreHistory,
        currentAvgScore: analytics.avgScore,
        currentAvgAccuracy: analytics.avgAccuracy,
        totalTests: analytics.totalTests,
      },
    });
  } catch (error) {
    next(error);
  }
};
