-- ============================================================
-- Course Registration and Academic Management System
-- schema.sql - Complete Database Schema
-- ============================================================

-- Drop existing schema cleanly (for development resets)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS (Authentication credentials, separate from profiles)
-- ============================================================
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login    TIMESTAMPTZ
);

-- ============================================================
-- 2. DEPARTMENTS
-- ============================================================
CREATE TABLE departments (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(10)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    head_name   VARCHAR(100),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. STUDENTS (Profile data, references users)
-- ============================================================
CREATE TABLE students (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER      NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    student_id      VARCHAR(20)  NOT NULL UNIQUE,  -- e.g., "STU2024001"
    first_name      VARCHAR(50)  NOT NULL,
    last_name       VARCHAR(50)  NOT NULL,
    date_of_birth   DATE,
    gender          VARCHAR(10)  CHECK (gender IN ('male', 'female', 'other')),
    phone           VARCHAR(20),
    address         TEXT,
    department_id   INTEGER      REFERENCES departments(id) ON DELETE SET NULL,
    enrollment_year INTEGER      NOT NULL,
    current_year    INTEGER      NOT NULL DEFAULT 1 CHECK (current_year BETWEEN 1 AND 6),
    gpa             NUMERIC(3,2) CHECK (gpa BETWEEN 0.0 AND 4.0),
    max_credits     INTEGER      NOT NULL DEFAULT 18,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. FACULTY (Profile data, references users)
-- ============================================================
CREATE TABLE faculty (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER      NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    faculty_id      VARCHAR(20)  NOT NULL UNIQUE,  -- e.g., "FAC001"
    first_name      VARCHAR(50)  NOT NULL,
    last_name       VARCHAR(50)  NOT NULL,
    department_id   INTEGER      REFERENCES departments(id) ON DELETE SET NULL,
    designation     VARCHAR(100),
    phone           VARCHAR(20),
    office          VARCHAR(50),
    specialization  TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. ACADEMIC TERMS (Semesters)
-- ============================================================
CREATE TABLE academic_terms (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50)  NOT NULL UNIQUE,  -- e.g., "Fall 2024"
    term_code       VARCHAR(20)  NOT NULL UNIQUE,  -- e.g., "FA2024"
    start_date      DATE         NOT NULL,
    end_date        DATE         NOT NULL,
    is_current      BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_term_dates CHECK (end_date > start_date)
);

-- ============================================================
-- 6. REGISTRATION PERIODS
-- ============================================================
CREATE TABLE registration_periods (
    id              SERIAL PRIMARY KEY,
    term_id         INTEGER      NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    start_datetime  TIMESTAMPTZ  NOT NULL,
    end_datetime    TIMESTAMPTZ  NOT NULL,
    eligible_years  INTEGER[]    DEFAULT '{1,2,3,4,5,6}',  -- which student years can register
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_reg_period_dates CHECK (end_datetime > start_datetime)
);

-- ============================================================
-- 7. COURSES (Course definitions, term-independent)
-- ============================================================
CREATE TABLE courses (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(20)  NOT NULL UNIQUE,   -- e.g., "CS301"
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    department_id   INTEGER      NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    credits         INTEGER      NOT NULL CHECK (credits BETWEEN 1 AND 6),
    course_level    INTEGER      NOT NULL DEFAULT 100 CHECK (course_level IN (100,200,300,400,500,600)),
    category        VARCHAR(50)  CHECK (category IN ('core', 'elective', 'lab', 'seminar', 'project')),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. COURSE PREREQUISITES (Self-referencing M2M)
-- ============================================================
CREATE TABLE course_prerequisites (
    course_id       INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    prerequisite_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    is_mandatory    BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (course_id, prerequisite_id),
    CONSTRAINT chk_no_self_prereq CHECK (course_id <> prerequisite_id)
);

-- ============================================================
-- 9. COURSE OFFERINGS (Term-specific instances of courses)
-- ============================================================
CREATE TABLE course_offerings (
    id              SERIAL PRIMARY KEY,
    course_id       INTEGER      NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    term_id         INTEGER      NOT NULL REFERENCES academic_terms(id) ON DELETE RESTRICT,
    faculty_id      INTEGER      REFERENCES faculty(id) ON DELETE SET NULL,
    section         VARCHAR(10)  NOT NULL DEFAULT 'A',
    room            VARCHAR(50),
    capacity        INTEGER      NOT NULL CHECK (capacity > 0),
    enrolled_count  INTEGER      NOT NULL DEFAULT 0 CHECK (enrolled_count >= 0),
    waitlist_count  INTEGER      NOT NULL DEFAULT 0 CHECK (waitlist_count >= 0),
    status          VARCHAR(20)  NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','cancelled','completed')),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (course_id, term_id, section),
    CONSTRAINT chk_enrolled_lte_capacity CHECK (enrolled_count <= capacity)
);

-- ============================================================
-- 10. COURSE SCHEDULES (Days/Times for each offering)
-- ============================================================
CREATE TABLE course_schedules (
    id              SERIAL PRIMARY KEY,
    offering_id     INTEGER      NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    day_of_week     VARCHAR(10)  NOT NULL CHECK (day_of_week IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
    start_time      TIME         NOT NULL,
    end_time        TIME         NOT NULL,
    room            VARCHAR(50),
    CONSTRAINT chk_schedule_times CHECK (end_time > start_time)
);

-- ============================================================
-- 11. ENROLLMENTS (Student course registrations)
-- ============================================================
CREATE TABLE enrollments (
    id              SERIAL PRIMARY KEY,
    student_id      INTEGER      NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    offering_id     INTEGER      NOT NULL REFERENCES course_offerings(id) ON DELETE RESTRICT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'registered'
                                CHECK (status IN ('registered','dropped','completed','failed','withdrawn')),
    grade           VARCHAR(5)   CHECK (grade IN ('A+','A','A-','B+','B','B-','C+','C','C-','D','F','W','I')),
    registered_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    dropped_at      TIMESTAMPTZ,
    drop_reason     TEXT,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, offering_id)
);

-- ============================================================
-- 12. WAITLIST ENTRIES
-- ============================================================
CREATE TABLE waitlist_entries (
    id              SERIAL PRIMARY KEY,
    student_id      INTEGER      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    offering_id     INTEGER      NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    position        INTEGER      NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'waiting'
                                CHECK (status IN ('waiting','promoted','withdrawn','expired')),
    joined_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    promoted_at     TIMESTAMPTZ,
    withdrawn_at    TIMESTAMPTZ,
    UNIQUE (student_id, offering_id),
    CONSTRAINT chk_waitlist_position CHECK (position > 0)
);

-- ============================================================
-- 13. COMPLETED COURSES (Academic history / transcript)
-- ============================================================
CREATE TABLE completed_courses (
    id              SERIAL PRIMARY KEY,
    student_id      INTEGER      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id       INTEGER      NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    term_id         INTEGER      NOT NULL REFERENCES academic_terms(id) ON DELETE RESTRICT,
    grade           VARCHAR(5)   NOT NULL CHECK (grade IN ('A+','A','A-','B+','B','B-','C+','C','C-','D','F','W')),
    credits_earned  INTEGER      NOT NULL,
    completed_at    DATE         NOT NULL,
    UNIQUE (student_id, course_id, term_id)
);

-- ============================================================
-- 14. REGISTRATION AUDIT LOGS
-- ============================================================
CREATE TABLE registration_audit_logs (
    id              SERIAL PRIMARY KEY,
    actor_user_id   INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    student_id      INTEGER      REFERENCES students(id) ON DELETE SET NULL,
    offering_id     INTEGER      REFERENCES course_offerings(id) ON DELETE SET NULL,
    action          VARCHAR(50)  NOT NULL,
    -- e.g., 'register','drop','waitlist_join','waitlist_promote','admin_enroll','admin_drop'
    status          VARCHAR(20)  NOT NULL CHECK (status IN ('success','failure')),
    details         JSONB,       -- before/after values, error messages, etc.
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 15. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    message         TEXT         NOT NULL,
    type            VARCHAR(30)  NOT NULL DEFAULT 'info'
                                CHECK (type IN ('info','success','warning','error')),
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    related_id      INTEGER,     -- optional: offering_id or enrollment_id for deep-links
    related_type    VARCHAR(50), -- e.g., 'enrollment', 'waitlist'
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMMENTS for documentation
-- ============================================================
COMMENT ON TABLE users               IS 'Authentication credentials. Separate from profile data to support 3NF.';
COMMENT ON TABLE students            IS 'Student academic profile linked to a user account.';
COMMENT ON TABLE faculty             IS 'Faculty profile linked to a user account.';
COMMENT ON TABLE departments         IS 'Academic departments (e.g., Computer Science, Mathematics).';
COMMENT ON TABLE academic_terms      IS 'Semester definitions (e.g., Fall 2024, Spring 2025).';
COMMENT ON TABLE registration_periods IS 'Windows during which students may register for courses.';
COMMENT ON TABLE courses             IS 'Course definitions independent of semester.';
COMMENT ON TABLE course_prerequisites IS 'Many-to-many self-join on courses for prerequisite relationships.';
COMMENT ON TABLE course_offerings    IS 'Term-specific offering of a course with section, faculty, and capacity.';
COMMENT ON TABLE course_schedules    IS 'Day/time slots for each course offering. Multiple rows per offering.';
COMMENT ON TABLE enrollments         IS 'Student registrations. Soft-deleted (status changed, never hard-deleted).';
COMMENT ON TABLE waitlist_entries    IS 'Ordered waitlist per offering. Position maintained for fair promotion.';
COMMENT ON TABLE completed_courses   IS 'Permanent academic transcript records.';
COMMENT ON TABLE registration_audit_logs IS 'Immutable audit trail of all registration operations.';
COMMENT ON TABLE notifications       IS 'In-app notifications for students and faculty.';
