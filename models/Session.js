const mongoose = require('mongoose');

// A session represents one authenticated login (one device).
// Validity is decided by the `sid` claim in the JWT matching
// `User.activeSessionId`; the session document carries metadata,
// expiry and an explicit revocation status for logout/admin/replay.
const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // SHA-256 hash of the current (rotated) refresh token. Never stored in plaintext.
    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },
    // SHA-256 hash of the token this session rotated away from. Used to
    // reject the immediately-previous token (e.g. concurrent-refresh loser)
    // WITHOUT revoking the session, while older tokens trigger replay revocation.
    previousRefreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    deviceName: {
      type: String,
      default: '',
      maxlength: 200,
    },
    userAgent: {
      type: String,
      default: '',
      maxlength: 500,
    },
    ip: {
      type: String,
      default: '',
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
      index: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revocationReason: {
      type: String,
      enum: ['logout', 'replaced_by_new_session', 'admin_revoked', 'refresh_replay_detected', 'password_changed', null],
      default: null,
    },
  },
  { timestamps: true }
);

// Common query: find active sessions for a user / check superseded sessions
sessionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Session', sessionSchema);
