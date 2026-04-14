const mongoose = require('mongoose');

const userAnalyticsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    totalTests: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    avgAccuracy: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 },
    sectionPerformance: {
      type: Map,
      of: {
        attempts: { type: Number, default: 0 },
        totalCorrect: { type: Number, default: 0 },
        totalQuestions: { type: Number, default: 0 },
        avgTimePerQ: { type: Number, default: 0 },
        totalTime: { type: Number, default: 0 },
      },
      default: {},
    },
    topicPerformance: {
      type: Map,
      of: {
        attempts: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
        wrong: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        confidence: { type: String, enum: ['strong', 'medium', 'weak'], default: 'weak' },
      },
      default: {},
    },
    scoreHistory: [
      {
        date: Date,
        score: Number,
        percentage: Number,
        testType: String,
        testId: mongoose.Schema.Types.ObjectId,
      },
    ],
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserAnalytics', userAnalyticsSchema);
