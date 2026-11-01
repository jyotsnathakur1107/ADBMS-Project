// ============================================================
// src/routes/notifications.js, students.js, departments.js, terms.js
// ============================================================
const router = require('express').Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { success } = require('../utils/response');

// GET /api/notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    return success(res, rows);
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    return success(res, null, 'Marked as read');
  } catch (err) { next(err); }
});

// PATCH /api/notifications/mark-all-read
router.patch('/mark-all-read', authenticate, async (req, res, next) => {
  try {
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    return success(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
});

module.exports = router;
