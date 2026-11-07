const { body } = require('express-validator');

const SECTIONS = ['numerical', 'reasoning', 'verbal', 'advanced', 'system', 'technical'];
const GROUP_TYPES = ['data_interpretation', 'reading_comprehension', 'image_based', 'table_based', 'case_study', 'data_sufficiency', 'syllogism'];

const questionValidator = [
  body('text').trim().notEmpty().withMessage('Question text is required'),
  body('options')
    .isArray({ min: 2, max: 5 })
    .withMessage('Between 2 and 5 options are required'),
  body('options.*').trim().notEmpty().withMessage('Each option must be non-empty'),
  body('correctAnswer')
    .isInt({ min: 0, max: 4 })
    .withMessage('Correct answer must be 0-4 (validated against the number of options)'),
  body('marks')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Marks must be an integer between 0 and 100'),
  body('section')
    .isIn(SECTIONS)
    .withMessage('Invalid section'),
  body('topic').trim().notEmpty().withMessage('Topic is required'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty'),
  body('explanation').optional().trim(),
  body('questionType')
    .optional()
    .isIn(['mcq', 'image_mcq'])
    .withMessage('Invalid questionType'),
  body('groupId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid groupId'),
  body('media').optional({ nullable: true }).isObject().withMessage('media must be an object'),
  body('media.type').optional().isIn(['image', 'chart', 'table']).withMessage('Invalid media type'),
  body('media.url').optional().trim(),
  body('media.alt').optional().trim(),
  body('optionMedia').optional({ nullable: true }).isArray({ max: 5 }).withMessage('optionMedia must be an array of up to 5 media objects'),
  body('optionMedia.*').optional({ nullable: true }).isObject().withMessage('Each optionMedia entry must be an object'),
  body('optionMedia.*.type').optional().isIn(['image', 'chart', 'table']).withMessage('Invalid optionMedia type'),
  body('optionMedia.*.url').optional().trim(),
  body('optionMedia.*.alt').optional().trim(),
];

const bulkQuestionValidator = [
  body('questions').isArray({ min: 1 }).withMessage('Questions array is required'),
  body('questions.*.text').trim().notEmpty().withMessage('Question text is required'),
  body('questions.*.options')
    .isArray({ min: 2, max: 5 })
    .withMessage('Between 2 and 5 options required'),
  body('questions.*.correctAnswer')
    .isInt({ min: 0, max: 4 })
    .withMessage('Correct answer must be 0-4'),
  body('questions.*.marks')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Marks must be an integer between 0 and 100'),
  body('questions.*.section')
    .isIn(SECTIONS)
    .withMessage('Invalid section'),
  body('questions.*.topic').trim().notEmpty().withMessage('Topic is required'),
  body('questions.*.questionType')
    .optional()
    .isIn(['mcq', 'image_mcq'])
    .withMessage('Invalid questionType'),
  body('questions.*.media').optional({ nullable: true }).isObject().withMessage('media must be an object'),
  body('questions.*.media.type').optional().isIn(['image', 'chart', 'table']).withMessage('Invalid media type'),
  body('questions.*.optionMedia').optional({ nullable: true }).isArray({ max: 5 }).withMessage('optionMedia must be an array of up to 5 media objects'),
  body('questions.*.optionMedia.*').optional({ nullable: true }).isObject().withMessage('Each optionMedia entry must be an object'),
  body('questions.*.optionMedia.*.type').optional().isIn(['image', 'chart', 'table']).withMessage('Invalid optionMedia type'),
];

const questionGroupValidator = [
  body('title').trim().notEmpty().withMessage('Group title is required'),
  body('type').isIn(GROUP_TYPES).withMessage('Invalid group type'),
  body('section').optional().isIn(SECTIONS).withMessage('Invalid section'),
  body('topic').optional().trim(),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty'),
  body('stimulus').optional().isObject().withMessage('stimulus must be an object'),
  body('stimulus.text').optional().isString(),
  body('stimulus.media').optional({ nullable: true }).isObject().withMessage('stimulus.media must be an object'),
  body('questions').optional().isArray().withMessage('questions must be an array'),
  body('questions.*').optional().isMongoId().withMessage('Invalid question ID'),
];

module.exports = { questionValidator, bulkQuestionValidator, questionGroupValidator, SECTIONS, GROUP_TYPES };
