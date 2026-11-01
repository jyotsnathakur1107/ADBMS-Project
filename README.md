# Course Registration and Academic Management System
### Advanced Database Management Systems (ADBMS) Semester Project

A production-style, full-stack **University Course Registration and Academic Management System** built with **PostgreSQL**, **Express.js**, **Node.js**, **React (Vite)**, and **Tailwind CSS**.

This project emphasizes advanced database engineering concepts: strictly normalized **Third Normal Form (3NF/BCNF)** schema, **ACID transactions** with pessimistic row-locking (`SELECT ... FOR UPDATE`), **PL/pgSQL functions & stored procedures**, **triggers**, **materialized views**, and **strategic composite/partial/GIN indexing**.

---

## 1. System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│               React 19 + Vite Frontend                │
│ (Tailwind CSS, Lucide Icons, Recharts, Responsive UI)  │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (Axios + JWT)
┌───────────────────────────▼────────────────────────────┐
│               Express.js Backend Server                │
│ (RBAC Middleware, Connection Pool, Input Validators)   │
└───────────────────────────┬────────────────────────────┘
                            │ pg (Dedicated Pool & Transaction Clients)
┌───────────────────────────▼────────────────────────────┐
│               PostgreSQL 15+ Database Engine           │
│ ├── 15 Relational Tables (Normalized to 3NF)           │
│ ├── ACID Transactions (FOR UPDATE Concurrency Guard)   │
│ ├── 10 PL/pgSQL Functions (fn_*)                       │
│ ├── 3 Stored Procedures (sp_*)                         │
│ ├── 7 Automation & Integrity Triggers (trg_*)          │
│ ├── 6 Views + Materialized View (Concurrent Refresh)   │
│ └── Strategic Indexing (B-Tree, Partial, GIN FTS)      │
└────────────────────────────────────────────────────────┘
```

### Technology Matrix
- **Frontend**: React 19, Vite, React Router 7, Tailwind CSS, Lucide React, Recharts.
- **Backend**: Node.js, Express.js, `pg` (node-postgres connection pool), JWT, bcryptjs, Helmet, CORS.
- **Database**: PostgreSQL 15+ (Relational engine, PL/pgSQL procedural language).

---

## 2. Default Demo Credentials

All seeded accounts share the default development password: **`Demo@1234`**
The login UI includes **one-click demo pills** to log in instantly.

| Role | Email Address | Password | Profile / Permissions |
| :--- | :--- | :--- | :--- |
| **Student** | `s001@student.edu` | `Demo@1234` | James Smith (CS, Year 1, Max 18 Credits) |
| **Student** | `s002@student.edu` | `Demo@1234` | Emily Johnson (CS, Year 2, Max 18 Credits) |
| **Faculty** | `alice.morgan@university.edu` | `Demo@1234` | Dr. Alice Morgan (Computer Science Professor) |
| **Faculty** | `bob.chen@university.edu` | `Demo@1234` | Dr. Bob Chen (Associate Professor) |
| **Admin** | `admin@university.edu` | `Demo@1234` | University Registrar & System Administrator |

---

## 3. Quick Start & Execution Guide

### Prerequisites
- Node.js v18+ (verified on v22)
- PostgreSQL 15+ (running on `localhost:5432`)

---

### Step 1: Database Setup
You can initialize the entire database (schema, functions, procedures, triggers, views, indexes, and realistic seed data) using either the automated scripts or standard `psql`.

#### Option A: One-Click Script (Recommended on Windows)
Run PowerShell from the project root:
```powershell
.\database\setup_db.ps1
```
*(Or double-click `database\setup_db.bat` from Windows File Explorer)*

#### Option B: Manual PSQL Execution
```bash
# 1. Create the database
createdb -U postgres course_registration

# 2. Run master orchestration script
psql -U postgres -d course_registration -f database/init_all.sql
```

---

### Step 2: Configure Environment Variables
Verify or edit `server/.env`:
```ini
NODE_ENV=development
PORT=5000

# PostgreSQL Connection Settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=course_registration
DB_USER=postgres
DB_PASSWORD=postgres
DB_POOL_MAX=20

# JWT Authentication
JWT_SECRET=super_secret_university_jwt_key_2026_academic_management_system
JWT_EXPIRES_IN=24h

# Client Application URL
CLIENT_URL=http://localhost:5173
```

---

### Step 3: Start the Backend Server
In a terminal window:
```bash
cd server
npm start
```
*Server starts on `http://localhost:5000` and verifies PostgreSQL connectivity.*

---

