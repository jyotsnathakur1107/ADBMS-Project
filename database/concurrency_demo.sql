-- ============================================================
-- concurrency_demo.sql
-- Demonstrates ACID properties and concurrent registration safety
-- ============================================================

-- ============================================================
-- SCENARIO: CS201-C (offering_id=25) has exactly 1 seat left.
-- Two students attempt to register simultaneously.
-- Only ONE should succeed.
-- ============================================================

-- ============================================================
-- SESSION 1 (Student A trying to register)
-- ============================================================

-- Start transaction
BEGIN;

-- Lock the offering row FIRST (SELECT ... FOR UPDATE)
-- This blocks Session 2 from reading the same row with FOR UPDATE
SELECT id, enrolled_count, capacity
FROM course_offerings
WHERE id = 25
FOR UPDATE;
-- Session 2 is now BLOCKED here until Session 1 commits or rolls back

-- Simulate checking: is there space?
-- enrolled_count = 9, capacity = 10 → 1 seat available

-- Register student (assume student_id=1 for this demo)
INSERT INTO enrollments (student_id, offering_id, status)
VALUES (1, 25, 'registered')
ON CONFLICT (student_id, offering_id)
DO UPDATE SET status = 'registered', registered_at = NOW(), updated_at = NOW()
WHERE enrollments.status = 'dropped';

-- Increment count
UPDATE course_offerings
SET enrolled_count = enrolled_count + 1
WHERE id = 25;

-- COMMIT (Session 2 is now unblocked but will find 0 seats left)
COMMIT;

-- ============================================================
-- SESSION 2 (Student B trying to register, slightly later)
-- ============================================================

BEGIN;

-- This was BLOCKED by Session 1's FOR UPDATE
-- Now it proceeds and re-reads the row
SELECT id, enrolled_count, capacity
FROM course_offerings
WHERE id = 25
FOR UPDATE;

-- NOW: enrolled_count = 10, capacity = 10 → NO SEATS LEFT!
-- The function fn_register_student will detect this and ROLLBACK

-- Simulating what fn_register_student does:
DO $$
DECLARE
    v_enrolled INTEGER;
    v_capacity INTEGER;
BEGIN
    SELECT enrolled_count, capacity
    INTO v_enrolled, v_capacity
    FROM course_offerings WHERE id = 25;

    IF v_enrolled >= v_capacity THEN
        RAISE EXCEPTION 'No seats available. Race condition prevented by FOR UPDATE lock.';
    END IF;
END;
$$;

-- This exception causes the transaction to roll back automatically
-- Student B is NOT enrolled. They can join the waitlist instead.

ROLLBACK;

-- ============================================================
-- VERIFICATION: Check state after both transactions
-- ============================================================
SELECT
    co.id,
    c.code,
    co.enrolled_count,
    co.capacity,
    co.enrolled_count = co.capacity AS is_full
FROM course_offerings co
JOIN courses c ON c.id = co.course_id
WHERE co.id = 25;

-- Check enrollments: only Student A should be enrolled
SELECT e.student_id, e.status, e.registered_at
FROM enrollments e
WHERE e.offering_id = 25;

-- ============================================================
-- WHY NAIVE APPROACHES FAIL (Explanation)
-- ============================================================

/*
  WRONG APPROACH (Race Condition):
  ──────────────────────────────────
  Session 1: SELECT enrolled_count FROM course_offerings WHERE id=25; → 9 (space!)
  Session 2: SELECT enrolled_count FROM course_offerings WHERE id=25; → 9 (space!)
  Session 1: INSERT INTO enrollments ...
  Session 1: UPDATE course_offerings SET enrolled_count = 10 ...
  Session 2: INSERT INTO enrollments ...  ← ALSO SUCCEEDS! Capacity EXCEEDED.
  Session 2: UPDATE course_offerings SET enrolled_count = 11 ... ← VIOLATES CONSTRAINT

  CORRECT APPROACH (SELECT ... FOR UPDATE):
  ──────────────────────────────────────────
  Session 1: BEGIN; SELECT ... FOR UPDATE → acquires row lock
  Session 2: BEGIN; SELECT ... FOR UPDATE → BLOCKS (waits for Session 1)
  Session 1: Validates, inserts, updates. COMMIT. → releases lock
  Session 2: Resumes, re-reads enrolled_count=10=capacity → FAILS gracefully. ROLLBACK.

  This is the SERIALIZABLE behavior for a critical section.
  PostgreSQL's MVCC + row-level locking ensures only one transaction
  can modify the target row at a time when FOR UPDATE is used.
*/

-- ============================================================
-- ROLLBACK DEMONSTRATION (Failure Mid-Transaction)
-- ============================================================
BEGIN;

-- Step 1: Insert enrollment
INSERT INTO enrollments (student_id, offering_id, status)
VALUES (2, 1, 'registered')
ON CONFLICT (student_id, offering_id)
DO UPDATE SET status = 'registered', registered_at = NOW(), updated_at = NOW()
WHERE enrollments.status = 'dropped';

-- Step 2: Simulate a failure (e.g., credit limit exceeded)
-- At this point, nothing is committed yet
-- The application layer calls ROLLBACK

ROLLBACK;

-- Verify: Student 2's enrollment in offering 1 is NOT committed
SELECT * FROM enrollments WHERE student_id = 2 AND offering_id = 1;

-- ============================================================
-- ISOLATION LEVEL DEMONSTRATION
-- ============================================================
-- Default: READ COMMITTED
-- For registration: READ COMMITTED + FOR UPDATE is sufficient.
-- SERIALIZABLE would also work but has higher overhead.

-- Recommended for registration transactions:
-- SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
-- (combined with SELECT ... FOR UPDATE on the offering row)
