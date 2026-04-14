# TCS NQT Backend API - CURL Requests & Sample Responses

Base URL: `http://localhost:5000`

---

## 1. Health Check

```bash
curl http://localhost:5000/api/health
```

**Response (200):**
```json
{
  "success": true,
  "message": "TCS NQT API is running"
}
```

---

## 2. Authentication

### 2.1 Register

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "6652a1b3c4d5e6f7a8b9c0d1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2.2 Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@tcsnqt.com",
    "password": "demo123"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "6652a1b3c4d5e6f7a8b9c0d2",
    "name": "Demo User",
    "email": "demo@tcsnqt.com",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2.3 Login as Admin

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tcsnqt.com",
    "password": "admin123"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "6652a1b3c4d5e6f7a8b9c0d0",
    "name": "Admin",
    "email": "admin@tcsnqt.com",
    "role": "admin"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2.4 Refresh Token

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2.5 Get Current User

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "6652a1b3c4d5e6f7a8b9c0d2",
    "name": "Demo User",
    "email": "demo@tcsnqt.com",
    "role": "user",
    "createdAt": "2026-04-14T08:00:00.000Z"
  }
}
```

### 2.6 Logout

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 3. Tests (Public - requires auth)

> Replace `<ACCESS_TOKEN>` with the token from login/register response.

### 3.1 List All Tests

```bash
curl http://localhost:5000/api/tests \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "6652b1a2c3d4e5f6a7b8c9d0",
      "title": "Numerical Ability Test",
      "type": "section_test",
      "section": "numerical",
      "totalQuestions": 20,
      "duration": 1500,
      "sectionLocked": false,
      "isActive": true,
      "createdAt": "2026-04-14T08:00:00.000Z"
    },
    {
      "_id": "6652b1a2c3d4e5f6a7b8c9d1",
      "title": "Logical Reasoning Test",
      "type": "section_test",
      "section": "reasoning",
      "totalQuestions": 20,
      "duration": 1500,
      "sectionLocked": false,
      "isActive": true,
      "createdAt": "2026-04-14T08:00:00.000Z"
    },
    {
      "_id": "6652b1a2c3d4e5f6a7b8c9d2",
      "title": "Verbal Ability Test",
      "type": "section_test",
      "section": "verbal",
      "totalQuestions": 25,
      "duration": 1500,
      "sectionLocked": false,
      "isActive": true,
      "createdAt": "2026-04-14T08:00:00.000Z"
    },
    {
      "_id": "6652b1a2c3d4e5f6a7b8c9d3",
      "title": "TCS NQT Full Mock Test",
      "type": "full_mock",
      "totalQuestions": 79,
      "duration": 7200,
      "sectionLocked": true,
      "isActive": true,
      "createdAt": "2026-04-14T08:00:00.000Z"
    }
  ]
}
```

### 3.2 Filter Tests by Type

```bash
curl "http://localhost:5000/api/tests?type=section_test" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "_id": "6652b1a2c3d4e5f6a7b8c9d0",
      "title": "Numerical Ability Test",
      "type": "section_test",
      "section": "numerical",
      "totalQuestions": 20,
      "duration": 1500,
      "isActive": true
    }
  ]
}
```

### 3.3 Filter Tests by Section

```bash
curl "http://localhost:5000/api/tests?section=numerical" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 3.4 Get Single Test (with questions, without answers)

```bash
curl http://localhost:5000/api/tests/<TEST_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "6652b1a2c3d4e5f6a7b8c9d0",
    "title": "Numerical Ability Test",
    "type": "section_test",
    "section": "numerical",
    "totalQuestions": 20,
    "duration": 1500,
    "questions": [
      {
        "_id": "6652a2b3c4d5e6f7a8b9c0e0",
        "text": "If the price of an article is increased by 20% and then decreased by 20%, what is the net percentage change in price?",
        "options": ["No change", "4% decrease", "4% increase", "2% decrease"],
        "section": "numerical",
        "topic": "Percentages",
        "difficulty": "easy"
      }
    ]
  }
}
```

### 3.5 Get Topics by Section

```bash
curl http://localhost:5000/api/tests/topics/numerical \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    "Percentages",
    "Profit-Loss",
    "Ratios",
    "Time-Speed-Distance",
    "Algebra",
    "Geometry",
    "Averages",
    "Number Systems"
  ]
}
```

