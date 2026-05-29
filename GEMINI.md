# Gemini Project Context: TCS NQT Backend

This file serves as a source of truth for the architectural patterns, code conventions, and project-specific knowledge of the TCS NQT Practice Platform backend.

## 🏗 Architecture & Patterns

- **Pattern:** Classic MVC (Model-View-Controller).
- **Control Flow:** `Routes` -> `Middleware (Auth/Validate)` -> `Controller` -> `Model` -> `Utility (Scoring/Analytics)`.
- **Database:** MongoDB via Mongoose. Uses **Discriminators** for specialized question types (e.g., `PassageQuestion` extending `Question`).
- **Authentication:** 
  - Dual-token system: JWT Access Token (short-lived) + JWT Refresh Token (long-lived, stored in DB).
  - Refresh tokens are rotated on each refresh call.
  - `protect` middleware populates `req.user`.

## 📂 Core Modules

| Module | Responsibility | Key Files |
|---|---|---|
| **Auth** | Registration, Login, Token Refresh | `controllers/authController.js`, `utils/generateToken.js` |
| **Testing** | Test retrieval, Topic/Section filtering | `controllers/testController.js` |
| **Attempting** | Real-time tracking of test progress | `controllers/attemptController.js`, `models/TestAttempt.js` |
| **Scoring** | Post-test validation and grading | `utils/scoringEngine.js`, `models/Result.js` |
| **Analytics** | Weakness detection, Recommendations | `utils/recommendationEngine.js`, `models/UserAnalytics.js` |
| **Coding** | Coding problem solutions (PYQs) | `controllers/codingController.js`, `models/CodingQuestion.js` |

## 🛠 Engineering Standards

### Coding Conventions
- **Error Handling:** Use `try-catch` blocks in controllers and pass errors to `next(error)`. Centralized `middleware/errorHandler.js` handles formatting.
- **Validation:** All write operations must be validated using `express-validator` (see `validators/` folder).
- **Asynchronous Ops:** Prefer `async/await` over callbacks or raw `.then()`.
- **Naming:** 
  - Controllers: camelCase (e.g., `getTest`).
  - Models: PascalCase (e.g., `TestAttempt`).
  - Routes: kebab-case (e.g., `/api/test-attempts`).

### Seeding Strategy
- The database is heavily dependent on seed data for questions.
- **Rule:** Never manually edit production question collections; always update the JSON in `seeds/` and run the corresponding script.
- **Shuffle Logic:** Many tests (Full Mocks, Practice) are generated dynamically by sampling from the question pool using Fisher-Yates shuffle.

## 🧪 Testing State
- **Current State:** No automated test suite (Jest/Mocha) is implemented.
- **Validation:** Rely on `api/debug/db` and manual Postman/Frontend verification.

## 💡 Key Logic: Test Attempt Lifecycle
1. `startAttempt`: Creates a `TestAttempt` record. If an active one exists, it resumes it unless `forceNew` is passed.
2. `saveAnswer`: Incremental updates to the attempt. Tracks `timeSpent` per question.
3. `submitAttempt`: Marks status as `completed` or `timed_out`.
4. `calculateAndSaveResult`: Triggered on submission. Cross-references answers with `Question` model, saves `Result`, and triggers background `updateUserAnalytics`.

## ⚠️ Critical Constraints
- **CORS:** Must remain `origin: true` with `credentials: true` for cross-domain cookie/token support.
- **Payload Limits:** `express.json` is set to `10mb` to accommodate large seed uploads/analytics payloads.
- **Discriminators:** Ensure `require('./models/PassageQuestion')` stays in `server.js` before routes to ensure Mongoose resolves the schema correctly.
