-- ============================================================
-- demo_queries.sql - 12+ Advanced SQL Demonstration Queries
-- ============================================================

-- ============================================================
-- Q1: Students registered in a particular course (CS301)
-- Demonstrates: JOIN, filtering, ordering
-- ============================================================
SELECT
    s.student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    u.email,
    e.registered_at,
    e.status
FROM enrollments e
JOIN students s ON s.id = e.student_id
JOIN users u ON u.id = s.user_id
JOIN course_offerings co ON co.id = e.offering_id
JOIN courses c ON c.id = co.course_id
WHERE c.code = 'CS301'
  AND e.status = 'registered'
ORDER BY s.last_name, s.first_name;

-- ============================================================
-- Q2: Courses with highest enrollment (Top 10)
-- Demonstrates: JOIN, GROUP BY, ORDER BY, LIMIT
-- ============================================================
SELECT
    c.code,
    c.name,
    d.name AS department,
    co.section,
    at.name AS term,
    co.enrolled_count,
    co.capacity,
    ROUND(co.enrolled_count::DECIMAL / co.capacity * 100, 1) AS fill_percentage
FROM course_offerings co
JOIN courses c ON c.id = co.course_id
JOIN departments d ON d.id = c.department_id
JOIN academic_terms at ON at.id = co.term_id
WHERE co.is_active = TRUE
ORDER BY co.enrolled_count DESC, fill_percentage DESC
LIMIT 10;

-- ============================================================
-- Q3: Students who have NOT registered for ANY course
-- (in the current term)
-- Demonstrates: LEFT JOIN + IS NULL (anti-join), subquery
-- ============================================================
SELECT
    s.student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    u.email,
    s.current_year,
    d.name AS department
FROM students s
JOIN users u ON u.id = s.user_id
LEFT JOIN departments d ON d.id = s.department_id
WHERE s.is_active = TRUE
  AND NOT EXISTS (
      SELECT 1
      FROM enrollments e
      JOIN course_offerings co ON co.id = e.offering_id
      WHERE e.student_id = s.id
        AND co.term_id = (SELECT id FROM academic_terms WHERE is_current = TRUE)
        AND e.status = 'registered'
  )
ORDER BY s.student_id;

-- ============================================================
-- Q4: Courses with NO enrollments in the current term
-- Demonstrates: LEFT JOIN + IS NULL, filtering
-- ============================================================
SELECT
    c.code,
    c.name,
    co.section,
    d.name AS department,
    f.first_name || ' ' || f.last_name AS instructor,
    co.capacity
FROM course_offerings co
JOIN courses c ON c.id = co.course_id
JOIN departments d ON d.id = c.department_id
LEFT JOIN faculty f ON f.id = co.faculty_id
LEFT JOIN enrollments e ON e.offering_id = co.id AND e.status = 'registered'
WHERE co.term_id = (SELECT id FROM academic_terms WHERE is_current = TRUE)
  AND co.is_active = TRUE
GROUP BY c.code, c.name, co.section, d.name, f.first_name, f.last_name, co.capacity, co.id
HAVING COUNT(e.id) = 0
ORDER BY c.code;

-- ============================================================
-- Q5: Students who have completed ALL prerequisites for CS401
-- Demonstrates: EXISTS, NOT EXISTS, subquery, set logic
-- ============================================================
WITH prereqs AS (
    SELECT cp.prerequisite_id
    FROM course_prerequisites cp
    JOIN courses c ON c.id = cp.course_id
    WHERE c.code = 'CS401' AND cp.is_mandatory = TRUE
)
SELECT
    s.student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    s.current_year
FROM students s
WHERE s.is_active = TRUE
  AND NOT EXISTS (
      -- Find any prerequisite the student has NOT completed
      SELECT 1 FROM prereqs p
      WHERE NOT EXISTS (
          SELECT 1 FROM completed_courses cc
          WHERE cc.student_id = s.id
            AND cc.course_id = p.prerequisite_id
            AND cc.grade NOT IN ('F', 'W')
      )
  )
ORDER BY s.student_id;

