const mongoose = require('mongoose');

const solutionSchema = new mongoose.Schema(
  {
    approach: { type: String, required: true },
    code: { type: String, required: true },
    language: { type: String, default: 'python' },
    timeComplexity: { type: String, required: true },
    spaceComplexity: { type: String, required: true },
  },
  { _id: false }
);

const exampleSchema = new mongoose.Schema(
  {
    input: { type: String, required: true },
    output: { type: String, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const codingQuestionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    constraints: {
      type: [String],
      default: [],
    },
    examples: {
      type: [exampleSchema],
      required: true,
    },
    bruteForce: {
      type: solutionSchema,
      required: true,
    },
    optimal: {
      type: solutionSchema,
      required: true,
    },
    source: {
      type: String,
      default: 'TCS NQT PYQ',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

codingQuestionSchema.index({ topic: 1 });
codingQuestionSchema.index({ difficulty: 1 });

module.exports = mongoose.model('CodingQuestion', codingQuestionSchema);