---

## 4. Test Attempts (Exam Simulation)

### 4.1 Start a Test

```bash
curl -X POST http://localhost:5000/api/attempts/start/<TEST_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "6652c1d2e3f4a5b6c7d8e9f0",
    "user": "6652a1b3c4d5e6f7a8b9c0d2",
    "test": "6652b1a2c3d4e5f6a7b8c9d0",
    "startedAt": "2026-04-14T08:30:00.000Z",
    "duration": 1500,
    "status": "in_progress",
    "currentQuestion": 0,
    "tabSwitchCount": 0,
    "responses": [
      {
        "question": "6652a2b3c4d5e6f7a8b9c0e0",
        "selectedAnswer": null,
        "status": "not_visited",
        "timeSpent": 0
      },
      {
        "question": "6652a2b3c4d5e6f7a8b9c0e1",
        "selectedAnswer": null,
        "status": "not_visited",
        "timeSpent": 0
      }
    ]
  }
}
```

### 4.2 Get Attempt State (Resume)

```bash
curl http://localhost:5000/api/attempts/<ATTEMPT_ID>/state \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "6652c1d2e3f4a5b6c7d8e9f0",
    "test": {
      "_id": "6652b1a2c3d4e5f6a7b8c9d0",
      "title": "Numerical Ability Test",
      "type": "section_test",
      "section": "numerical",
      "totalQuestions": 20,
      "duration": 1500,
      "sectionLocked": false
    },
    "startedAt": "2026-04-14T08:30:00.000Z",
    "duration": 1500,
    "status": "in_progress",
    "currentQuestion": 3,
    "tabSwitchCount": 0,
    "responses": [
      {
        "question": {
          "_id": "6652a2b3c4d5e6f7a8b9c0e0",
          "text": "If the price of an article is increased by 20%...",
          "options": ["No change", "4% decrease", "4% increase", "2% decrease"],
          "section": "numerical",
          "topic": "Percentages"
        },
        "selectedAnswer": 1,
        "status": "answered",
        "timeSpent": 45
      }
    ]
  }
}
```

### 4.3 Save Answer

```bash
curl -X PUT http://localhost:5000/api/attempts/<ATTEMPT_ID>/answer \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "questionIndex": 0,
    "selectedAnswer": 1,
    "timeSpent": 45
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "questionIndex": 0,
    "status": "answered"
  }
}
```

### 4.4 Mark Question for Review

```bash
curl -X PUT http://localhost:5000/api/attempts/<ATTEMPT_ID>/mark-review \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "questionIndex": 2
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "questionIndex": 2,
    "status": "marked_for_review"
  }
}
```

### 4.5 Clear Response

```bash
curl -X PUT http://localhost:5000/api/attempts/<ATTEMPT_ID>/clear \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "questionIndex": 0
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "questionIndex": 0,
    "status": "not_answered"
  }
}
```

### 4.6 Navigate (change current question)

```bash
curl -X PUT http://localhost:5000/api/attempts/<ATTEMPT_ID>/navigate \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentQuestion": 5,
    "previousQuestion": 3,
    "timeSpent": 30,
    "currentSection": "numerical"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "currentQuestion": 5,
    "currentSection": "numerical"
  }
}
```

### 4.7 Record Tab Switch (Anti-Cheat)

```bash
curl -X PUT http://localhost:5000/api/attempts/<ATTEMPT_ID>/tab-switch \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tabSwitchCount": 1
  }
}
```

### 4.8 Submit Test

```bash
curl -X POST http://localhost:5000/api/attempts/<ATTEMPT_ID>/submit \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "attempt": {
      "_id": "6652c1d2e3f4a5b6c7d8e9f0",
      "status": "completed",
      "submittedAt": "2026-04-14T08:55:00.000Z"
    },
    "result": {
      "_id": "6652d1e2f3a4b5c6d7e8f9a0",
      "score": 14,
      "totalQuestions": 20,
      "percentage": 70,
      "correct": 14,
      "wrong": 4,
      "skipped": 2,
      "timeTaken": 1320,
      "sectionWise": [
        {
          "section": "numerical",
          "correct": 14,
          "wrong": 4,
          "skipped": 2,
          "total": 20,
          "accuracy": 77.78,
          "avgTimePerQuestion": 66
        }
      ],
      "topicWise": [
        {
          "topic": "Percentages",
          "section": "numerical",
          "correct": 2,
          "wrong": 1,
          "skipped": 0,
          "total": 3,
          "accuracy": 66.67
        },
        {
          "topic": "Ratios",
          "section": "numerical",
          "correct": 2,
          "wrong": 0,
          "skipped": 0,
          "total": 2,
          "accuracy": 100
        }
      ]
    }
  }
}
```

