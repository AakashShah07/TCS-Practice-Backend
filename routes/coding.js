const express = require('express');
const router = express.Router();
const {
  getCodingQuestions,
  getCodingQuestion,
  getCodingTopics,
} = require('../controllers/codingController');

router.get('/topics', getCodingTopics);
router.get('/:id', getCodingQuestion);
router.get('/', getCodingQuestions);

module.exports = router;
