const express = require('express');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const User = require('../models/User');
const protect = require('../middleware/auth');
const {
  calculateNetBalances,
  calculateDirectionalBalances,
  computeSettlements,
  getParticipantStats,
  generateInsights,
} = require('../utils/balanceEngine');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/groups
// @desc    Get all groups for the current user
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const groups = await Group.find({ owner: req.user._id }).sort({ lastActivityAt: -1 });

    // Enrich each group with quick balance summary
    const enrichedGroups = await Promise.all(
      groups.map(async (group) => {
        const expenses = await Expense.find({ group: group._id, isDeleted: false });
        const settlements = computeSettlements(expenses);
        const netBalances = calculateNetBalances(expenses);

        return {
          ...group.toObject(),
          quickStats: {
            totalExpenses: group.cachedTotalExpenses,
            expenseCount: group.cachedExpenseCount,
            pendingSettlements: settlements.length,
            netBalances,
          },
        };
      })
    );

    res.json({ success: true, data: enrichedGroups });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/groups
// @desc    Create a new group
// @access  Private
router.post('/', async (req, res, next) => {
  try {
    const { name, emoji, participants } = req.body;

    // Ensure owner is included as a participant
    const ownerParticipant = {
      name: req.user.name,
      color: req.user.avatar,
      isOwner: true,
    };

    let allParticipants = [ownerParticipant];
    if (participants && Array.isArray(participants)) {
      // Limit to 3 additional participants
      const additional = participants.slice(0, 3).map(p => ({
        name: p.name,
        color: p.color || undefined,
        isOwner: false,
      }));
      allParticipants = [...allParticipants, ...additional];
    }

    const group = await Group.create({
      name,
      emoji: emoji || '💰',
      owner: req.user._id,
      participants: allParticipants,
    });

    // Update user stats
    req.user.totalGroupsCreated += 1;
    // Award badge at 5 groups
    if (req.user.totalGroupsCreated === 5) {
      req.user.badges.push({
        name: 'Group Guru',
        icon: '🏘️',
        earnedAt: new Date(),
      });
    }
    await req.user.save();

    res.status(201).json({
      success: true,
      message: `🎊 Group "${group.name}" created! Add some expenses to get started.`,
      data: group,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/groups/:id
// @desc    Get single group with full balance data
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, owner: req.user._id });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '🔍 Group not found. It may have been deleted.',
      });
    }

    const expenses = await Expense.find({ group: group._id, isDeleted: false }).sort({ date: -1 });
    const netBalances = calculateNetBalances(expenses);
    const directionalBalances = calculateDirectionalBalances(expenses);
    const settlements = computeSettlements(expenses);
    const participantStats = getParticipantStats(expenses);
    const insights = generateInsights(expenses, group.participants);

    res.json({
      success: true,
      data: {
        group,
        expenses,
        balances: {
          net: netBalances,
          directional: directionalBalances,
          settlements,
          participantStats,
        },
        insights,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/groups/:id
// @desc    Update group name, emoji, or participants
// @access  Private
router.put('/:id', async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, owner: req.user._id });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '🔍 Group not found.',
      });
    }

    const { name, emoji, participants } = req.body;

    if (name) group.name = name;
    if (emoji) group.emoji = emoji;

    if (participants && Array.isArray(participants)) {
      // Keep the owner participant
      const ownerParticipant = group.participants.find(p => p.isOwner);

      const updatedParticipants = [ownerParticipant];
      const additional = participants.filter(p => !p.isOwner).slice(0, 3).map(p => ({
        name: p.name,
        color: p.color || undefined,
        isOwner: false,
      }));

      group.participants = [...updatedParticipants, ...additional];
    }

    await group.save();

    res.json({
      success: true,
      message: `✅ Group "${group.name}" updated successfully!`,
      data: group,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/groups/:id
// @desc    Delete group with cascade deletion of all expenses
// @access  Private
router.delete('/:id', async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, owner: req.user._id });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '🔍 Group not found.',
      });
    }

    // Cascade delete all expenses in this group
    const deletedExpenses = await Expense.deleteMany({ group: group._id });

    // Delete the group
    await Group.deleteOne({ _id: group._id });

    res.json({
      success: true,
      message: `🗑️ Group "${group.name}" and ${deletedExpenses.deletedCount} expenses have been deleted.`,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/groups/:id/balances
// @desc    Get computed balances & settlements for a group
// @access  Private
router.get('/:id/balances', async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, owner: req.user._id });
    if (!group) {
      return res.status(404).json({ success: false, message: '🔍 Group not found.' });
    }

    const expenses = await Expense.find({ group: group._id, isDeleted: false });
    const netBalances = calculateNetBalances(expenses);
    const directionalBalances = calculateDirectionalBalances(expenses);
    const settlements = computeSettlements(expenses);
    const participantStats = getParticipantStats(expenses);

    res.json({
      success: true,
      data: {
        netBalances,
        directionalBalances,
        settlements,
        participantStats,
        totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
        expenseCount: expenses.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
