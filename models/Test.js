const mongoose = require('mongoose');

const testSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Test title is required'],
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['section_test', 'full_mock', 'topic_practice'],
    },
    section: {
      type: String,
      enum: ['numerical', 'reasoning', 'verbal', 'advanced', 'system', 'technical'],
    },
    topic: {
      type: String,
      trim: true,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    // Curated question groups (shared stimuli) for fixed selection.
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuestionGroup',
      },
    ],
    // Question selection strategy:
    //  'auto'   - legacy behaviour (section/topic pool sampling, questions[] fallback)
    //  'fixed'  - use configured groups + questions in the exact configured order
    //  'random' - sample from the configured section/topic pool
    selectionMode: {
      type: String,
      enum: ['auto', 'fixed', 'random'],
      default: 'auto',
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
      required: [true, 'Duration in seconds is required'],
    },
    sectionLocked: {
      type: Boolean,
      default: false,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Test', testSchema);
