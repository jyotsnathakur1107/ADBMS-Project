# Database Architecture & Technical Design Specification

## Course Registration & Academic Management System
**Advanced Database Management Systems (ADBMS) Project**

---

## 1. Relational Database Architecture

The system utilizes **PostgreSQL 15+** as an enterprise-grade object-relational database. The database architecture is built to withstand high concurrency, prevent double bookings, guarantee strict referential integrity, and provide an immutable audit trail.

---

## 2. Transactions & ACID Implementation

### Atomicity
Every state-modifying operation executes within a discrete transaction block (`BEGIN ... COMMIT / ROLLBACK`). If an exception is raised at any stage (such as prerequisite unmet or credit limit exceeded), all preliminary reads and tentative updates are rolled back to their pre-transaction state without leaving orphaned records.

```sql
BEGIN;
-- Step 1: Lock course offering
SELECT * FROM course_offerings WHERE id = 12 FOR UPDATE;
-- Step 2: Validate preconditions (prereqs, limits, overlaps)
-- Step 3: Insert enrollment record
INSERT INTO enrollments (student_id, offering_id, status) VALUES (1, 12, 'registered');
-- Step 4: Increment enrolled count
UPDATE course_offerings SET enrolled_count = enrolled_count + 1 WHERE id = 12;
-- Step 5: Audit log
INSERT INTO registration_audit_logs (...) VALUES (...);
COMMIT;
```

### Consistency
Consistency is maintained by combining declarative database constraints with procedural domain rules:
- `chk_enrolled_lte_capacity`: `CHECK (enrolled_count <= capacity)`
- `chk_schedule_times`: `CHECK (end_time > start_time)`
- `chk_no_self_prereq`: `CHECK (course_id <> prerequisite_id)`
- `UNIQUE (student_id, offering_id)` on `enrollments`
- Foreign Key cascades and restrictions (`ON DELETE RESTRICT` on active offerings to protect student history).

### Isolation & Concurrency Control
Under concurrent course registration, the **Lost Update** and **Overbooking** anomalies present critical risks.

#### Why Simple SELECT Followed by INSERT Fails:
If two concurrent transactions $T_1$ and $T_2$ both execute:
1. $T_1$: `SELECT enrolled_count, capacity FROM course_offerings WHERE id = 5;` (reads `enrolled_count = 29, capacity = 30`)
2. $T_2$: `SELECT enrolled_count, capacity FROM course_offerings WHERE id = 5;` (reads `enrolled_count = 29, capacity = 30`)
3. Both conclude a seat is open.
4. $T_1$ inserts enrollment and updates `enrolled_count = 30`.
5. $T_2$ inserts enrollment and updates `enrolled_count = 31` (Violating capacity constraint!).

#### Concurrency Defense: Row-Level Exclusive Locking (`FOR UPDATE`)
By querying `course_offerings` with `SELECT ... FOR UPDATE`, PostgreSQL acquires an exclusive row-level lock (`RowShareLock` / `ExclusiveLock`) on that specific tuple:
- Transaction $T_1$ acquires the lock.
- When $T_2$ attempts `SELECT ... FOR UPDATE` on the same tuple, it blocks in the database engine until $T_1$ completes (`COMMIT` or `ROLLBACK`).
- Once $T_1$ commits (setting `enrolled_count = 30`), $T_2$ unblocks, reads the freshly committed tuple (`enrolled_count = 30`), evaluates `30 >= 30`, and rejects the registration safely, redirecting the student to the waitlist.

### Durability
PostgreSQL uses Write-Ahead Logging (WAL). All modifications are flushed to non-volatile disk logs before transaction acknowledgment, guaranteeing recovery even under sudden power loss or server crash.

---

## 3. Stored Functions vs. Stored Procedures (PL/pgSQL)

