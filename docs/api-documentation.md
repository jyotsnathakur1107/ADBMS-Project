# RESTful API Documentation

## Course Registration & Academic Management System
Base URL: `http://localhost:5000/api`

---

## 1. Authentication & Session Management

### `POST /auth/login`
Authenticates user and returns JWT token and role profile.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "s001@student.edu",
    "password": "Demo@1234"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": { "id": 11, "email": "s001@student.edu", "role": "student" },
      "profile": {
        "id": 1,
        "student_id": "STU2024001",
        "first_name": "James",
        "last_name": "Smith",
        "department_name": "Computer Science",
        "current_year": 1,
        "max_credits": 18
      }
    }
  }
  ```

### `GET /auth/me`
Retrieves currently authenticated user and active academic profile.
- **Headers**: `Authorization: Bearer <token>`
- **Access**: Authenticated

---

## 2. Course Catalog & Offerings

### `GET /courses`
Search and filter the academic course catalog with availability and prerequisite awareness.
- **Access**: Authenticated
- **Query Parameters**:
  - `search`: Course name, code, or professor name (ILIKE substring match)
  - `department_id`: Integer filter
  - `term_id`: Semester ID filter
  - `credits`: Number of credits (1-6)
  - `category`: `core | elective | lab | seminar | project`
  - `availability`: `available | full`
  - `page`: Page index (default: 1)
  - `limit`: Page size (default: 20)
- **Response**: Paginated course cards enriched with schedule arrays, prerequisite objects, and student registration status.

### `GET /courses/:offeringId`
Full details for an offering including section capacity, room, instructor office, and meeting times.

---

## 3. Registration & Enrollment Operations

### `POST /enrollments/register`
Attempts transactional registration via `fn_register_student`.
- **Access**: Student only
- **Request Body**:
  ```json
  { "offering_id": 12 }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Successfully registered for the course.",
    "data": { "offering_id": 12, "student_id": 1 }
  }
  ```
- **Error Response (422 Unprocessable Entity)**:
  ```json
  {
    "success": false,
    "message": "This course conflicts with your current schedule."
  }
  ```

### `POST /enrollments/drop`
Soft-drops a course, preserves audit trail, and automatically triggers waitlist promotion.
- **Access**: Student only
- **Request Body**:
  ```json
  {
    "offering_id": 12,
    "reason": "Elective conflict"
  }
  ```

### `POST /enrollments/waitlist`
Places a student in the fair first-come waitlist queue for a full section.
- **Access**: Student only
- **Request Body**:
  ```json
  { "offering_id": 25 }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Added to waitlist at position 1",
    "data": { "offering_id": 25, "position": 1 }
  }
  ```

### `GET /enrollments/my-courses`
Returns all registered and dropped courses for the authenticated student.

### `GET /enrollments/timetable`
Returns calendar-ready day/time slots for the student's active semester.

---

## 4. Faculty Management

### `GET /faculty/my-courses`
Retrieves assigned course offerings, enrolled student counts, capacity, and weekly schedules.
- **Access**: Faculty only

### `GET /faculty/courses/:offeringId/students`
Retrieves class roster of registered students (names, student IDs, emails, majors, registration dates).
- **Access**: Assigned Faculty or Admin

---

## 5. Administrative Controls

### `GET /admin/dashboard`
Returns high-level institution metrics:
- Total active students & faculty
- Course offering capacity & fill rates
- Department enrollment breakdown
- Live audit activity feed

### `POST /admin/offerings`
Creates a new course section offering for an academic term.

### `PUT /admin/offerings/:id`
Updates offering capacity, assigned instructor, or room.

### `POST /admin/maintenance/reconcile`
Invokes stored procedure `sp_reconcile_enrollment_counts` to audit and synchronize cached counters.