---

## 5. Results

### 5.1 Get Result by Attempt ID

```bash
curl http://localhost:5000/api/results/<ATTEMPT_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "6652d1e2f3a4b5c6d7e8f9a0",
    "user": "6652a1b3c4d5e6f7a8b9c0d2",
    "test": {
      "_id": "6652b1a2c3d4e5f6a7b8c9d0",
      "title": "Numerical Ability Test",
      "type": "section_test",
      "section": "numerical",
      "duration": 1500
    },
    "score": 14,
    "totalQuestions": 20,
    "percentage": 70,
    "correct": 14,
    "wrong": 4,
    "skipped": 2,
    "timeTaken": 1320,
    "sectionWise": [
      {
        "section": "numerical",
        "correct": 14,
        "wrong": 4,
        "skipped": 2,
        "total": 20,
        "accuracy": 77.78,
        "avgTimePerQuestion": 66
      }
    ],
    "topicWise": [
      {
        "topic": "Percentages",
        "section": "numerical",
        "correct": 2,
        "wrong": 1,
        "skipped": 0,
        "total": 3,
        "accuracy": 66.67
      }
    ],
    "questionDetails": [
      {
        "question": "6652a2b3c4d5e6f7a8b9c0e0",
        "selectedAnswer": 1,
        "correctAnswer": 1,
        "isCorrect": true,
        "timeSpent": 45
      },
      {
        "question": "6652a2b3c4d5e6f7a8b9c0e1",
        "selectedAnswer": 0,
        "correctAnswer": 1,
        "isCorrect": false,
        "timeSpent": 90
      }
    ],
    "createdAt": "2026-04-14T08:55:00.000Z"
  }
}
```

### 5.2 Get Review (Wrong Answers with Explanations)

```bash
curl http://localhost:5000/api/results/<ATTEMPT_ID>/review \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "score": 14,
    "totalQuestions": 20,
    "percentage": 70,
    "review": [
      {
        "question": {
          "_id": "6652a2b3c4d5e6f7a8b9c0e1",
          "text": "A shopkeeper sells an article at 15% profit. If the cost price is Rs. 200, what is the selling price?",
          "options": ["Rs. 215", "Rs. 230", "Rs. 240", "Rs. 250"],
          "correctAnswer": 1,
          "section": "numerical",
          "topic": "Profit-Loss",
          "explanation": "SP = CP × (1 + Profit%) = 200 × 1.15 = Rs. 230."
        },
        "selectedAnswer": 0,
        "correctAnswer": 1,
        "timeSpent": 90
      },
      {
        "question": {
          "_id": "6652a2b3c4d5e6f7a8b9c0e5",
          "text": "The area of a circle with radius 7 cm is:",
          "options": ["154 sq cm", "144 sq cm", "148 sq cm", "156 sq cm"],
          "correctAnswer": 0,
          "section": "numerical",
          "topic": "Geometry",
          "explanation": "Area = πr² = 22/7 × 49 = 154 sq cm."
        },
        "selectedAnswer": null,
        "correctAnswer": 0,
        "timeSpent": 0
      }
    ]
  }
}
```

### 5.3 Get User History

```bash
curl "http://localhost:5000/api/results/user/history?page=1&limit=10" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "total": 3,
  "pages": 1,
  "currentPage": 1,
  "data": [
    {
      "_id": "6652d1e2f3a4b5c6d7e8f9a2",
      "test": {
        "_id": "6652b1a2c3d4e5f6a7b8c9d1",
        "title": "Logical Reasoning Test",
        "type": "section_test",
        "section": "reasoning"
      },
      "score": 16,
      "totalQuestions": 20,
      "percentage": 80,
      "correct": 16,
      "wrong": 3,
      "skipped": 1,
      "timeTaken": 1200,
      "createdAt": "2026-04-14T10:00:00.000Z"
    },
    {
      "_id": "6652d1e2f3a4b5c6d7e8f9a0",
      "test": {
        "_id": "6652b1a2c3d4e5f6a7b8c9d0",
        "title": "Numerical Ability Test",
        "type": "section_test",
        "section": "numerical"
      },
      "score": 14,
      "totalQuestions": 20,
      "percentage": 70,
      "correct": 14,
      "wrong": 4,
      "skipped": 2,
      "timeTaken": 1320,
      "createdAt": "2026-04-14T08:55:00.000Z"
    }
  ]
}
```

