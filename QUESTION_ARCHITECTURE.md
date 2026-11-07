# Question Architecture — Grouped, DI, and Image-Based Questions (Phase 1)

Backend-only change. No frontend work. Additive and backward compatible — existing
tests, attempts and seeds keep working unchanged.

## 1. What changed

### New models
- `models/QuestionGroup.js` — shared stimulus (graph/table/passage/case study) with
  ordered child questions.
- `models/mediaSchema.js` — reusable media descriptor (`type`, `url`, `alt`). Only a
  URL is stored; **no binary data in MongoDB**.

### Updated models
- `models/Question.js`
  - `options`: now **2–5** (was exactly 4)
  - `correctAnswer`: validated against `options.length` (supports 0–4)
  - new `questionType` (`mcq` | `image_mcq`, default `mcq`)
  - new `groupId` (ref `QuestionGroup`)
  - new `media` (per-question media for `image_mcq`)
  - new `marks` (optional, default `1`; the Fair Stalls / Data Sufficiency / Syllogism sets use 2)
- `models/Test.js`
  - new `selectionMode` (`auto` | `fixed` | `random`, default `auto`)
  - new `groups` (curated `QuestionGroup` references)
- `models/TestAttempt.js`
  - `selectedAnswer`: removed hardcoded `0–3`; range is validated at answer time
    against the actual option count
- `models/PassageQuestion.js` — unchanged; still 5 options / correctAnswer 0–4, and now
  answerable in attempts.

### Group types
`data_interpretation`, `reading_comprehension`, `image_based`, `table_based`, `case_study`,
`data_sufficiency`, `syllogism`

### Media types
`image`, `chart`, `table`

## 2. Question selection strategies

| `selectionMode` | Behaviour |
|---|---|
| `auto` (default) | Legacy behaviour — section/topic pool sampling; `questions[]` fallback |
| `random` | Sample from the configured section/topic pool |
| `fixed` | Use configured `groups` + `questions` in exact order |

`fixed` expands a group into its ordered children, includes a group at most once,
and never returns a child question without its group.

## 3. Assessment API response contract

`GET /api/attempts/:id/state`, `GET /api/tests/:id` and
`GET /api/results/:attemptId/review` now include:

```json
{
  "questionMode": "grouped | standalone | mixed",
  "questionGroups": [
    {
      "id": "groupId",
      "title": "Election Campaign Analysis",
      "type": "data_interpretation",
      "section": "reasoning",
      "topic": "Data Interpretation",
      "difficulty": "medium",
      "stimulus": {
        "text": "Study the following graph...",
        "media": { "type": "chart", "url": "/uploads/di.png", "alt": "Voter graph" }
      },
      "questionIds": ["q1", "q2", "q3"]
    }
  ]
}
```

Each populated `responses[].question` (and review `question`) now carries
`questionType`, `media`, and `groupId`. `correctAnswer` and `explanation` are
**never** returned during an active attempt; they appear only in the post-submit
review.

## 4. Admin API

All under `protect + adminOnly`:

| Method | Route |
|---|---|
| POST | `/api/admin/question-groups` |
| GET | `/api/admin/question-groups` |
| GET | `/api/admin/question-groups/:id` |
| PUT | `/api/admin/question-groups/:id` |
| DELETE | `/api/admin/question-groups/:id` (detaches children, unlinks from tests) |
| POST | `/api/admin/question-groups/:id/questions` |
| PUT | `/api/admin/question-groups/:id/questions/reorder` |
| DELETE | `/api/admin/question-groups/:id/questions/:questionId` |
| PUT | `/api/admin/question-groups/:id/media` |

## 5. Media storage integration point

No upload pipeline exists. The API accepts a `media.url` supplied by the admin
(external CDN/object store or a static path such as `/uploads/questions/xyz.png`).
A real upload handler should be added in front of these endpoints later; the
`mediaSchema` shape is the integration point.

## 6. Migration notes

- **Additive only.** New fields have defaults (`questionType: 'mcq'`,
  `groupId: null`, `media: null`, `selectionMode: 'auto'`, `groups: []`).
- No data migration is required. Mongoose creates new indexes automatically:
  - `QuestionGroup`: `{section, topic}`, `{type}`
  - `Question`: `groupId`
- Existing 4-option questions remain valid; existing attempts/tests behave exactly as
  before (`selectionMode: 'auto'`).
- To convert legacy textual RC questions into groups, optionally backfill later — not
  required for correctness.

## 7. Tests

`tests/question-groups.test.js` (17 cases) + existing `tests/auth.test.js` (29 cases).
Run with an isolated mongod:

```bash
mongod --dbpath /tmp/opencode/nqt-test-db --port 27099 --fork --logpath /tmp/opencode/mongod-test.log
npm test
```
