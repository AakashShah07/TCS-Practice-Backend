'use strict';
// Integration tests for Single Active Session enforcement.
// Uses an ISOLATED, THROWAWAY MongoDB instance (port 27099, temp dbpath).
// Never run against the development/production database.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-access-secret-nqt';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-nqt';
process.env.JWT_EXPIRE = '2h';
process.env.JWT_REFRESH_EXPIRE = '7d';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const MONGO_TEST_URI = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27099/nqt_sessions_test';

let app;
let server;
let base;
let User;
let Session;
let TestModel;
let Question;

const api = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
};

const registerUser = async (email, password = 'secret123') => {
  const res = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Test User', email, password },
  });
  assert.equal(res.status, 201, `register failed: ${JSON.stringify(res.body)}`);
  return res.body;
};

const loginUser = async (email, password = 'secret123') => {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return res;
};

const decode = (t) => jwt.decode(t);

before(async () => {
  await mongoose.connect(MONGO_TEST_URI);
  await mongoose.connection.dropDatabase();

  User = require('../models/User');
  Session = require('../models/Session');
  TestModel = require('../models/Test');
  Question = require('../models/Question');
  app = require('../server');

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await new Promise((resolve) => server.close(resolve));
});

let seq = 0;
const uniqueEmail = () => `user_${Date.now()}_${seq++}@example.com`;

// ---------- Registration & login ----------

test('1. registration continues to work', async () => {
  const email = uniqueEmail();
  const res = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Reg User', email, password: 'secret123' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.email, email);
  assert.ok(res.body.accessToken && res.body.refreshToken);
});

test('2. successful login creates a session', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  await Session.deleteMany({}); // start from a clean session state
  const res = await loginUser(email);
  assert.equal(res.status, 200);
  const dbUser = await User.findOne({ email });
  const sessions = await Session.find({ user: dbUser._id });
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].status, 'active');
  assert.equal(dbUser.activeSessionId, sessions[0].sessionId);
});

test('3. access token includes the correct session id', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const res = await loginUser(email);
  const dbUser = await User.findOne({ email });
  const payload = decode(res.body.accessToken);
  assert.equal(payload.sid, dbUser.activeSessionId);
  assert.equal(String(payload.id), String(dbUser._id));
});

test('4. login response maintains required existing fields', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const res = await loginUser(email);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  for (const field of ['_id', 'name', 'email', 'role', 'isPremium']) {
    assert.ok(field in res.body.data, `missing data.${field}`);
  }
  assert.ok(res.body.accessToken && res.body.refreshToken);
});

// ---------- Session enforcement ----------

test('5-8. Device B login revokes Device A; B stays authenticated', async () => {
  const email = uniqueEmail();
  await registerUser(email);

  const a = await loginUser(email);
  assert.equal(a.status, 200);

  const meA = await api('/api/auth/me', { token: a.body.accessToken });
  assert.equal(meA.status, 200);

  const b = await loginUser(email);
  assert.equal(b.status, 200);

  // Device A must be rejected immediately
  const meAAfter = await api('/api/auth/me', { token: a.body.accessToken });
  assert.equal(meAAfter.status, 401);
  assert.equal(meAAfter.body.code, 'SESSION_REVOKED');

  // Device B remains authenticated
  const meB = await api('/api/auth/me', { token: b.body.accessToken });
  assert.equal(meB.status, 200);
  assert.equal(meB.body.data.email, email);
});

test('9. Device A cannot access premium endpoints after revocation', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const a = await loginUser(email);

  // Seed a premium test
  const premiumTest = await TestModel.create({
    title: 'Premium Mock',
    type: 'full_mock',
    section: 'numerical',
    totalQuestions: 1,
    duration: 300,
    isPremium: true,
    isActive: true,
  });

  await loginUser(email); // Device B replaces Device A

  const res = await api(`/api/attempts/start/${premiumTest._id}`, {
    method: 'POST',
    token: a.body.accessToken,
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'SESSION_REVOKED');
});

test('10. Device A cannot refresh its revoked token', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const a = await loginUser(email);
  await loginUser(email); // supersede A

  const res = await api('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: a.body.refreshToken },
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'SESSION_REVOKED');
});

test('11. an old access token cannot regain access', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const a = await loginUser(email);
  await loginUser(email);
  for (let i = 0; i < 3; i++) {
    const res = await api('/api/auth/me', { token: a.body.accessToken });
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'SESSION_REVOKED');
  }
});

test('12. a token without a session id is rejected', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const dbUser = await User.findOne({ email });
  const legacy = jwt.sign({ id: dbUser._id }, process.env.JWT_SECRET);
  const res = await api('/api/auth/me', { token: legacy });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'SESSION_REVOKED');
});

