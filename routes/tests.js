const express = require('express');
const router = express.Router();
const { getTests, getTest, getTopicsBySection } = require('../controllers/testController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getTests);
router.get('/topics/:section', protect, getTopicsBySection);
router.get('/:id', protect, getTest);

module.exports = router;
