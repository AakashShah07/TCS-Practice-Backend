const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const { markSupersededRevoked } = require('../utils/session');

const unauthorized = (res, code, message, extra = {}) =>
  res.status(401).json({ success: false, code, message, ...extra });

// Protect routes - verify JWT AND enforce single active session
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return unauthorized(res, 'TOKEN_INVALID', 'Not authorized, no token');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // `expired: true` kept for backwards compatibility with existing clients
      return unauthorized(res, 'TOKEN_EXPIRED', 'Token expired', { expired: true });
    }
    return unauthorized(res, 'TOKEN_INVALID', 'Not authorized, token invalid');
  }

  const { id, sid } = decoded;
  if (!id || !sid) {
    // Legacy tokens without a session binding are not accepted
    return unauthorized(res, 'SESSION_REVOKED', 'Session is not valid');
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return unauthorized(res, 'TOKEN_INVALID', 'User not found');
    }

    // The session id in the token must match the user's authoritative active session.
    // This is the linchpin of single-active-session enforcement: a replaced login
    // invalidates the previous session immediately, with no cross-document race.
    if (user.activeSessionId !== sid) {
      markSupersededRevoked(sid);
      return unauthorized(res, 'SESSION_REVOKED', 'Session has been revoked or replaced');
    }

    const session = await Session.findOne({ sessionId: sid, user: user._id }).lean();
    if (!session) {
      return unauthorized(res, 'SESSION_REVOKED', 'Session not found');
    }
    if (session.user.toString() !== user._id.toString()) {
      return unauthorized(res, 'SESSION_REVOKED', 'Session does not belong to this user');
    }
    if (session.status !== 'active') {
      return unauthorized(res, 'SESSION_REVOKED', 'Session has been revoked');
    }
    if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
      return unauthorized(res, 'SESSION_REVOKED', 'Session has expired');
    }

    req.user = user;
    req.sessionId = sid;
    next();
  } catch (error) {
    next(error);
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, code: 'ADMIN_REQUIRED', message: 'Admin access required' });
};

module.exports = { protect, adminOnly };
