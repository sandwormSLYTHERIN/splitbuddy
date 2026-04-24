const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const protect = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '📧 An account with this email already exists. Try logging in!',
      });
    }

    // Create user
    const user = await User.create({ name, email, password });

    // Award first badge
    user.badges.push({
      name: 'Early Bird',
      icon: '🐣',
      earnedAt: new Date(),
    });
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: `🎉 Welcome aboard, ${user.name}! Your account is ready.`,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          initials: user.initials,
          badges: user.badges,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/login
// @desc    Login user & return JWT
// @access  Public
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '📝 Please provide both email and password.',
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '🔍 No account found with this email. Want to register?',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '🔐 Incorrect password. Give it another shot!',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: `👋 Welcome back, ${user.name}!`,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          initials: user.initials,
          badges: user.badges,
          totalGroupsCreated: user.totalGroupsCreated,
          totalExpensesLogged: user.totalExpensesLogged,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      initials: req.user.initials,
      badges: req.user.badges,
      totalGroupsCreated: req.user.totalGroupsCreated,
      totalExpensesLogged: req.user.totalExpensesLogged,
      memberSince: req.user.createdAt,
    },
  });
});

module.exports = router;
