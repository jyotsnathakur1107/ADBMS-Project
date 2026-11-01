-- ============================================================
-- views.sql - Views and Materialized Views
-- ============================================================

-- ============================================================
-- 1. STUDENT REGISTRATION SUMMARY VIEW
-- Returns each student's current registration snapshot
-- ============================================================
CREATE OR REPLACE VIEW v_student_registration_summary AS
SELECT
    s.id                                AS student_id,
    s.student_id                        AS student_code,
    s.first_name || ' ' || s.last_name  AS student_name,
    u.email,
    d.name                              AS department,
    s.current_year,
    s.max_credits,
    COUNT(e.id) FILTER (WHERE e.status = 'registered') AS registered_courses,
    COALESCE(SUM(c.credits) FILTER (WHERE e.status = 'registered'), 0) AS registered_credits,
    s.max_credits - COALESCE(SUM(c.credits) FILTER (WHERE e.status = 'registered'), 0) AS remaining_credits
FROM students s
JOIN users u ON u.id = s.user_id
LEFT JOIN departments d ON d.id = s.department_id
LEFT JOIN enrollments e ON e.student_id = s.id
LEFT JOIN course_offerings co ON co.id = e.offering_id
LEFT JOIN courses c ON c.id = co.course_id
WHERE s.is_active = TRUE
GROUP BY s.id, s.student_id, s.first_name, s.last_name, u.email, d.name, s.current_year, s.max_credits;

-- ============================================================
-- 2. COURSE ENROLLMENT SUMMARY VIEW
-- Returns enrollment numbers and availability per offering
-- ============================================================
CREATE OR REPLACE VIEW v_course_enrollment_summary AS
SELECT
    co.id                               AS offering_id,
    c.code                              AS course_code,
    c.name                              AS course_name,
    c.credits,
    c.category,
    d.name                              AS department,
    at.name                             AS term_name,
    at.term_code,
    f.first_name || ' ' || f.last_name  AS instructor_name,
    co.section,
    co.room,
    co.capacity,
    co.enrolled_count,
    co.capacity - co.enrolled_count     AS available_seats,
    co.waitlist_count,
    co.status,
    CASE
        WHEN co.status = 'cancelled' THEN 'cancelled'
        WHEN co.status = 'closed'    THEN 'closed'
        WHEN co.enrolled_count >= co.capacity THEN 'full'
        WHEN (co.capacity - co.enrolled_count) <= 5 THEN 'limited'
        ELSE 'available'
    END                                 AS availability_status
FROM course_offerings co
JOIN courses c ON c.id = co.course_id
JOIN departments d ON d.id = c.department_id
JOIN academic_terms at ON at.id = co.term_id
LEFT JOIN faculty f ON f.id = co.faculty_id
WHERE co.is_active = TRUE;

-- ============================================================
-- 3. AVAILABLE OFFERINGS VIEW
-- Shows only open course offerings with seats
-- ============================================================
CREATE OR REPLACE VIEW v_available_offerings AS
SELECT *
FROM v_course_enrollment_summary
WHERE status = 'open'
  AND availability_status IN ('available', 'limited');

-- ============================================================
-- 4. STUDENT TIMETABLE VIEW
-- Returns schedule blocks for each enrolled student
-- ============================================================
CREATE OR REPLACE VIEW v_student_timetable AS
SELECT
    s.id                                AS student_id,
    s.student_id                        AS student_code,
    e.id                                AS enrollment_id,
    co.id                               AS offering_id,
    c.code                              AS course_code,
    c.name                              AS course_name,
    f.first_name || ' ' || f.last_name  AS instructor_name,
    cs.day_of_week,
    cs.start_time,
    cs.end_time,
    COALESCE(cs.room, co.room)          AS room,
    at.name                             AS term_name,
    at.term_code
FROM students s
JOIN enrollments e      ON e.student_id  = s.id   AND e.status = 'registered'
JOIN course_offerings co ON co.id        = e.offering_id
JOIN courses c           ON c.id         = co.course_id
JOIN academic_terms at   ON at.id        = co.term_id
LEFT JOIN faculty f      ON f.id         = co.faculty_id
LEFT JOIN course_schedules cs ON cs.offering_id = co.id;

-- ============================================================
-- 5. FACULTY TEACHING SCHEDULE VIEW
-- ============================================================
CREATE OR REPLACE VIEW v_faculty_teaching_schedule AS
SELECT
    f.id                                AS faculty_id,
    f.faculty_id                        AS faculty_code,
    f.first_name || ' ' || f.last_name  AS faculty_name,
    d.name                              AS department,
    co.id                               AS offering_id,
    c.code                              AS course_code,
    c.name                              AS course_name,
    c.credits,
    co.section,
    co.enrolled_count,
    co.capacity,
    cs.day_of_week,
    cs.start_time,
    cs.end_time,
    COALESCE(cs.room, co.room)          AS room,
    at.name                             AS term_name
