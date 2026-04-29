const CodingQuestion = require('../models/CodingQuestion');

// @desc    Get all coding questions (list view - no solutions)
// @route   GET /api/coding
exports.getCodingQuestions = async (req, res) => {
  const { topic, difficulty } = req.query;
  const filter = { isActive: true };
  if (topic) filter.topic = topic;
  if (difficulty) filter.difficulty = difficulty;

  const questions = await CodingQuestion.find(filter)
    .select('title difficulty topic source createdAt')
    .sort({ createdAt: 1 });

  res.json({ success: true, count: questions.length, data: questions });
};

// @desc    Get single coding question with full solutions
// @route   GET /api/coding/:id
exports.getCodingQuestion = async (req, res) => {
  const question = await CodingQuestion.findById(req.params.id);
  if (!question) {
    return res.status(404).json({ success: false, message: 'Question not found' });
  }
  res.json({ success: true, data: question });
};

// @desc    Get all unique topics
// @route   GET /api/coding/topics
exports.getCodingTopics = async (req, res) => {
  const topics = await CodingQuestion.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$topic', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({
    success: true,
    data: topics.map((t) => ({ topic: t._id, count: t.count })),
  });
};
