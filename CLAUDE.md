# TCS NQT Practice Platform — Backend

## Overview

Express.js + MongoDB REST API for a TCS NQT exam practice platform. Provides auth, test management, attempt tracking, scoring, analytics, and admin APIs.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5
- **Database:** MongoDB Atlas via Mongoose 9
- **Auth:** JWT (access + refresh tokens), bcryptjs
- **Validation:** express-validator
- **Security:** helmet, cors
- **Logging:** morgan
- **Deployment:** Vercel (serverless)

## Project Structure

```
config/db.js          — MongoDB connection
models/               — Mongoose schemas (User, Test, Question, TestAttempt, Result, UserAnalytics, CodingQuestion)
controllers/          — Business logic (auth, test, attempt, result, analytics, admin, coding)
routes/               — Express routers mapping to controllers
middleware/            — auth (JWT protect + adminOnly), errorHandler, validate
validators/           — express-validator rules (auth, question, test)
utils/                — generateToken, scoringEngine, recommendationEngine
seeds/                — DB seeding scripts + JSON question data
server.js             — Entry point
```

## Commands

```bash
npm start                      # node server.js
npm run dev                    # nodemon server.js
npm run seed                   # node seeds/seed.js
npm run seed:hard              # node seeds/seed_hard.js
npm run seed:extra             # node seeds/seed_extra.js
npm run seed:extra2            # node seeds/seed_extra2.js
npm run seed:custom            # node seeds/seed_custom.js
npm run seed:ratio-percentage       # node seeds/seed_ratio_percentage.js
npm run seed:ratio-percentage-test  # node seeds/seed_ratio_percentage_test.js
npm run seed:time-and-work          # node seeds/seed_time_and_work.js
npm run seed:time-and-work-test     # node seeds/seed_time_and_work_test.js
npm run seed:lcm-hcf               # node seeds/seed_lcm_hcf.js
npm run seed:lcm-hcf-test          # node seeds/seed_lcm_hcf_test.js
npm run seed:coding                # node seeds/seed_coding.js
npm run seed:speed-time-distance        # node seeds/seed_speed_time_distance.js
npm run seed:speed-time-distance-test   # node seeds/seed_speed_time_distance_test.js
npm run seed:verbal-rc-parajumble           # node seeds/seed_verbal_rc_parajumble.js
npm run seed:verbal-rc-parajumble-test      # node seeds/seed_verbal_rc_parajumble_test.js
npm run seed:vocabulary-fitb               # node seeds/seed_vocabulary_fitb.js
npm run seed:error-detection               # node seeds/seed_error_detection.js
npm run seed:average                       # node seeds/seed_average.js
npm run seed:average-test                  # node seeds/seed_average_test.js
npm run seed:profit-and-loss               # node seeds/seed_profit_and_loss.js
npm run seed:profit-and-loss-test          # node seeds/seed_profit_and_loss_test.js
```

Additional seed scripts (no npm aliases — run directly with `node seeds/<file>`):
- `seed_numerical_boost.js`, `seed_more.js`, `seed_tests.js`
- `seed_blood_relations.js`, `seed_blood_relations_test.js`
- `seed_simplification.js`, `seed_simplification_test.js`
- `seed_approximation.js`, `seed_approximation_test.js`

## API Routes

| Prefix | Auth | Description |
|---|---|---|
| `/api/auth` | Mixed | Register, login, refresh, logout, me |
| `/api/tests` | No | List tests, get test, topics, practice questions |
| `/api/attempts` | Yes | Start, answer, navigate, mark review, submit |
| `/api/results` | Yes | History, detailed result, full question review |
| `/api/analytics` | Yes | Dashboard, section/topic performance, trends, recommendations |
| `/api/admin` | Admin | CRUD questions/tests, user management, dashboard stats |
| `/api/coding` | No | PYQ coding question solutions with brute force & optimal approaches |

## Key Patterns

- **MVC architecture** — models, controllers, routes cleanly separated
- **JWT auth** — 15m access token + 7d refresh token, Bearer header
- **Error handling** — centralized middleware handles Mongoose errors, CastError, duplicates
- **Attempt resume** — in-progress attempts can be resumed within duration + 30s grace
- **Scoring** — section-wise and topic-wise breakdowns with time tracking
- **Analytics** — confidence levels, overthinking/guessing detection, score history (last 50)
- **Test generation** — Fisher-Yates shuffle, proportional sampling for full mocks

## Environment Variables

```
PORT, MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRE, JWT_REFRESH_EXPIRE, NODE_ENV
```

## Sections & Difficulty

- Sections: `numerical`, `reasoning`, `verbal`, `advanced`
- Difficulty: `easy`, `medium`, `hard`
- Test types: `section_test`, `full_mock`, `topic_practice`

## Topic Practice Tests

| Topic | Questions (pool) | Per Test | Duration | Seed Commands |
|---|---|---|---|---|
| Ratio & Percentage | 69 | 30 | 40 min | `seed:ratio-percentage` + `seed:ratio-percentage-test` |
| Time & Work | 30 | 30 | 45 min | `seed:time-and-work` + `seed:time-and-work-test` |
| LCM & HCF | 35 | 35 | 45 min | `seed:lcm-hcf` + `seed:lcm-hcf-test` |
| Blood Relations | 50 | 25 | 30 min | `seed_blood_relations.js` + `seed_blood_relations_test.js` |
| Simplification | 30 | 30 | 45 min | `seed_simplification.js` + `seed_simplification_test.js` |
| Approximation | 30 | 30 | 40 min | `seed_approximation.js` + `seed_approximation_test.js` |
| Speed, Time & Distance | 35 | 30 | 45 min | `seed:speed-time-distance` + `seed:speed-time-distance-test` |
| Para Jumble | 15 | 15 | 20 min | `seed:verbal-rc-parajumble` + `seed:verbal-rc-parajumble-test` |
| Reading Comprehension | 66+ | 30 | 45 min | `seed:verbal-rc-parajumble` + `seed:verbal-rc-parajumble-test` |
| Vocabulary Fill in the Blank | 30 | 30 | 30 min | `seed:vocabulary-fitb` |
| Error Detection | 30 | 30 | 35 min | `seed:error-detection` |
| Average | 36 | 30 | 40 min | `seed:average` + `seed:average-test` |
| Profit & Loss | 34 | 30 | 40 min | `seed:profit-and-loss` + `seed:profit-and-loss-test` |

## Key API Behaviors

- **Review endpoint** (`GET /api/results/:attemptId/review`) returns **all** questions with `isCorrect` flag (not just wrong answers)

## No test suite configured — no Jest/Mocha in dependencies.
