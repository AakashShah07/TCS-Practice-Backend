/**
 * Seed a mock Data Interpretation (grouped) test.
 *
 * Supports two data-file shapes:
 *
 *   Single group (legacy):
 *     { "group": {...}, "questions": [...], "test": {...} }
 *
 *   Multiple groups (one test, N shared-stimulus groups):
 *     { "groups": [ { ...group, "questions": [...] }, ... ],
 *       "standaloneQuestions": [ ... ],   // optional, appended after the groups
 *       "test": {...} }
 *
 * Creates one QuestionGroup per spec with its ordered child questions and a
 * curated `topic_practice` Test that uses fixed selection.
 *
 * Idempotent: re-running updates the existing groups/questions/test by title
 * instead of creating duplicates.
 *
 * Run:  npm run seed:di-mock
 *   or: node seeds/seed_data_interpretation_mock.js
 *   or: node seeds/seed_data_interpretation_mock.js seeds/data_interpretation_friends.json
 *   or: MONGO_URI="mongodb://127.0.0.1:27017/tcs-nqt" node seeds/seed_data_interpretation_mock.js
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Question = require('../models/Question');
const QuestionGroup = require('../models/QuestionGroup');
const Test = require('../models/Test');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tcs-nqt';
const dataFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'data_interpretation_mock.json');

async function upsertQuestions(questions) {
  const ids = [];
  for (const q of questions) {
    // Match on the unique (text, topic) index so re-runs update in place.
    const doc = await Question.findOneAndUpdate(
      { text: q.text, topic: q.topic },
      { $set: q },
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    ids.push(doc._id);
  }
  return ids;
}

async function upsertGroup(groupSpec, questionIds) {
  return QuestionGroup.findOneAndUpdate(
    { title: groupSpec.title },
    {
      $set: {
        ...groupSpec,
        questions: questionIds,
        isActive: true,
      },
    },
    { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

function normalizeGroups(data) {
  if (Array.isArray(data.groups) && data.groups.length > 0) {
    return data.groups.map((g) => {
      const { questions, ...group } = g;
      return { group, questions: questions || [] };
    });
  }
  if (data.group) {
    return [{ group: data.group, questions: data.questions || [] }];
  }
  throw new Error('Data file must define either "groups" (an array) or "group" (a single object).');
}

async function main() {
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  await mongoose.connect(MONGO_URI);
  console.log(`Connected: ${mongoose.connection.host}`);

  const groupSpecs = normalizeGroups(data);

  // 1. Child questions + groups (in file order)
  const allQuestionIds = [];
  const groupIds = [];
  for (const spec of groupSpecs) {
    const questionIds = await upsertQuestions(spec.questions);
    console.log(`Upserted ${questionIds.length} child questions for group "${spec.group.title}"`);

    const group = await upsertGroup(spec.group, questionIds);
    console.log(`Upserted question group: ${group.title} (${group._id})`);

    // Back-link children to the group
    await Question.updateMany({ _id: { $in: questionIds } }, { $set: { groupId: group._id } });

    allQuestionIds.push(...questionIds);
    groupIds.push(group._id);
  }

  // 1b. Standalone questions (no shared stimulus), appended in file order.
  const standalone = Array.isArray(data.standaloneQuestions) ? data.standaloneQuestions : [];
  if (standalone.length > 0) {
    const standaloneIds = await upsertQuestions(standalone);
    console.log(`Upserted ${standaloneIds.length} standalone questions`);
    allQuestionIds.push(...standaloneIds);
  }

  // 2. The curated test (fixed selection -> exact configured groups/questions)
  const test = await Test.findOneAndUpdate(
    { title: data.test.title },
    {
      $set: {
        ...data.test,
        groups: groupIds,
        questions: allQuestionIds,
        totalQuestions: allQuestionIds.length,
      },
    },
    { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  console.log(`Upserted test: ${test.title} (${test._id})`);
  console.log(`   selectionMode=${test.selectionMode} groups=${test.groups.length} totalQuestions=${test.totalQuestions}`);

  console.log('\nDone. Open the platform and start this test, or hit:');
  console.log(`   POST /api/attempts/start/${test._id}   (authenticated)`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Seed failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
