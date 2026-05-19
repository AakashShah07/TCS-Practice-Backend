require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');

const fix = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tcs-nqt';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');

    // Fix 1: "15 men complete work in 20 days, 20 women in 15 days" question
    // Correct answer is 15 days (option B, index 1), not 12 days
    // Math: 1 man rate = 1/(15×20) = 1/300, 1 woman rate = 1/(20×15) = 1/300
    // 10 men + 10 women = 20/300 = 1/15 per day → 15 days
    const fix1 = await Question.updateOne(
      { text: { $regex: '15 men.*20 days.*20 women.*15 days.*10 men.*10 women' } },
      {
        $set: {
          correctAnswer: 1,
          explanation: "1 man's daily work = 1/(15×20) = 1/300. 1 woman's daily work = 1/(20×15) = 1/300. Both have equal efficiency. 10 men + 10 women = 20 workers. Combined rate = 20/300 = 1/15 per day. Time = 15 days."
        }
      }
    );
    console.log(`Fix 1 (15 men & 20 women): ${fix1.modifiedCount ? 'FIXED' : 'NOT FOUND (may already be correct or question text differs)'}`);

    // Fix 2: "A completes 1/4 work in 5 days, B joins" question
    // Seed file has correct text (9 days → answer 30 days), but DB may have "6 days"
    // Fix: update text to "9 days" so answer 30 days (option A, index 0) is correct
    // Math: A rate = 1/20. (1/20 + 1/B)×9 = 3/4 → 1/B = 1/12 - 1/20 = 2/60 = 1/30 → B = 30 days
    const fix2 = await Question.updateOne(
      { text: { $regex: 'completes 1/4th of the work in 5 days.*B joins.*remaining work in 6 days' } },
      {
        $set: {
          text: "A starts working alone and completes 1/4th of the work in 5 days. Then B joins, and together they finish the remaining work in 9 days. Find the time taken by B alone to do the whole work.",
          correctAnswer: 0,
          explanation: "A does 1/4 in 5 days. A's rate = 1/20 per day. Remaining = 3/4. A+B do 3/4 in 9 days: (1/20 + 1/B) × 9 = 3/4. 1/20 + 1/B = 3/36 = 1/12. 1/B = 1/12 − 1/20 = (5−3)/60 = 2/60 = 1/30. B alone = 30 days."
        }
      }
    );
    console.log(`Fix 2 (A completes 1/4 work): ${fix2.modifiedCount ? 'FIXED' : 'NOT FOUND (may already be correct or question text differs)'}`);

    // Fix 3: "A and B together in 12 days, work 3 days, A leaves, B finishes in 18 days"
    // Correct answer is 24 days (option A, index 0), not 36 days
    // Math: A+B = 1/12. 3 days = 1/4 done. Remaining = 3/4.
    // B does 3/4 in 18 days → B rate = 3/(4×18) = 1/24
    // A rate = 1/12 − 1/24 = 1/24 → A alone = 24 days
    const fix3 = await Question.updateOne(
      { text: { $regex: 'A and B together.*12 days.*3 days.*A leaves.*18 days' } },
      {
        $set: {
          correctAnswer: 0,
          explanation: "A+B rate = 1/12. In 3 days: 3/12 = 1/4 done. Remaining = 3/4. B does 3/4 in 18 days → B's rate = 3/(4×18) = 1/24. A's rate = 1/12 − 1/24 = (2−1)/24 = 1/24. A alone = 24 days."
        }
      }
    );
    console.log(`Fix 3 (A and B together 12 days): ${fix3.modifiedCount ? 'FIXED' : 'NOT FOUND (may already be correct or question text differs)'}`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error fixing:', error.message);
    process.exit(1);
  }
};

fix();
