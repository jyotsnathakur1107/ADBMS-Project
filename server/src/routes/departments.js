// ============================================================
// src/routes/departments.js - Public department listing
// ============================================================
const router = require('express').Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { success } = require('../utils/response');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, code, name, description, head_name FROM departments WHERE is_active = TRUE ORDER BY name'
    );
    return success(res, rows);
  } catch (err) { next(err); }
});

module.exports = router;
