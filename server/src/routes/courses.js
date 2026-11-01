// ============================================================
// src/routes/courses.js - Course Catalog Routes
// ============================================================
const router = require('express').Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { success, error, paginated } = require('../utils/response');

// GET /api/courses - Public course catalog with search, filter, pagination
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      search = '',
      department_id,
      term_id,
      credits,
      category,
      instructor_id,
      status = 'open',
      availability,
      page = 1,
      limit = 20,
      sort = 'code',
      order = 'asc'
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    const conditions = ['co.is_active = TRUE'];

    if (term_id) {
      params.push(term_id);
      conditions.push(`co.term_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(c.code ILIKE $${idx} OR c.name ILIKE $${idx} OR (f.first_name || ' ' || f.last_name) ILIKE $${idx})`);
    }

    if (department_id) {
      params.push(department_id);
      conditions.push(`c.department_id = $${params.length}`);
    }

    if (credits) {
      params.push(credits);
      conditions.push(`c.credits = $${params.length}`);
    }

    if (category) {
      params.push(category);
      conditions.push(`c.category = $${params.length}`);
    }

    if (instructor_id) {
      params.push(instructor_id);
      conditions.push(`co.faculty_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`co.status = $${params.length}`);
    }

    if (availability === 'available') {
      conditions.push('co.enrolled_count < co.capacity');
    } else if (availability === 'full') {
      conditions.push('co.enrolled_count >= co.capacity');
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const allowedSorts = { code: 'c.code', name: 'c.name', credits: 'c.credits', enrolled: 'co.enrolled_count', available: '(co.capacity - co.enrolled_count)' };
    const sortCol = allowedSorts[sort] || 'c.code';
    const sortDir = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const baseQuery = `
      FROM course_offerings co
      JOIN courses c ON c.id = co.course_id
      JOIN departments d ON d.id = c.department_id
      JOIN academic_terms at ON at.id = co.term_id
      LEFT JOIN faculty f ON f.id = co.faculty_id
      ${whereClause}
    `;

    const countResult = await query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const dataResult = await query(`
      SELECT
        co.id AS offering_id,
        c.id AS course_id,
        c.code,
        c.name,
        c.description,
        c.credits,
        c.category,
        c.course_level,
        d.name AS department,
        d.code AS dept_code,
        at.id AS term_id,
        at.name AS term_name,
        at.term_code,
        f.id AS faculty_id,
        f.first_name || ' ' || f.last_name AS instructor,
        co.section,
        co.room,
        co.capacity,
        co.enrolled_count,
        co.capacity - co.enrolled_count AS available_seats,
        co.waitlist_count,
        co.status,
        CASE
          WHEN co.status = 'cancelled' THEN 'cancelled'
          WHEN co.status = 'closed' THEN 'closed'
          WHEN co.enrolled_count >= co.capacity THEN 'full'
          WHEN (co.capacity - co.enrolled_count) <= 5 THEN 'limited'
          ELSE 'available'
        END AS availability_status
      ${baseQuery}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    // Fetch prerequisites for returned courses
    const offeringIds = dataResult.rows.map(r => r.course_id);
    let prereqMap = {};
    if (offeringIds.length > 0) {
      const prereqResult = await query(`
        SELECT cp.course_id, c.code AS prereq_code, c.name AS prereq_name, cp.is_mandatory
        FROM course_prerequisites cp
        JOIN courses c ON c.id = cp.prerequisite_id
        WHERE cp.course_id = ANY($1)
      `, [offeringIds]);
      prereqResult.rows.forEach(r => {
        if (!prereqMap[r.course_id]) prereqMap[r.course_id] = [];
        prereqMap[r.course_id].push({ code: r.prereq_code, name: r.prereq_name, mandatory: r.is_mandatory });
      });
    }

    // Fetch schedules
    const sOfferingIds = dataResult.rows.map(r => r.offering_id);
    let scheduleMap = {};
    if (sOfferingIds.length > 0) {
      const schedResult = await query(`
        SELECT offering_id, day_of_week, start_time, end_time, room
        FROM course_schedules WHERE offering_id = ANY($1)
        ORDER BY offering_id, day_of_week
      `, [sOfferingIds]);
      schedResult.rows.forEach(r => {
        if (!scheduleMap[r.offering_id]) scheduleMap[r.offering_id] = [];
        scheduleMap[r.offering_id].push(r);
      });
    }

    // Check student enrollment status for each offering
    let enrolledMap = {};
    let waitlistedMap = {};
    if (req.user.role === 'student') {
      const { rows: studentRows } = await query(
        'SELECT id FROM students WHERE user_id = $1', [req.user.id]
      );
      if (studentRows.length) {
        const sid = studentRows[0].id;
        const { rows: enrRows } = await query(
          'SELECT offering_id, status FROM enrollments WHERE student_id = $1 AND offering_id = ANY($2)',
          [sid, sOfferingIds]
        );
        enrRows.forEach(r => { enrolledMap[r.offering_id] = r.status; });

        const { rows: wlRows } = await query(
          'SELECT offering_id, position, status FROM waitlist_entries WHERE student_id = $1 AND offering_id = ANY($2)',
          [sid, sOfferingIds]
        );
        wlRows.forEach(r => { waitlistedMap[r.offering_id] = r; });
      }
    }

    const enriched = dataResult.rows.map(row => ({
      ...row,
      prerequisites: prereqMap[row.course_id] || [],
      schedule: scheduleMap[row.offering_id] || [],
      student_enrollment_status: enrolledMap[row.offering_id] || null,
      student_waitlist: waitlistedMap[row.offering_id] || null,
    }));

    return paginated(res, enriched, total, page, limit, 'Courses retrieved');
  } catch (err) {
    next(err);
  }
});

// GET /api/courses/:offeringId - Single course detail
router.get('/:offeringId', authenticate, async (req, res, next) => {
  try {
    const { offeringId } = req.params;
    const { rows } = await query(`
      SELECT
        co.id AS offering_id,
        c.id AS course_id, c.code, c.name, c.description, c.credits, c.category, c.course_level,
        d.name AS department, d.code AS dept_code,
        at.id AS term_id, at.name AS term_name, at.term_code,
        f.id AS faculty_id, f.first_name || ' ' || f.last_name AS instructor,
        f.email AS instructor_email, f.office AS instructor_office,
        co.section, co.room, co.capacity, co.enrolled_count,
        co.capacity - co.enrolled_count AS available_seats,
        co.waitlist_count, co.status
      FROM course_offerings co
      JOIN courses c ON c.id = co.course_id
      JOIN departments d ON d.id = c.department_id
      JOIN academic_terms at ON at.id = co.term_id
      LEFT JOIN faculty f ON f.id = co.faculty_id
      LEFT JOIN users uf ON uf.id = f.user_id
      WHERE co.id = $1
    `, [offeringId]);

    if (!rows.length) return error(res, 'Course not found', 404);

    const course = rows[0];

    const [prereqResult, schedResult] = await Promise.all([
      query(`
        SELECT c.code AS prereq_code, c.name AS prereq_name, cp.is_mandatory
        FROM course_prerequisites cp
        JOIN courses c ON c.id = cp.prerequisite_id
        WHERE cp.course_id = $1
      `, [course.course_id]),
      query(
        'SELECT day_of_week, start_time, end_time, room FROM course_schedules WHERE offering_id = $1 ORDER BY day_of_week',
        [offeringId]
      )
    ]);

    course.prerequisites = prereqResult.rows;
    course.schedule = schedResult.rows;

    return success(res, course);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