| Characteristic | Stored Functions (`fn_*`) | Stored Procedures (`sp_*`) |
| :--- | :--- | :--- |
| **Invocation** | Called within queries (`SELECT * FROM fn_register_student(...)`) | Executed via dedicated call (`CALL sp_reconcile_enrollment_counts(...)`) |
| **Transaction Control** | Cannot execute internal `COMMIT` or `ROLLBACK`; bound to outer query transaction | Can manage internal autonomous transactions (`COMMIT`/`ROLLBACK` inside loops) |
| **Return Type** | Always returns a scalar, record, or table (`RETURNS TABLE`) | Optional `INOUT` parameters; returns no result sets |
| **Use Case in System** | `fn_register_student`, `fn_drop_enrollment`, `fn_has_schedule_conflict` | `sp_reconcile_enrollment_counts`, `sp_bulk_enroll_cohort`, `sp_archive_term_enrollments` |

---

## 4. Trigger Architecture

The system employs triggers for declarative automation where centralized database rules must apply regardless of the caller (REST API, direct SQL, or batch job):

1. **`trg_set_updated_at`**: Automatically synchronizes `updated_at = NOW()` on modification.
2. **`trg_enforce_capacity`**: Fires before offering updates; aborts transaction if `enrolled_count > capacity`.
3. **`trg_validate_enrollment`**: Prevents assigning grades to non-completed offerings and blocks enrolling in cancelled sections.
4. **`trg_audit_enrollment`**: Generates structured audit records into `registration_audit_logs` on enrollment status changes.
5. **`trg_single_current_term`**: Enforces that only one academic semester is marked `is_current = TRUE` across the institution.

---

## 5. Materialized Views & Refresh Strategies

For heavy administrative reporting, querying live transaction tables across multiple joins creates CPU load. We deploy the materialized view `mv_admin_dashboard_analytics`:

```sql
CREATE MATERIALIZED VIEW mv_admin_dashboard_analytics AS
SELECT
    d.id AS department_id,
    d.code AS department_code,
    d.name AS department_name,
    COUNT(DISTINCT c.id) AS total_courses,
    COUNT(DISTINCT co.id) AS active_offerings,
    COUNT(e.id) FILTER (WHERE e.status = 'registered') AS total_enrollments,
    COALESCE(SUM(co.capacity), 0) AS total_capacity,
    ROUND(
        COUNT(e.id) FILTER (WHERE e.status = 'registered')::NUMERIC /
        NULLIF(SUM(co.capacity), 0) * 100, 2
    ) AS utilization_rate
FROM departments d
LEFT JOIN courses c ON c.department_id = d.id AND c.is_active = TRUE
LEFT JOIN course_offerings co ON co.course_id = c.id AND co.is_active = TRUE
LEFT JOIN enrollments e ON e.offering_id = co.id
GROUP BY d.id, d.code, d.name;

CREATE UNIQUE INDEX idx_mv_admin_dept ON mv_admin_dashboard_analytics(department_id);
```

### Refresh Strategy
- **Concurrent Refresh**: `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_dashboard_analytics;`
- Because an index exists on `department_id`, the view refreshes in the background without acquiring exclusive table read locks, ensuring the dashboard never hangs during refresh.
- Scheduled via cron or triggered after administrative maintenance batches.

---

## 6. Strategic Indexing & Query Execution Plans

### Index Types Implemented:
1. **B-Tree Indexes**: Default for primary keys, foreign keys, timestamps, and equality lookups (e.g. `idx_users_email`, `idx_enrollments_student`).
2. **Composite Indexes**: Optimized for multi-column queries (`idx_enrollments_student` on `(student_id, status)`, `idx_schedules_day_time` on `(day_of_week, start_time, end_time)`).
3. **Partial Indexes**: Drastically reduce index tree footprint and index maintenance overhead:
   ```sql
   CREATE INDEX idx_enrollments_active ON enrollments(student_id)
   WHERE status = 'registered';
   ```
4. **GIN (Generalized Inverted Index)**: Supports full-text search on course catalogs:
   ```sql
   CREATE INDEX idx_courses_fts ON courses USING GIN (
       to_tsvector('english', name || ' ' || COALESCE(description, ''))
   );
   ```

### EXPLAIN ANALYZE Performance Evidence:
- **Without Index**: Full Sequential Scan of `enrollments` table ($O(N)$), filtering millions of historical records.
- **With Partial Index**: Bitmap Index Scan ($O(\log N)$) hitting only currently active enrollments, reducing execution time by over 95%.

