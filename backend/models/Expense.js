const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema({
  participant: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100,
  },
}, { _id: false });

const expenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be positive'],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  payer: {
    type: String,
    required: [true, 'Payer is required'],
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  splitMode: {
    type: String,
    enum: ['equal', 'custom', 'percentage'],
    default: 'equal',
  },
  splits: {
    type: [splitSchema],
    required: true,
    validate: {
      validator: function (v) {
        return v.length > 0;
      },
      message: 'At least one split is required',
    },
  },
  // Auto-categorization
  category: {
    type: String,
    default: 'general',
  },
  categoryEmoji: {
    type: String,
    default: '💳',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Soft-delete support
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Auto-categorize before saving
expenseSchema.pre('save', function (next) {
  if (this.isModified('description')) {
    const desc = this.description.toLowerCase();
    const categories = {
      '🍽️': { name: 'food', keywords: ['food', 'restaurant', 'dinner', 'lunch', 'breakfast', 'meal', 'pizza', 'burger', 'biryani', 'chicken', 'snack'] },
      '☕': { name: 'drinks', keywords: ['coffee', 'tea', 'starbucks', 'cafe', 'juice', 'smoothie', 'drink', 'beer', 'wine'] },
      '🚕': { name: 'transport', keywords: ['uber', 'ola', 'cab', 'taxi', 'auto', 'bus', 'train', 'metro', 'fuel', 'petrol', 'gas', 'parking'] },
      '🎬': { name: 'entertainment', keywords: ['movie', 'cinema', 'netflix', 'concert', 'show', 'game', 'bowling', 'karaoke'] },
      '🛒': { name: 'shopping', keywords: ['shopping', 'amazon', 'flipkart', 'clothes', 'shoes', 'mall', 'grocery', 'groceries', 'supermarket'] },
      '🏠': { name: 'housing', keywords: ['rent', 'electricity', 'water', 'wifi', 'internet', 'gas bill', 'maintenance', 'house'] },
      '💊': { name: 'health', keywords: ['medicine', 'doctor', 'hospital', 'pharmacy', 'medical', 'health', 'gym', 'fitness'] },
      '✈️': { name: 'travel', keywords: ['flight', 'hotel', 'airbnb', 'trip', 'travel', 'vacation', 'booking', 'resort', 'holiday'] },
      '📚': { name: 'education', keywords: ['book', 'course', 'tuition', 'class', 'school', 'college', 'study', 'udemy'] },
      '🎁': { name: 'gifts', keywords: ['gift', 'present', 'birthday', 'party', 'celebration', 'anniversary'] },
    };

    for (const [emoji, cat] of Object.entries(categories)) {
      if (cat.keywords.some(kw => desc.includes(kw))) {
        this.category = cat.name;
        this.categoryEmoji = emoji;
        return next();
      }
    }
    this.category = 'general';
    this.categoryEmoji = '💳';
  }
  next();
});

// Validate splits match total amount
expenseSchema.pre('save', function (next) {
  if (this.splitMode === 'equal') {
    // Auto-calculate equal splits
    const perPerson = Math.floor((this.amount * 100) / this.splits.length) / 100;
    const remainder = Math.round((this.amount - perPerson * this.splits.length) * 100) / 100;

    this.splits.forEach((split, i) => {
      split.amount = i === 0 ? perPerson + remainder : perPerson;
      split.percentage = Math.round((split.amount / this.amount) * 10000) / 100;
    });
  } else if (this.splitMode === 'percentage') {
    const totalPct = this.splits.reduce((sum, s) => sum + (s.percentage || 0), 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      return next(new Error('Percentages must sum to 100%'));
    }
    // Calculate amounts from percentages
    this.splits.forEach(split => {
      split.amount = Math.round((this.amount * (split.percentage / 100)) * 100) / 100;
    });
    // Fix rounding — assign remainder to first split
    const splitTotal = this.splits.reduce((sum, s) => sum + s.amount, 0);
    const diff = Math.round((this.amount - splitTotal) * 100) / 100;
    if (diff !== 0) {
      this.splits[0].amount = Math.round((this.splits[0].amount + diff) * 100) / 100;
    }
  } else if (this.splitMode === 'custom') {
    const splitTotal = this.splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(splitTotal - this.amount) > 0.01) {
      return next(new Error(`Split amounts (${splitTotal}) must equal total amount (${this.amount})`));
    }
    // Calculate percentages from amounts
    this.splits.forEach(split => {
      split.percentage = Math.round((split.amount / this.amount) * 10000) / 100;
    });
  }
  next();
});

// Indexes for search and filtering
expenseSchema.index({ group: 1, date: -1 });
expenseSchema.index({ description: 'text' });
expenseSchema.index({ payer: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
