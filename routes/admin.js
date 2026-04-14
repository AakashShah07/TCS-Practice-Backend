const express = require('express');
const router = express.Router();
const {
  addQuestion,
  bulkAddQuestions,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  createTest,
  getTests,
  updateTest,
  deleteTest,
  getDashboard,
  getUsers,
  getUserDetail,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { questionValidator, bulkQuestionValidator } = require('../validators/questionValidator');
const { testValidator } = require('../validators/testValidator');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// Dashboard
router.get('/dashboard', getDashboard);

// Questions
router.post('/questions', validate(questionValidator), addQuestion);
router.post('/questions/bulk', validate(bulkQuestionValidator), bulkAddQuestions);
router.get('/questions', getQuestions);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);

// Tests
router.post('/tests', validate(testValidator), createTest);
router.get('/tests', getTests);
router.put('/tests/:id', updateTest);
router.delete('/tests/:id', deleteTest);

// Users
router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);

module.exports = router;
