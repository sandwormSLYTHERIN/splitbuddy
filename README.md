# 💰 SplitBuddy — Smart Expense Splitting

A full-stack MERN expense splitting application with premium dark-mode UI, real-time balance calculations, and AI-powered features via Google Gemini.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- (Optional) Google Gemini API key for AI features

### 1. Backend Setup

```bash
cd backend
npm install
```

Edit `backend/.env` with your credentials:
```
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/splitbuddy
JWT_SECRET=your_secret_key_here
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here  # Optional
```

Start the backend:
```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## ✨ Features

### Core
- 🔐 JWT Authentication (Register/Login)
- 👥 Group Management (max 4 participants)
- 💳 Expense Tracking with 3 split modes (Equal, Custom, Percentage)
- ⚖️ Balance Engine with minimal settlement algorithm
- 📊 Recharts Visualizations (Pie + Bar charts)
- 🔍 Search & Filters (text, participant, date range)
- 🎨 Premium glassmorphism dark-mode UI

### Creative Touches
- 🏆 Achievement badges (Early Bird, Group Guru, Expense Tracker, Money Maven)
- 😌 Group mood system (Chill → Active → On Fire)
- 🏷️ Auto-categorization with emoji mapping (10+ categories)
- 💡 Smart spending insights (biggest spender, weekend patterns, etc.)
- ⏰ Time-based greeting on dashboard
- 🔐 Password strength indicator

### AI — MintSense (Gemini)
- 🗣️ Natural language expense parsing
- 🏷️ AI auto-categorization
- 📝 Group spending summaries
- 🤝 Smart settlement suggestions

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v7 |
| Styling | Vanilla CSS (glassmorphism dark theme) |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Express.js 4, Node.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| AI | Google Gemini 2.0 Flash |
| Notifications | react-hot-toast |

## 📁 Project Structure

```
splitbuddy/
├── backend/
│   ├── middleware/    # JWT auth, error handler
│   ├── models/        # User, Group, Expense schemas
│   ├── routes/        # auth, groups, expenses, ai
│   ├── utils/         # Balance engine, insights
│   ├── server.js      # Express entry point
│   └── .env           # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/  # 11 reusable components
│   │   ├── context/     # AuthContext
│   │   ├── pages/       # Login, Register, Dashboard, GroupDetail
│   │   ├── utils/       # Axios API utility
│   │   ├── App.jsx      # Router
│   │   ├── main.jsx     # Entry point
│   │   └── index.css    # Design system (700+ lines)
│   └── index.html
└── README.md
```
