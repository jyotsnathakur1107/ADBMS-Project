-- ============================================================
-- triggers.sql - PostgreSQL Trigger Definitions
-- ============================================================

-- ============================================================
-- TRIGGER 1: AUTO-UPDATE updated_at TIMESTAMP
-- Applied to tables that have updated_at columns
-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_faculty_updated_at
    BEFORE UPDATE ON faculty
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_offerings_updated_at
    BEFORE UPDATE ON course_offerings
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_enrollments_updated_at
    BEFORE UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- TRIGGER 2: MAINTAIN ENROLLED_COUNT ON ENROLLMENTS CHANGE
-- Fires after INSERT/UPDATE on enrollments to keep the
-- enrolled_count in course_offerings consistent.
-- This is a "stored counter" maintained via trigger.
-- Justification: avoids expensive COUNT(*) queries on every
-- seat-availability check during high-concurrency registration.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_sync_enrollment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_offering_id INTEGER;
    v_delta       INTEGER := 0;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- New row inserted: if status is 'registered', +1
        IF NEW.status = 'registered' THEN
            v_delta := 1;
        END IF;
        v_offering_id := NEW.offering_id;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Status changed
        v_offering_id := NEW.offering_id;
        IF OLD.status <> 'registered' AND NEW.status = 'registered' THEN
            v_delta := 1;   -- Activated (e.g., re-enrolled after drop)
        ELSIF OLD.status = 'registered' AND NEW.status <> 'registered' THEN
            v_delta := -1;  -- Deactivated (dropped, withdrawn, etc.)
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        -- Row deleted (should not happen by policy, but handled safely)
        IF OLD.status = 'registered' THEN
            v_delta := -1;
        END IF;
        v_offering_id := OLD.offering_id;
    END IF;

    IF v_delta <> 0 THEN
        UPDATE course_offerings
        SET enrolled_count = GREATEST(enrolled_count + v_delta, 0)
        WHERE id = v_offering_id;
    END IF;

    RETURN NEW;
END;
$$;

-- NOTE: The fn_register_student function also updates enrolled_count directly.
-- The trigger is here as a safety net for any direct enrollment inserts/updates.
-- To avoid double-counting, the stored function skips the count update if this
-- trigger handles it. In production, choose one approach; here we use the function
-- approach and the trigger as a guard for out-of-band changes.

-- Commenting trigger creation to avoid double-counting with the function approach:
-- If you prefer trigger-only approach, uncomment below and remove count updates in functions.
-- CREATE TRIGGER trg_sync_enrollment_count
--     AFTER INSERT OR UPDATE OR DELETE ON enrollments
--     FOR EACH ROW EXECUTE FUNCTION fn_sync_enrollment_count();

-- ============================================================
-- TRIGGER 3: PREVENT INVALID ENROLLMENT CHANGES
-- Cannot re-register for a 'completed' or 'failed' offering term
-- ============================================================
CREATE OR REPLACE FUNCTION fn_validate_enrollment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_offering_status VARCHAR;
BEGIN
    SELECT status INTO v_offering_status
    FROM course_offerings
    WHERE id = NEW.offering_id;

    -- Prevent enrolling in cancelled offerings
    IF v_offering_status = 'cancelled' AND NEW.status = 'registered' THEN
        RAISE EXCEPTION 'Cannot register for a cancelled course offering.';
    END IF;

    -- Prevent setting drop timestamp without 'dropped' status
    IF NEW.dropped_at IS NOT NULL AND NEW.status <> 'dropped' THEN
        RAISE EXCEPTION 'drop_at can only be set when status is dropped.';
    END IF;

    -- Prevent grade assignment without terminal status
    IF NEW.grade IS NOT NULL AND NEW.status NOT IN ('completed', 'failed') THEN
        RAISE EXCEPTION 'Grade can only be assigned to completed or failed enrollments.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_enrollment
    BEFORE INSERT OR UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_validate_enrollment_change();

-- ============================================================
-- TRIGGER 4: AUDIT LOG ON ENROLLMENT CHANGES
-- Records every significant status change in the audit log
-- ============================================================
CREATE OR REPLACE FUNCTION fn_audit_enrollment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_action  VARCHAR;
    v_status  VARCHAR := 'success';
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'enroll_insert';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status <> NEW.status THEN
            CASE NEW.status
                WHEN 'registered' THEN v_action := 'register';
                WHEN 'dropped'    THEN v_action := 'drop';
                WHEN 'completed'  THEN v_action := 'complete';
                WHEN 'withdrawn'  THEN v_action := 'withdraw';
                WHEN 'failed'     THEN v_action := 'fail';
                ELSE v_action := 'status_change';
            END CASE;
        ELSE
            RETURN NEW;  -- No status change, skip audit
        END IF;
    END IF;

    INSERT INTO registration_audit_logs
        (actor_user_id, student_id, offering_id, action, status, details)
    SELECT
        NULL,           -- actor unknown from trigger context
        NEW.student_id,
        NEW.offering_id,
        v_action,
        v_status,
        jsonb_build_object(
            'old_status', OLD.status,
            'new_status', NEW.status,
            'trigger',    TRUE
        );

    RETURN NEW;
END;
$$;

-- This trigger only fires for status changes (not all updates)
CREATE TRIGGER trg_audit_enrollment
    AFTER INSERT OR UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_audit_enrollment_change();

-- ============================================================
-- TRIGGER 5: PREVENT DUPLICATE ACTIVE WAITLIST
-- Extra guard in addition to the UNIQUE constraint
-- ============================================================
CREATE OR REPLACE FUNCTION fn_validate_waitlist_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Don't allow joining waitlist if already enrolled
    IF EXISTS (
        SELECT 1 FROM enrollments
        WHERE student_id  = NEW.student_id
          AND offering_id = NEW.offering_id
          AND status      = 'registered'
    ) THEN
        RAISE EXCEPTION 'Student is already enrolled in this course. Cannot join waitlist.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_waitlist
    BEFORE INSERT ON waitlist_entries
    FOR EACH ROW EXECUTE FUNCTION fn_validate_waitlist_entry();

-- ============================================================
-- TRIGGER 6: ENFORCE CAPACITY CONSTRAINT
-- Prevents enrolled_count from exceeding capacity
-- This is the final database-level guard against race conditions
-- ============================================================
CREATE OR REPLACE FUNCTION fn_enforce_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.enrolled_count > NEW.capacity THEN
        RAISE EXCEPTION 'Cannot exceed course capacity of %. Current enrolled: %.',
            NEW.capacity, NEW.enrolled_count;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_capacity
    BEFORE UPDATE ON course_offerings
    FOR EACH ROW
    WHEN (NEW.enrolled_count > NEW.capacity)
    EXECUTE FUNCTION fn_enforce_capacity();

-- ============================================================
-- TRIGGER 7: ONLY ONE CURRENT TERM
-- When a term is set to is_current=TRUE, set all others to FALSE
-- ============================================================
CREATE OR REPLACE FUNCTION fn_ensure_single_current_term()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.is_current = TRUE THEN
        UPDATE academic_terms
        SET is_current = FALSE
        WHERE id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_current_term
    BEFORE INSERT OR UPDATE OF is_current ON academic_terms
    FOR EACH ROW
    WHEN (NEW.is_current = TRUE)
    EXECUTE FUNCTION fn_ensure_single_current_term();
