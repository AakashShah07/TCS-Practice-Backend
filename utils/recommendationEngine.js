const UserAnalytics = require('../models/UserAnalytics');

// Update analytics after each test completion
const updateUserAnalytics = async (userId, result) => {
  let analytics = await UserAnalytics.findOne({ user: userId });

  if (!analytics) {
    analytics = new UserAnalytics({ user: userId });
  }

  // Update totals
  analytics.totalTests += 1;
  analytics.totalTimeSpent += result.timeTaken;

  // Running average for score
  analytics.avgScore =
    ((analytics.avgScore * (analytics.totalTests - 1)) + result.percentage) / analytics.totalTests;
  analytics.avgScore = Math.round(analytics.avgScore * 100) / 100;

  // Running average for accuracy (correct / attempted)
  const attempted = result.correct + result.wrong;
  const accuracy = attempted > 0 ? (result.correct / attempted) * 100 : 0;
  analytics.avgAccuracy =
    ((analytics.avgAccuracy * (analytics.totalTests - 1)) + accuracy) / analytics.totalTests;
  analytics.avgAccuracy = Math.round(analytics.avgAccuracy * 100) / 100;

  // Update section performance
  for (const sec of result.sectionWise) {
    const existing = analytics.sectionPerformance.get(sec.section) || {
      attempts: 0, totalCorrect: 0, totalQuestions: 0, avgTimePerQ: 0, totalTime: 0,
    };
    existing.attempts += 1;
    existing.totalCorrect += sec.correct;
    existing.totalQuestions += sec.total;
    existing.totalTime += sec.avgTimePerQuestion * sec.total;
    existing.avgTimePerQ = existing.totalQuestions > 0
      ? Math.round((existing.totalTime / existing.totalQuestions) * 100) / 100
      : 0;
    analytics.sectionPerformance.set(sec.section, existing);
  }

  // Update topic performance
  for (const top of result.topicWise) {
    const existing = analytics.topicPerformance.get(top.topic) || {
      attempts: 0, correct: 0, wrong: 0, total: 0, accuracy: 0, confidence: 'weak',
    };
    existing.attempts += 1;
    existing.correct += top.correct;
    existing.wrong += top.wrong;
    existing.total += top.total;

    const totalAttempted = existing.correct + existing.wrong;
    existing.accuracy = totalAttempted > 0
      ? Math.round((existing.correct / totalAttempted) * 10000) / 100
      : 0;

    // Confidence based on accuracy + attempt volume
    if (existing.accuracy >= 70 && existing.total >= 5) {
      existing.confidence = 'strong';
    } else if (existing.accuracy >= 40 || existing.total < 5) {
      existing.confidence = 'medium';
    } else {
      existing.confidence = 'weak';
    }

    analytics.topicPerformance.set(top.topic, existing);
  }

  // Add to score history (keep last 50)
  analytics.scoreHistory.push({
    date: new Date(),
    score: result.score,
    percentage: result.percentage,
    testType: result.test ? 'test' : 'unknown',
    testId: result.test,
  });
  if (analytics.scoreHistory.length > 50) {
    analytics.scoreHistory = analytics.scoreHistory.slice(-50);
  }

  analytics.lastUpdated = new Date();
  await analytics.save();

  return analytics;
};

// Generate smart recommendations
const generateRecommendations = (analytics) => {
  const recommendations = [];

  if (!analytics || analytics.totalTests === 0) {
    return [{ type: 'info', message: 'Take your first test to get personalized recommendations!' }];
  }

  // Find weak topics
  const weakTopics = [];
  const strongTopics = [];
  for (const [topic, data] of analytics.topicPerformance) {
    if (data.confidence === 'weak') weakTopics.push({ topic, ...data });
    if (data.confidence === 'strong') strongTopics.push({ topic, ...data });
  }

  // Weak topic recommendations
  for (const wt of weakTopics.slice(0, 3)) {
    recommendations.push({
      type: 'revise',
      priority: 'high',
      message: `Revise "${wt.topic}" — your accuracy is ${wt.accuracy}% (${wt.correct}/${wt.correct + wt.wrong} correct)`,
      topic: wt.topic,
    });
  }

  // Section-level recommendations
  const sections = Array.from(analytics.sectionPerformance.entries());
  if (sections.length > 1) {
    const sorted = sections.sort((a, b) => {
      const accA = a[1].totalQuestions > 0 ? a[1].totalCorrect / a[1].totalQuestions : 0;
      const accB = b[1].totalQuestions > 0 ? b[1].totalCorrect / b[1].totalQuestions : 0;
      return accA - accB;
    });

    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];
    const weakAcc = weakest[1].totalQuestions > 0
      ? Math.round((weakest[1].totalCorrect / weakest[1].totalQuestions) * 100)
      : 0;

    if (weakAcc < 50) {
      recommendations.push({
        type: 'focus',
        priority: 'high',
        message: `Focus more on "${weakest[0]}" section — accuracy is only ${weakAcc}%`,
        section: weakest[0],
      });
    }

    if (strongest[1].totalQuestions > 0) {
      const strongAcc = Math.round((strongest[1].totalCorrect / strongest[1].totalQuestions) * 100);
      if (strongAcc > 70) {
        recommendations.push({
          type: 'strength',
          priority: 'low',
          message: `Your "${strongest[0]}" is strong at ${strongAcc}% — shift focus to weaker sections`,
          section: strongest[0],
        });
      }
    }
  }

  // Speed recommendations
  for (const [section, data] of analytics.sectionPerformance) {
    if (data.avgTimePerQ > 120) {
      recommendations.push({
        type: 'speed',
        priority: 'medium',
        message: `You're spending ${Math.round(data.avgTimePerQ)}s per question in "${section}" — try to improve speed`,
        section,
      });
    }
  }

  // Overall progress
  if (analytics.totalTests >= 3 && analytics.avgScore < 50) {
    recommendations.push({
      type: 'practice',
      priority: 'high',
      message: 'Your average score is below 50%. Consider doing more topic-wise practice before attempting full mocks.',
    });
  }

  return recommendations.length > 0
    ? recommendations
    : [{ type: 'info', message: 'Great progress! Keep practicing to maintain your performance.' }];
};

module.exports = { updateUserAnalytics, generateRecommendations };
