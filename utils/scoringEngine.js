const Result = require('../models/Result');
const Question = require('../models/Question');
const { updateUserAnalytics } = require('./recommendationEngine');

const calculateAndSaveResult = async (attempt) => {
  // Load all questions for this attempt
  const questionIds = attempt.responses.map((r) => r.question);
  const questions = await Question.find({ _id: { $in: questionIds } });
  const questionMap = Object.fromEntries(questions.map((q) => [q._id.toString(), q]));

  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let totalTime = 0;
  const questionDetails = [];

  // Section and topic accumulators
  const sectionStats = {};
  const topicStats = {};

  for (const response of attempt.responses) {
    const question = questionMap[response.question.toString()];
    if (!question) continue;

    const isCorrect = response.selectedAnswer === question.correctAnswer;
    const isSkipped = response.selectedAnswer === null;

    if (isSkipped) {
      skipped++;
    } else if (isCorrect) {
      correct++;
    } else {
      wrong++;
    }

    totalTime += response.timeSpent || 0;

    questionDetails.push({
      question: question._id,
      selectedAnswer: response.selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect: !isSkipped && isCorrect,
      markedForReview: response.status === 'marked_for_review',
      timeSpent: response.timeSpent || 0,
    });

    // Section stats
    const sec = question.section;
    if (!sectionStats[sec]) {
      sectionStats[sec] = { section: sec, correct: 0, wrong: 0, skipped: 0, total: 0, totalTime: 0 };
    }
    sectionStats[sec].total++;
    sectionStats[sec].totalTime += response.timeSpent || 0;
    if (isSkipped) sectionStats[sec].skipped++;
    else if (isCorrect) sectionStats[sec].correct++;
    else sectionStats[sec].wrong++;

    // Topic stats
    const top = question.topic;
    const topKey = `${sec}:${top}`;
    if (!topicStats[topKey]) {
      topicStats[topKey] = { topic: top, section: sec, correct: 0, wrong: 0, skipped: 0, total: 0 };
    }
    topicStats[topKey].total++;
    if (isSkipped) topicStats[topKey].skipped++;
    else if (isCorrect) topicStats[topKey].correct++;
    else topicStats[topKey].wrong++;
  }

  // Calculate percentages
  const totalQuestions = attempt.responses.length;
  const percentage = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 10000) / 100 : 0;

  const sectionWise = Object.values(sectionStats).map((s) => ({
    ...s,
    accuracy: s.total - s.skipped > 0
      ? Math.round((s.correct / (s.total - s.skipped)) * 10000) / 100
      : 0,
    avgTimePerQuestion: s.total > 0 ? Math.round((s.totalTime / s.total) * 100) / 100 : 0,
    totalTime: undefined,
  }));

  const topicWise = Object.values(topicStats).map((t) => ({
    ...t,
    accuracy: t.total - t.skipped > 0
      ? Math.round((t.correct / (t.total - t.skipped)) * 10000) / 100
      : 0,
  }));

  const result = await Result.create({
    user: attempt.user,
    test: attempt.test,
    attempt: attempt._id,
    score: correct,
    totalQuestions,
    percentage,
    correct,
    wrong,
    skipped,
    timeTaken: totalTime,
    sectionWise,
    topicWise,
    questionDetails,
  });

  // Update user analytics in the background
  try {
    await updateUserAnalytics(attempt.user, result);
  } catch (err) {
    console.error('Analytics update error:', err.message);
  }

  return result;
};

module.exports = { calculateAndSaveResult };
