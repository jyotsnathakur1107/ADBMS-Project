// ============================================================
// src/routes/faculty.js - Faculty Dashboard Routes
// ============================================================
const router = require('express').Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { success, error } = require('../utils/response');

// GET /api/faculty/my-courses - Faculty's assigned courses
router.get('/my-courses', authenticate, authorize('faculty'), async (req, res, next) => {
  try {
    const { term_id } = req.query;
    const { rows: fRows } = await query('SELECT id FROM faculty WHERE user_id = $1', [req.user.id]);
    if (!fRows.length) return error(res, 'Faculty profile not found', 404);
    const facultyId = fRows[0].id;

    const params = [facultyId];
    let termFilter = '';
    if (term_id) {
      params.push(term_id);
      termFilter = `AND co.term_id = $${params.length}`;
    }

    const { rows } = await query(`
      SELECT
        co.id AS offering_id,
        c.id AS course_id,
        c.code,
        c.name,
        c.description,
        c.credits,
        c.category,
        d.name AS department,
        at.id AS term_id,
        at.name AS term_name,
        co.section,
        co.room,
        co.capacity,
        co.enrolled_count,
        co.capacity - co.enrolled_count AS available_seats,
        co.waitlist_count,
        co.status
      FROM course_offerings co
      JOIN courses c ON c.id = co.course_id
      JOIN departments d ON d.id = c.department_id
      JOIN academic_terms at ON at.id = co.term_id
      WHERE co.faculty_id = $1 ${termFilter}
      ORDER BY at.start_date DESC, c.code
    `, params);

    // Fetch schedules
    const offeringIds = rows.map(r => r.offering_id);
    if (offeringIds.length) {
      const { rows: scheds } = await query(
        'SELECT offering_id, day_of_week, start_time, end_time FROM course_schedules WHERE offering_id = ANY($1)',
        [offeringIds]
      );
      const schedMap = {};
      scheds.forEach(s => {
        if (!schedMap[s.offering_id]) schedMap[s.offering_id] = [];
        schedMap[s.offering_id].push(s);
      });
      rows.forEach(r => { r.schedule = schedMap[r.offering_id] || []; });
    }

    return success(res, rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/faculty/courses/:offeringId/students - Students enrolled
router.get('/courses/:offeringId/students', authenticate, authorize('faculty', 'admin'), async (req, res, next) => {
  try {
    const { offeringId } = req.params;

    // Verify faculty owns this offering (unless admin)
    if (req.user.role === 'faculty') {
      const { rows: fRows } = await query('SELECT id FROM faculty WHERE user_id = $1', [req.user.id]);
      const { rows: ofRows } = await query('SELECT faculty_id FROM course_offerings WHERE id = $1', [offeringId]);
      if (!ofRows.length || ofRows[0].faculty_id !== fRows[0]?.id) {
        return error(res, 'Access denied to this course', 403);
      }
    }

    const { rows } = await query(`
      SELECT
        s.student_id AS student_code,
        s.first_name || ' ' || s.last_name AS student_name,
        u.email,
        d.name AS department,
        s.current_year,
        e.registered_at,
        e.status AS enrollment_status,
        e.grade
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN users u ON u.id = s.user_id
      LEFT JOIN departments d ON d.id = s.department_id
      WHERE e.offering_id = $1 AND e.status = 'registered'
      ORDER BY s.last_name, s.first_name
    `, [offeringId]);

    return success(res, rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/faculty/profile
router.get('/profile', authenticate, authorize('faculty'), async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT f.*, d.name as department_name, u.email
      FROM faculty f
      LEFT JOIN departments d ON d.id = f.department_id
      JOIN users u ON u.id = f.user_id
      WHERE f.user_id = $1
    `, [req.user.id]);

    if (!rows.length) return error(res, 'Faculty profile not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
