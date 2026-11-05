const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, getMe, upgradePremium } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerValidator, loginValidator } = require('../validators/authValidator');

router.post('/register', validate(registerValidator), register);
router.post('/login', validate(loginValidator), login);
router.post('/refresh', refresh);
router.post('/upgrade-premium', upgradePremium);
// /logout is intentionally not behind `protect` so it stays idempotent even after
// the session has been revoked/replaced (see authController.logout).
router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
