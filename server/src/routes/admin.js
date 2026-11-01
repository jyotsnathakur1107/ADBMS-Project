// ============================================================
// src/routes/admin.js - Admin Management Routes
// ============================================================
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query, getClient } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { success, error, paginated } = require('../utils/response');

const adminOnly = [authenticate, authorize('admin')];

// ============================
// DASHBOARD STATS
// ============================
router.get('/dashboard', ...adminOnly, async (req, res, next) => {
  try {
    const [
      studentsRes, facultyRes, offeringsRes, enrollmentsRes,
      fullCoursesRes, waitlistRes, deptStatsRes, recentAuditRes
    ] = await Promise.all([
      query(`SELECT COUNT(*) FROM students WHERE is_active = TRUE`),
      query(`SELECT COUNT(*) FROM faculty WHERE is_active = TRUE`),
      query(`SELECT COUNT(*) FROM course_offerings co WHERE co.is_active = TRUE AND co.term_id = (SELECT id FROM academic_terms WHERE is_current = TRUE)`),
      query(`SELECT COUNT(*) FROM enrollments e JOIN course_offerings co ON co.id = e.offering_id WHERE e.status = 'registered' AND co.term_id = (SELECT id FROM academic_terms WHERE is_current = TRUE)`),
      query(`SELECT COUNT(*) FROM course_offerings WHERE is_active=TRUE AND enrolled_count >= capacity AND status='open' AND term_id = (SELECT id FROM academic_terms WHERE is_current = TRUE)`),
      query(`SELECT SUM(waitlist_count) FROM course_offerings WHERE is_active=TRUE AND term_id = (SELECT id FROM academic_terms WHERE is_current = TRUE)`),
      query(`SELECT * FROM mv_admin_dashboard_analytics ORDER BY total_enrollments DESC`),
      query(`SELECT ral.*, u.email as actor_email FROM registration_audit_logs ral LEFT JOIN users u ON u.id = ral.actor_user_id ORDER BY ral.created_at DESC LIMIT 10`)
    ]);

    return success(res, {
      stats: {
        total_students: parseInt(studentsRes.rows[0].count),
        total_faculty: parseInt(facultyRes.rows[0].count),
        active_offerings: parseInt(offeringsRes.rows[0].count),
        active_enrollments: parseInt(enrollmentsRes.rows[0].count),
        full_courses: parseInt(fullCoursesRes.rows[0].count),
        total_waitlisted: parseInt(waitlistRes.rows[0].sum || 0),
      },
      department_analytics: deptStatsRes.rows,
      recent_activity: recentAuditRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ============================
// COURSE OFFERINGS MANAGEMENT
// ============================
router.get('/offerings', ...adminOnly, async (req, res, next) => {
  try {
    const { term_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = ['co.is_active = TRUE'];
    if (term_id) { params.push(term_id); conditions.push(`co.term_id = $${params.length}`); }
    const where = 'WHERE ' + conditions.join(' AND ');

    const countRes = await query(`SELECT COUNT(*) FROM course_offerings co ${where}`, params);
    params.push(parseInt(limit)); params.push(offset);

    const { rows } = await query(`
      SELECT co.*, c.code, c.name AS course_name, c.credits,
             at.name AS term_name, d.name AS department,
             f.first_name || ' ' || f.last_name AS instructor
      FROM course_offerings co
      JOIN courses c ON c.id = co.course_id
      JOIN academic_terms at ON at.id = co.term_id
      JOIN departments d ON d.id = c.department_id
      LEFT JOIN faculty f ON f.id = co.faculty_id
      ${where}
      ORDER BY at.start_date DESC, c.code
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return paginated(res, rows, parseInt(countRes.rows[0].count), page, limit);
  } catch (err) { next(err); }
});

router.post('/offerings', ...adminOnly, async (req, res, next) => {
  try {
    const { course_id, term_id, faculty_id, section = 'A', room, capacity } = req.body;
    if (!course_id || !term_id || !capacity) return error(res, 'course_id, term_id, capacity required');
    const { rows } = await query(
      `INSERT INTO course_offerings (course_id, term_id, faculty_id, section, room, capacity)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [course_id, term_id, faculty_id || null, section, room || null, capacity]
    );
    return success(res, rows[0], 'Offering created', 201);
  } catch (err) { next(err); }
});

router.put('/offerings/:id', ...adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { faculty_id, section, room, capacity, status } = req.body;
    const { rows } = await query(
      `UPDATE course_offerings SET
        faculty_id = COALESCE($1, faculty_id),
        section = COALESCE($2, section),
        room = COALESCE($3, room),
        capacity = COALESCE($4, capacity),
        status = COALESCE($5, status)
       WHERE id = $6 RETURNING *`,
      [faculty_id, section, room, capacity, status, id]
    );
    if (!rows.length) return error(res, 'Offering not found', 404);
    return success(res, rows[0], 'Offering updated');
  } catch (err) { next(err); }
});

// ============================
// COURSES MANAGEMENT
// ============================
router.get('/courses', ...adminOnly, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT c.*, d.name AS department_name FROM courses c
      JOIN departments d ON d.id = c.department_id
      ORDER BY c.code
    `);
    return success(res, rows);
  } catch (err) { next(err); }
});

router.post('/courses', ...adminOnly, async (req, res, next) => {
  try {
    const { code, name, description, department_id, credits, course_level = 100, category = 'core' } = req.body;
    if (!code || !name || !department_id || !credits) return error(res, 'code, name, department_id, credits required');
    const { rows } = await query(
      `INSERT INTO courses (code, name, description, department_id, credits, course_level, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [code, name, description, department_id, credits, course_level, category]
    );
    return success(res, rows[0], 'Course created', 201);
  } catch (err) { next(err); }
});

router.put('/courses/:id', ...adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, credits, category, is_active } = req.body;
    const { rows } = await query(
      `UPDATE courses SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        credits = COALESCE($3, credits),
        category = COALESCE($4, category),
        is_active = COALESCE($5, is_active)
       WHERE id = $6 RETURNING *`,
      [name, description, credits, category, is_active, id]
    );
    if (!rows.length) return error(res, 'Course not found', 404);
    return success(res, rows[0], 'Course updated');
  } catch (err) { next(err); }
});

