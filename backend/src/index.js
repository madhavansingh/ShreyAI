require('dotenv').config();

// ── Global crash catchers — MUST be first ──────────────────────
process.on('uncaughtException', (err) => {
  console.error('💥 uncaughtException:', err.message, err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 unhandledRejection:', reason);
  process.exit(1);
});
process.on('exit', (code) => {
  if (code !== 0) console.error(`💥 Process exited with code ${code}`);
});
// ──────────────────────────────────────────────────────────────

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import configs (initializes Firebase + Gemini on startup)
require('./config/firebase');
require('./config/gemini');

// Import routes
const healthRoutes = require('./routes/health');

// Import error handler
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5001;

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS policy: origin ${origin} is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-demo-role'],
  })
);

// ─── Request Logging ────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Global Rate Limiter ─────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please wait a moment and try again.',
    code: 429,
  },
  skip: (req) => req.path === '/api/health', // never rate-limit health checks
});

app.use(globalLimiter);

// ─── Stricter limiter for AI chat (prevent abuse) ────────────────────────────
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 chat requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Chat rate limit reached. Please wait a moment.',
    code: 429,
  },
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/health',  healthRoutes);
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/chat',    chatLimiter, require('./routes/chat'));

// Placeholder routes — added in Phase 4
// app.use('/api/courses',     require('./routes/courses'));
// app.use('/api/enrollments', require('./routes/enrollments'));

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`,
    code: 404,
  });
});

// ─── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Kodr Aura Backend running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error(`   On macOS, port 5000 is used by AirPlay Receiver.`);
    console.error(`   Fix: Change PORT in backend/.env to 5001 (or disable AirPlay in System Settings → General → AirDrop & Handoff)\n`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});

module.exports = app;
