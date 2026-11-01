// ============================================================
// src/app.js - Express Application Entry Point
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes         = require('./routes/auth');
const courseRoutes       = require('./routes/courses');
const enrollmentRoutes   = require('./routes/enrollments');
const facultyRoutes      = require('./routes/faculty');
const adminRoutes        = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const departmentRoutes   = require('./routes/departments');
const termRoutes         = require('./routes/terms');

const app = express();

// ============================================================
// SECURITY & MIDDLEWARE
// ============================================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 5000,
  message: { success: false, message: 'Too many requests, please try again later' }
});
app.use('/api', limiter);

// Stricter limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 500,
  message: { success: false, message: 'Too many login attempts' }
});

// ============================================================
// ROUTES
// ============================================================
app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/courses',       courseRoutes);
app.use('/api/enrollments',   enrollmentRoutes);
app.use('/api/faculty',       facultyRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/departments',   departmentRoutes);
app.use('/api/terms',         termRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