// ============================
// TERMS MANAGEMENT
// ============================
router.get('/terms', ...adminOnly, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM academic_terms ORDER BY start_date DESC');
    return success(res, rows);
  } catch (err) { next(err); }
});

router.post('/terms', ...adminOnly, async (req, res, next) => {
  try {
    const { name, term_code, start_date, end_date, is_current = false } = req.body;
    const { rows } = await query(
      `INSERT INTO academic_terms (name, term_code, start_date, end_date, is_current)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, term_code, start_date, end_date, is_current]
    );
    return success(res, rows[0], 'Term created', 201);
  } catch (err) { next(err); }
});

// ============================
// DEPARTMENTS
// ============================
router.get('/departments', ...adminOnly, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM departments ORDER BY name');
    return success(res, rows);
  } catch (err) { next(err); }
});

router.post('/departments', ...adminOnly, async (req, res, next) => {
  try {
    const { code, name, description, head_name } = req.body;
    const { rows } = await query(
      `INSERT INTO departments (code, name, description, head_name) VALUES ($1,$2,$3,$4) RETURNING *`,
      [code, name, description, head_name]
    );
    return success(res, rows[0], 'Department created', 201);
  } catch (err) { next(err); }
});

// ============================
// STUDENTS MANAGEMENT
// ============================
router.get('/students', ...adminOnly, async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20, department_id } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = ['s.is_active = TRUE'];
    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      conditions.push(`(s.first_name ILIKE $${i} OR s.last_name ILIKE $${i} OR s.student_id ILIKE $${i} OR u.email ILIKE $${i})`);
    }
    if (department_id) { params.push(department_id); conditions.push(`s.department_id = $${params.length}`); }
    const where = 'WHERE ' + conditions.join(' AND ');

    const countRes = await query(`SELECT COUNT(*) FROM students s JOIN users u ON u.id = s.user_id ${where}`, params);
    params.push(parseInt(limit)); params.push(offset);

    const { rows } = await query(`
      SELECT s.*, u.email, d.name AS department_name
      FROM students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN departments d ON d.id = s.department_id
      ${where}
      ORDER BY s.student_id
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return paginated(res, rows, parseInt(countRes.rows[0].count), page, limit);
  } catch (err) { next(err); }
});

router.put('/students/:id', ...adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { max_credits, current_year, is_active } = req.body;
    const { rows } = await query(
      `UPDATE students SET
        max_credits = COALESCE($1, max_credits),
        current_year = COALESCE($2, current_year),
        is_active = COALESCE($3, is_active)
       WHERE id = $4 RETURNING *`,
      [max_credits, current_year, is_active, id]
    );
    if (!rows.length) return error(res, 'Student not found', 404);
    return success(res, rows[0], 'Student updated');
  } catch (err) { next(err); }
});

