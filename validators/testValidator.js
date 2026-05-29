const { body } = require('express-validator');

const testValidator = [
  body('title').trim().notEmpty().withMessage('Test title is required'),
  body('type')
    .isIn(['section_test', 'full_mock', 'topic_practice'])
    .withMessage('Invalid test type'),
  body('section')
    .optional()
    .isIn(['numerical', 'reasoning', 'verbal', 'advanced', 'system'])
    .withMessage('Invalid section'),
  body('topic').optional().trim(),
  body('questions')
    .isArray({ min: 1 })
    .withMessage('At least one question is required'),
  body('questions.*').isMongoId().withMessage('Invalid question ID'),
  body('duration')
    .isInt({ min: 60 })
    .withMessage('Duration must be at least 60 seconds'),
];

module.exports = { testValidator };