---

## 6. Analytics

### 6.1 Dashboard

```bash
curl http://localhost:5000/api/analytics/dashboard \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalTests": 3,
    "avgScore": 73.33,
    "avgAccuracy": 78.5,
    "totalTimeSpent": 3720,
    "sectionPerformance": {
      "numerical": {
        "attempts": 1,
        "totalCorrect": 14,
        "totalQuestions": 20,
        "avgTimePerQ": 66,
        "totalTime": 1320
      },
      "reasoning": {
        "attempts": 1,
        "totalCorrect": 16,
        "totalQuestions": 20,
        "avgTimePerQ": 60,
        "totalTime": 1200
      }
    },
    "lastUpdated": "2026-04-14T10:00:00.000Z"
  }
}
```

### 6.2 Section Deep-Dive

```bash
curl http://localhost:5000/api/analytics/section/numerical \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "section": "numerical",
    "attempts": 1,
    "totalCorrect": 14,
    "totalQuestions": 20,
    "avgTimePerQ": 66,
    "accuracy": 70,
    "topicBreakdown": [
      {
        "topic": "Percentages",
        "attempts": 1,
        "correct": 2,
        "wrong": 1,
        "total": 3,
        "accuracy": 66.67,
        "confidence": "medium"
      },
      {
        "topic": "Geometry",
        "attempts": 1,
        "correct": 1,
        "wrong": 2,
        "total": 3,
        "accuracy": 33.33,
        "confidence": "weak"
      }
    ]
  }
}
```

### 6.3 Topic-wise Performance

```bash
curl http://localhost:5000/api/analytics/topics \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "topic": "Geometry",
      "attempts": 1,
      "correct": 1,
      "wrong": 2,
      "total": 3,
      "accuracy": 33.33,
      "confidence": "weak"
    },
    {
      "topic": "Percentages",
      "attempts": 2,
      "correct": 4,
      "wrong": 1,
      "total": 5,
      "accuracy": 80,
      "confidence": "strong"
    },
    {
      "topic": "Ratios",
      "attempts": 1,
      "correct": 2,
      "wrong": 0,
      "total": 2,
      "accuracy": 100,
      "confidence": "medium"
    }
  ]
}
```

### 6.4 Time Analysis

```bash
curl http://localhost:5000/api/analytics/time-analysis \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "avgTimePerQuestion": 62.5,
    "totalQuestionsAnalyzed": 40,
    "insights": [
      {
        "type": "overthinking",
        "count": 3,
        "message": "You spent too much time on 3 questions but still got them wrong.",
        "affectedTopics": ["Data Interpretation", "Geometry"]
      },
      {
        "type": "guessing",
        "count": 2,
        "message": "You answered 2 questions too quickly and got them wrong — likely guessing.",
        "affectedTopics": ["Syllogisms"]
      }
    ]
  }
}
```

### 6.5 Smart Recommendations

```bash
curl http://localhost:5000/api/analytics/recommendations \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "type": "revise",
      "priority": "high",
      "message": "Revise \"Geometry\" — your accuracy is 33.33% (1/3 correct)",
      "topic": "Geometry"
    },
    {
      "type": "focus",
      "priority": "high",
      "message": "Focus more on \"numerical\" section — accuracy is only 45%",
      "section": "numerical"
    },
    {
      "type": "strength",
      "priority": "low",
      "message": "Your \"reasoning\" is strong at 80% — shift focus to weaker sections",
      "section": "reasoning"
    },
    {
      "type": "speed",
      "priority": "medium",
      "message": "You're spending 130s per question in \"advanced\" — try to improve speed",
      "section": "advanced"
    }
  ]
}
```

### 6.6 Score & Accuracy Trends

