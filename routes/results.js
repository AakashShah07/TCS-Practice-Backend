const express = require('express');
const router = express.Router();
const { getResult, getReview, getHistory } = require('../controllers/resultController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/user/history', getHistory);
router.get('/:attemptId', getResult);
router.get('/:attemptId/review', getReview);

module.exports = router;
