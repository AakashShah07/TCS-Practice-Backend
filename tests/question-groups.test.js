'use strict';
// Integration tests for the grouped/media question architecture.
// Uses an ISOLATED, THROWAWAY MongoDB instance (port 27099).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'groups-access-secret';
process.env.JWT_REFRESH_SECRET = 'groups-refresh-secret';
process.env.JWT_EXPIRE = '2h';
process.env.JWT_REFRESH_EXPIRE = '7d';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MONGO_TEST_URI = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27099/nqt_groups_test';

let app;
let server;
let base;
let Question;
let QuestionGroup;
let TestModel;
let TestAttempt;
let PassageQuestion;
let User;

const api = async (p, { method = 'GET', token, body } = {}) => {
  const r = await fetch(base + p, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => null) };
};

let seq = 0;
const uniq = () => `${Date.now()}_${seq++}_${Math.random().toString(36).slice(2, 7)}`;

const registered = async (isAdmin = false) => {
  const email = `g_${uniq()}@example.com`;
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'G User', email, password: 'secret123' },
  });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));
  if (isAdmin) {
    await User.updateOne({ email }, { role: 'admin' });
    const adminLogin = await api('/api/auth/login', { method: 'POST', body: { email, password: 'secret123' } });
    return adminLogin.body.accessToken;
  }
  return reg.body.accessToken;
};

const makeQuestion = (over = {}) =>
  Question.create({
    text: `Q ${uniq()}`,
    options: ['a', 'b', 'c', 'd'],
    correctAnswer: 0,
    section: 'reasoning',
    topic: 'General',
    difficulty: 'easy',
    ...over,
  });