### Step 4: Start the Frontend Application
In a second terminal window:
```bash
cd client
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 4. Key Advanced DBMS Concepts Implemented

### 1. ACID Transactions & Concurrency Safety
- **Pessimistic Locking**: Registration operations use `SELECT ... FOR UPDATE` on `course_offerings` tuples.
- **Race Condition Prevention**: Prevents overbooking when multiple students attempt to register for the final seat simultaneously. The second transaction blocks in the database engine and receives a clean rejection when unblocked.
- **Reproducible Script**: See [database/concurrency_demo.sql](file:///c:/Users/thaku/OneDrive/Documents/ADBMS-project/database/concurrency_demo.sql).

### 2. PL/pgSQL Stored Functions vs. Procedures
- **Functions (`fn_*`)**: Callable within SQL expressions for atomic checks.
  - `fn_student_meets_prerequisites(student_id, course_id)`: Traverses prerequisite graph against `completed_courses`.
  - `fn_has_schedule_conflict(student_id, offering_id)`: Detects interval overlap across weekly schedules.
  - `fn_register_student(student_id, offering_id, actor_id)`: Atomic registration function.
  - `fn_drop_enrollment(student_id, offering_id, reason, actor_id)`: Soft-drop and automatic waitlist promotion.
- **Procedures (`sp_*`)**: Invoked via `CALL` with independent transaction control (`COMMIT`/`ROLLBACK`).
  - `sp_reconcile_enrollment_counts()`: Audits cached counts against ground-truth tables.
  - `sp_bulk_enroll_cohort()`: Batch enrolls student cohorts.
  - `sp_archive_term_enrollments()`: Finalizes semester grades and populates transcripts.

### 3. Database Triggers
- `trg_enforce_capacity`: Aborts updates if `enrolled_count > capacity`.
- `trg_validate_enrollment`: Prevents illegal status transitions and grade assignments to incomplete courses.
- `trg_audit_enrollment`: Automatically writes status changes into `registration_audit_logs`.
- `trg_single_current_term`: Enforces that only one semester has `is_current = TRUE`.

### 4. Views & Materialized Views
- **Standard Views**: `v_student_registration_summary`, `v_course_enrollment_summary`, `v_available_offerings`, `v_student_timetable`.
- **Materialized View**: `mv_admin_dashboard_analytics` for instant reporting across large datasets. Includes concurrent refresh (`REFRESH MATERIALIZED VIEW CONCURRENTLY`).

### 5. Indexing Strategy
- **B-Tree**: Primary keys, foreign keys, timestamps, login lookups.
- **Composite Indexes**: `(student_id, status)`, `(day_of_week, start_time, end_time)`.
- **Partial Indexes**: `CREATE INDEX idx_enrollments_active ON enrollments(student_id) WHERE status = 'registered';`
- **GIN (Generalized Inverted Index)**: Full-text search over course catalogs (`to_tsvector`).

---

## 5. Project Directory Structure

```
ADBMS-project/
├── client/                     # React 19 + Vite Frontend
│   ├── src/
│   │   ├── components/UI.jsx   # Design system (Cards, Badges, Modals, Tables)
│   │   ├── context/AuthContext # JWT Auth Provider
│   │   ├── layouts/AppLayout   # Responsive Sidebar & Top Navigation
│   │   ├── pages/              # Role-specific Views
│   │   │   ├── Login.jsx
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── CourseCatalog.jsx
│   │   │   ├── MyCourses.jsx
│   │   │   ├── TimetablePage.jsx
│   │   │   ├── AcademicProgress.jsx
│   │   │   ├── FacultyDashboard.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminOfferings.jsx
│   │   │   ├── AdminCourses.jsx
│   │   │   └── AdminAuditLogs.jsx
│   │   ├── services/api.js     # Axios instance with interceptors
│   │   ├── App.jsx             # Route definitions & RBAC guards
│   │   └── main.jsx
│   └── package.json
├── server/                     # Node.js + Express.js Backend
│   ├── src/
│   │   ├── config/db.js        # pg Pool & Transaction Client helper
│   │   ├── middleware/         # JWT Auth, Role Guard, Central Error Handler
│   │   ├── routes/             # Modular Express routers
│   │   │   ├── auth.js
│   │   │   ├── courses.js
│   │   │   ├── enrollments.js
│   │   │   ├── faculty.js
│   │   │   ├── admin.js
│   │   │   ├── departments.js
│   │   │   ├── terms.js
│   │   │   └── notifications.js
│   │   └── app.js
│   ├── .env.example
│   └── server.js
├── database/                   # PostgreSQL Scripts
│   ├── schema.sql              # Relational schema (15 tables)
│   ├── functions.sql           # PL/pgSQL functions
│   ├── procedures.sql          # Stored procedures
│   ├── triggers.sql            # Triggers & automation
│   ├── views.sql               # Views & materialized views
│   ├── indexes.sql             # B-Tree, partial, GIN indexes
│   ├── seed.sql                # 30 students, 10 faculty, 25 offerings
│   ├── demo_queries.sql        # 12+ analytical demonstration queries
│   ├── concurrency_demo.sql    # Concurrency locking test
│   ├── init_all.sql            # Master runner script
│   ├── setup_db.ps1            # PowerShell auto-setup
│   └── setup_db.bat            # Windows batch setup
├── docs/                       # Comprehensive Academic Documentation
│   ├── er-diagram.md           # ER Diagram & Data Dictionary
│   ├── normalization.md        # 1NF, 2NF, 3NF, BCNF formal proofs
│   ├── database-design.md      # ACID, locking, indexing analysis
│   ├── api-documentation.md    # REST API specification
│   └── viva-questions.md       # DBMS Viva Examination Q&A
├── package.json                # Root package runner
└── README.md                   # Project overview & manual
```

---

## 6. Analytical Demonstration Queries (12 Queries)

To run the analytical queries script:
```bash
psql -U postgres -d course_registration -f database/demo_queries.sql
```
Queries include:
1. Active enrollments for a specific course section.
2. Top 10 courses with highest fill percentages.
3. Students who have not registered for any courses in the current term (Anti-join).
4. Courses with zero enrollments in the current term.
5. Prerequisite verification check.
6. Students approaching their maximum registered credit limits ($> 15$ credits).
7. Course offerings with seats available.
8. Faculty members teaching the highest number of students.
9. Department-wise enrollment and capacity utilization.
10. Schedule conflict detector for concurrent course times.
11. Courses currently maintaining a waitlist.
12. Drop rate analysis for the semester.

