-- ============================================================
-- procedures.sql - Stored Procedures (PL/pgSQL with CALL)
-- Demonstrates differences from functions:
-- 1. Procedures support autonomous transaction control (COMMIT/ROLLBACK within body)
-- 2. Invoked via CALL instead of SELECT
-- 3. Designed for administrative batches and maintenance workflows
-- ============================================================

-- ============================================================
-- PROCEDURE 1: RECONCILE ENROLLMENT COUNTS
-- Audits and corrects any divergence between course_offerings.enrolled_count
-- and the actual count of 'registered' records in enrollments table.
-- Common in high-volume registration systems where concurrency race conditions
-- or unexpected server crashes may cause counter drift.
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_reconcile_enrollment_counts(
    p_term_id INTEGER DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    v_actual_enrolled INTEGER;
    v_actual_waitlist INTEGER;
    v_fixed_count INTEGER := 0;
BEGIN
    FOR r IN
        SELECT id, course_id, section, enrolled_count, waitlist_count
        FROM course_offerings
        WHERE (p_term_id IS NULL OR term_id = p_term_id)
          AND is_active = TRUE
        FOR UPDATE
    LOOP
        -- Count actual registered enrollments
        SELECT COUNT(*)
        INTO v_actual_enrolled
        FROM enrollments
        WHERE offering_id = r.id AND status = 'registered';

        -- Count actual waiting waitlist entries
        SELECT COUNT(*)
        INTO v_actual_waitlist
        FROM waitlist_entries
        WHERE offering_id = r.id AND status = 'waiting';

        -- If discrepancy exists, update and log
        IF r.enrolled_count <> v_actual_enrolled OR r.waitlist_count <> v_actual_waitlist THEN
            UPDATE course_offerings
            SET enrolled_count = v_actual_enrolled,
                waitlist_count = v_actual_waitlist,
                updated_at     = NOW()
            WHERE id = r.id;

            INSERT INTO registration_audit_logs
                (actor_user_id, offering_id, action, status, details)
            VALUES
                (NULL, r.id, 'reconcile_counts', 'success',
                 jsonb_build_object(
                     'old_enrolled', r.enrolled_count,
                     'new_enrolled', v_actual_enrolled,
                     'old_waitlist', r.waitlist_count,
                     'new_waitlist', v_actual_waitlist
                 ));

            v_fixed_count := v_fixed_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'Reconciliation completed. Fixed % offering discrepancies.', v_fixed_count;
END;
$$;

COMMENT ON PROCEDURE sp_reconcile_enrollment_counts IS
'Audits and repairs cached enrolled_count and waitlist_count columns against ground truth tables.';

-- ============================================================
-- PROCEDURE 2: BULK ENROLL COHORT
-- Enrolls all active students of a given department and academic year
-- into a designated core offering, respecting capacity limits.
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_bulk_enroll_cohort(
    p_department_id INTEGER,
    p_academic_year INTEGER,
    p_offering_id   INTEGER,
    p_admin_user_id INTEGER,
    INOUT p_success_count INTEGER DEFAULT 0,
    INOUT p_failure_count INTEGER DEFAULT 0
)
LANGUAGE plpgsql
AS $$
DECLARE
    s RECORD;
    v_reg_result VARCHAR;
    v_reg_message TEXT;
BEGIN
    p_success_count := 0;
    p_failure_count := 0;

    FOR s IN
        SELECT id
        FROM students
        WHERE department_id = p_department_id
          AND current_year  = p_academic_year
          AND is_active     = TRUE
        ORDER BY id
    LOOP
        -- Call the transactional registration function for each student
        SELECT result, message
        INTO v_reg_result, v_reg_message
        FROM fn_register_student(s.id, p_offering_id, p_admin_user_id);

        IF v_reg_result = 'success' THEN
            p_success_count := p_success_count + 1;
        ELSE
            p_failure_count := p_failure_count + 1;
            RAISE NOTICE 'Skipping student %: %', s.id, v_reg_message;
        END IF;
    END LOOP;

    RAISE NOTICE 'Cohort bulk enrollment finished: % succeeded, % failed.', p_success_count, p_failure_count;
END;
$$;

COMMENT ON PROCEDURE sp_bulk_enroll_cohort IS
'Batch enrolls an entire student cohort into a course section using the safe fn_register_student logic.';

-- ============================================================
-- PROCEDURE 3: ARCHIVE TERM ENROLLMENTS & FINALIZE TRANSCRIPTS
-- End-of-term batch process:
-- 1. Populates completed_courses transcript records for passing grades.
-- 2. Sets term is_current = FALSE.
-- 3. Marks all open offerings in this term as completed.
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_archive_term_enrollments(
    p_term_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_records_archived INTEGER := 0;
BEGIN
    -- Insert passing grades into permanent transcripts table
    INSERT INTO completed_courses (student_id, course_id, term_id, grade, credits_earned, completed_at)
    SELECT
        e.student_id,
        co.course_id,
        co.term_id,
        COALESCE(e.grade, 'P'),
        c.credits,
        CURRENT_DATE
    FROM enrollments e
    JOIN course_offerings co ON co.id = e.offering_id
    JOIN courses c           ON c.id  = co.course_id
    WHERE co.term_id = p_term_id
      AND e.status   = 'registered'
      AND (e.grade IS NULL OR e.grade NOT IN ('F', 'W'))
    ON CONFLICT (student_id, course_id, term_id) DO NOTHING;

    GET DIAGNOSTICS v_records_archived = ROW_COUNT;

    -- Update enrollment records to completed
    UPDATE enrollments e
    SET status     = 'completed',
        updated_at = NOW()
    FROM course_offerings co
    WHERE e.offering_id = co.id
      AND co.term_id    = p_term_id
      AND e.status      = 'registered';

    -- Mark offerings in term as completed
    UPDATE course_offerings
    SET status     = 'completed',
        updated_at = NOW()
    WHERE term_id = p_term_id;

    -- Deactivate current term status
    UPDATE academic_terms
    SET is_current = FALSE,
        updated_at = NOW()
    WHERE id = p_term_id;

    -- Expire any lingering waitlists for this term
    UPDATE waitlist_entries we
    SET status       = 'expired',
        withdrawn_at = NOW()
    FROM course_offerings co
    WHERE we.offering_id = co.id
      AND co.term_id     = p_term_id
      AND we.status      = 'waiting';

    RAISE NOTICE 'Term % archived successfully. % transcript records written.', p_term_id, v_records_archived;
END;
$$;

COMMENT ON PROCEDURE sp_archive_term_enrollments IS
'Closes an academic semester, moves active enrollments to completed_courses, and expires open waitlists.';

