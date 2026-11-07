const mongoose = require('mongoose');
const { mediaSchema, MEDIA_TYPES } = require('./mediaSchema');

// A QuestionGroup represents a shared stimulus (graph, table, passage, case study)
// with one or more ordered child questions that all reference it.
const GROUP_TYPES = [
  'data_interpretation',
  'reading_comprehension',
  'image_based',
  'table_based',
  'case_study',
  'data_sufficiency',
  'syllogism',
];

const questionGroupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Group title is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Group type is required'],
      enum: GROUP_TYPES,
    },
    section: {
      type: String,
      enum: ['numerical', 'reasoning', 'verbal', 'advanced', 'system', 'technical'],
    },
    topic: {
      type: String,
      trim: true,
    },
    stimulus: {
      text: {
        type: String,
        default: '',
      },
      media: {
        type: mediaSchema,
        default: null,
      },
    },
    // Ordered child question references.
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

questionGroupSchema.index({ section: 1, topic: 1 });
questionGroupSchema.index({ type: 1 });

module.exports = mongoose.model('QuestionGroup', questionGroupSchema);
module.exports.GROUP_TYPES = GROUP_TYPES;
module.exports.MEDIA_TYPES = MEDIA_TYPES;
