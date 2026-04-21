# TCS NQT Practice Platform — Backend

## Overview

Express.js + MongoDB REST API for a TCS NQT exam practice platform. Provides auth, test management, attempt tracking, scoring, analytics, and admin APIs.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5
- **Database:** MongoDB Atlas via Mongoose 9
- **Auth:** JWT (access + refresh tokens), bcryptjs
- **Validation:** express-validator
- **Deployment:** Vercel (serverless)

## Project Structure

```
config/db.js          — MongoDB connection
models/               — Mongoose schemas (User, Test, Question, TestAttempt, Result, UserAnalytics)
controllers/          — Business logic (auth, test, attempt, result, analytics, admin)
routes/               — Express routers mapping to controllers
middleware/            — auth (JWT protect + adminOnly), errorHandler, validate
validators/           — express-validator rules (auth, question, test)
utils/                — generateToken, scoringEngine, recommendationEngine
seeds/                — DB seeding scripts + JSON question data
server.js             — Entry point
```

## Commands

```bash
npm start             # node server.js
npm run dev           # nodemon server.js
npm run seed          # node seeds/seed.js
npm run seed:hard     # node seeds/seed_hard.js
npm run seed:extra    # node seeds/seed_extra.js
npm run seed:extra2   # node seeds/seed_extra2.js
npm run seed:custom   # node seeds/seed_custom.js
```

## API Routes

| Prefix | Auth | Description |
|---|---|---|
| `/api/auth` | Mixed | Register, login, refresh, logout, me |
| `/api/tests` | No | List tests, get test, topics, practice questions |
| `/api/attempts` | Yes | Start, answer, navigate, mark review, submit |
| `/api/results` | Yes | History, detailed result, wrong answer review |
| `/api/analytics` | Yes | Dashboard, section/topic performance, trends, recommendations |
| `/api/admin` | Admin | CRUD questions/tests, user management, dashboard stats |

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

## No test suite configured — no Jest/Mocha in dependencies.
