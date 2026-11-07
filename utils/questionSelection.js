const Question = require('../models/Question');
const QuestionGroup = require('../models/QuestionGroup');

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Deduplicate questions by text to avoid repeated questions from duplicate DB entries
function dedupeByText(questions) {
  const seen = new Set();
  return questions.filter((q) => {
    if (seen.has(q.text)) return false;
    seen.add(q.text);
    return true;
  });
}

// Extract the canonical passage body from a Reading Comprehension question text.
// A Reading Comprehension question is written as:
// "Read the passage: '...some text...' Which of the following ... ?"
function extractReadingPassage(text) {
  if (!text || typeof text !== 'string') return { passage: null, questionText: text || '' };

  const match = text.match(/^Read the passage\s*:\s*['"“]([\s\S]*?)['"”]\s*(.*)$/i);
  if (!match) {
    return { passage: null, questionText: text };
  }

  const passage = match[1]?.trim();
  const trailing = match[2]?.trim();
  return {
    passage: passage || '',
    questionText: trailing || '',
  };
}

function buildReadingComprehensionGroups(questionPool) {
  const groups = new Map();

  for (const question of questionPool) {
    const { passage } = extractReadingPassage(question.text);
    const normalizedKey = passage || question.text;

    if (!groups.has(normalizedKey)) {
      groups.set(normalizedKey, []);
    }

    groups.get(normalizedKey).push(question);
  }

  return Array.from(groups.values());
}

function selectReadingComprehensionIds(groups, requireCount) {
  const shuffledGroups = shuffle(groups);
  const selectedIds = [];

  for (const group of shuffledGroups) {
    const ids = group.map((q) => q._id);
    const remainingSlots = requireCount - selectedIds.length;
    if (remainingSlots <= 0) break;

    if (ids.length <= remainingSlots) {
      selectedIds.push(...ids);
    } else {
      selectedIds.push(...ids.slice(0, remainingSlots));
    }
  }

  return selectedIds;
}

// ---------------------------------------------------------------------------
// Selection strategies
// ---------------------------------------------------------------------------

// fixed: use the exact configured groups + questions, in the configured order.
// Groups are expanded into their ordered children; a group is included at most
// once and a child question is never duplicated across the selection.
async function selectFixedQuestionIds(test) {
  const orderedIds = [];
  const seen = new Set();
  const push = (id) => {
    const key = String(id);
    if (seen.has(key)) return;
    seen.add(key);
    orderedIds.push(id);
  };

  // 1. Curated groups first (in order), each expanded into its ordered children.
  if (Array.isArray(test.groups) && test.groups.length > 0) {
    const groups = await QuestionGroup.find({ _id: { $in: test.groups } }).select('_id questions');
    const byId = new Map(groups.map((g) => [String(g._id), g]));
    for (const gid of test.groups) {
      const group = byId.get(String(gid));
      if (!group) continue;
      for (const qid of group.questions) push(qid);
    }
  }

  // 2. Explicitly listed questions in order. If a question belongs to a group,
  // include the whole group (stimulus + ordered children) instead of an orphan.
  const configured = test.questions || [];
  const groupCache = new Map();
  const loadGroup = async (groupId) => {
    const key = String(groupId);
    if (!groupCache.has(key)) {
      groupCache.set(key, await QuestionGroup.findById(groupId).select('_id questions'));
    }
    return groupCache.get(key);
  };

  const questionDocs = await Question.find({ _id: { $in: configured } }).select('_id groupId');
  const qById = new Map(questionDocs.map((q) => [String(q._id), q]));

  for (const qid of configured) {
    const q = qById.get(String(qid));
    if (!q) {
      // The configured id may itself be a QuestionGroup id — expand it.
      const group = await loadGroup(qid);
      if (group) {
        for (const cid of group.questions) push(cid);
      }
      continue;
    }
    if (q.groupId) {
      const group = await loadGroup(q.groupId);
      if (group) {
        for (const cid of group.questions) push(cid);
        continue;
      }
    }
    push(qid);
  }

  // 3. Fallback: if nothing resolved (e.g. empty configured list), use all listed ids.
  if (orderedIds.length === 0) configured.forEach(push);

  return orderedIds;
}

// random/legacy: sample from the configured section/topic pool.
async function selectRandomQuestionIds(test) {
  if (test.type === 'full_mock') {
    const sectionCounts = { numerical: 25, reasoning: 25, verbal: 25, advanced: 14 };
    const selected = [];
    for (const [section, count] of Object.entries(sectionCounts)) {
      const pool = await Question.find({ section }).select('_id text');
      const unique = dedupeByText(pool);

      if (section === 'verbal') {
        const rcGroups = buildReadingComprehensionGroups(unique);
        const rcIds = selectReadingComprehensionIds(rcGroups, Math.min(count, unique.length));
        const remaining = Math.max(count - rcIds.length, 0);
        if (remaining > 0) {
          const nonRc = unique.filter((q) => !/Read the passage\s*:/i.test(q.text));
          const shuffledNonRc = shuffle(nonRc.map((q) => q._id));
          selected.push(...rcIds, ...shuffledNonRc.slice(0, Math.min(remaining, shuffledNonRc.length)));
        } else {
          selected.push(...rcIds);
        }
      } else {
        const shuffled = shuffle(unique.map((q) => q._id));
        selected.push(...shuffled.slice(0, Math.min(count, shuffled.length)));
      }
    }
    return selected;
  }

  if (test.type === 'topic_practice' && test.topic) {
    const pool = await Question.find({ section: test.section, topic: test.topic }).select('_id text');
    const unique = dedupeByText(pool);

    if (/reading comprehension/i.test(test.topic)) {
      const groups = buildReadingComprehensionGroups(unique);
      return selectReadingComprehensionIds(groups, Math.min(test.totalQuestions, unique.length));
    }
    const shuffled = shuffle(unique.map((q) => q._id));
    return shuffled.slice(0, Math.min(test.totalQuestions, shuffled.length));
  }

  if (test.section) {
    const pool = await Question.find({ section: test.section }).select('_id text');
    const unique = dedupeByText(pool);
    const shuffled = shuffle(unique.map((q) => q._id));
    return shuffled.slice(0, Math.min(test.totalQuestions, shuffled.length));
  }

  // Fallback: use the test's fixed questions (legacy behaviour)
  return shuffle(test.questions || []);
}

async function selectQuestionIds(test) {
  if (test.selectionMode === 'fixed') return selectFixedQuestionIds(test);
  // 'auto' (default) and 'random' both use pool sampling, preserving legacy behaviour.
  return selectRandomQuestionIds(test);
}

// ---------------------------------------------------------------------------
// Response assembly
// ---------------------------------------------------------------------------

// Build the grouped-question response contract from flat question documents.
// Returns { questionMode, questionGroups }. Standalone-only attempts return an
// empty group list; grouped attempts include each referenced group exactly once.
function buildQuestionAssemblies(questionDocs, groupDocs) {
  const validQuestions = questionDocs.filter(Boolean);
  const groupMap = new Map((groupDocs || []).map((g) => [String(g._id), g]));

  const referenced = new Set();
  for (const q of validQuestions) {
    if (q && q.groupId) referenced.add(String(q.groupId));
  }

  const questionGroups = [];
  for (const gid of referenced) {
    const g = groupMap.get(gid);
    if (!g) continue;
    questionGroups.push({
      id: g._id,
      title: g.title,
      type: g.type,
      section: g.section,
      topic: g.topic,
      difficulty: g.difficulty,
      stimulus: g.stimulus || { text: '', media: null },
      questionIds: g.questions || [],
    });
  }

  let questionMode = 'standalone';
  if (questionGroups.length > 0) {
    const groupedCount = validQuestions.filter((q) => q.groupId).length;
    questionMode = groupedCount === validQuestions.length ? 'grouped' : 'mixed';
  }

  return { questionMode, questionGroups };
}

module.exports = {
  shuffle,
  dedupeByText,
  extractReadingPassage,
  buildReadingComprehensionGroups,
  selectReadingComprehensionIds,
  selectFixedQuestionIds,
  selectRandomQuestionIds,
  selectQuestionIds,
  buildQuestionAssemblies,
};
