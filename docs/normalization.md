# Relational Database Normalization Analysis

## Course Registration and Academic Management System
**Advanced Database Management Systems (ADBMS) Project**

---

## 1. Introduction & Objectives

Normalization is the formal process of structuring relational schema to:
1. Eliminate insertion, update, and deletion anomalies.
2. Minimize redundant data storage.
3. Ensure functional dependencies are cleanly preserved by candidate keys.
4. Enforce referential and domain integrity constraints at the database engine level.

This project achieves **Third Normal Form (3NF)** across all entities, with core tables satisfying **Boyce-Codd Normal Form (BCNF)**. Where deliberate controlled denormalization was introduced (such as `enrolled_count` on `course_offerings`), we provide explicit architectural justification and demonstrate transaction-level synchronization.

---

## 2. Normalization Progression & Formal Proofs

### First Normal Form (1NF)
A relation $R$ is in **1NF** if and only if all underlying domains contain only atomic (indivisible) values, each attribute contains only a single value from that domain, and there are no repeating groups.

#### Design Violations Prevented:
- **Course Schedules**: A course often meets multiple times per week (e.g. Monday 10:00-11:30 and Wednesday 10:00-11:30). Storing this as a comma-separated string `day="Mon, Wed"` or having columns `day1, start1, day2, start2` violates 1NF and prevents indexing and interval overlap arithmetic.
  - **Resolution**: Extracted to separate relation `course_schedules(id, offering_id, day_of_week, start_time, end_time)`.
- **Course Prerequisites**: Storing multiple prerequisites as an array `prereq_ids = [101, 102]` in `courses` violates 1NF atomicity.
  - **Resolution**: Extracted to junction relation `course_prerequisites(course_id, prerequisite_id)`.
- **Student Profile**: Splitting `first_name` and `last_name` into atomic components rather than a single compound name string.

---

### Second Normal Form (2NF)
A relation $R$ is in **2NF** if and only if it is in 1NF and every non-prime attribute is fully functionally dependent on every candidate key (no partial dependencies).

#### Design Violations Prevented:
- **Composite Key in Course Offerings**:
  Consider an un-normalized offering record keyed by `(course_code, term_code, section)` containing `course_name`, `credits`, `instructor_name`, and `room`.
  - Functional Dependency 1: `{course_code} -> {course_name, credits, department_id}`
  - Functional Dependency 2: `{course_code, term_code, section} -> {room, capacity, faculty_id}`
  - Here, `{course_name, credits}` are partially dependent on a proper subset of the composite key (`course_code`).
  - **Resolution**: Decomposed into:
    1. `courses(id, code, name, credits, department_id, ...)` keyed by `id` or `code`.
    2. `course_offerings(id, course_id, term_id, section, room, capacity, ...)` keyed by `id`.

- **Completed Courses Transcript**:
  In `completed_courses(student_id, course_id, term_id, grade, credits_earned)`:
  - Key: `{student_id, course_id, term_id}`.
  - Grade and completion date depend on the entire composite key.
  - Course attributes (`name`, `department`) are NOT stored here; they are referenced via `course_id`.

---

### Third Normal Form (3NF)
A relation $R$ is in **3NF** if and only if it is in 2NF and no non-prime attribute is transitively dependent on any candidate key (i.e., for every non-trivial functional dependency $X \rightarrow Y$, either $X$ is a superkey, or $Y$ is a prime attribute).

#### Design Violations Prevented:
- **User Authentication vs Profile**:
  If student profile data were stored in `users`:
  - `{user_id} -> {department_id} -> {department_name, department_head}`
  - Transitive dependency: `{user_id} -> {department_name}` via `{department_id}`.
  - Updating a department's head would require updating thousands of student rows (Update Anomaly).
  - Deleting all students in a department would delete the department (Deletion Anomaly).
  - **Resolution**: Normalized into three distinct relations:
    1. `users(id, email, password_hash, role)`
    2. `students(id, user_id, department_id, current_year, ...)`
    3. `departments(id, code, name, head_name, ...)`

