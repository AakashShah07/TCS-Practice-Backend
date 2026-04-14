const express = require('express');
const router = express.Router();
const {
  startAttempt,
  getAttemptState,
  saveAnswer,
  markForReview,
  clearResponse,
  navigate,
  recordTabSwitch,
  submitAttempt,
} = require('../controllers/attemptController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/start/:testId', startAttempt);
router.get('/:id/state', getAttemptState);
router.put('/:id/answer', saveAnswer);
router.put('/:id/mark-review', markForReview);
router.put('/:id/clear', clearResponse);
router.put('/:id/navigate', navigate);
router.put('/:id/tab-switch', recordTabSwitch);
router.post('/:id/submit', submitAttempt);

module.exports = router;
