// Premium membership is checked against the database-backed `req.user`
// (loaded fresh on every request by `protect`), never against client claims.
const premiumOnly = (req, res, next) => {
  if (req.user && req.user.isPremium) {
    next();
  } else {
    res.status(403).json({ success: false, code: 'PREMIUM_REQUIRED', message: 'Premium subscription required' });
  }
};

module.exports = { premiumOnly };
