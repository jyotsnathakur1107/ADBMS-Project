-- ============================================================
-- functions.sql - PL/pgSQL Functions and Procedures
-- ============================================================

-- ============================================================
-- 1. CHECK PREREQUISITES
-- Returns true if a student has completed all mandatory prereqs
-- for a given course. Uses completed_courses table.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_student_meets_prerequisites(
    p_student_id  INTEGER,
    p_course_id   INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_unmet_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_unmet_count
    FROM course_prerequisites cp
    WHERE cp.course_id = p_course_id
      AND cp.is_mandatory = TRUE
      AND NOT EXISTS (
          SELECT 1
          FROM completed_courses cc
          WHERE cc.student_id = p_student_id
            AND cc.course_id  = cp.prerequisite_id
            AND cc.grade NOT IN ('F', 'W')   -- Only passing grades count
      );

    RETURN v_unmet_count = 0;
END;
$$;

COMMENT ON FUNCTION fn_student_meets_prerequisites IS
'Returns TRUE if the student has completed all mandatory prerequisites for the given course.';

-- ============================================================
-- 2. GET STUDENT REGISTERED CREDITS
-- Calculates total credits currently registered for active term
-- ============================================================
CREATE OR REPLACE FUNCTION fn_get_student_registered_credits(
    p_student_id  INTEGER,
    p_term_id     INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_credits INTEGER;
BEGIN
    SELECT COALESCE(SUM(c.credits), 0)
    INTO v_total_credits
    FROM enrollments e
    JOIN course_offerings co ON co.id = e.offering_id
    JOIN courses c ON c.id = co.course_id
    WHERE e.student_id = p_student_id
      AND co.term_id   = p_term_id
      AND e.status     = 'registered';

    RETURN v_total_credits;
END;
$$;

-- ============================================================
-- 3. GET AVAILABLE SEATS FOR AN OFFERING
-- ============================================================
CREATE OR REPLACE FUNCTION fn_get_available_seats(
    p_offering_id INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_seats INTEGER;
BEGIN
    SELECT capacity - enrolled_count
    INTO v_seats
    FROM course_offerings
    WHERE id = p_offering_id;

    RETURN COALESCE(v_seats, 0);
END;
$$;

-- ============================================================
-- 4. CHECK SCHEDULE CONFLICT
-- Returns TRUE if the student has a time conflict with an offering
-- ============================================================
CREATE OR REPLACE FUNCTION fn_has_schedule_conflict(
    p_student_id  INTEGER,
    p_offering_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_conflict_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_conflict_count
    FROM enrollments e
    JOIN course_offerings co   ON co.id = e.offering_id
    JOIN course_schedules cs1  ON cs1.offering_id = co.id
    JOIN course_schedules cs2  ON cs2.offering_id = p_offering_id
    WHERE e.student_id = p_student_id
      AND e.status     = 'registered'
      AND e.offering_id <> p_offering_id
      AND cs1.day_of_week = cs2.day_of_week
      -- Overlap condition: (start1 < end2) AND (end1 > start2)
      AND cs1.start_time < cs2.end_time
      AND cs1.end_time   > cs2.start_time;

    RETURN v_conflict_count > 0;
END;
$$;

-- ============================================================
-- 5. CHECK REGISTRATION PERIOD IS OPEN
-- Returns TRUE if there is an active, open registration period
-- for the given term and student year
-- ============================================================
CREATE OR REPLACE FUNCTION fn_is_registration_open(
    p_term_id      INTEGER,
    p_student_year INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM registration_periods
    WHERE term_id          = p_term_id
      AND is_active        = TRUE
      AND start_datetime  <= NOW()
      AND end_datetime    >= NOW()
      AND p_student_year  = ANY(eligible_years);

    RETURN v_count > 0;
END;
$$;

-- ============================================================
-- 6. GET NEXT WAITLIST POSITION
-- Returns the next available position for a given offering
-- ============================================================
CREATE OR REPLACE FUNCTION fn_get_next_waitlist_position(
    p_offering_id INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_max_pos INTEGER;
BEGIN
    SELECT COALESCE(MAX(position), 0) + 1
    INTO v_max_pos
    FROM waitlist_entries
    WHERE offering_id = p_offering_id
      AND status      = 'waiting';

    RETURN v_max_pos;
END;
$$;

-- ============================================================
-- 7. MAIN REGISTRATION FUNCTION (Transactional)
-- This is the core registration logic enforced at DB level.
-- Returns: ('success', null) or ('failure', 'error reason')
-- ============================================================
CREATE OR REPLACE FUNCTION fn_register_student(
    p_student_id  INTEGER,
    p_offering_id INTEGER,
    p_actor_id    INTEGER  -- user_id of who is performing the action
)
RETURNS TABLE(result VARCHAR, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_student         RECORD;
    v_offering        RECORD;
    v_term            RECORD;
    v_registered_credits INTEGER;
    v_course_credits  INTEGER;
BEGIN
    -- Lock the offering row to prevent concurrent race conditions
    SELECT co.*, c.credits AS course_credits, c.id AS course_id
    INTO v_offering
    FROM course_offerings co
    JOIN courses c ON c.id = co.course_id
    WHERE co.id = p_offering_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'failure'::VARCHAR, 'Course offering not found.'::TEXT;
        RETURN;
    END IF;

    -- Load student
    SELECT * INTO v_student FROM students WHERE id = p_student_id;
    IF NOT FOUND OR NOT v_student.is_active THEN
        RETURN QUERY SELECT 'failure'::VARCHAR, 'Student not found or inactive.'::TEXT;
        RETURN;
    END IF;

    -- Load term
    SELECT * INTO v_term FROM academic_terms WHERE id = v_offering.term_id;

    -- Check offering status
    IF v_offering.status NOT IN ('open') THEN
        RETURN QUERY SELECT 'failure'::VARCHAR,
            ('Course offering is ' || v_offering.status || ' and not available for registration.')::TEXT;
        RETURN;
    END IF;

    -- Check registration period
    IF NOT fn_is_registration_open(v_offering.term_id, v_student.current_year) THEN
        RETURN QUERY SELECT 'failure'::VARCHAR,
            'Registration is not currently open for your year/term.'::TEXT;
        RETURN;
    END IF;

    -- Check duplicate enrollment
    IF EXISTS (
        SELECT 1 FROM enrollments
        WHERE student_id = p_student_id
          AND offering_id = p_offering_id
          AND status = 'registered'
    ) THEN
        RETURN QUERY SELECT 'failure'::VARCHAR,
            'You are already registered for this course.'::TEXT;
        RETURN;
    END IF;

    -- Check prerequisites
    IF NOT fn_student_meets_prerequisites(p_student_id, v_offering.course_id) THEN
        RETURN QUERY SELECT 'failure'::VARCHAR,
            'You have not completed the required prerequisites for this course.'::TEXT;
        RETURN;
    END IF;

    -- Check credit limit
    v_registered_credits := fn_get_student_registered_credits(p_student_id, v_offering.term_id);
    IF (v_registered_credits + v_offering.course_credits) > v_student.max_credits THEN
        RETURN QUERY SELECT 'failure'::VARCHAR,
            ('Adding this course would exceed your credit limit of ' || v_student.max_credits ||
             '. You currently have ' || v_registered_credits || ' credits.')::TEXT;
        RETURN;
    END IF;

    -- Check schedule conflict
    IF fn_has_schedule_conflict(p_student_id, p_offering_id) THEN
        RETURN QUERY SELECT 'failure'::VARCHAR,
            'This course conflicts with your current schedule.'::TEXT;
        RETURN;
    END IF;

    -- Check seat availability
    IF v_offering.enrolled_count >= v_offering.capacity THEN
        RETURN QUERY SELECT 'failure'::VARCHAR,
            'No seats available. You may join the waitlist.'::TEXT;
        RETURN;
    END IF;

    -- All checks passed — INSERT enrollment (or re-activate dropped enrollment)
    INSERT INTO enrollments (student_id, offering_id, status, registered_at)
    VALUES (p_student_id, p_offering_id, 'registered', NOW())
    ON CONFLICT (student_id, offering_id)
    DO UPDATE SET
        status      = 'registered',
        dropped_at  = NULL,
        drop_reason = NULL,
        registered_at = NOW(),
        updated_at  = NOW()
    WHERE enrollments.status IN ('dropped', 'withdrawn');

    -- Update enrolled count (trigger also does this, kept for safety)
    UPDATE course_offerings
    SET enrolled_count = enrolled_count + 1,
        updated_at     = NOW()
    WHERE id = p_offering_id;

    -- Audit log
    INSERT INTO registration_audit_logs
        (actor_user_id, student_id, offering_id, action, status, details)
    VALUES
        (p_actor_id, p_student_id, p_offering_id, 'register', 'success',
         jsonb_build_object('course_credits', v_offering.course_credits,
                            'registered_credits_before', v_registered_credits));

    RETURN QUERY SELECT 'success'::VARCHAR, 'Successfully registered for the course.'::TEXT;
END;
$$;

-- ============================================================
-- 8. DROP ENROLLMENT FUNCTION (Transactional)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_drop_enrollment(
    p_student_id  INTEGER,
    p_offering_id INTEGER,
    p_reason      TEXT,
    p_actor_id    INTEGER
)
RETURNS TABLE(result VARCHAR, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_enrollment  RECORD;
    v_offering    RECORD;
BEGIN
    -- Lock enrollment row
    SELECT * INTO v_enrollment
    FROM enrollments
    WHERE student_id  = p_student_id
      AND offering_id = p_offering_id
      AND status      = 'registered'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'failure'::VARCHAR,
            'No active registration found for this course.'::TEXT;
        RETURN;
    END IF;

    -- Lock the offering row
    SELECT * INTO v_offering
    FROM course_offerings
    WHERE id = p_offering_id
    FOR UPDATE;

    -- Soft-drop: update status, never delete
    UPDATE enrollments
    SET status      = 'dropped',
        dropped_at  = NOW(),
        drop_reason = p_reason,
        updated_at  = NOW()
    WHERE id = v_enrollment.id;

    -- Decrement enrolled count
    UPDATE course_offerings
    SET enrolled_count = GREATEST(enrolled_count - 1, 0),
        updated_at     = NOW()
    WHERE id = p_offering_id;

    -- Audit log
    INSERT INTO registration_audit_logs
        (actor_user_id, student_id, offering_id, action, status, details)
    VALUES
        (p_actor_id, p_student_id, p_offering_id, 'drop', 'success',
         jsonb_build_object('reason', p_reason, 'dropped_at', NOW()));

    -- Promote next waitlisted student
    PERFORM fn_promote_waitlist(p_offering_id);

    RETURN QUERY SELECT 'success'::VARCHAR, 'Course dropped successfully.'::TEXT;
END;
$$;

-- ============================================================
-- 9. JOIN WAITLIST FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION fn_join_waitlist(
    p_student_id  INTEGER,
    p_offering_id INTEGER,
    p_actor_id    INTEGER
)
RETURNS TABLE(result VARCHAR, message TEXT, "position" INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    v_offering    RECORD;
    v_student     RECORD;
    v_position    INTEGER;
BEGIN
    -- Lock offering
    SELECT * INTO v_offering
    FROM course_offerings
    WHERE id = p_offering_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'failure'::VARCHAR, 'Offering not found.'::TEXT, 0::INTEGER;
        RETURN;
    END IF;

    SELECT * INTO v_student FROM students WHERE id = p_student_id;

    -- Check registration period
    IF NOT fn_is_registration_open(v_offering.term_id, v_student.current_year) THEN
        RETURN QUERY SELECT 'failure'::VARCHAR,
            'Registration period is not open.'::TEXT, 0::INTEGER;
        RETURN;
    END IF;

    -- Check not already enrolled
    IF EXISTS (
        SELECT 1 FROM enrollments
        WHERE student_id = p_student_id AND offering_id = p_offering_id AND status = 'registered'
    ) THEN
        RETURN QUERY SELECT 'failure'::VARCHAR,
            'You are already registered for this course.'::TEXT, 0::INTEGER;
        RETURN;
    END IF;

    -- Check not already on waitlist
    IF EXISTS (
        SELECT 1 FROM waitlist_entries
        WHERE student_id = p_student_id AND offering_id = p_offering_id AND status = 'waiting'
    ) THEN
        RETURN QUERY SELECT 'failure'::VARCHAR,
            'You are already on the waitlist for this course.'::TEXT, 0::INTEGER;
        RETURN;
    END IF;

    -- Check prerequisites
    IF NOT fn_student_meets_prerequisites(p_student_id, v_offering.course_id) THEN
        RETURN QUERY SELECT 'failure'::VARCHAR,
            'Prerequisites not met.'::TEXT, 0::INTEGER;
        RETURN;
    END IF;

    -- Get next position
    v_position := fn_get_next_waitlist_position(p_offering_id);

    -- Insert waitlist entry
    INSERT INTO waitlist_entries (student_id, offering_id, position, status)
    VALUES (p_student_id, p_offering_id, v_position, 'waiting');

    -- Update waitlist count
    UPDATE course_offerings
    SET waitlist_count = waitlist_count + 1
    WHERE id = p_offering_id;

    -- Audit log
    INSERT INTO registration_audit_logs
        (actor_user_id, student_id, offering_id, action, status, details)
    VALUES
        (p_actor_id, p_student_id, p_offering_id, 'waitlist_join', 'success',
         jsonb_build_object('position', v_position));

    RETURN QUERY SELECT 'success'::VARCHAR,
        ('Added to waitlist at position ' || v_position)::TEXT, v_position::INTEGER;
END;
$$;

-- ============================================================
-- 10. PROMOTE WAITLIST (Called after a drop)
-- Promotes the first eligible waiting student to enrolled
-- ============================================================
CREATE OR REPLACE FUNCTION fn_promote_waitlist(
    p_offering_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_offering  RECORD;
    v_entry     RECORD;
    v_student   RECORD;
BEGIN
    -- Check if there's room
    SELECT * INTO v_offering
    FROM course_offerings
    WHERE id = p_offering_id
    FOR UPDATE;

    IF v_offering.enrolled_count >= v_offering.capacity THEN
        RETURN;  -- No room yet
    END IF;

    -- Get the first waiting entry
    SELECT we.* INTO v_entry
    FROM waitlist_entries we
    WHERE we.offering_id = p_offering_id
      AND we.status      = 'waiting'
    ORDER BY we.position ASC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;  -- No one waiting
    END IF;

    SELECT * INTO v_student FROM students WHERE id = v_entry.student_id;

    -- Re-validate eligibility before promoting
    IF NOT fn_has_schedule_conflict(v_entry.student_id, p_offering_id)
       AND fn_student_meets_prerequisites(v_entry.student_id, v_offering.course_id)
    THEN
        -- Enroll the student
        INSERT INTO enrollments (student_id, offering_id, status, registered_at)
        VALUES (v_entry.student_id, p_offering_id, 'registered', NOW())
        ON CONFLICT (student_id, offering_id)
        DO UPDATE SET status = 'registered', dropped_at = NULL, registered_at = NOW(), updated_at = NOW();

        -- Update counts
        UPDATE course_offerings
        SET enrolled_count = enrolled_count + 1,
            waitlist_count = GREATEST(waitlist_count - 1, 0)
        WHERE id = p_offering_id;

        -- Update waitlist entry
        UPDATE waitlist_entries
        SET status = 'promoted', promoted_at = NOW()
        WHERE id = v_entry.id;

        -- Notify the student
        INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
        SELECT v_student.user_id,
               'Waitlist Promotion!',
               'Great news! A seat opened up and you have been enrolled in the course.',
               'success',
               p_offering_id,
               'offering';

        -- Audit
        INSERT INTO registration_audit_logs
            (actor_user_id, student_id, offering_id, action, status, details)
        VALUES
            (NULL, v_entry.student_id, p_offering_id, 'waitlist_promote', 'success',
             jsonb_build_object('waitlist_position', v_entry.position));
    ELSE
        -- Skip this student (conflict/prereq issue), mark withdrawn and try next
        UPDATE waitlist_entries
        SET status = 'withdrawn', withdrawn_at = NOW()
        WHERE id = v_entry.id;

        UPDATE course_offerings
        SET waitlist_count = GREATEST(waitlist_count - 1, 0)
        WHERE id = p_offering_id;

        -- Recurse to try the next student
        PERFORM fn_promote_waitlist(p_offering_id);
    END IF;
END;
$$;

COMMENT ON FUNCTION fn_promote_waitlist IS
'Promotes the next eligible waitlisted student when a seat opens up. Handles eligibility re-validation.';