```bash
curl http://localhost:5000/api/analytics/trends \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "scoreHistory": [
      {
        "date": "2026-04-14T08:55:00.000Z",
        "score": 14,
        "percentage": 70,
        "testType": "test",
        "testId": "6652b1a2c3d4e5f6a7b8c9d0"
      },
      {
        "date": "2026-04-14T10:00:00.000Z",
        "score": 16,
        "percentage": 80,
        "testType": "test",
        "testId": "6652b1a2c3d4e5f6a7b8c9d1"
      }
    ],
    "currentAvgScore": 73.33,
    "currentAvgAccuracy": 78.5,
    "totalTests": 3
  }
}
```

---

## 7. Admin APIs (requires admin token)

> Login as admin first, then use the admin's access token.

### 7.1 Admin Dashboard

```bash
curl http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1,
    "totalQuestions": 79,
    "totalTests": 5,
    "totalAttempts": 0,
    "avgScore": 0
  }
}
```

### 7.2 Add a Question

```bash
curl -X POST http://localhost:5000/api/admin/questions \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "What is 25% of 200?",
    "options": ["25", "50", "75", "100"],
    "correctAnswer": 1,
    "section": "numerical",
    "topic": "Percentages",
    "difficulty": "easy",
    "explanation": "25% of 200 = 200 × 0.25 = 50"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "6652e1f2a3b4c5d6e7f8a9b0",
    "text": "What is 25% of 200?",
    "options": ["25", "50", "75", "100"],
    "correctAnswer": 1,
    "section": "numerical",
    "topic": "Percentages",
    "difficulty": "easy",
    "explanation": "25% of 200 = 200 × 0.25 = 50",
    "createdAt": "2026-04-14T11:00:00.000Z"
  }
}
```

### 7.3 Bulk Add Questions

```bash
curl -X POST http://localhost:5000/api/admin/questions/bulk \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {
        "text": "What is 10% of 500?",
        "options": ["25", "50", "75", "100"],
        "correctAnswer": 1,
        "section": "numerical",
        "topic": "Percentages",
        "difficulty": "easy"
      },
      {
        "text": "What is 20% of 300?",
        "options": ["30", "60", "90", "120"],
        "correctAnswer": 1,
        "section": "numerical",
        "topic": "Percentages",
        "difficulty": "easy"
      }
    ]
  }'
```

