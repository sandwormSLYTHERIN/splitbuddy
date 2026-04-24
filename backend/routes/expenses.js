const express = require('express');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const protect = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/groups/:groupId/expenses
// @desc    Get all expenses for a group with search & filter support
// @access  Private
router.get('/group/:groupId', async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.groupId, owner: req.user._id });
    if (!group) {
      return res.status(404).json({ success: false, message: '🔍 Group not found.' });
    }

    // Build query
    const query = { group: req.params.groupId, isDeleted: false };

    // Text search
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Filter by participant (payer)
    if (req.query.participant) {
      query.payer = req.query.participant;
    }

    // Filter by date range
    if (req.query.dateFrom || req.query.dateTo) {
      query.date = {};
      if (req.query.dateFrom) query.date.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) query.date.$lte = new Date(req.query.dateTo);
    }

    // Filter by amount range
    if (req.query.amountMin || req.query.amountMax) {
      query.amount = {};
      if (req.query.amountMin) query.amount.$gte = parseFloat(req.query.amountMin);
      if (req.query.amountMax) query.amount.$lte = parseFloat(req.query.amountMax);
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    // If text search fails (index not created yet), fall back to regex search
    if (error.message && error.message.includes('text index')) {
      try {
        const query = { group: req.params.groupId, isDeleted: false };
        if (req.query.search) {
          query.description = { $regex: req.query.search, $options: 'i' };
        }
        const expenses = await Expense.find(query).sort({ date: -1 });
        return res.json({ success: true, count: expenses.length, data: expenses });
      } catch (fallbackError) {
        return next(fallbackError);
      }
    }
    next(error);
  }
});

// @route   POST /api/groups/:groupId/expenses
// @desc    Add a new expense to a group
// @access  Private
router.post('/group/:groupId', async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.groupId, owner: req.user._id });
    if (!group) {
      return res.status(404).json({ success: false, message: '🔍 Group not found.' });
    }

    const { description, amount, date, payer, splitMode, splits } = req.body;

    // Validate payer is a participant
    const participantNames = group.participants.map(p => p.name);
    if (!participantNames.includes(payer)) {
      return res.status(400).json({
        success: false,
        message: `🤷 "${payer}" is not a participant in this group. Available: ${participantNames.join(', ')}`,
      });
    }

    // Validate split participants
    if (splits) {
      for (const split of splits) {
        if (!participantNames.includes(split.participant)) {
          return res.status(400).json({
            success: false,
            message: `🤷 "${split.participant}" is not in this group.`,
          });
        }
      }
    }

    // Build splits — if not provided, split equally among all participants
    let finalSplits = splits;
    if (!finalSplits || finalSplits.length === 0) {
      finalSplits = participantNames.map(name => ({
        participant: name,
        amount: 0, // Will be calculated by pre-save hook
      }));
    }

    const expense = await Expense.create({
      description,
      amount,
      date: date || new Date(),
      payer,
      group: group._id,
      splitMode: splitMode || 'equal',
      splits: finalSplits,
      createdBy: req.user._id,
    });

    // Update group cached stats
    await group.refreshStats();

    // Update user stats
    req.user.totalExpensesLogged += 1;
    // Award badge at 10 expenses
    if (req.user.totalExpensesLogged === 10) {
      req.user.badges.push({
        name: 'Expense Tracker',
        icon: '📊',
        earnedAt: new Date(),
      });
    }
    // Award badge at 50 expenses
    if (req.user.totalExpensesLogged === 50) {
      req.user.badges.push({
        name: 'Money Maven',
        icon: '💎',
        earnedAt: new Date(),
      });
    }
    await req.user.save();

    res.status(201).json({
      success: true,
      message: `${expense.categoryEmoji} Expense "${expense.description}" added! (${expense.category})`,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update an expense
// @access  Private
router.put('/:id', async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: '🔍 Expense not found.' });
    }

    // Verify ownership through group
    const group = await Group.findOne({ _id: expense.group, owner: req.user._id });
    if (!group) {
      return res.status(403).json({ success: false, message: '🚫 Not authorized.' });
    }

    const { description, amount, date, payer, splitMode, splits } = req.body;

    if (description !== undefined) expense.description = description;
    if (amount !== undefined) expense.amount = amount;
    if (date !== undefined) expense.date = date;
    if (payer !== undefined) expense.payer = payer;
    if (splitMode !== undefined) expense.splitMode = splitMode;
    if (splits !== undefined) expense.splits = splits;

    await expense.save();
    await group.refreshStats();

    res.json({
      success: true,
      message: `✏️ Expense updated successfully!`,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense (soft delete)
// @access  Private
router.delete('/:id', async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: '🔍 Expense not found.' });
    }

    const group = await Group.findOne({ _id: expense.group, owner: req.user._id });
    if (!group) {
      return res.status(403).json({ success: false, message: '🚫 Not authorized.' });
    }

    // Soft delete
    expense.isDeleted = true;
    await expense.save();
    await group.refreshStats();

    res.json({
      success: true,
      message: `🗑️ Expense "${expense.description}" deleted. Balances recalculated.`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
