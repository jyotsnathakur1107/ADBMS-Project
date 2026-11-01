-- ============================================================
-- indexes.sql - Strategic Index Definitions
-- ============================================================

-- ============================================================
-- USERS TABLE INDEXES
-- ============================================================
-- Fast login lookup by email (most frequent query)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role) WHERE is_active = TRUE;

-- ============================================================
-- STUDENTS TABLE INDEXES
-- ============================================================
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_department ON students(department_id) WHERE is_active = TRUE;
-- Composite: department + year for cohort queries
CREATE INDEX idx_students_dept_year ON students(department_id, current_year) WHERE is_active = TRUE;

-- ============================================================
-- FACULTY TABLE INDEXES
-- ============================================================
CREATE INDEX idx_faculty_user_id ON faculty(user_id);
CREATE INDEX idx_faculty_department ON faculty(department_id);

-- ============================================================
-- COURSES TABLE INDEXES
-- ============================================================
-- Text search on course name and code
CREATE INDEX idx_courses_code ON courses(code);
CREATE INDEX idx_courses_department ON courses(department_id) WHERE is_active = TRUE;
CREATE INDEX idx_courses_category ON courses(category) WHERE is_active = TRUE;
-- Full-text search index on name + description
CREATE INDEX idx_courses_fts ON courses USING GIN (
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- ============================================================
-- COURSE OFFERINGS TABLE INDEXES
-- ============================================================
-- Most common lookup: offerings by term
CREATE INDEX idx_offerings_term ON course_offerings(term_id) WHERE is_active = TRUE;
-- Offerings by course
CREATE INDEX idx_offerings_course ON course_offerings(course_id);
-- Offerings by faculty (for faculty dashboard)
CREATE INDEX idx_offerings_faculty ON course_offerings(faculty_id) WHERE is_active = TRUE;
-- Composite for course catalog: term + status
CREATE INDEX idx_offerings_term_status ON course_offerings(term_id, status) WHERE is_active = TRUE;
-- Partial index: offerings with available seats (very useful for registration)
CREATE INDEX idx_offerings_available ON course_offerings(term_id, enrolled_count, capacity)
    WHERE status = 'open' AND is_active = TRUE;

-- ============================================================
-- COURSE SCHEDULES TABLE INDEXES
-- ============================================================
CREATE INDEX idx_schedules_offering ON course_schedules(offering_id);
-- Conflict detection: day + time overlap queries
CREATE INDEX idx_schedules_day_time ON course_schedules(day_of_week, start_time, end_time);

-- ============================================================
-- ENROLLMENTS TABLE INDEXES
-- ============================================================
-- Student's current enrollments (most common query)
CREATE INDEX idx_enrollments_student ON enrollments(student_id, status);
-- Offering's enrolled students
CREATE INDEX idx_enrollments_offering ON enrollments(offering_id, status);
-- Active enrollments only (partial index saves space and speeds active queries)
CREATE INDEX idx_enrollments_active ON enrollments(student_id)
    WHERE status = 'registered';
-- Registration timestamp for history
CREATE INDEX idx_enrollments_registered_at ON enrollments(registered_at DESC);

-- ============================================================
-- WAITLIST ENTRIES TABLE INDEXES
-- ============================================================
-- Waitlist per offering, ordered by position (critical for fair promotion)
CREATE INDEX idx_waitlist_offering_position ON waitlist_entries(offering_id, position)
    WHERE status = 'waiting';
-- Student's waitlist entries
CREATE INDEX idx_waitlist_student ON waitlist_entries(student_id, status);

-- ============================================================
-- REGISTRATION PERIODS TABLE INDEXES
-- ============================================================
CREATE INDEX idx_reg_periods_term ON registration_periods(term_id) WHERE is_active = TRUE;
-- Time-based lookup for "is registration open now?"
CREATE INDEX idx_reg_periods_dates ON registration_periods(start_datetime, end_datetime)
    WHERE is_active = TRUE;

-- ============================================================
-- AUDIT LOGS TABLE INDEXES
-- ============================================================
CREATE INDEX idx_audit_student ON registration_audit_logs(student_id, created_at DESC);
CREATE INDEX idx_audit_offering ON registration_audit_logs(offering_id);
CREATE INDEX idx_audit_actor ON registration_audit_logs(actor_user_id);
CREATE INDEX idx_audit_action ON registration_audit_logs(action, created_at DESC);

-- ============================================================
-- NOTIFICATIONS TABLE INDEXES
-- ============================================================
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- COMPLETED COURSES TABLE INDEXES
-- ============================================================
CREATE INDEX idx_completed_student ON completed_courses(student_id);
CREATE INDEX idx_completed_course ON completed_courses(course_id);

-- ============================================================
-- QUERY OPTIMIZATION NOTES
-- ============================================================
-- Partial indexes (WHERE clause) are used for:
--   - Active records only (avoids scanning inactive/deleted rows)
--   - Open/available offerings (narrows registration queries significantly)
--   - Active enrollments (reduces index size by excluding historical records)
--
-- GIN index on courses supports full-text search queries like:
--   SELECT * FROM courses WHERE to_tsvector('english', name) @@ plainto_tsquery('english', 'database');
--
-- Trade-off awareness:
--   Each index adds overhead to INSERT/UPDATE/DELETE operations.
--   The idx_courses_fts GIN index is expensive to maintain but essential for search.
--   Partial indexes minimize this overhead by only indexing relevant rows.