test('13. a session belonging to another user is rejected', async () => {
  const emailA = uniqueEmail();
  const emailB = uniqueEmail();
  await registerUser(emailA);
  await registerUser(emailB);
  const bLogin = await loginUser(emailB);
  const dbB = await User.findOne({ email: emailB });
  const dbA = await User.findOne({ email: emailA });

  // Forged (but correctly signed) token: A's id + B's session id
  const forged = jwt.sign({ id: dbA._id, sid: dbB.activeSessionId }, process.env.JWT_SECRET);
  const res = await api('/api/auth/me', { token: forged });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'SESSION_REVOKED');
  void bLogin;
});

test('14. a revoked session remains revoked', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const a = await loginUser(email);
  const out = await api('/api/auth/logout', { method: 'POST', token: a.body.accessToken });
  assert.equal(out.status, 200);
  const again = await api('/api/auth/me', { token: a.body.accessToken });
  assert.equal(again.status, 401);
  assert.equal(again.body.code, 'SESSION_REVOKED');
});

// ---------- Refresh token security ----------

test('15. successful refresh rotates the token', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const login = await loginUser(email);
  const refreshed = await api('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: login.body.refreshToken },
  });
  assert.equal(refreshed.status, 200);
  assert.ok(refreshed.body.accessToken && refreshed.body.refreshToken);
  assert.notEqual(refreshed.body.refreshToken, login.body.refreshToken);
});

test('16. previous refresh token cannot be reused', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const login = await loginUser(email);
  const first = await api('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: login.body.refreshToken },
  });
  assert.equal(first.status, 200);
  const second = await api('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: login.body.refreshToken },
  });
  assert.equal(second.status, 401);
  assert.equal(second.body.code, 'REFRESH_TOKEN_INVALID');
});

test('17. concurrent refresh requests cannot both succeed', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const login = await loginUser(email);
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      api('/api/auth/refresh', {
        method: 'POST',
        body: { refreshToken: login.body.refreshToken },
      })
    )
  );
  const ok = results.filter((r) => r.status === 200);
  assert.equal(ok.length, 1, `expected exactly one success, got ${ok.length}`);
  for (const r of results.filter((r) => r.status !== 200)) {
    assert.equal(r.status, 401);
  }
});

test('18. refresh after session revocation is rejected', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const login = await loginUser(email);
  await api('/api/auth/logout', { method: 'POST', token: login.body.accessToken });
  const res = await api('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: login.body.refreshToken },
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'SESSION_REVOKED');
});

test('19. refresh after session expiry is rejected', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const login = await loginUser(email);
  const dbUser = await User.findOne({ email });
  await Session.updateOne(
    { sessionId: dbUser.activeSessionId },
    { expiresAt: new Date(Date.now() - 1000) }
  );
  const res = await api('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: login.body.refreshToken },
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'REFRESH_TOKEN_EXPIRED');
});

test('replay of a two-generations-old refresh token revokes the session', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const login = await loginUser(email);
  const r1 = await api('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: login.body.refreshToken },
  });
  const r2 = await api('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: r1.body.refreshToken },
  });
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  // r1's token is exactly one generation back → tolerated rejection, session survives
  const oneBack = await api('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: r1.body.refreshToken },
  });
  assert.equal(oneBack.status, 401);
  assert.equal(oneBack.body.code, 'REFRESH_TOKEN_INVALID');

  // The original login token is two generations back → replay detected, session revoked
  const replay = await api('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: login.body.refreshToken },
  });
  assert.equal(replay.status, 401);
  assert.equal(replay.body.code, 'SESSION_REVOKED');
});

// ---------- Logout & account security ----------

test('20. logout invalidates the current session', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const login = await loginUser(email);
  const out = await api('/api/auth/logout', { method: 'POST', token: login.body.accessToken });
  assert.equal(out.status, 200);
  const me = await api('/api/auth/me', { token: login.body.accessToken });
  assert.equal(me.status, 401);
});

test('21. repeated logout is handled safely', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const login = await loginUser(email);
  const first = await api('/api/auth/logout', { method: 'POST', token: login.body.accessToken });
  const second = await api('/api/auth/logout', { method: 'POST', token: login.body.accessToken });
  const third = await api('/api/auth/logout', { method: 'POST' }); // no token at all
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(third.status, 200);
});

