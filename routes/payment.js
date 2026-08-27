const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { 
  submitPayment, 
  getPaymentStatus, 
  getPendingPayments, 
  approvePayment, 
  rejectPayment 
} = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

// Rate limiter for payment submission
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each user to 5 submissions per hour
  message: { success: false, message: 'Too many payment submissions, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// User routes
router.post('/submit', protect, submitLimiter, submitPayment);
router.get('/status', protect, getPaymentStatus);

// Admin routes
router.get('/admin/pending', protect, adminOnly, getPendingPayments);
router.post('/admin/approve/:id', protect, adminOnly, approvePayment);
router.post('/admin/reject/:id', protect, adminOnly, rejectPayment);

module.exports = router;
