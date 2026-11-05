const crypto = require('crypto');
const Session = require('../models/Session');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('./generateToken');

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // matches default '7d' refresh lifetime

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const clientMeta = (req) => {
  const forwarded = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return {
    userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
    ip: String(forwarded || req.ip || '').slice(0, 100),
    deviceName: String((req.body && req.body.deviceName) || '').slice(0, 200),
  };
};

// Create a session and make it the user's sole active session.
// Concurrency-safe: `User.findOneAndUpdate` is a single atomic document
// update, so when two logins race, exactly one sid ends up authoritative
// and the loser's session is rejected on its next protected request.
const establishSession = async (user, req) => {
  const sessionId = crypto.randomUUID();
  const accessToken = generateAccessToken(user._id, sessionId);
  const refreshToken = generateRefreshToken(user._id, sessionId);

  await Session.create({
    user: user._id,
    sessionId,
    refreshTokenHash: hashToken(refreshToken),
    ...clientMeta(req),
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  await User.updateOne({ _id: user._id }, { activeSessionId: sessionId });

  return { accessToken, refreshToken, sessionId };
};

// Revoke the given session and clear the authoritative reference iff it
// still points at that session (never clears a newer — authoritative — session).
const revokeSession = async (userId, sessionId, reason) => {
  if (sessionId) {
    await User.updateOne({ _id: userId, activeSessionId: sessionId }, { activeSessionId: null });
    await Session.updateOne(
      { sessionId, user: userId, status: 'active' },
      { status: 'revoked', revokedAt: new Date(), revocationReason: reason }
    );
  }
};

// Lazily mark a superseded session as revoked. Safe to call at any time:
// the sid being marked is by definition NOT the authoritative one.
const markSupersededRevoked = (sessionId) => {
  Session.updateOne(
    { sessionId, status: 'active' },
    { status: 'revoked', revokedAt: new Date(), revocationReason: 'replaced_by_new_session' }
  ).catch(() => {});
};

module.exports = { hashToken, establishSession, revokeSession, markSupersededRevoked, REFRESH_TTL_MS };
