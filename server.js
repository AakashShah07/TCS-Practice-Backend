require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Connect to database
connectDB();

const app = express();

// Middleware — cors must run before helmet so preflight OPTIONS requests succeed
app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'TCS NQT API is running' });
});

// Debug: check DB collections (REMOVE after debugging)
app.get('/api/debug/db', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Test = require('./models/Test');
    const Question = require('./models/Question');
    const testCount = await Test.countDocuments();
    const testAll = await Test.countDocuments({});
    const testActive = await Test.countDocuments({ isActive: true });
    const questionCount = await Question.countDocuments();
    const dbName = mongoose.connection.name;
    const dbHost = mongoose.connection.host;
    const tests = await Test.find({}).select('title type isActive').lean();
    res.json({ dbHost, dbName, questionCount, testCount, testAll, testActive, tests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/attempts', require('./routes/attempts'));
app.use('/api/results', require('./routes/results'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/coding', require('./routes/coding'));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
