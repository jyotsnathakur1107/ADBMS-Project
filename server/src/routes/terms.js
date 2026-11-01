// ============================================================
// src/routes/terms.js - Academic Terms routes
// ============================================================
const router = require('express').Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { success } = require('../utils/response');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM academic_terms WHERE is_active = TRUE ORDER BY start_date DESC'
    );
    return success(res, rows);
  } catch (err) { next(err); }
});

router.get('/current', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM academic_terms WHERE is_current = TRUE LIMIT 1'
    );
    return success(res, rows[0] || null);
  } catch (err) { next(err); }
});

module.exports = router;
