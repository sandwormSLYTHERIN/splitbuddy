const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Participant name is required'],
    trim: true,
  },
  color: {
    type: String,
    default: function () {
      const palette = [
        '#7c3aed', '#06b6d4', '#10b981', '#f59e0b',
        '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6',
      ];
      return palette[Math.floor(Math.random() * palette.length)];
    },
  },
  avatar: {
    type: String,
    default: '', // Optional custom avatar URL
  },
  isOwner: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [60, 'Group name cannot exceed 60 characters'],
  },
  emoji: {
    type: String,
    default: '💰', // Group icon emoji
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: {
    type: [participantSchema],
    validate: {
      validator: function (v) {
        return v.length >= 1 && v.length <= 4; // 1 owner + up to 3 others
      },
      message: 'A group must have between 1 and 4 participants',
    },
  },
  // Cached stats for fast dashboard loading
  cachedTotalExpenses: { type: Number, default: 0 },
  cachedExpenseCount: { type: Number, default: 0 },
  lastActivityAt: { type: Date, default: Date.now },
  // Group mood — computed from spending patterns
  mood: {
    type: String,
    enum: ['chill', 'active', 'on-fire', 'settling-up'],
    default: 'chill',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual: average expense
groupSchema.virtual('averageExpense').get(function () {
  if (this.cachedExpenseCount === 0) return 0;
  return Math.round((this.cachedTotalExpenses / this.cachedExpenseCount) * 100) / 100;
});

// Method to update cached stats
groupSchema.methods.refreshStats = async function () {
  const Expense = mongoose.model('Expense');
  const expenses = await Expense.find({ group: this._id });
  this.cachedExpenseCount = expenses.length;
  this.cachedTotalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  this.lastActivityAt = new Date();

  // Update mood based on activity
  if (this.cachedExpenseCount === 0) {
    this.mood = 'chill';
  } else if (this.cachedExpenseCount > 20) {
    this.mood = 'on-fire';
  } else if (this.cachedExpenseCount > 5) {
    this.mood = 'active';
  } else {
    this.mood = 'chill';
  }

  await this.save();
};

// Index for fast queries
groupSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('Group', groupSchema);
