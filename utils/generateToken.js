const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Access token: short-lived, carries user id and session id (`sid`).
// `sid` is not a secret — it only binds the token to a server-side session record.
// `jti` guarantees uniqueness even for tokens issued in the same second.
const generateAccessToken = (userId, sessionId) => {
  return jwt.sign({ id: userId, sid: sessionId, jti: crypto.randomUUID() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '2h',
  });
};

// Refresh token: long-lived, also bound to the session via `sid`.
const generateRefreshToken = (userId, sessionId) => {
  return jwt.sign({ id: userId, sid: sessionId, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
};

module.exports = { generateAccessToken, generateRefreshToken };
