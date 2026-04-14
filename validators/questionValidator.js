const { body } = require('express-validator');

const questionValidator = [
  body('text').trim().notEmpty().withMessage('Question text is required'),
  body('options')
    .isArray({ min: 4, max: 4 })
    .withMessage('Exactly 4 options are required'),
  body('options.*').trim().notEmpty().withMessage('Each option must be non-empty'),
  body('correctAnswer')
    .isInt({ min: 0, max: 3 })
    .withMessage('Correct answer must be 0-3'),
  body('section')
    .isIn(['numerical', 'reasoning', 'verbal', 'advanced'])
    .withMessage('Invalid section'),
  body('topic').trim().notEmpty().withMessage('Topic is required'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty'),
  body('explanation').optional().trim(),
];

const bulkQuestionValidator = [
  body('questions').isArray({ min: 1 }).withMessage('Questions array is required'),
  body('questions.*.text').trim().notEmpty().withMessage('Question text is required'),
  body('questions.*.options')
    .isArray({ min: 4, max: 4 })
    .withMessage('Exactly 4 options required'),
  body('questions.*.correctAnswer')
    .isInt({ min: 0, max: 3 })
    .withMessage('Correct answer must be 0-3'),
  body('questions.*.section')
    .isIn(['numerical', 'reasoning', 'verbal', 'advanced'])
    .withMessage('Invalid section'),
  body('questions.*.topic').trim().notEmpty().withMessage('Topic is required'),
];

module.exports = { questionValidator, bulkQuestionValidator };
