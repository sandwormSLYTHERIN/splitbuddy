const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');
const aiRoutes = require('./routes/ai');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ═══════════════════════════════════════════
//  🧊 Middleware
// ═══════════════════════════════════════════
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ═══════════════════════════════════════════
//  🗄️ Database Connection
// ═══════════════════════════════════════════
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`
    ╔═══════════════════════════════════════════╗
    ║   🍃 MongoDB Connected Successfully!      ║
    ║   Host: ${conn.connection.host.padEnd(33)}║
    ║   DB:   ${conn.connection.name.padEnd(33)}║
    ╚═══════════════════════════════════════════╝
    `);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    throw error;
  }
};

// Ensure DB is connected before any API calls
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('💥 DB middleware error:', err.message);
    res.status(500).json({
      success: false,
      message: '🔌 Database connection failed. Check your MONGODB_URI.',
    });
  }
});

// ═══════════════════════════════════════════
//  🛣️ Routes
// ═══════════════════════════════════════════
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '💚 SplitBuddy API is alive and well!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `🗺️ Route ${req.method} ${req.originalUrl} not found. Check the API docs!`,
  });
});

// ═══════════════════════════════════════════
//  💥 Error Handler (must be last)
// ═══════════════════════════════════════════
app.use(errorHandler);

// ═══════════════════════════════════════════
//  🚀 Start Server
// ═══════════════════════════════════════════
if (process.env.NODE_ENV !== 'production') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`
      ╔═══════════════════════════════════════════╗
      ║                                           ║
      ║   💰 SplitBuddy API Server                ║
      ║   🌐 http://localhost:${String(PORT).padEnd(21)}║
      ║   📡 Environment: ${(process.env.NODE_ENV || 'development').padEnd(20)}║
      ║   🤖 AI: ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? 'Gemini Enabled ✅'.padEnd(30) : 'Not Configured ⚠️'.padEnd(30)}║
      ║                                           ║
      ╚═══════════════════════════════════════════╝
      `);
    });
  }).catch(err => {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  });
}

// For Vercel Serverless
module.exports = app;
