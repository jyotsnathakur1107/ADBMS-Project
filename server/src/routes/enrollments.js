// ============================================================
// src/routes/enrollments.js - Registration/Drop/Waitlist Routes
// ============================================================
const router = require('express').Router();
const { getClient, query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { success, error } = require('../utils/response');

// Helper: get student_id from user_id
async function getStudentId(userId) {
  const { rows } = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
  return rows.length ? rows[0].id : null;
}

// ============================================================
// POST /api/enrollments/register - Register for a course
// Core transactional operation using fn_register_student
// ============================================================
router.post('/register', authenticate, authorize('student'), async (req, res, next) => {
  const client = await getClient();
  try {
    const { offering_id } = req.body;
    if (!offering_id) return error(res, 'offering_id is required');

    const studentId = await getStudentId(req.user.id);
    if (!studentId) return error(res, 'Student profile not found', 404);

    await client.query('BEGIN');

    // Call the transactional PL/pgSQL function
    const { rows } = await client.query(
      'SELECT * FROM fn_register_student($1, $2, $3)',
      [studentId, offering_id, req.user.id]
    );

    const outcome = rows[0];
    if (outcome.result === 'success') {
      await client.query('COMMIT');
      return success(res, { offering_id, student_id: studentId }, outcome.message, 201);
    } else {
      await client.query('ROLLBACK');
      return error(res, outcome.message, 422);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ============================================================
// POST /api/enrollments/drop - Drop a registered course
// ============================================================
router.post('/drop', authenticate, authorize('student'), async (req, res, next) => {
  const client = await getClient();
  try {
    const { offering_id, reason = '' } = req.body;
    if (!offering_id) return error(res, 'offering_id is required');

    const studentId = await getStudentId(req.user.id);
    if (!studentId) return error(res, 'Student profile not found', 404);

    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT * FROM fn_drop_enrollment($1, $2, $3, $4)',
      [studentId, offering_id, reason, req.user.id]
    );

    const outcome = rows[0];
    if (outcome.result === 'success') {
      await client.query('COMMIT');
      return success(res, { offering_id, student_id: studentId }, outcome.message);
    } else {
      await client.query('ROLLBACK');
      return error(res, outcome.message, 422);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ============================================================
// POST /api/enrollments/waitlist - Join waitlist
// ============================================================
router.post('/waitlist', authenticate, authorize('student'), async (req, res, next) => {
  const client = await getClient();
  try {
    const { offering_id } = req.body;
    if (!offering_id) return error(res, 'offering_id is required');

    const studentId = await getStudentId(req.user.id);
    if (!studentId) return error(res, 'Student profile not found', 404);

    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT * FROM fn_join_waitlist($1, $2, $3)',
      [studentId, offering_id, req.user.id]
    );

    const outcome = rows[0];
    if (outcome.result === 'success') {
      await client.query('COMMIT');
      return success(res, { offering_id, student_id: studentId, position: outcome.position }, outcome.message, 201);
    } else {
      await client.query('ROLLBACK');
      return error(res, outcome.message, 422);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ============================================================
// GET /api/enrollments/my-courses - Student's registered courses
// ============================================================
router.get('/my-courses', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const { term_id, status } = req.query;
    const studentId = await getStudentId(req.user.id);
    if (!studentId) return error(res, 'Student profile not found', 404);

    const params = [studentId];
    const conditions = ['e.student_id = $1'];

    if (term_id) {
      params.push(term_id);
      conditions.push(`co.term_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`e.status = $${params.length}`);
    }

    const { rows } = await query(`
      SELECT
        e.id AS enrollment_id,
        e.status AS enrollment_status,
        e.registered_at,
        e.dropped_at,
        e.drop_reason,
        e.grade,
        co.id AS offering_id,
        co.section,
        co.room,
        c.id AS course_id,
        c.code,
        c.name,
        c.credits,
        c.category,
        d.name AS department,
        at.id AS term_id,
        at.name AS term_name,
        at.term_code,
        f.first_name || ' ' || f.last_name AS instructor
      FROM enrollments e
      JOIN course_offerings co ON co.id = e.offering_id
      JOIN courses c ON c.id = co.course_id
      JOIN departments d ON d.id = c.department_id
      JOIN academic_terms at ON at.id = co.term_id
      LEFT JOIN faculty f ON f.id = co.faculty_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.registered_at DESC
    `, params);

    // Attach schedules
    const offeringIds = rows.map(r => r.offering_id);
    let scheduleMap = {};
    if (offeringIds.length) {
      const { rows: scheds } = await query(
        'SELECT offering_id, day_of_week, start_time, end_time, room FROM course_schedules WHERE offering_id = ANY($1)',
        [offeringIds]
      );
      scheds.forEach(s => {
        if (!scheduleMap[s.offering_id]) scheduleMap[s.offering_id] = [];
        scheduleMap[s.offering_id].push(s);
      });
    }

    const enriched = rows.map(r => ({ ...r, schedule: scheduleMap[r.offering_id] || [] }));
    return success(res, enriched);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/enrollments/timetable - Student's weekly timetable
// ============================================================
router.get('/timetable', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const { term_id } = req.query;
    const studentId = await getStudentId(req.user.id);
    if (!studentId) return error(res, 'Student profile not found', 404);

    const currentTerm = term_id || (await query(
      'SELECT id FROM academic_terms WHERE is_current = TRUE LIMIT 1'
    )).rows[0]?.id;

    const { rows } = await query(`
      SELECT
        e.id AS enrollment_id,
        co.id AS offering_id,
        c.code,
        c.name,
        c.credits,
        f.first_name || ' ' || f.last_name AS instructor,
        cs.day_of_week,
        cs.start_time,
        cs.end_time,
        COALESCE(cs.room, co.room) AS room,
        at.name AS term_name
      FROM enrollments e
      JOIN course_offerings co ON co.id = e.offering_id
      JOIN courses c ON c.id = co.course_id
      JOIN academic_terms at ON at.id = co.term_id
      LEFT JOIN faculty f ON f.id = co.faculty_id
      LEFT JOIN course_schedules cs ON cs.offering_id = co.id
      WHERE e.student_id = $1
        AND e.status = 'registered'
        AND co.term_id = $2
      ORDER BY cs.day_of_week, cs.start_time
    `, [studentId, currentTerm]);

    return success(res, rows);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/enrollments/credit-summary
// ============================================================
router.get('/credit-summary', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const studentId = await getStudentId(req.user.id);
    if (!studentId) return error(res, 'Student profile not found', 404);

    const { rows } = await query(
      'SELECT * FROM v_student_credit_summary WHERE student_id = $1',
      [studentId]
    );

    return success(res, rows[0] || {});
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/enrollments/my-waitlists
// ============================================================
router.get('/my-waitlists', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const studentId = await getStudentId(req.user.id);
    if (!studentId) return error(res, 'Student profile not found', 404);

    const { rows } = await query(`
      SELECT we.id, we.position, we.status, we.joined_at, we.promoted_at,
             c.code, c.name, c.credits, at.name AS term_name
      FROM waitlist_entries we
      JOIN course_offerings co ON co.id = we.offering_id
      JOIN courses c ON c.id = co.course_id
      JOIN academic_terms at ON at.id = co.term_id
      WHERE we.student_id = $1
      ORDER BY we.joined_at DESC
    `, [studentId]);

    return success(res, rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
