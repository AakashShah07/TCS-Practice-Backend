const mongoose = require('mongoose');

const questionDetailSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedAnswer: { type: Number, default: null },
    correctAnswer: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    timeSpent: { type: Number, default: 0 },
  },
  { _id: false }
);

const sectionBreakdownSchema = new mongoose.Schema(
  {
    section: String,
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    avgTimePerQuestion: { type: Number, default: 0 },
  },
  { _id: false }
);

const topicBreakdownSchema = new mongoose.Schema(
  {
    topic: String,
    section: String,
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
    },
    attempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestAttempt',
      required: true,
    },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true },
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    timeTaken: { type: Number, default: 0 },
    sectionWise: [sectionBreakdownSchema],
    topicWise: [topicBreakdownSchema],
    questionDetails: [questionDetailSchema],
  },
  { timestamps: true }
);

resultSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Result', resultSchema);