**Response (201):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "6652e1f2a3b4c5d6e7f8a9b1",
      "text": "What is 10% of 500?",
      "options": ["25", "50", "75", "100"],
      "correctAnswer": 1,
      "section": "numerical",
      "topic": "Percentages",
      "difficulty": "easy"
    },
    {
      "_id": "6652e1f2a3b4c5d6e7f8a9b2",
      "text": "What is 20% of 300?",
      "options": ["30", "60", "90", "120"],
      "correctAnswer": 1,
      "section": "numerical",
      "topic": "Percentages",
      "difficulty": "easy"
    }
  ]
}
```

### 7.4 List Questions (with filters & pagination)

```bash
curl "http://localhost:5000/api/admin/questions?section=numerical&topic=Percentages&page=1&limit=5" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "count": 3,
  "total": 3,
  "pages": 1,
  "currentPage": 1,
  "data": [
    {
      "_id": "6652a2b3c4d5e6f7a8b9c0e0",
      "text": "If the price of an article is increased by 20%...",
      "options": ["No change", "4% decrease", "4% increase", "2% decrease"],
      "correctAnswer": 1,
      "section": "numerical",
      "topic": "Percentages",
      "difficulty": "easy",
      "explanation": "Let original price = 100..."
    }
  ]
}
```

### 7.5 Update a Question

```bash
curl -X PUT http://localhost:5000/api/admin/questions/<QUESTION_ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "difficulty": "medium",
    "explanation": "Updated explanation here"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "6652a2b3c4d5e6f7a8b9c0e0",
    "text": "If the price of an article is increased by 20%...",
    "difficulty": "medium",
    "explanation": "Updated explanation here"
  }
}
```

### 7.6 Delete a Question

```bash
curl -X DELETE http://localhost:5000/api/admin/questions/<QUESTION_ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "message": "Question deleted"
}
```

### 7.7 Create a Test

```bash
curl -X POST http://localhost:5000/api/admin/tests \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Custom Percentages Test",
    "type": "topic_practice",
    "section": "numerical",
    "topic": "Percentages",
    "questions": ["<QUESTION_ID_1>", "<QUESTION_ID_2>", "<QUESTION_ID_3>"],
    "duration": 300
  }'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "6652f1a2b3c4d5e6f7a8b9c0",
    "title": "Custom Percentages Test",
    "type": "topic_practice",
    "section": "numerical",
    "topic": "Percentages",
    "questions": ["<QUESTION_ID_1>", "<QUESTION_ID_2>", "<QUESTION_ID_3>"],
    "totalQuestions": 3,
    "duration": 300,
    "sectionLocked": false,
    "isActive": true
  }
}
```

### 7.8 List All Tests (Admin)

```bash
curl http://localhost:5000/api/admin/tests \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "count": 6,
  "data": [
    {
      "_id": "6652f1a2b3c4d5e6f7a8b9c0",
      "title": "Custom Percentages Test",
      "type": "topic_practice",
      "totalQuestions": 3,
      "duration": 300,
      "isActive": true
    }
  ]
}
```

### 7.9 Update a Test

```bash
curl -X PUT http://localhost:5000/api/admin/tests/<TEST_ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Test Title",
    "duration": 600,
    "isActive": false
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "6652f1a2b3c4d5e6f7a8b9c0",
    "title": "Updated Test Title",
    "duration": 600,
    "isActive": false
  }
}
```

### 7.10 Delete a Test

```bash
curl -X DELETE http://localhost:5000/api/admin/tests/<TEST_ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "message": "Test deleted"
}
```

### 7.11 List Users

```bash
curl "http://localhost:5000/api/admin/users?page=1&limit=20" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "total": 1,
  "data": [
    {
      "_id": "6652a1b3c4d5e6f7a8b9c0d2",
      "name": "Demo User",
      "email": "demo@tcsnqt.com",
      "testsCompleted": 3,
      "createdAt": "2026-04-14T08:00:00.000Z"
    }
  ]
}
```

### 7.12 Get User Detail

```bash
curl http://localhost:5000/api/admin/users/<USER_ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "6652a1b3c4d5e6f7a8b9c0d2",
      "name": "Demo User",
      "email": "demo@tcsnqt.com",
      "createdAt": "2026-04-14T08:00:00.000Z"
    },
    "recentResults": [
      {
        "_id": "6652d1e2f3a4b5c6d7e8f9a2",
        "test": {
          "_id": "6652b1a2c3d4e5f6a7b8c9d1",
          "title": "Logical Reasoning Test",
          "type": "section_test"
        },
        "score": 16,
        "totalQuestions": 20,
        "percentage": 80,
        "correct": 16,
        "wrong": 3,
        "skipped": 1,
        "timeTaken": 1200,
        "createdAt": "2026-04-14T10:00:00.000Z"
      }
    ]
  }
}
```

---

## Error Responses

### 401 Unauthorized (No/Invalid Token)

```json
{
  "success": false,
  "message": "Not authorized, no token"
}
```

### 403 Forbidden (Non-Admin accessing admin routes)

```json
{
  "success": false,
  "message": "Admin access required"
}
```

### 400 Validation Error

```json
{
  "success": false,
  "errors": [
    { "field": "email", "message": "Please enter a valid email" },
    { "field": "password", "message": "Password must be at least 6 characters" }
  ]
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Test not found"
}
```

---

## Quick Start Flow

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@tcsnqt.com","password":"demo123"}' | jq -r '.accessToken')

# 2. List tests
curl -s http://localhost:5000/api/tests -H "Authorization: Bearer $TOKEN" | jq

# 3. Start a test (replace TEST_ID)
ATTEMPT=$(curl -s -X POST http://localhost:5000/api/attempts/start/<TEST_ID> \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data._id')

# 4. Answer questions
curl -s -X PUT http://localhost:5000/api/attempts/$ATTEMPT/answer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"questionIndex":0,"selectedAnswer":1,"timeSpent":30}' | jq

# 5. Submit
curl -s -X POST http://localhost:5000/api/attempts/$ATTEMPT/submit \
  -H "Authorization: Bearer $TOKEN" | jq

# 6. View result
curl -s http://localhost:5000/api/results/$ATTEMPT \
  -H "Authorization: Bearer $TOKEN" | jq

# 7. View recommendations
curl -s http://localhost:5000/api/analytics/recommendations \
  -H "Authorization: Bearer $TOKEN" | jq
```
