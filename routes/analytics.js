const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getSectionAnalysis,
  getTopicPerformance,
  getTimeAnalysis,
  getRecommendations,
  getTrends,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/section/:section', getSectionAnalysis);
router.get('/topics', getTopicPerformance);
router.get('/time-analysis', getTimeAnalysis);
router.get('/recommendations', getRecommendations);
router.get('/trends', getTrends);

module.exports = router;