-- ============================================================
-- Q6: Students approaching their credit limit (within 3 credits)
-- Demonstrates: Aggregate, HAVING, computed column
-- ============================================================
SELECT
    s.student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    s.max_credits,
    COALESCE(SUM(c.credits), 0) AS registered_credits,
    s.max_credits - COALESCE(SUM(c.credits), 0) AS remaining_credits
FROM students s
LEFT JOIN enrollments e ON e.student_id = s.id AND e.status = 'registered'
LEFT JOIN course_offerings co ON co.id = e.offering_id
    AND co.term_id = (SELECT id FROM academic_terms WHERE is_current = TRUE)
LEFT JOIN courses c ON c.id = co.course_id
WHERE s.is_active = TRUE
GROUP BY s.id, s.student_id, s.first_name, s.last_name, s.max_credits
HAVING (s.max_credits - COALESCE(SUM(c.credits), 0)) <= 3
ORDER BY remaining_credits ASC;

-- ============================================================
-- Q7: Courses with available seats in current term
-- Demonstrates: Computed column, WHERE, ORDER BY
-- ============================================================
SELECT
    c.code,
    c.name,
    d.name AS department,
    f.first_name || ' ' || f.last_name AS instructor,
    co.capacity,
    co.enrolled_count,
    co.capacity - co.enrolled_count AS available_seats,
    co.waitlist_count
FROM course_offerings co
JOIN courses c ON c.id = co.course_id
JOIN departments d ON d.id = c.department_id
LEFT JOIN faculty f ON f.id = co.faculty_id
WHERE co.term_id = (SELECT id FROM academic_terms WHERE is_current = TRUE)
  AND co.status = 'open'
  AND co.enrolled_count < co.capacity
ORDER BY available_seats DESC;

-- ============================================================
-- Q8: Faculty teaching the highest number of students
-- Demonstrates: JOIN, GROUP BY, ORDER BY, aggregate
-- ============================================================
SELECT
    f.faculty_id,
    f.first_name || ' ' || f.last_name AS faculty_name,
    d.name AS department,
    COUNT(DISTINCT co.id) AS courses_teaching,
    SUM(co.enrolled_count) AS total_students_teaching,
    ROUND(AVG(co.enrolled_count::DECIMAL / co.capacity * 100), 1) AS avg_fill_pct
FROM faculty f
JOIN course_offerings co ON co.faculty_id = f.id
    AND co.term_id = (SELECT id FROM academic_terms WHERE is_current = TRUE)
JOIN departments d ON d.id = f.department_id
GROUP BY f.id, f.faculty_id, f.first_name, f.last_name, d.name
ORDER BY total_students_teaching DESC;

-- ============================================================
-- Q9: Department-wise enrollment statistics
-- Demonstrates: CTE, GROUP BY, aggregate, ROLLUP
-- ============================================================
WITH dept_stats AS (
    SELECT
        d.id AS dept_id,
        d.name AS department,
        COUNT(DISTINCT co.id) AS offerings,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'registered') AS total_enrollments,
        SUM(co.capacity) AS total_capacity,
        ROUND(
            SUM(co.enrolled_count)::DECIMAL / NULLIF(SUM(co.capacity), 0) * 100, 1
        ) AS fill_rate_pct,
        COUNT(DISTINCT s.id) AS unique_students
    FROM departments d
    JOIN courses c ON c.department_id = d.id
    JOIN course_offerings co ON co.course_id = c.id
        AND co.term_id = (SELECT id FROM academic_terms WHERE is_current = TRUE)
    LEFT JOIN enrollments e ON e.offering_id = co.id
    LEFT JOIN students s ON s.id = e.student_id AND e.status = 'registered'
    GROUP BY d.id, d.name
)
SELECT * FROM dept_stats
ORDER BY total_enrollments DESC;

-- ============================================================
-- Q10: Students with CONFLICTING schedules
-- Demonstrates: Self-join, time overlap detection, DISTINCT
-- ============================================================
SELECT DISTINCT
    s.student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    c1.code AS course1,
    c2.code AS course2,
    cs1.day_of_week,
    cs1.start_time AS course1_start,
    cs1.end_time AS course1_end,
    cs2.start_time AS course2_start,
    cs2.end_time AS course2_end
