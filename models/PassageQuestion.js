const Question = require('./Question');

const PassageQuestion = Question.discriminator(
  'PassageQuestion',
  new (require('mongoose').Schema)({
    options: {
      type: [String],
      required: [true, 'Options are required'],
      validate: {
        validator: (v) => v.length === 5,
        message: 'Exactly 5 options are required for passage fill in the blank',
      },
    },
    correctAnswer: {
      type: Number,
      required: [true, 'Correct answer index is required'],
      min: 0,
      max: 4,
    },
  })
);

module.exports = PassageQuestion;
