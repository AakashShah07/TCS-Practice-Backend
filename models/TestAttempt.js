const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    selectedAnswer: {
      type: Number,
      default: null,
      min: 0,
      max: 3,
    },
    status: {
      type: String,
      enum: ['not_visited', 'answered', 'not_answered', 'marked_for_review'],
      default: 'not_visited',
    },
    markedForReview: {
      type: Boolean,
      default: false,
    },
    timeSpent: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const testAttemptSchema = new mongoose.Schema(
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
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
    duration: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'timed_out'],
      default: 'in_progress',
    },
    currentQuestion: {
      type: Number,
      default: 0,
    },
    currentSection: {
      type: String,
    },
    responses: [responseSchema],
    tabSwitchCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for finding in-progress attempts
testAttemptSchema.index({ user: 1, status: 1 });
testAttemptSchema.index({ user: 1, test: 1 });

module.exports = mongoose.model('TestAttempt', testAttemptSchema);
