const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    options: {
      type: [String],
      required: [true, 'Options are required'],
      validate: {
        validator: (v) => v.length === 4,
        message: 'Exactly 4 options are required',
      },
    },
    correctAnswer: {
      type: Number,
      required: [true, 'Correct answer index is required'],
      min: 0,
      max: 3,
    },
    section: {
      type: String,
      required: [true, 'Section is required'],
      enum: ['numerical', 'reasoning', 'verbal', 'advanced', 'system'],
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
  },
  { timestamps: true }
);

// Indexes for filtered queries
questionSchema.index({ section: 1, topic: 1 });
questionSchema.index({ section: 1, difficulty: 1 });
// Prevent duplicate questions with the same text in the same topic
questionSchema.index({ text: 1, topic: 1 }, { unique: true });

module.exports = mongoose.model('Question', questionSchema);