FROM faculty f
JOIN course_offerings co ON co.faculty_id = f.id AND co.is_active = TRUE
JOIN courses c ON c.id = co.course_id
JOIN departments d ON d.id = f.department_id
JOIN academic_terms at ON at.id = co.term_id
LEFT JOIN course_schedules cs ON cs.offering_id = co.id;

-- ============================================================
-- 6. STUDENT CREDIT SUMMARY VIEW
-- ============================================================
CREATE OR REPLACE VIEW v_student_credit_summary AS
SELECT
    s.id                                AS student_id,
    s.student_id                        AS student_code,
    s.first_name || ' ' || s.last_name  AS student_name,
    s.max_credits,
    COALESCE(SUM(c.credits) FILTER (WHERE e.status = 'registered'), 0) AS current_credits,
    COALESCE(SUM(cc.credits_earned), 0) AS total_earned_credits,
    s.gpa
FROM students s
LEFT JOIN enrollments e ON e.student_id = s.id
LEFT JOIN course_offerings co ON co.id = e.offering_id
LEFT JOIN courses c ON c.id = co.course_id
LEFT JOIN completed_courses cc ON cc.student_id = s.id
WHERE s.is_active = TRUE
GROUP BY s.id, s.student_id, s.first_name, s.last_name, s.max_credits, s.gpa;

-- ============================================================
-- 7. COURSE PREREQUISITES VIEW (Readable)
-- ============================================================
CREATE OR REPLACE VIEW v_course_prerequisites AS
SELECT
    c.id            AS course_id,
    c.code          AS course_code,
    c.name          AS course_name,
    p.id            AS prereq_id,
    p.code          AS prereq_code,
    p.name          AS prereq_name,
    cp.is_mandatory
FROM course_prerequisites cp
JOIN courses c ON c.id = cp.course_id
JOIN courses p ON p.id = cp.prerequisite_id;

-- ============================================================
-- 8. WAITLIST STATUS VIEW
-- ============================================================
CREATE OR REPLACE VIEW v_waitlist_status AS
SELECT
    we.id,
    s.student_id                        AS student_code,
    s.first_name || ' ' || s.last_name  AS student_name,
    c.code                              AS course_code,
    c.name                              AS course_name,
    at.name                             AS term_name,
    we.position,
    we.status,
    we.joined_at
FROM waitlist_entries we
JOIN students s ON s.id = we.student_id
JOIN course_offerings co ON co.id = we.offering_id
JOIN courses c ON c.id = co.course_id
JOIN academic_terms at ON at.id = co.term_id
WHERE we.status = 'waiting'
ORDER BY we.offering_id, we.position;

-- ============================================================
-- 9. MATERIALIZED VIEW: Admin Analytics Dashboard
-- Refreshed manually or on schedule (data may be slightly stale)
-- ============================================================
CREATE MATERIALIZED VIEW mv_admin_dashboard_analytics AS
SELECT
    d.id                                AS department_id,
    d.code                              AS department_code,
    d.name                              AS department_name,
    COUNT(DISTINCT s.id)               AS total_students,
    COUNT(DISTINCT f.id)               AS total_faculty,
    COUNT(DISTINCT co.id)              AS total_offerings,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'registered') AS total_enrollments,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'registered') AS active_enrollments,
    COALESCE(SUM(co.capacity), 0)      AS total_capacity,
    COUNT(DISTINCT co.id) FILTER (
        WHERE co.enrolled_count >= co.capacity AND co.status = 'open'
    )                                   AS full_offerings,
    ROUND(
        AVG(co.enrolled_count::DECIMAL / NULLIF(co.capacity, 0) * 100), 2
    )                                   AS avg_fill_rate_pct,
    COALESCE(SUM(co.waitlist_count), 0) AS total_waitlisted
FROM departments d
LEFT JOIN students s ON s.department_id = d.id AND s.is_active = TRUE
LEFT JOIN faculty f ON f.department_id = d.id AND f.is_active = TRUE
LEFT JOIN courses c ON c.department_id = d.id AND c.is_active = TRUE
LEFT JOIN course_offerings co ON co.course_id = c.id AND co.is_active = TRUE
LEFT JOIN enrollments e ON e.offering_id = co.id
GROUP BY d.id, d.code, d.name
WITH DATA;

-- Index on the materialized view for fast dashboard queries
CREATE INDEX idx_mv_dashboard_dept ON mv_admin_dashboard_analytics(department_id);

-- ============================================================
-- REFRESH STRATEGY for Materialized View
-- ============================================================
-- This materialized view is intentionally slightly stale.
-- It should be refreshed via a scheduled job (cron) or explicitly:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_dashboard_analytics;
-- The CONCURRENTLY option allows reads during refresh (requires a unique index).
CREATE UNIQUE INDEX idx_mv_dashboard_unique ON mv_admin_dashboard_analytics(department_id);
