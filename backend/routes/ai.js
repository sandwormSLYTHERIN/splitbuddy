const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const protect = require('../middleware/auth');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { computeSettlements, getParticipantStats } = require('../utils/balanceEngine');

const router = express.Router();
router.use(protect);

// Initialize Gemini
function getGeminiModel() {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return null;
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

// @route   POST /api/ai/parse-expense
// @desc    Parse natural language into structured expense data
// @access  Private
router.post('/parse-expense', async (req, res, next) => {
  try {
    const model = getGeminiModel();
    if (!model) {
      return res.status(400).json({
        success: false,
        message: '🔑 Gemini API key not configured. Add GEMINI_API_KEY to your .env file.',
      });
    }

    const { text, groupId } = req.body;

    // Get group participants for context
    const group = await Group.findOne({ _id: groupId, owner: req.user._id });
    if (!group) {
      return res.status(404).json({ success: false, message: '🔍 Group not found.' });
    }

    const participantNames = group.participants.map(p => p.name);

    const prompt = `You are a smart expense parser for a group expense splitting app called SplitBuddy.

Given a natural language statement about an expense, extract:
- description: A short description of the expense
- amount: The numerical amount (just the number)
- payer: Who paid (match to one of the participants listed below)
- splitMode: "equal" if splitting equally, "custom" if specific amounts mentioned, "percentage" if percentages mentioned
- splits: Array of {participant, amount} for each participant involved
- date: Date if mentioned, otherwise null

Group participants: ${participantNames.join(', ')}

User input: "${text}"

Respond ONLY with valid JSON, no markdown formatting, no code blocks. Example format:
{"description":"Dinner at restaurant","amount":1200,"payer":"John","splitMode":"equal","splits":[{"participant":"John","amount":400},{"participant":"Jane","amount":400},{"participant":"Bob","amount":400}],"date":null}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse the JSON response
    let parsed;
    try {
      // Clean up potential markdown formatting
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(422).json({
        success: false,
        message: '🤖 I had trouble understanding that. Try something like "John paid 500 for dinner, split equally"',
        raw: response,
      });
    }

    res.json({
      success: true,
      message: '🧠 Got it! Here\'s what I understood:',
      data: parsed,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/ai/categorize
// @desc    Auto-categorize an expense description
// @access  Private
router.post('/categorize', async (req, res, next) => {
  try {
    const model = getGeminiModel();
    if (!model) {
      return res.status(400).json({ success: false, message: '🔑 Gemini API key not configured.' });
    }

    const { description } = req.body;

    const prompt = `Categorize this expense into exactly ONE category and suggest an emoji.

Categories: food, drinks, transport, entertainment, shopping, housing, health, travel, education, gifts, general

Expense: "${description}"

Respond ONLY with valid JSON: {"category":"food","emoji":"🍽️"}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    res.json({ success: true, data: parsed });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/ai/group-summary
// @desc    Generate a readable AI summary of group spending
// @access  Private
router.post('/group-summary', async (req, res, next) => {
  try {
    const model = getGeminiModel();
    if (!model) {
      return res.status(400).json({ success: false, message: '🔑 Gemini API key not configured.' });
    }

    const { groupId } = req.body;

    const group = await Group.findOne({ _id: groupId, owner: req.user._id });
    if (!group) {
      return res.status(404).json({ success: false, message: '🔍 Group not found.' });
    }

    const expenses = await Expense.find({ group: groupId, isDeleted: false }).sort({ date: -1 });
    const stats = getParticipantStats(expenses);
    const settlements = computeSettlements(expenses);

    const expenseSummary = expenses.slice(0, 20).map(e =>
      `${e.categoryEmoji} ${e.description}: ₹${e.amount} paid by ${e.payer} on ${new Date(e.date).toLocaleDateString()}`
    ).join('\n');

    const statsSummary = stats.map(s =>
      `${s.name}: Paid ₹${s.totalPaid}, Owes ₹${s.totalOwed}, Net: ₹${s.netBalance}`
    ).join('\n');

    const settlementSummary = settlements.map(s =>
      `${s.from} → ${s.to}: ₹${s.amount}`
    ).join('\n');

    const prompt = `You are MintSense, the AI assistant for SplitBuddy expense splitting app. Generate a fun, friendly, insightful summary of this group's spending.

Group: "${group.name}" (${group.participants.map(p => p.name).join(', ')})

Recent Expenses:
${expenseSummary || 'No expenses yet'}

Participant Stats:
${statsSummary || 'No data'}

Settlements Needed:
${settlementSummary || 'All settled up! 🎉'}

Write a short (3-5 paragraphs), engaging summary that:
1. Highlights interesting spending patterns
2. Mentions the top spender with a fun remark
3. Notes what categories dominate
4. Provides the settlement plan in a friendly way
5. Ends with a witty money-related tip or observation

Keep it fun, use emojis moderately, and make it feel personal.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    res.json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/ai/smart-settle
// @desc    Get intelligent settlement suggestions with explanations
// @access  Private
router.post('/smart-settle', async (req, res, next) => {
  try {
    const model = getGeminiModel();
    const { groupId } = req.body;

    const group = await Group.findOne({ _id: groupId, owner: req.user._id });
    if (!group) {
      return res.status(404).json({ success: false, message: '🔍 Group not found.' });
    }

    const expenses = await Expense.find({ group: groupId, isDeleted: false });
    const settlements = computeSettlements(expenses);
    const stats = getParticipantStats(expenses);

    // If Gemini is available, add AI flavor
    let aiSuggestion = null;
    if (model && settlements.length > 0) {
      const prompt = `You are MintSense. Given these settlements needed:
${settlements.map(s => `${s.from} owes ${s.to} ₹${s.amount}`).join('\n')}

Write 2-3 short, friendly sentences suggesting the best way to settle up. Maybe suggest a group activity, or a funny observation about who's been generous. Keep it brief and fun!`;

      try {
        const result = await model.generateContent(prompt);
        aiSuggestion = result.response.text();
      } catch (e) {
        // AI is optional, don't fail the request
        aiSuggestion = null;
      }
    }

    res.json({
      success: true,
      data: {
        settlements,
        participantStats: stats,
        totalToSettle: settlements.reduce((sum, s) => sum + s.amount, 0),
        aiSuggestion,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/ai/status
// @desc    Check if AI features are available
// @access  Private
router.get('/status', (req, res) => {
  const model = getGeminiModel();
  res.json({
    success: true,
    data: {
      available: !!model,
      provider: 'Google Gemini',
      model: 'gemini-2.0-flash',
    },
  });
});

module.exports = router;