before(async () => {
  await mongoose.connect(MONGO_TEST_URI);
  await mongoose.connection.dropDatabase();

  Question = require('../models/Question');
  QuestionGroup = require('../models/QuestionGroup');
  TestModel = require('../models/Test');
  TestAttempt = require('../models/TestAttempt');
  PassageQuestion = require('../models/PassageQuestion');
  User = require('../models/User');
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

// ---------------------------------------------------------------------------

test('1. existing four-option standalone MCQ works end to end', async () => {
  const token = await registered();
  const q = await makeQuestion({ options: ['a', 'b', 'c', 'd'], correctAnswer: 2, explanation: 'because c' });
  const testDoc = await TestModel.create({
    title: 'Standalone 4', type: 'section_test', section: 'reasoning',
    questions: [q._id], totalQuestions: 1, duration: 600, selectionMode: 'fixed',
  });

  const start = await api(`/api/attempts/start/${testDoc._id}`, { method: 'POST', token });
  assert.equal(start.status, 201);
  const attemptId = start.body.data._id;

  const ans = await api(`/api/attempts/${attemptId}/answer`, {
    method: 'PUT', token, body: { questionIndex: 0, selectedAnswer: 2 },
  });
  assert.equal(ans.status, 200);

  const submit = await api(`/api/attempts/${attemptId}/submit`, { method: 'POST', token });
  assert.equal(submit.status, 200);
  assert.equal(submit.body.data.result.score, 1);

  const review = await api(`/api/results/${attemptId}/review`, { token });
  assert.equal(review.status, 200);
  assert.equal(review.body.data.review[0].isCorrect, true);
  assert.equal(review.body.data.questionMode, 'standalone');
});

test('2. five-option MCQ is accepted and answerable', async () => {
  const token = await registered();
  const q = await makeQuestion({ options: ['a', 'b', 'c', 'd', 'e'], correctAnswer: 4 });
  const testDoc = await TestModel.create({
    title: 'Standalone 5', type: 'section_test', section: 'reasoning',
    questions: [q._id], totalQuestions: 1, duration: 600, selectionMode: 'fixed',
  });

  const start = await api(`/api/attempts/start/${testDoc._id}`, { method: 'POST', token });
  const attemptId = start.body.data._id;
  const ans = await api(`/api/attempts/${attemptId}/answer`, {
    method: 'PUT', token, body: { questionIndex: 0, selectedAnswer: 4 },
  });
  assert.equal(ans.status, 200);
  const submit = await api(`/api/attempts/${attemptId}/submit`, { method: 'POST', token });
  assert.equal(submit.body.data.result.score, 1);
});

test('2b. answering beyond the option count is rejected (4-option, index 4)', async () => {
  const token = await registered();
  const q = await makeQuestion({ options: ['a', 'b', 'c', 'd'], correctAnswer: 0 });
  const testDoc = await TestModel.create({
    title: 'Bound Check', type: 'section_test', section: 'reasoning',
    questions: [q._id], totalQuestions: 1, duration: 600, selectionMode: 'fixed',
  });
  const start = await api(`/api/attempts/start/${testDoc._id}`, { method: 'POST', token });
  const attemptId = start.body.data._id;
  const ans = await api(`/api/attempts/${attemptId}/answer`, {
    method: 'PUT', token, body: { questionIndex: 0, selectedAnswer: 4 },
  });
  assert.equal(ans.status, 400);
  assert.equal(ans.body.code, 'INVALID_ANSWER');
});

test('3. image-based question carries media and stays answerable', async () => {
  const token = await registered();
  const q = await makeQuestion({
    questionType: 'image_mcq',
    media: { type: 'image', url: '/uploads/questions/puzzle.png', alt: 'Puzzle figure' },
  });
  const testDoc = await TestModel.create({
    title: 'Image MCQ', type: 'section_test', section: 'reasoning',
    questions: [q._id], totalQuestions: 1, duration: 600, selectionMode: 'fixed',
  });
  const start = await api(`/api/attempts/start/${testDoc._id}`, { method: 'POST', token });
  const state = await api(`/api/attempts/${start.body.data._id}/state`, { token });
  const q0 = state.body.data.responses[0].question;
  assert.equal(q0.questionType, 'image_mcq');
  assert.equal(q0.media.url, '/uploads/questions/puzzle.png');
  assert.equal(q0.media.type, 'image');
});

test('4. group with multiple ordered child questions (admin API)', async () => {
  const admin = await registered(true);
  const c1 = await makeQuestion({ text: 'child 1 ' + uniq() });
  const c2 = await makeQuestion({ text: 'child 2 ' + uniq() });
  const c3 = await makeQuestion({ text: 'child 3 ' + uniq() });

  const created = await api('/api/admin/question-groups', {
    method: 'POST', token: admin,
    body: {
      title: 'Election Campaign Analysis',
      type: 'data_interpretation',
      section: 'reasoning',
      topic: 'Data Interpretation',
      stimulus: { text: 'Study the following graph...', media: { type: 'chart', url: '/uploads/di.png', alt: 'Voter graph' } },
      questions: [c1._id, c2._id, c3._id],
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const groupId = created.body.data._id;

  const fetched = await api(`/api/admin/question-groups/${groupId}`, { token: admin });
  assert.equal(fetched.body.data.questions.length, 3);
  assert.deepEqual(
    fetched.body.data.questions.map((q) => String(q._id)),
    [String(c1._id), String(c2._id), String(c3._id)]
  );
  assert.equal(fetched.body.data.stimulus.media.type, 'chart');

  for (const c of [c1, c2, c3]) {
    const fresh = await Question.findById(c._id);
    assert.equal(String(fresh.groupId), String(groupId));
  }

  // reorder
  const reorder = await api(`/api/admin/question-groups/${groupId}/questions/reorder`, {
    method: 'PUT', token: admin, body: { questionIds: [c3._id, c1._id, c2._id] },
  });
  assert.equal(reorder.status, 200);
  assert.deepEqual(reorder.body.data.questions.map(String), [String(c3._id), String(c1._id), String(c2._id)]);

  // remove one
  const remove = await api(`/api/admin/question-groups/${groupId}/questions/${c3._id}`, { method: 'DELETE', token: admin });
  assert.equal(remove.status, 200);
  assert.equal(remove.body.data.questions.length, 2);
  const detached = await Question.findById(c3._id);
  assert.equal(detached.groupId, null);

  // attach media
  const media = await api(`/api/admin/question-groups/${groupId}/media`, {
    method: 'PUT', token: admin, body: { media: { type: 'table', url: '/uploads/t.png', alt: 'Sales table' } },
  });
  assert.equal(media.status, 200);
  assert.equal(media.body.data.stimulus.media.type, 'table');

  // update metadata
  const upd = await api(`/api/admin/question-groups/${groupId}`, {
    method: 'PUT', token: admin, body: { title: 'Renamed Group' },
  });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.data.title, 'Renamed Group');
});

test('5-6. grouped attempt creation + correct answer validation', async () => {
  const token = await registered();
  const children = [];
  for (let i = 0; i < 3; i++) children.push(await makeQuestion({ text: `grp ${uniq()}`, correctAnswer: 1 }));

  const group = await QuestionGroup.create({
    title: 'DI Set', type: 'data_interpretation', section: 'reasoning', topic: 'Data Interpretation',
    stimulus: { text: 'Table: A=1 B=2', media: { type: 'table', url: '/uploads/t.png', alt: 'table' } },
    questions: children.map((c) => c._id),
  });
  await Question.updateMany({ _id: { $in: children.map((c) => c._id) } }, { groupId: group._id });

  const testDoc = await TestModel.create({
    title: 'Curated DI', type: 'topic_practice', section: 'reasoning', topic: 'Data Interpretation',
    groups: [group._id], totalQuestions: 3, duration: 900, selectionMode: 'fixed',
  });

  const start = await api(`/api/attempts/start/${testDoc._id}`, { method: 'POST', token });
  assert.equal(start.status, 201);
  assert.equal(start.body.data.responses.length, 3);

  const state = await api(`/api/attempts/${start.body.data._id}/state`, { token });
  assert.equal(state.body.data.questionMode, 'grouped');
  assert.equal(state.body.data.questionGroups.length, 1);
  assert.equal(state.body.data.questionGroups[0].type, 'data_interpretation');
  assert.equal(state.body.data.questionGroups[0].questionIds.length, 3);
  assert.deepEqual(
    state.body.data.responses.map((r) => String(r.question._id)),
    children.map((c) => String(c._id))
  );
});

test('6b. invalid correctAnswer / option counts are rejected', async () => {
  await assert.rejects(
    () => makeQuestion({ options: ['a', 'b', 'c', 'd'], correctAnswer: 4 }),
    /valid index/
  );
  // too many options via admin validator
  const admin = await registered(true);
  const bad = await api('/api/admin/questions', {
    method: 'POST', token: admin,
    body: { text: 'six options ' + uniq(), options: ['1', '2', '3', '4', '5', '6'], correctAnswer: 0, section: 'reasoning', topic: 'X' },
  });
  assert.equal(bad.status, 400);
  // two options is allowed
  const two = await makeQuestion({ options: ['yes', 'no'], correctAnswer: 1 });
  assert.equal(two.options.length, 2);
});

test('7. grouped answer saving + submission scores correctly', async () => {
  const token = await registered();
  const children = [];
  for (let i = 0; i < 2; i++) children.push(await makeQuestion({ text: `ans ${uniq()}`, correctAnswer: 1 }));
  const group = await QuestionGroup.create({
    title: 'G2', type: 'data_interpretation', section: 'reasoning', topic: 'DI',
    stimulus: { text: 'data', media: null }, questions: children.map((c) => c._id),
  });
  await Question.updateMany({ _id: { $in: children.map((c) => c._id) } }, { groupId: group._id });
  const testDoc = await TestModel.create({
    title: 'Grouped Score', type: 'topic_practice', section: 'reasoning', topic: 'DI',
    groups: [group._id], totalQuestions: 2, duration: 600, selectionMode: 'fixed',
  });

  const start = await api(`/api/attempts/start/${testDoc._id}`, { method: 'POST', token });
  const attemptId = start.body.data._id;
  await api(`/api/attempts/${attemptId}/answer`, { method: 'PUT', token, body: { questionIndex: 0, selectedAnswer: 1 } });
  await api(`/api/attempts/${attemptId}/answer`, { method: 'PUT', token, body: { questionIndex: 1, selectedAnswer: 0 } });

  const submit = await api(`/api/attempts/${attemptId}/submit`, { method: 'POST', token });
  assert.equal(submit.status, 200);
  assert.equal(submit.body.data.result.score, 1);
  assert.equal(submit.body.data.result.totalQuestions, 2);
});

test('8. result review exposes group context, explanation and correctAnswer', async () => {
  const token = await registered();
  const c1 = await makeQuestion({ text: `rev1 ${uniq()}`, correctAnswer: 0, explanation: 'exp one' });
  const c2 = await makeQuestion({ text: `rev2 ${uniq()}`, correctAnswer: 1, explanation: 'exp two' });
  const group = await QuestionGroup.create({
    title: 'Review Group', type: 'reading_comprehension', section: 'verbal', topic: 'Reading Comprehension',
    stimulus: { text: 'long passage', media: null }, questions: [c1._id, c2._id],
  });
  await Question.updateMany({ _id: { $in: [c1._id, c2._id] } }, { groupId: group._id });
  const testDoc = await TestModel.create({
    title: 'Review Test', type: 'section_test', section: 'verbal',
    groups: [group._id], totalQuestions: 2, duration: 600, selectionMode: 'fixed',
  });
  const start = await api(`/api/attempts/start/${testDoc._id}`, { method: 'POST', token });
  const attemptId = start.body.data._id;
  await api(`/api/attempts/${attemptId}/answer`, { method: 'PUT', token, body: { questionIndex: 0, selectedAnswer: 0 } });
  await api(`/api/attempts/${attemptId}/submit`, { method: 'POST', token });

  const review = await api(`/api/results/${attemptId}/review`, { token });
  assert.equal(review.status, 200);
  assert.equal(review.body.data.questionGroups.length, 1);
  assert.equal(review.body.data.questionGroups[0].title, 'Review Group');
  assert.equal(review.body.data.review.length, 2);
  assert.ok(review.body.data.review[0].question.explanation);
  assert.equal(typeof review.body.data.review[0].correctAnswer, 'number');
});

test('9. correctAnswer and explanation are NOT exposed during an active attempt', async () => {
  const token = await registered();
  const q = await makeQuestion({ explanation: 'secret explanation' });
  const testDoc = await TestModel.create({
    title: 'Hidden', type: 'section_test', section: 'reasoning',
    questions: [q._id], totalQuestions: 1, duration: 600, selectionMode: 'fixed',
  });
  const start = await api(`/api/attempts/start/${testDoc._id}`, { method: 'POST', token });
  const state = await api(`/api/attempts/${start.body.data._id}/state`, { token });
  const q0 = state.body.data.responses[0].question;
  assert.ok(!('correctAnswer' in q0), 'correctAnswer must not be present');
  assert.ok(!('explanation' in q0), 'explanation must not be present');
});

test('10. fixed selection preserves order, expands groups and never orphans a child', async () => {
  const token = await registered();
  const c1 = await makeQuestion({ text: `fx1 ${uniq()}` });
  const c2 = await makeQuestion({ text: `fx2 ${uniq()}` });
  const c3 = await makeQuestion({ text: `fx3 ${uniq()}` });
  const group = await QuestionGroup.create({
    title: 'Fixed Group', type: 'data_interpretation', section: 'reasoning', topic: 'DI',
    stimulus: { text: 's', media: null }, questions: [c1._id, c2._id, c3._id],
  });
  await Question.updateMany({ _id: { $in: [c1._id, c2._id, c3._id] } }, { groupId: group._id });

  const standalone = await makeQuestion({ text: `fx-standalone ${uniq()}` });

  // Only c2 (a child) + a standalone are configured. The group must be expanded once.
  const testDoc = await TestModel.create({
    title: 'Fixed Order', type: 'section_test', section: 'reasoning',
    questions: [c2._id, standalone._id], totalQuestions: 4, duration: 600, selectionMode: 'fixed',
  });
  const start = await api(`/api/attempts/start/${testDoc._id}`, { method: 'POST', token });
  const state = await api(`/api/attempts/${start.body.data._id}/state`, { token });
  const ids = state.body.data.responses.map((r) => String(r.question._id));
  assert.deepEqual(ids, [String(c1._id), String(c2._id), String(c3._id), String(standalone._id)]);
  assert.equal(state.body.data.questionGroups.length, 1);
  assert.equal(state.body.data.questionMode, 'mixed');
});

test('11. random selection samples from the configured pool', async () => {
  const token = await registered();
  const topic = 'RandomTopic ' + uniq();
  for (let i = 0; i < 5; i++) {
    await makeQuestion({ text: `rnd ${uniq()}`, section: 'reasoning', topic, options: ['a', 'b', 'c', 'd'], correctAnswer: 0 });
  }
  const testDoc = await TestModel.create({
    title: 'Random Pool', type: 'topic_practice', section: 'reasoning', topic,
    totalQuestions: 3, duration: 600, selectionMode: 'random',
  });
  const start = await api(`/api/attempts/start/${testDoc._id}`, { method: 'POST', token });
  assert.equal(start.status, 201);
  assert.equal(start.body.data.responses.length, 3);
  const state = await api(`/api/attempts/${start.body.data._id}/state`, { token });
  for (const r of state.body.data.responses) {
    assert.equal(r.question.topic, topic);
  }
});

test('12. existing seed data remains compatible with the new schema', async () => {
  const files = ['reasoning.json', 'average.json', 'numerical.json', 'verbal.json'];
  let checked = 0;
  for (const f of files) {
    const p = path.join(__dirname, '..', 'seeds', f);
    if (!fs.existsSync(p)) continue;
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const q of data) {
      const doc = new Question(q);
      const err = doc.validateSync();
      assert.equal(err, undefined, `${f}: ${q.text?.slice(0, 40)} -> ${err && err.message}`);
      assert.ok(doc.options.length >= 2 && doc.options.length <= 5);
      assert.ok(doc.correctAnswer < doc.options.length);
      checked++;
    }
  }
  assert.ok(checked > 100, `expected to validate many seed questions, got ${checked}`);
});

test('13. legacy tests (no selectionMode) and 5-option PassageQuestion still work', async () => {
  const token = await registered();

  // Legacy test: no selectionMode, section set -> legacy random behaviour
  const legacyPool = [];
  for (let i = 0; i < 3; i++) legacyPool.push(await makeQuestion({ text: `legacy ${uniq()}`, section: 'advanced', topic: 'Legacy' }));
  const legacyTest = await TestModel.create({
    title: 'Legacy Section', type: 'section_test', section: 'advanced',
    totalQuestions: 2, duration: 600,
  });
  assert.equal(legacyTest.selectionMode, 'auto');
  const legacyStart = await api(`/api/attempts/start/${legacyTest._id}`, { method: 'POST', token });
  assert.equal(legacyStart.status, 201);
  assert.equal(legacyStart.body.data.responses.length, 2);

  // PassageQuestion (5 options, correctAnswer 4) answerable in an attempt
  const p5 = await PassageQuestion.create({
    text: 'Passage FITB ' + uniq(),
    options: ['a', 'b', 'c', 'd', 'e'],
    correctAnswer: 4,
    section: 'verbal',
    topic: 'Passage Fill in the Blank',
  });
  const pTest = await TestModel.create({
    title: 'Passage 5', type: 'section_test', section: 'verbal',
    questions: [p5._id], totalQuestions: 1, duration: 600, selectionMode: 'fixed',
  });
  const pStart = await api(`/api/attempts/start/${pTest._id}`, { method: 'POST', token });
  const ans = await api(`/api/attempts/${pStart.body.data._id}/answer`, {
    method: 'PUT', token, body: { questionIndex: 0, selectedAnswer: 4 },
  });
  assert.equal(ans.status, 200);
  const pSubmit = await api(`/api/attempts/${pStart.body.data._id}/submit`, { method: 'POST', token });
  assert.equal(pSubmit.body.data.result.score, 1);
});

test('14. deleting a group safely detaches children and unlinks from tests', async () => {
  const admin = await registered(true);
  const c1 = await makeQuestion({ text: `del1 ${uniq()}` });
  const group = await QuestionGroup.create({
    title: 'To Delete', type: 'case_study', section: 'advanced', topic: 'Case',
    stimulus: { text: 'case', media: null }, questions: [c1._id],
  });
  await Question.updateOne({ _id: c1._id }, { groupId: group._id });
  const testDoc = await TestModel.create({
    title: 'Uses Group', type: 'section_test', section: 'advanced',
    groups: [group._id], totalQuestions: 1, duration: 600, selectionMode: 'fixed',
  });

  const del = await api(`/api/admin/question-groups/${group._id}`, { method: 'DELETE', token: admin });
  assert.equal(del.status, 200);
  assert.equal(await QuestionGroup.findById(group._id), null);
  const child = await Question.findById(c1._id);
  assert.equal(child.groupId, null);
  const testAfter = await TestModel.findById(testDoc._id);
  assert.equal(testAfter.groups.length, 0);
});

test('15. cannot answer another user\'s attempt or answer after submission', async () => {
  const tokenA = await registered();
  const tokenB = await registered();
  const q = await makeQuestion({ text: `sec ${uniq()}` });
  const testDoc = await TestModel.create({
    title: 'Security', type: 'section_test', section: 'reasoning',
    questions: [q._id], totalQuestions: 1, duration: 600, selectionMode: 'fixed',
  });
  const start = await api(`/api/attempts/start/${testDoc._id}`, { method: 'POST', token: tokenA });
  const attemptId = start.body.data._id;

  const other = await api(`/api/attempts/${attemptId}/answer`, {
    method: 'PUT', token: tokenB, body: { questionIndex: 0, selectedAnswer: 0 },
  });
  assert.equal(other.status, 400);

  await api(`/api/attempts/${attemptId}/submit`, { method: 'POST', token: tokenA });
  const after = await api(`/api/attempts/${attemptId}/answer`, {
    method: 'PUT', token: tokenA, body: { questionIndex: 0, selectedAnswer: 1 },
  });
  assert.equal(after.status, 400);
});

test('16. non-admin cannot access question-group admin APIs', async () => {
  const user = await registered();
  const res = await api('/api/admin/question-groups', {
    method: 'POST', token: user,
    body: { title: 'x', type: 'data_interpretation' },
  });
  assert.equal(res.status, 403);
});
