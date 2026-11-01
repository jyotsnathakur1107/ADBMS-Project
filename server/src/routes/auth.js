// ============================================================
// src/routes/auth.js - Authentication Routes
// ============================================================
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { success, error } = require('../utils/response');

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')
];

// POST /api/auth/login
router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return error(res, errors.array()[0].msg);

    const { email, password } = req.body;

    const { rows } = await query(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (!rows.length) return error(res, 'Invalid email or password', 401);
    const user = rows[0];
    if (!user.is_active) return error(res, 'Account is deactivated', 401);

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return error(res, 'Invalid email or password', 401);

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Fetch profile
    let profile = null;
    if (user.role === 'student') {
      const { rows: sr } = await query(
        `SELECT s.*, d.name as department_name FROM students s
         LEFT JOIN departments d ON d.id = s.department_id
         WHERE s.user_id = $1`, [user.id]
      );
      profile = sr[0] || null;
    } else if (user.role === 'faculty') {
      const { rows: fr } = await query(
        `SELECT f.*, d.name as department_name FROM faculty f
         LEFT JOIN departments d ON d.id = f.department_id
         WHERE f.user_id = $1`, [user.id]
      );
      profile = fr[0] || null;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return success(res, {
      token,
      user: { id: user.id, email: user.email, role: user.role },
      profile
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register (student self-registration)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('first_name').trim().isLength({ min: 1, max: 50 }),
  body('last_name').trim().isLength({ min: 1, max: 50 }),
  body('department_id').isInt({ min: 1 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return error(res, errors.array()[0].msg);

    const { email, password, first_name, last_name, department_id } = req.body;

    // Check email uniqueness
    const { rows: existing } = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length) return error(res, 'Email already registered', 409);

    const hash = await bcrypt.hash(password, 10);

    // Use a transaction for atomicity
    const { rows: [newUser] } = await query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, hash, 'student']
    );

    // Generate student ID
    const { rows: [cnt] } = await query('SELECT COUNT(*) FROM students');
    const studentId = 'STU' + new Date().getFullYear() + String(parseInt(cnt.count) + 1).padStart(3, '0');

    await query(
      `INSERT INTO students (user_id, student_id, first_name, last_name, department_id, enrollment_year, current_year)
       VALUES ($1, $2, $3, $4, $5, $6, 1)`,
      [newUser.id, studentId, first_name, last_name, department_id, new Date().getFullYear()]
    );

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return success(res, { token, user: newUser }, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    let profile = null;
    if (req.user.role === 'student') {
      const { rows } = await query(
        `SELECT s.*, d.name as department_name FROM students s
         LEFT JOIN departments d ON d.id = s.department_id
         WHERE s.user_id = $1`, [req.user.id]
      );
      profile = rows[0] || null;
    } else if (req.user.role === 'faculty') {
      const { rows } = await query(
        `SELECT f.*, d.name as department_name FROM faculty f
         LEFT JOIN departments d ON d.id = f.department_id
         WHERE f.user_id = $1`, [req.user.id]
      );
      profile = rows[0] || null;
    }
    return success(res, { user: req.user, profile });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