FROM enrollments e1
JOIN enrollments e2 ON e1.student_id = e2.student_id AND e1.offering_id < e2.offering_id
JOIN students s ON s.id = e1.student_id
JOIN course_offerings co1 ON co1.id = e1.offering_id
JOIN course_offerings co2 ON co2.id = e2.offering_id
JOIN courses c1 ON c1.id = co1.course_id
JOIN courses c2 ON c2.id = co2.course_id
JOIN course_schedules cs1 ON cs1.offering_id = co1.id
JOIN course_schedules cs2 ON cs2.offering_id = co2.id
WHERE e1.status = 'registered'
  AND e2.status = 'registered'
  AND cs1.day_of_week = cs2.day_of_week
  AND cs1.start_time < cs2.end_time
  AND cs1.end_time > cs2.start_time
ORDER BY s.student_id;

-- ============================================================
-- Q11: Courses with a waitlist
-- Demonstrates: HAVING, aggregate, JOIN
-- ============================================================
SELECT
    c.code,
    c.name,
    co.section,
    at.name AS term,
    co.capacity,
    co.enrolled_count,
    co.waitlist_count,
    -- Window function: rank by waitlist size
    RANK() OVER (ORDER BY co.waitlist_count DESC) AS demand_rank
FROM course_offerings co
JOIN courses c ON c.id = co.course_id
JOIN academic_terms at ON at.id = co.term_id
WHERE co.waitlist_count > 0
  AND co.is_active = TRUE
ORDER BY co.waitlist_count DESC;

-- ============================================================
-- Q12: Students who dropped courses in Fall 2026
-- Demonstrates: JOIN, date filtering, status filtering
-- ============================================================
SELECT
    s.student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    c.code AS course_code,
    c.name AS course_name,
    e.registered_at,
    e.dropped_at,
    e.drop_reason,
    EXTRACT(DAY FROM (e.dropped_at - e.registered_at)) AS days_before_drop
FROM enrollments e
JOIN students s ON s.id = e.student_id
JOIN course_offerings co ON co.id = e.offering_id
JOIN courses c ON c.id = co.course_id
JOIN academic_terms at ON at.id = co.term_id
WHERE at.term_code = 'FA2026'
  AND e.status = 'dropped'
ORDER BY e.dropped_at DESC;

-- ============================================================
-- Q13 BONUS: Window function — Running credit total per student
-- Demonstrates: Window functions, ORDER BY within partition
-- ============================================================
SELECT
    s.student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    c.code AS course_code,
    c.credits,
    SUM(c.credits) OVER (
        PARTITION BY s.id
        ORDER BY e.registered_at
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_credit_total,
    s.max_credits
FROM enrollments e
JOIN students s ON s.id = e.student_id
JOIN course_offerings co ON co.id = e.offering_id
JOIN courses c ON c.id = co.course_id
WHERE e.status = 'registered'
  AND co.term_id = (SELECT id FROM academic_terms WHERE is_current = TRUE)
ORDER BY s.student_id, e.registered_at;

-- ============================================================
-- Q14 BONUS: Registration audit trail with actor information
-- Demonstrates: JSONB operators, timestamp queries
-- ============================================================
SELECT
    ral.id,
    u.email AS actor_email,
    s.student_id AS affected_student,
    c.code AS course_code,
    ral.action,
    ral.status,
    ral.details,
    ral.created_at
FROM registration_audit_logs ral
LEFT JOIN users u ON u.id = ral.actor_user_id
LEFT JOIN students s ON s.id = ral.student_id
LEFT JOIN course_offerings co ON co.id = ral.offering_id
LEFT JOIN courses c ON c.id = co.course_id
ORDER BY ral.created_at DESC
LIMIT 50;

-- ============================================================
-- EXPLAIN ANALYZE demonstration
-- ============================================================

-- Before index: full scan
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM course_offerings
WHERE term_id = 6 AND status = 'open';

-- After index: index scan on idx_offerings_term_status
-- (Run same query above after indexes are created to compare plans)