- **Faculty and Department Association**:
  Similar transitive dependency eliminated by linking `faculty` to `departments` via `department_id` foreign key.

---

### Boyce-Codd Normal Form (BCNF)
A relation $R$ is in **BCNF** if and only if for every non-trivial functional dependency $X \rightarrow Y$, $X$ is a superkey.

In our schema:
- In `courses`: Candidate keys are `{id}` and `{code}`. Both are superkeys.
- In `students`: Candidate keys are `{id}`, `{user_id}`, and `{student_id}`. All are superkeys.
- In `course_offerings`: Candidate keys are `{id}` and `{course_id, term_id, section}`. Both are superkeys.
All functional dependencies originate from superkeys. Hence, BCNF is satisfied.

---

## 3. Formal Functional Dependencies (FD) Summary

### Entity: `users`
- Primary Key: `{id}`
- Alternate Key: `{email}`
- Functional Dependencies:
  - `{id} -> {email, password_hash, role, is_active, created_at, updated_at, last_login}`
  - `{email} -> {id, password_hash, role, is_active, created_at, updated_at, last_login}`

### Entity: `students`
- Primary Key: `{id}`
- Alternate Keys: `{user_id}`, `{student_id}`
- Functional Dependencies:
  - `{id} -> {user_id, student_id, first_name, last_name, date_of_birth, gender, phone, address, department_id, enrollment_year, current_year, gpa, max_credits, is_active}`
  - `{student_id} -> {id, user_id, ...}`
  - `{user_id} -> {id, student_id, ...}`

### Entity: `courses`
- Primary Key: `{id}`
- Alternate Key: `{code}`
- Functional Dependencies:
  - `{id} -> {code, name, description, department_id, credits, course_level, category, is_active}`
  - `{code} -> {id, name, description, department_id, credits, course_level, category, is_active}`

### Entity: `course_offerings`
- Primary Key: `{id}`
- Alternate Key: `{course_id, term_id, section}`
- Functional Dependencies:
  - `{id} -> {course_id, term_id, faculty_id, section, room, capacity, enrolled_count, waitlist_count, status, is_active}`
  - `{course_id, term_id, section} -> {id, faculty_id, room, capacity, enrolled_count, waitlist_count, status, is_active}`

### Entity: `enrollments`
- Primary Key: `{id}`
- Alternate Key: `{student_id, offering_id}`
- Functional Dependencies:
  - `{id} -> {student_id, offering_id, status, grade, registered_at, dropped_at, drop_reason}`
  - `{student_id, offering_id} -> {id, status, grade, registered_at, dropped_at, drop_reason}`

---

## 4. Controlled Denormalization & Trade-Off Analysis

### The `enrolled_count` and `waitlist_count` Columns
In pure 3NF, the number of students enrolled in an offering is derived by:
```sql
SELECT COUNT(*) FROM enrollments WHERE offering_id = :id AND status = 'registered';
```

#### Why we retain a stored counter:
1. **Catalog Performance**: During peak course registration, thousands of concurrent requests view catalog pages displaying seat availability for hundreds of offerings simultaneously. Computing dynamic `COUNT(*)` across millions of historical enrollment rows causes table scan thrashing and CPU bottlenecks.
2. **Locking Efficiency**: Row-level locking for concurrency control (`SELECT capacity, enrolled_count FROM course_offerings WHERE id = :id FOR UPDATE`) requires locking only a single row in `course_offerings`, rather than executing predicate locks or locking aggregate ranges in `enrollments`.

#### Guarding Against Inconsistency:
To guarantee that `enrolled_count` never diverges from ground truth:
1. `chk_enrolled_lte_capacity` database check constraint prevents `enrolled_count > capacity`.
2. Core registrations execute via `fn_register_student` and `fn_drop_enrollment` in strict ACID transactions.
3. Administrative stored procedure `sp_reconcile_enrollment_counts` runs periodic reconciliation.
4. Database trigger `trg_enforce_capacity` acts as an absolute fail-safe.