test('24. admin can revoke an authorized user session', async () => {
  const userEmail = uniqueEmail();
  const adminEmail = uniqueEmail();
  await registerUser(userEmail);
  await registerUser(adminEmail);
  await User.updateOne({ email: adminEmail }, { role: 'admin' });

  const adminLogin = await loginUser(adminEmail);
  const userLogin = await loginUser(userEmail);
  const dbUser = await User.findOne({ email: userEmail });

  const res = await api(`/api/admin/users/${dbUser._id}/revoke-session`, {
    method: 'PUT',
    token: adminLogin.body.accessToken,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.sessionRevoked, true);

  const me = await api('/api/auth/me', { token: userLogin.body.accessToken });
  assert.equal(me.status, 401);
  assert.equal(me.body.code, 'SESSION_REVOKED');
});

test('25. ordinary user cannot revoke another user session', async () => {
  const emailA = uniqueEmail();
  const emailB = uniqueEmail();
  await registerUser(emailA);
  await registerUser(emailB);
  const a = await loginUser(emailA);
  const dbB = await User.findOne({ email: emailB });

  const res = await api(`/api/admin/users/${dbB._id}/revoke-session`, {
    method: 'PUT',
    token: a.body.accessToken,
  });
  assert.equal(res.status, 403);
});

// ---------- Concurrent login ----------

test('26-30. concurrent logins yield exactly one authorized session', async () => {
  const email = uniqueEmail();
  await registerUser(email);

  const results = await Promise.all(Array.from({ length: 8 }, () => loginUser(email)));
  assert.ok(results.every((r) => r.status === 200));

  const dbUser = await User.findOne({ email });
  const activeSid = dbUser.activeSessionId;
  assert.ok(activeSid);

  const sids = results.map((r) => decode(r.body.accessToken).sid);
  const winners = results.filter((r) => decode(r.body.accessToken).sid === activeSid);
  assert.equal(winners.length, 1, 'exactly one login response must match the authoritative session');

  // Only the authoritative session can access protected APIs
  for (const r of results) {
    const sid = decode(r.body.accessToken).sid;
    const me = await api('/api/auth/me', { token: r.body.accessToken });
    if (sid === activeSid) {
      assert.equal(me.status, 200);
    } else {
      assert.equal(me.status, 401);
      assert.equal(me.body.code, 'SESSION_REVOKED');
    }
  }

  // Stale sessions cannot refresh
  const stale = results.find((r) => decode(r.body.accessToken).sid !== activeSid);
  const refresh = await api('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: stale.body.refreshToken },
  });
  assert.equal(refresh.status, 401);

  // Only one active session record should validate as authoritative
  const sessions = await Session.find({ user: dbUser._id });
  const authoritative = sessions.filter((s) => s.sessionId === activeSid);
  assert.equal(authoritative.length, 1);
  assert.ok(sids.includes(activeSid));
});

// ---------- Premium authorization ----------

test('31. free user cannot access premium endpoints', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const login = await loginUser(email);
  const premiumTest = await TestModel.create({
    title: 'Premium Section Test',
    type: 'section_test',
    section: 'reasoning',
    totalQuestions: 1,
    duration: 600,
    isPremium: true,
    isActive: true,
  });
  const start = await api(`/api/attempts/start/${premiumTest._id}`, {
    method: 'POST',
    token: login.body.accessToken,
  });
  assert.equal(start.status, 403);
  assert.equal(start.body.code, 'PREMIUM_REQUIRED');

  const view = await api(`/api/tests/${premiumTest._id}`, { token: login.body.accessToken });
  assert.equal(view.status, 403);
  assert.equal(view.body.code, 'PREMIUM_REQUIRED');
});

test('34. client-supplied premium status is ignored', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const login = await loginUser(email);
  const premiumTest = await TestModel.create({
    title: 'Premium Client Tamper Test',
    type: 'full_mock',
    section: 'verbal',
    totalQuestions: 1,
    duration: 600,
    isPremium: true,
    isActive: true,
  });
  const start = await api(`/api/attempts/start/${premiumTest._id}`, {
    method: 'POST',
    token: login.body.accessToken,
    body: { isPremium: true, premium: true },
  });
  assert.equal(start.status, 403);
  assert.equal(start.body.code, 'PREMIUM_REQUIRED');
});

test('32. premium user can access premium endpoints', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  await User.updateOne({ email }, { isPremium: true, subscriptionType: 'pro' });
  const login = await loginUser(email);

  const q = await Question.create({
    text: `Sample question ${Date.now()} ${Math.random()}`,
    options: ['a', 'b', 'c', 'd'],
    correctAnswer: 0,
    section: 'verbal',
    topic: 'reading_comprehension',
    difficulty: 'medium',
  });
  const premiumTest = await TestModel.create({
    title: 'Premium Accessible Test',
    type: 'section_test',
    section: 'verbal',
    questions: [q._id],
    totalQuestions: 1,
    duration: 600,
    isPremium: true,
    isActive: true,
  });
  const start = await api(`/api/attempts/start/${premiumTest._id}`, {
    method: 'POST',
    token: login.body.accessToken,
  });
  assert.equal(start.status, 201);
});