// ============================
// FACULTY MANAGEMENT
// ============================
router.get('/faculty', ...adminOnly, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT f.*, u.email, d.name AS department_name
      FROM faculty f JOIN users u ON u.id = f.user_id
      LEFT JOIN departments d ON d.id = f.department_id
      WHERE f.is_active = TRUE ORDER BY f.last_name, f.first_name
    `);
    return success(res, rows);
  } catch (err) { next(err); }
});

// ============================
// REGISTRATION PERIODS
// ============================
router.get('/registration-periods', ...adminOnly, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT rp.*, at.name AS term_name FROM registration_periods rp
      JOIN academic_terms at ON at.id = rp.term_id ORDER BY rp.start_datetime DESC
    `);
    return success(res, rows);
  } catch (err) { next(err); }
});

router.post('/registration-periods', ...adminOnly, async (req, res, next) => {
  try {
    const { term_id, name, start_datetime, end_datetime, eligible_years } = req.body;
    const { rows } = await query(
      `INSERT INTO registration_periods (term_id, name, start_datetime, end_datetime, eligible_years)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [term_id, name, start_datetime, end_datetime, eligible_years || [1,2,3,4,5,6]]
    );
    return success(res, rows[0], 'Registration period created', 201);
  } catch (err) { next(err); }
});

// ============================
// AUDIT LOGS
// ============================
router.get('/audit-logs', ...adminOnly, async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;
    const countRes = await query('SELECT COUNT(*) FROM registration_audit_logs');
    const { rows } = await query(`
      SELECT ral.*, u.email AS actor_email,
             s.student_id AS student_code, s.first_name || ' ' || s.last_name AS student_name,
             c.code AS course_code
      FROM registration_audit_logs ral
      LEFT JOIN users u ON u.id = ral.actor_user_id
      LEFT JOIN students s ON s.id = ral.student_id
      LEFT JOIN course_offerings co ON co.id = ral.offering_id
      LEFT JOIN courses c ON c.id = co.course_id
      ORDER BY ral.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), offset]);

    return paginated(res, rows, parseInt(countRes.rows[0].count), page, limit);
  } catch (err) { next(err); }
});

// ============================
// ANALYTICS
// ============================
router.get('/analytics/enrollment-trends', ...adminOnly, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        at.name AS term,
        at.term_code,
        COUNT(e.id) FILTER (WHERE e.status = 'registered') AS registrations,
        COUNT(e.id) FILTER (WHERE e.status = 'dropped') AS drops,
        COUNT(DISTINCT e.student_id) AS unique_students
      FROM academic_terms at
      LEFT JOIN course_offerings co ON co.term_id = at.id
      LEFT JOIN enrollments e ON e.offering_id = co.id
      GROUP BY at.id, at.name, at.term_code, at.start_date
      ORDER BY at.start_date
    `);
    return success(res, rows);
  } catch (err) { next(err); }
});

router.post('/refresh-analytics', ...adminOnly, async (req, res, next) => {
  try {
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_dashboard_analytics');
    return success(res, null, 'Analytics refreshed');
  } catch (err) { next(err); }
});

// ============================
// STORED PROCEDURE MAINTENANCE
// ============================
router.post('/maintenance/reconcile', ...adminOnly, async (req, res, next) => {
  try {
    await query('CALL sp_reconcile_enrollment_counts()');
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_dashboard_analytics');
    return success(res, null, 'Stored procedure sp_reconcile_enrollment_counts executed successfully. Counters verified against ground-truth tables.');
  } catch (err) { next(err); }
});

// ============================
// FACULTY LIST (ADMIN)
// ============================
router.get('/faculty', ...adminOnly, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT f.id, f.first_name, f.last_name, f.faculty_id, d.name AS department_name
      FROM faculty f
      LEFT JOIN departments d ON d.id = f.department_id
      WHERE f.is_active = TRUE
      ORDER BY f.last_name
    `);
    return success(res, rows);
  } catch (err) { next(err); }
});

module.exports = router;
