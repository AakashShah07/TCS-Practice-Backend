const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const { establishSession, revokeSession, hashToken } = require('../utils/session');

const userPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isPremium: user.isPremium,
});

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });
    const { accessToken, refreshToken, sessionId } = await establishSession(user, req);

    res.status(201).json({
      success: true,
      data: userPayload(user),
      accessToken,
      refreshToken,
      sessionId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Establish the new session and atomically make it the ONLY active session.
    // Any previously issued tokens become invalid immediately.
    const { accessToken, refreshToken, sessionId } = await establishSession(user, req);

    res.json({
      success: true,
      data: userPayload(user),
      accessToken,
      refreshToken,
      sessionId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token (rotates the refresh token)
// @route   POST /api/auth/refresh
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, code: 'REFRESH_TOKEN_INVALID', message: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, code: 'REFRESH_TOKEN_EXPIRED', message: 'Refresh token expired' });
      }
      return res.status(401).json({ success: false, code: 'REFRESH_TOKEN_INVALID', message: 'Invalid refresh token' });
    }

    const { id, sid } = decoded;
    if (!id || !sid) {
      return res.status(401).json({ success: false, code: 'REFRESH_TOKEN_INVALID', message: 'Invalid refresh token' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(401).json({ success: false, code: 'REFRESH_TOKEN_INVALID', message: 'Invalid refresh token' });
    }

    // Session must still be the authoritative one (not replaced/revoked).
    if (user.activeSessionId !== sid) {
      return res.status(401).json({ success: false, code: 'SESSION_REVOKED', message: 'Session has been revoked or replaced' });
    }

    const session = await Session.findOne({ sessionId: sid, user: user._id }).select('+refreshTokenHash +previousRefreshTokenHash');
    if (!session || session.status !== 'active') {
      return res.status(401).json({ success: false, code: 'SESSION_REVOKED', message: 'Session is not active' });
    }
    if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
      return res.status(401).json({ success: false, code: 'REFRESH_TOKEN_EXPIRED', message: 'Session has expired' });
    }

    const presentedHash = hashToken(refreshToken);
    if (presentedHash === session.previousRefreshTokenHash) {
      // Immediately-previous token — typically the loser of a concurrent refresh
      // race (or a benign retry). Reject it without destroying the session.
      return res.status(401).json({ success: false, code: 'REFRESH_TOKEN_INVALID', message: 'Refresh token already used' });
    }
    if (presentedHash !== session.refreshTokenHash) {
      // Cryptographically valid token from an older rotation generation: replay detected.
      await revokeSession(user._id, sid, 'refresh_replay_detected');
      return res.status(401).json({ success: false, code: 'SESSION_REVOKED', message: 'Session revoked due to refresh token reuse' });
    }

    // Atomic rotation: the conditional update can succeed for only ONE of any
    // number of concurrent requests presenting the same refresh token.
    const newRefreshToken = generateRefreshToken(user._id, sid);
    const newAccessToken = generateAccessToken(user._id, sid);
    const newHash = hashToken(newRefreshToken);

    const rotated = await Session.findOneAndUpdate(
      { _id: session._id, refreshTokenHash: presentedHash, status: 'active' },
      { refreshTokenHash: newHash, previousRefreshTokenHash: presentedHash, lastActiveAt: new Date() },
      { returnDocument: 'after' }
    );
    if (!rotated) {
      // Lost the rotation race — this token was already consumed.
      return res.status(401).json({ success: false, code: 'REFRESH_TOKEN_INVALID', message: 'Refresh token already used' });
    }

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upgrade user to premium (DEV/MANUAL USE ONLY — see note below)
// @route   POST /api/auth/upgrade-premium
// NOTE: This endpoint is intentionally left unchanged in this phase (tracked as a
// known critical issue). It is NOT part of the session enforcement work.
exports.upgradePremium = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isPremium = true;
    user.subscriptionType = 'pro';
    user.subscriptionExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    await user.save();

    res.json({
      success: true,
      message: 'User upgraded to premium successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isPremium: user.isPremium,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user — revoke the current session, idempotently
// @route   POST /api/auth/logout
// NOTE: deliberately does not use `protect` so that repeated logouts (or logout
// after the session was already replaced) still succeed safely.
exports.logout = async (req, res, next) => {
  try {
    res.clearCookie('token');
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer') ? header.split(' ')[1] : null;

    if (token) {
      let decoded = null;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        // Token expired/invalid — there is nothing session-bound left to revoke cleanly.
        // Still succeed: logout must be safe to call repeatedly.
        decoded = null;
      }
      if (decoded && decoded.id && decoded.sid) {
        await revokeSession(decoded.id, decoded.sid, 'logout');
      }
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({
    success: true,
    data: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isPremium: req.user.isPremium,
      createdAt: req.user.createdAt,
    },
  });
};
