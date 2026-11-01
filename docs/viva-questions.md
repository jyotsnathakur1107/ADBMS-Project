# Advanced DBMS Project Viva Examination Preparation Guide

## Course Registration & Academic Management System
**Key Questions, Theoretical Concepts, and Project-Specific Architectural Answers**

---

### Q1: Why did you separate `users` from `students` and `faculty` instead of using a single `users` table with optional fields?
**Answer:**
This design adheres to **Third Normal Form (3NF)** and the **Table Inheritance / Specialization-Generalization** pattern.
1. **Avoiding NULL Proliferation**: Students possess matriculation years, GPA, and max credits, whereas faculty possess office numbers, academic rank, and specializations. A single table would create high sparsity with dozens of NULL attributes.
2. **Security & Principle of Least Privilege**: Authentication credentials (`password_hash`, `last_login`, session state) are kept isolated in `users`. Profile and academic records (`students`) can be queried by registrars and academic advisors without exposing user credential columns.
3. **Multi-Role Extensibility**: If a faculty member subsequently enrolls as a student (e.g. taking an advanced postgraduate seminar), the 1:1 foreign key structure enables a single user identity to associate with both student and faculty profiles without duplicating login accounts.

---

### Q2: What concurrency anomalies can occur during course registration, and how does your database prevent them?
**Answer:**
The two primary anomalies are **Lost Updates** and **Overbooking (Write Skew / Race Condition)**.
- **The Problem**: When a course section has 1 seat remaining, two students might check seat availability simultaneously. If both execute an un-isolated `SELECT enrolled_count, capacity ...`, both see 1 seat available and both execute `INSERT INTO enrollments ...`, causing `enrolled_count` to exceed `capacity`.
- **Our Solution**:
  1. We execute the registration logic inside an atomic transaction (`BEGIN ... COMMIT`).
  2. We use pessimistic row-level locking via `SELECT ... FOR UPDATE` on the `course_offerings` record.
  3. The first transaction locks the offering tuple. The second transaction blocks in the database engine until the first transaction commits.
  4. When the second transaction unblocks, it reads the updated state (`enrolled_count = 30 / capacity = 30`), detects that no seats remain, and automatically routes the student to the waitlist queue.
  5. Furthermore, a database check constraint (`chk_enrolled_lte_capacity`) and a `BEFORE UPDATE` trigger (`trg_enforce_capacity`) serve as hard database-level guards.

---

### Q3: What is the difference between a Stored Function and a Stored Procedure in PostgreSQL?
**Answer:**
1. **Transaction Control**: In PostgreSQL, a **Stored Procedure** (`CREATE PROCEDURE ... CALL sp_name()`) can control its own transactions by executing internal `COMMIT` and `ROLLBACK` statements within loops. A **Function** (`CREATE FUNCTION ... SELECT fn_name()`) runs strictly within the outer transaction context of the caller and cannot issue autonomous `COMMIT` or `ROLLBACK`.
2. **Return Values**: Functions must return a value, tuple, or table (`RETURNS TABLE`), allowing them to be embedded directly within `SELECT`, `WHERE`, and `JOIN` clauses. Procedures do not return values directly (though they support `INOUT` parameters).
3. **Project Usage**: We used **Functions** (`fn_register_student`, `fn_has_schedule_conflict`) for inline query evaluation and atomic registration checks, while using **Procedures** (`sp_reconcile_enrollment_counts`, `sp_bulk_enroll_cohort`, `sp_archive_term_enrollments`) for autonomous administrative batch workflows.

---

### Q4: Explain the conflict detection algorithm for student timetables.
**Answer:**
A timetable conflict occurs if a student attempts to register for an offering that has a time slot overlapping with any currently registered course on the same day of the week.
Two time intervals $[S_1, E_1)$ and $[S_2, E_2)$ overlap if and only if:
$$\text{Start}_1 < \text{End}_2 \quad \text{AND} \quad \text{End}_1 > \text{Start}_2$$
In our PL/pgSQL function `fn_has_schedule_conflict`:
```sql
SELECT COUNT(*) INTO v_conflict_count
FROM enrollments e
JOIN course_offerings co ON co.id = e.offering_id
JOIN course_schedules cs1 ON cs1.offering_id = co.id
JOIN course_schedules cs2 ON cs2.offering_id = p_new_offering_id
WHERE e.student_id = p_student_id
  AND e.status = 'registered'
  AND cs1.day_of_week = cs2.day_of_week
  AND cs1.start_time < cs2.end_time
  AND cs1.end_time > cs2.start_time;
```
If `v_conflict_count > 0`, the transaction rejects the registration.

---

### Q5: Why did you use Partial Indexes? Give an example from your schema.
**Answer:**
A **Partial Index** is an index built over a subset of a table defined by a conditional `WHERE` clause.
- **Example in Project**:
  ```sql
  CREATE INDEX idx_enrollments_active ON enrollments(student_id)
  WHERE status = 'registered';
  ```
- **Justification**:
  In an institutional database, 90% of rows in the `enrollments` table eventually represent historical terms (`completed`, `dropped`, `withdrawn`). During active semester operations, 99% of student queries only care about currently `'registered'` courses.
- **Benefits**:
  1. **Storage Reduction**: The index tree is a fraction of the size of a full table index.
  2. **Cache Retention**: The partial index easily fits in RAM (`shared_buffers`), guaranteeing fast memory hits.
  3. **Write Speed**: Updates or inserts of non-active enrollments do not require updating the partial index B-Tree.

---

### Q6: What is a Materialized View, and when is it preferred over a Standard View?
**Answer:**
- A **Standard View** is a saved SQL query. When queried, PostgreSQL executes the underlying query dynamically. If the query involves multiple joins and aggregations across millions of rows, execution is slow.
- A **Materialized View** physically persists the query result set on disk as a concrete table.
- **Project Usage**: We created `mv_admin_dashboard_analytics` for the administrator dashboard, aggregating department-level enrollments, capacities, and course counts.
- **Refresh Strategy**: Because analytics data tolerates minor latency, we refresh the materialized view asynchronously using `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_dashboard_analytics;`. The `CONCURRENTLY` parameter ensures reads are never blocked while the view is recalculating.

---

### Q7: Why do you soft-drop enrollments instead of using `DELETE FROM enrollments`?
**Answer:**
1. **Audit & Compliance**: Universities are legally required to maintain complete registration transcripts, drop dates, and refund audit records.
2. **Historical Analysis**: Deleting rows destroys analytics data regarding course drop rates, peak withdrawal periods, and faculty attrition.
3. **Relational Integrity**: Deleting enrollment records would trigger cascading issues with audit logs and billing tables.
4. **Implementation**: When a course is dropped, status is updated to `'dropped'`, `dropped_at` is timestamped, and the course offering seat is decremented, preserving the permanent history.

---

### Q8: How does your waitlist promotion handle race conditions?
**Answer:**
When a student drops a course via `fn_drop_enrollment`:
1. The transaction locks both the offering row and the top waitlisted student tuple (`ORDER BY position ASC LIMIT 1 FOR UPDATE`).
2. Before promoting the candidate, the function re-verifies that the student has not since registered for a conflicting course.
3. If eligible, the student's status changes to `'promoted'`, the offering's `enrolled_count` is updated, and an in-app notification is queued.
4. If the student has developed a conflict or missing prerequisite, their waitlist entry is marked `'withdrawn'` and the procedure recurses to promote the next candidate in line.
5. All operations occur within the single drop transaction, ensuring no intermediate state can allow an outside student to steal the vacated seat.

