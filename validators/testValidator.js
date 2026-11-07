const { body } = require('express-validator');

const testValidator = [
  body('title').trim().notEmpty().withMessage('Test title is required'),
  body('type')
    .isIn(['section_test', 'full_mock', 'topic_practice'])
    .withMessage('Invalid test type'),
  body('section')
    .optional()
    .isIn(['numerical', 'reasoning', 'verbal', 'advanced', 'system', 'technical'])
    .withMessage('Invalid section'),
  body('topic').optional().trim(),
  body('questions')
    .optional()
    .isArray()
    .withMessage('questions must be an array'),
  body('questions.*').optional().isMongoId().withMessage('Invalid question ID'),
  body('groups')
    .optional()
    .isArray()
    .withMessage('groups must be an array'),
  body('groups.*').optional().isMongoId().withMessage('Invalid group ID'),
  body('selectionMode')
    .optional()
    .isIn(['auto', 'fixed', 'random'])
    .withMessage('Invalid selectionMode'),
  body('duration')
    .isInt({ min: 60 })
    .withMessage('Duration must be at least 60 seconds'),
];

module.exports = { testValidator };