test('33. revoked premium membership is rejected (admin grant then revoke)', async () => {
  const userEmail = uniqueEmail();
  const adminEmail = uniqueEmail();
  await registerUser(userEmail);
  await registerUser(adminEmail);
  await User.updateOne({ email: adminEmail }, { role: 'admin' });
  const adminLogin = await loginUser(adminEmail);
  const dbUser = await User.findOne({ email: userEmail });

  // Admin grants premium
  const grant = await api(`/api/admin/users/${dbUser._id}/premium`, {
    method: 'PUT',
    token: adminLogin.body.accessToken,
    body: { isPremium: true, subscriptionType: 'pro' },
  });
  assert.equal(grant.status, 200);

  const premiumTest = await TestModel.create({
    title: 'Premium Revocation Test',
    type: 'section_test',
    section: 'advanced',
    totalQuestions: 1,
    duration: 600,
    isPremium: true,
    isActive: true,
  });

  const userLogin = await loginUser(userEmail);
  // Still premium — but start a premium test to confirm access first
  const allowed = await api(`/api/tests/${premiumTest._id}`, { token: userLogin.body.accessToken });
  assert.equal(allowed.status, 200);

  // Admin revokes premium
  const revoke = await api(`/api/admin/users/${dbUser._id}/premium`, {
    method: 'PUT',
    token: adminLogin.body.accessToken,
    body: { isPremium: false },
  });
  assert.equal(revoke.status, 200);

  // Same token must now be rejected for premium content (DB is authoritative)
  const denied = await api(`/api/tests/${premiumTest._id}`, { token: userLogin.body.accessToken });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.code, 'PREMIUM_REQUIRED');
});

// ---------- Regression ----------

test('35. test listing, attempts, results and analytics auth still work', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const login = await loginUser(email);

  // Unauthenticated requests are still rejected
  assert.equal((await api('/api/tests')).status, 401);
  assert.equal((await api('/api/results/user/history')).status, 401);
  assert.equal((await api('/api/analytics/dashboard')).status, 401);

  const q = await Question.create({
    text: `Regression question ${Date.now()} ${Math.random()}`,
    options: ['a', 'b', 'c', 'd'],
    correctAnswer: 2,
    section: 'numerical',
    topic: 'percentages',
    difficulty: 'easy',
  });
  const testDoc = await TestModel.create({
    title: 'Regression Section Test',
    type: 'section_test',
    section: 'numerical',
    questions: [q._id],
    totalQuestions: 1,
    duration: 600,
    isPremium: false,
    isActive: true,
  });

  const list = await api('/api/tests', { token: login.body.accessToken });
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.body.data));

  const start = await api(`/api/attempts/start/${testDoc._id}`, {
    method: 'POST',
    token: login.body.accessToken,
  });
  assert.equal(start.status, 201);
  const attemptId = start.body.data._id;

  const submit = await api(`/api/attempts/${attemptId}/submit`, {
    method: 'POST',
    token: login.body.accessToken,
  });
  assert.equal(submit.status, 200);

  const history = await api('/api/results/user/history', { token: login.body.accessToken });
  assert.equal(history.status, 200);

  const analytics = await api('/api/analytics/dashboard', { token: login.body.accessToken });
  assert.equal(analytics.status, 200);
});

test('36. admin routes retain role checks', async () => {
  const userEmail = uniqueEmail();
  const adminEmail = uniqueEmail();
  await registerUser(userEmail);
  await registerUser(adminEmail);
  await User.updateOne({ email: adminEmail }, { role: 'admin' });

  const userLogin = await loginUser(userEmail);
  const adminLogin = await loginUser(adminEmail);

  assert.equal((await api('/api/admin/dashboard', { token: userLogin.body.accessToken })).status, 403);
  assert.equal((await api('/api/admin/dashboard', { token: adminLogin.body.accessToken })).status, 200);
});

test('38. registering again does not clobber the existing session silently', async () => {
  const email = uniqueEmail();
  await registerUser(email);
  const login = await loginUser(email);
  const sidBefore = decode(login.body.accessToken).sid;
  const again = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Dup', email, password: 'secret123' },
  });
  assert.equal(again.status, 400);
  const dbUser = await User.findOne({ email });
  assert.equal(dbUser.activeSessionId, sidBefore);
});
