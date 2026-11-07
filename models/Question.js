const mongoose = require('mongoose');
const { mediaSchema } = require('./mediaSchema');

const questionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    // Flexible option count: 2–5 (supports the legacy 4-option MCQs and 5-option MCQs).
    options: {
      type: [String],
      required: [true, 'Options are required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 2 && v.length <= 5,
        message: 'Between 2 and 5 options are required',
      },
    },
    correctAnswer: {
      type: Number,
      required: [true, 'Correct answer index is required'],
      min: 0,
    },
    section: {
      type: String,
      required: [true, 'Section is required'],
      enum: ['numerical', 'reasoning', 'verbal', 'advanced', 'system', 'technical'],
    },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    explanation: {
      type: String,
      default: '',
    },
    // Optional per-question marks (defaults to 1 for legacy questions).
    marks: {
      type: Number,
      default: 1,
      min: 0,
      max: 100,
    },
    // 'mcq' = text-only question; 'image_mcq' = question that also carries media.
    questionType: {
      type: String,
      enum: ['mcq', 'image_mcq'],
      default: 'mcq',
    },
    // Present for grouped questions (shared stimulus lives on the QuestionGroup).
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionGroup',
      default: null,
      index: true,
    },
    // Optional per-question media (used by image_mcq).
    media: {
      type: mediaSchema,
      default: null,
    },
    // Optional per-option media, parallel to `options` (image-based answer choices).
    optionMedia: {
      type: [mediaSchema],
      default: [],
      validate: {
        validator: (v) => Array.isArray(v) && v.length <= 5,
        message: 'optionMedia can contain at most 5 entries',
      },
    },
  },
  { timestamps: true }
);

// Cross-field validation: correctAnswer must be a valid index into options.
// Implemented as a document hook so it also applies to discriminators
// (e.g. PassageQuestion) that redefine the correctAnswer path.
questionSchema.pre('validate', function validateCorrectAnswer() {
  if (
    this.correctAnswer !== undefined &&
    this.correctAnswer !== null &&
    Array.isArray(this.options) &&
    this.options.length > 0 &&
    (this.correctAnswer < 0 || this.correctAnswer >= this.options.length)
  ) {
    this.invalidate(
      'correctAnswer',
      `correctAnswer (${this.correctAnswer}) must be a valid index for ${this.options.length} options`
    );
  }

  // optionMedia must align 1:1 with options when supplied.
  if (
    Array.isArray(this.optionMedia) &&
    this.optionMedia.length > 0 &&
    Array.isArray(this.options) &&
    this.optionMedia.length !== this.options.length
  ) {
    this.invalidate(
      'optionMedia',
      `optionMedia (${this.optionMedia.length}) must match options count (${this.options.length})`
    );
  }
});

// Indexes for filtered queries
questionSchema.index({ section: 1, topic: 1 });
questionSchema.index({ section: 1, difficulty: 1 });
// Prevent duplicate questions with the same text in the same topic
questionSchema.index({ text: 1, topic: 1 }, { unique: true });

module.exports = mongoose.model('Question', questionSchema);
