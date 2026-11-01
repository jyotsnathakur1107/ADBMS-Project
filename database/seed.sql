-- ============================================================
-- seed.sql - Realistic Sample Data
-- All passwords: Demo@1234 (bcrypt hashed)
-- ============================================================
-- bcrypt hash for "Demo@1234" (cost 10):
-- $2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a
-- ============================================================

BEGIN;

-- ============================================================
-- DEPARTMENTS
-- ============================================================
INSERT INTO departments (code, name, description, head_name) VALUES
('CS',   'Computer Science',         'Study of computation, algorithms, and software systems', 'Dr. Alan Turing'),
('MATH', 'Mathematics',              'Pure and applied mathematics', 'Dr. Emmy Noether'),
('PHY',  'Physics',                  'Fundamental principles of matter and energy', 'Dr. Richard Feynman'),
('EE',   'Electrical Engineering',   'Electronics, circuits, and electrical systems', 'Dr. Nikola Tesla'),
('BIO',  'Biology',                  'Life sciences and biological systems', 'Dr. Rosalind Franklin'),
('CHEM', 'Chemistry',                'Molecular and atomic science', 'Dr. Marie Curie'),
('MBA',  'Business Administration',  'Management and business strategy', 'Dr. Peter Drucker'),
('ENG',  'English Literature',       'Language, writing, and literature studies', 'Dr. Virginia Woolf');

-- ============================================================
-- USERS (password: Demo@1234)
-- ============================================================
INSERT INTO users (email, password_hash, role) VALUES
-- Admin
('admin@university.edu',    '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'admin'),
-- Faculty (10)
('alice.morgan@university.edu',   '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'faculty'),
('bob.chen@university.edu',       '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'faculty'),
('carol.davis@university.edu',    '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'faculty'),
('david.kim@university.edu',      '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'faculty'),
('eva.smith@university.edu',      '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'faculty'),
('frank.wilson@university.edu',   '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'faculty'),
('grace.lee@university.edu',      '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'faculty'),
('henry.patel@university.edu',    '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'faculty'),
('irene.brown@university.edu',    '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'faculty'),
('james.taylor@university.edu',   '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'faculty'),
-- Students (30)
('s001@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s002@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s003@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s004@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s005@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s006@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s007@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s008@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s009@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s010@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s011@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s012@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s013@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s014@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s015@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s016@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s017@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s018@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s019@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s020@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s021@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s022@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s023@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s024@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s025@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s026@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s027@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s028@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s029@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student'),
('s030@student.edu', '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a', 'student');

-- ============================================================
-- FACULTY PROFILES
-- ============================================================
INSERT INTO faculty (user_id, faculty_id, first_name, last_name, department_id, designation, phone, office, specialization) VALUES
((SELECT id FROM users WHERE email='alice.morgan@university.edu'),    'FAC001', 'Alice',  'Morgan', 1, 'Associate Professor', '555-0101', 'CS-201', 'Databases, Data Mining'),
((SELECT id FROM users WHERE email='bob.chen@university.edu'),        'FAC002', 'Bob',    'Chen',   1, 'Professor',           '555-0102', 'CS-202', 'Algorithms, Theory'),
((SELECT id FROM users WHERE email='carol.davis@university.edu'),     'FAC003', 'Carol',  'Davis',  1, 'Assistant Professor',  '555-0103', 'CS-203', 'Operating Systems, Networks'),
((SELECT id FROM users WHERE email='david.kim@university.edu'),       'FAC004', 'David',  'Kim',    2, 'Professor',           '555-0104', 'MT-101', 'Calculus, Linear Algebra'),
((SELECT id FROM users WHERE email='eva.smith@university.edu'),       'FAC005', 'Eva',    'Smith',  2, 'Associate Professor', '555-0105', 'MT-102', 'Statistics, Probability'),
((SELECT id FROM users WHERE email='frank.wilson@university.edu'),    'FAC006', 'Frank',  'Wilson', 3, 'Professor',           '555-0106', 'PH-101', 'Quantum Mechanics'),
((SELECT id FROM users WHERE email='grace.lee@university.edu'),       'FAC007', 'Grace',  'Lee',    4, 'Associate Professor', '555-0107', 'EE-201', 'Digital Circuits'),
((SELECT id FROM users WHERE email='henry.patel@university.edu'),     'FAC008', 'Henry',  'Patel',  1, 'Professor',           '555-0108', 'CS-204', 'Machine Learning, AI'),
((SELECT id FROM users WHERE email='irene.brown@university.edu'),     'FAC009', 'Irene',  'Brown',  5, 'Assistant Professor',  '555-0109', 'BI-101', 'Molecular Biology'),
((SELECT id FROM users WHERE email='james.taylor@university.edu'),    'FAC010', 'James',  'Taylor', 7, 'Associate Professor', '555-0110', 'MB-101', 'Finance, Strategy');

-- ============================================================
-- ACADEMIC TERMS
-- ============================================================
INSERT INTO academic_terms (name, term_code, start_date, end_date, is_current, is_active) VALUES
('Spring 2024', 'SP2024', '2024-01-15', '2024-05-10', FALSE, TRUE),
('Fall 2024',   'FA2024', '2024-08-19', '2024-12-15', FALSE, TRUE),
('Spring 2025', 'SP2025', '2025-01-20', '2025-05-16', FALSE, TRUE),
('Fall 2025',   'FA2025', '2025-08-18', '2025-12-12', FALSE, TRUE),
('Spring 2026', 'SP2026', '2026-01-19', '2026-05-15', FALSE, TRUE),
('Fall 2026',   'FA2026', '2026-08-17', '2026-12-14', TRUE,  TRUE);

-- ============================================================
-- REGISTRATION PERIODS (Fall 2026 is current & open)
-- ============================================================
INSERT INTO registration_periods (term_id, name, start_datetime, end_datetime, eligible_years) VALUES
(6, 'Fall 2026 Open Registration',
    '2026-07-01 00:00:00+00', '2026-09-30 23:59:59+00', '{1,2,3,4,5,6}');

-- ============================================================
-- COURSES (25+ courses)
-- ============================================================
INSERT INTO courses (code, name, description, department_id, credits, course_level, category) VALUES
-- Computer Science
('CS101', 'Introduction to Programming',        'Fundamentals of programming using Python. Variables, loops, functions, and basic data structures.', 1, 3, 100, 'core'),
('CS201', 'Data Structures and Algorithms',     'Arrays, linked lists, trees, graphs, sorting, and searching algorithms.', 1, 3, 200, 'core'),
('CS301', 'Database Management Systems',        'Relational databases, SQL, normalization, transactions, and database design.', 1, 3, 300, 'core'),
('CS302', 'Operating Systems',                  'Process management, memory management, file systems, and concurrency.', 1, 3, 300, 'core'),
('CS303', 'Computer Networks',                  'Network protocols, TCP/IP stack, routing, and distributed systems fundamentals.', 1, 3, 300, 'core'),
('CS401', 'Machine Learning',                   'Supervised and unsupervised learning, neural networks, model evaluation.', 1, 3, 400, 'elective'),
('CS402', 'Artificial Intelligence',            'Search algorithms, knowledge representation, planning, and NLP.', 1, 3, 400, 'elective'),
('CS403', 'Software Engineering',               'SDLC, design patterns, testing, agile methodologies, version control.', 1, 3, 400, 'core'),
('CS404', 'Compiler Design',                    'Lexical analysis, parsing, semantic analysis, and code generation.', 1, 3, 400, 'elective'),
('CS499', 'Capstone Project',                   'Semester-long group project integrating all CS concepts.', 1, 3, 400, 'project'),
('CS150L', 'Programming Lab',                   'Hands-on programming lab complementing CS101 and CS201.', 1, 1, 100, 'lab'),
-- Mathematics
('MATH101', 'Calculus I',                        'Limits, derivatives, applications of differentiation.', 2, 4, 100, 'core'),
('MATH102', 'Calculus II',                       'Integration techniques, series, and applications.', 2, 4, 100, 'core'),
('MATH201', 'Linear Algebra',                    'Vectors, matrices, eigenvalues, and linear transformations.', 2, 3, 200, 'core'),
('MATH202', 'Discrete Mathematics',              'Logic, sets, combinatorics, graph theory, and proofs.', 2, 3, 200, 'core'),
('MATH301', 'Probability and Statistics',        'Probability theory, distributions, hypothesis testing, regression.', 2, 3, 300, 'core'),
('MATH401', 'Numerical Methods',                 'Numerical solutions to mathematical problems, error analysis.', 2, 3, 400, 'elective'),
-- Physics
('PHY101', 'Physics I - Mechanics',              'Kinematics, dynamics, energy, and momentum.', 3, 4, 100, 'core'),
('PHY201', 'Physics II - Electromagnetism',      'Electric fields, magnetism, Maxwell equations.', 3, 4, 200, 'core'),
('PHY301', 'Quantum Mechanics',                  'Wave functions, Schrödinger equation, quantum states.', 3, 3, 300, 'elective'),
-- Electrical Engineering
('EE201', 'Circuit Theory',                      'KVL, KCL, AC/DC circuits, Thevenin and Norton equivalents.', 4, 3, 200, 'core'),
('EE301', 'Digital Electronics',                 'Boolean algebra, logic gates, flip-flops, sequential circuits.', 4, 3, 300, 'core'),
-- Biology
('BIO101', 'Introduction to Biology',            'Cell biology, genetics, evolution, and ecology.', 5, 3, 100, 'core'),
-- Business
('MBA201', 'Business Statistics',                'Statistical methods for business decision-making.', 7, 3, 200, 'core'),
('MBA301', 'Project Management',                 'Planning, execution, risk management, and agile frameworks.', 7, 3, 300, 'elective');

-- ============================================================
-- COURSE PREREQUISITES
-- ============================================================
INSERT INTO course_prerequisites (course_id, prerequisite_id, is_mandatory) VALUES
-- CS201 requires CS101
((SELECT id FROM courses WHERE code='CS201'),  (SELECT id FROM courses WHERE code='CS101'),  TRUE),
-- CS301 requires CS201 and MATH202
((SELECT id FROM courses WHERE code='CS301'),  (SELECT id FROM courses WHERE code='CS201'),  TRUE),
((SELECT id FROM courses WHERE code='CS301'),  (SELECT id FROM courses WHERE code='MATH202'), TRUE),
-- CS302 requires CS201
((SELECT id FROM courses WHERE code='CS302'),  (SELECT id FROM courses WHERE code='CS201'),  TRUE),
-- CS303 requires CS302
((SELECT id FROM courses WHERE code='CS303'),  (SELECT id FROM courses WHERE code='CS302'),  TRUE),
-- CS401 requires CS201 and MATH301
((SELECT id FROM courses WHERE code='CS401'),  (SELECT id FROM courses WHERE code='CS201'),  TRUE),
((SELECT id FROM courses WHERE code='CS401'),  (SELECT id FROM courses WHERE code='MATH301'), TRUE),
-- CS402 requires CS201 and MATH202
((SELECT id FROM courses WHERE code='CS402'),  (SELECT id FROM courses WHERE code='CS201'),  TRUE),
((SELECT id FROM courses WHERE code='CS402'),  (SELECT id FROM courses WHERE code='MATH202'), TRUE),
-- CS403 requires CS201
((SELECT id FROM courses WHERE code='CS403'),  (SELECT id FROM courses WHERE code='CS201'),  TRUE),
-- CS404 requires CS201 and MATH202
((SELECT id FROM courses WHERE code='CS404'),  (SELECT id FROM courses WHERE code='CS201'),  TRUE),
-- CS499 requires CS403
((SELECT id FROM courses WHERE code='CS499'),  (SELECT id FROM courses WHERE code='CS403'),  TRUE),
-- MATH102 requires MATH101
((SELECT id FROM courses WHERE code='MATH102'), (SELECT id FROM courses WHERE code='MATH101'), TRUE),
-- MATH201 requires MATH101
((SELECT id FROM courses WHERE code='MATH201'), (SELECT id FROM courses WHERE code='MATH101'), TRUE),
-- MATH301 requires MATH102 and MATH201
((SELECT id FROM courses WHERE code='MATH301'), (SELECT id FROM courses WHERE code='MATH102'), TRUE),
((SELECT id FROM courses WHERE code='MATH301'), (SELECT id FROM courses WHERE code='MATH201'), TRUE),
-- PHY201 requires PHY101
((SELECT id FROM courses WHERE code='PHY201'),  (SELECT id FROM courses WHERE code='PHY101'),  TRUE),
-- PHY301 requires PHY201 and MATH301
((SELECT id FROM courses WHERE code='PHY301'),  (SELECT id FROM courses WHERE code='PHY201'),  TRUE),
-- EE301 requires EE201
((SELECT id FROM courses WHERE code='EE301'),   (SELECT id FROM courses WHERE code='EE201'),   TRUE);

-- ============================================================
-- COURSE OFFERINGS (Fall 2026 - term_id=6)
-- ============================================================
INSERT INTO course_offerings (course_id, term_id, faculty_id, section, room, capacity, enrolled_count, status) VALUES
-- CS offerings
((SELECT id FROM courses WHERE code='CS101'),  6, 1, 'A', 'CS-101', 40, 35, 'open'),  -- 1
((SELECT id FROM courses WHERE code='CS101'),  6, 3, 'B', 'CS-102', 35, 30, 'open'),  -- 2
((SELECT id FROM courses WHERE code='CS201'),  6, 2, 'A', 'CS-201', 35, 33, 'open'),  -- 3  ← 2 seats left
((SELECT id FROM courses WHERE code='CS301'),  6, 1, 'A', 'CS-301', 30, 28, 'open'),  -- 4
((SELECT id FROM courses WHERE code='CS302'),  6, 3, 'A', 'CS-302', 30, 20, 'open'),  -- 5
((SELECT id FROM courses WHERE code='CS303'),  6, 3, 'A', 'CS-303', 28, 15, 'open'),  -- 6
((SELECT id FROM courses WHERE code='CS401'),  6, 8, 'A', 'CS-401', 25, 22, 'open'),  -- 7
((SELECT id FROM courses WHERE code='CS402'),  6, 8, 'A', 'CS-402', 25, 18, 'open'),  -- 8
((SELECT id FROM courses WHERE code='CS403'),  6, 2, 'A', 'CS-403', 30, 25, 'open'),  -- 9
((SELECT id FROM courses WHERE code='CS499'),  6, 2, 'A', 'CS-499', 20, 10, 'open'),  -- 10
((SELECT id FROM courses WHERE code='CS150L'), 6, 1, 'A', 'CS-LAB', 20, 18, 'open'),  -- 11
-- MATH offerings
((SELECT id FROM courses WHERE code='MATH101'), 6, 4, 'A', 'MT-101', 50, 45, 'open'), -- 12
((SELECT id FROM courses WHERE code='MATH101'), 6, 5, 'B', 'MT-102', 50, 40, 'open'), -- 13
((SELECT id FROM courses WHERE code='MATH102'), 6, 4, 'A', 'MT-201', 40, 38, 'open'), -- 14
((SELECT id FROM courses WHERE code='MATH201'), 6, 4, 'A', 'MT-301', 35, 30, 'open'), -- 15
((SELECT id FROM courses WHERE code='MATH202'), 6, 5, 'A', 'MT-302', 35, 25, 'open'), -- 16
((SELECT id FROM courses WHERE code='MATH301'), 6, 5, 'A', 'MT-401', 30, 20, 'open'), -- 17
-- PHY offerings
((SELECT id FROM courses WHERE code='PHY101'),  6, 6, 'A', 'PH-101', 45, 40, 'open'), -- 18
((SELECT id FROM courses WHERE code='PHY201'),  6, 6, 'A', 'PH-201', 35, 25, 'open'), -- 19
-- EE offerings
((SELECT id FROM courses WHERE code='EE201'),   6, 7, 'A', 'EE-101', 30, 20, 'open'), -- 20
((SELECT id FROM courses WHERE code='EE301'),   6, 7, 'A', 'EE-201', 25, 15, 'open'), -- 21
-- Bio, MBA
((SELECT id FROM courses WHERE code='BIO101'),  6, 9, 'A', 'BI-101', 40, 30, 'open'), -- 22
((SELECT id FROM courses WHERE code='MBA201'),  6, 10,'A', 'MB-101', 35, 28, 'open'), -- 23
((SELECT id FROM courses WHERE code='MBA301'),  6, 10,'A', 'MB-201', 30, 25, 'open'), -- 24
-- FULL COURSE for concurrency demo (CS201-B, 1 seat left)
((SELECT id FROM courses WHERE code='CS201'),  6, 2, 'C', 'CS-203', 10, 9, 'open');   -- 25 ← ONLY 1 SEAT

-- ============================================================
-- COURSE SCHEDULES
-- ============================================================
INSERT INTO course_schedules (offering_id, day_of_week, start_time, end_time) VALUES
-- CS101-A: Mon/Wed/Fri 8:00-9:00
(1, 'monday', '08:00', '09:00'), (1, 'wednesday', '08:00', '09:00'), (1, 'friday', '08:00', '09:00'),
-- CS101-B: Tue/Thu 9:30-11:00
(2, 'tuesday', '09:30', '11:00'), (2, 'thursday', '09:30', '11:00'),
-- CS201-A: Mon/Wed/Fri 10:00-11:00
(3, 'monday', '10:00', '11:00'), (3, 'wednesday', '10:00', '11:00'), (3, 'friday', '10:00', '11:00'),
-- CS301: Tue/Thu 11:00-12:30
(4, 'tuesday', '11:00', '12:30'), (4, 'thursday', '11:00', '12:30'),
-- CS302: Mon/Wed 13:00-14:30
(5, 'monday', '13:00', '14:30'), (5, 'wednesday', '13:00', '14:30'),
-- CS303: Tue/Thu 14:00-15:30
(6, 'tuesday', '14:00', '15:30'), (6, 'thursday', '14:00', '15:30'),
-- CS401: Mon/Wed/Fri 14:00-15:00
(7, 'monday', '14:00', '15:00'), (7, 'wednesday', '14:00', '15:00'), (7, 'friday', '14:00', '15:00'),
-- CS402: Tue/Thu 09:00-10:30
(8, 'tuesday', '09:00', '10:30'), (8, 'thursday', '09:00', '10:30'),
-- CS403: Mon/Wed 09:00-10:30
(9, 'monday', '09:00', '10:30'), (9, 'wednesday', '09:00', '10:30'),
-- CS499: Fri 13:00-16:00
(10, 'friday', '13:00', '16:00'),
-- CS150L: Fri 09:00-11:00
(11, 'friday', '09:00', '11:00'),
-- MATH101-A: Mon/Wed/Fri 08:00-09:00
(12, 'monday', '08:00', '09:00'), (12, 'wednesday', '08:00', '09:00'), (12, 'friday', '08:00', '09:00'),
-- MATH101-B: Tue/Thu 08:00-09:30
(13, 'tuesday', '08:00', '09:30'), (13, 'thursday', '08:00', '09:30'),
-- MATH102: Mon/Wed/Fri 09:00-10:00
(14, 'monday', '09:00', '10:00'), (14, 'wednesday', '09:00', '10:00'), (14, 'friday', '09:00', '10:00'),
-- MATH201: Tue/Thu 11:00-12:30
(15, 'tuesday', '11:00', '12:30'), (15, 'thursday', '11:00', '12:30'),
-- MATH202: Mon/Wed 11:00-12:30
(16, 'monday', '11:00', '12:30'), (16, 'wednesday', '11:00', '12:30'),
-- MATH301: Tue/Thu 13:00-14:30
(17, 'tuesday', '13:00', '14:30'), (17, 'thursday', '13:00', '14:30'),
-- PHY101: Mon/Wed/Fri 11:00-12:00
(18, 'monday', '11:00', '12:00'), (18, 'wednesday', '11:00', '12:00'), (18, 'friday', '11:00', '12:00'),
-- PHY201: Tue/Thu 15:00-16:30
(19, 'tuesday', '15:00', '16:30'), (19, 'thursday', '15:00', '16:30'),
-- EE201: Mon/Wed 15:00-16:30
(20, 'monday', '15:00', '16:30'), (20, 'wednesday', '15:00', '16:30'),
-- EE301: Tue/Thu 13:00-14:30
(21, 'tuesday', '13:00', '14:30'), (21, 'thursday', '13:00', '14:30'),
-- BIO101: Mon/Wed/Fri 13:00-14:00
(22, 'monday', '13:00', '14:00'), (22, 'wednesday', '13:00', '14:00'), (22, 'friday', '13:00', '14:00'),
-- MBA201: Tue/Thu 09:30-11:00
(23, 'tuesday', '09:30', '11:00'), (23, 'thursday', '09:30', '11:00'),
-- MBA301: Mon/Wed 16:00-17:30
(24, 'monday', '16:00', '17:30'), (24, 'wednesday', '16:00', '17:30'),
-- CS201-C (1-seat): Tue/Thu 11:00-12:30
(25, 'tuesday', '11:00', '12:30'), (25, 'thursday', '11:00', '12:30');

-- ============================================================
-- STUDENTS (30 students with variety of years and departments)
-- ============================================================
DO $$
DECLARE
    uid INTEGER;
    dept_ids INTEGER[] := ARRAY[1,1,1,1,1,2,2,2,3,3,4,4,5,7,7,1,1,1,1,1,2,2,3,4,5,1,1,1,2,2];
    years INTEGER[]    := ARRAY[1,1,2,2,2,2,3,3,3,3,4,4,4,4,4,1,2,3,4,1,2,3,2,3,4,3,4,2,3,1];
    fnames TEXT[] := ARRAY['Liam','Emma','Noah','Olivia','Ava','Sophia','Jackson','Isabella','Lucas','Mia',
                           'Ethan','Amelia','Aiden','Harper','James','Charlotte','Oliver','Evelyn','Benjamin','Aria',
                           'Elijah','Scarlett','Logan','Grace','Mason','Chloe','Alexander','Riley','Sebastian','Zoey'];
    lnames TEXT[] := ARRAY['Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Taylor','Anderson',
                           'Thomas','Jackson','White','Harris','Martin','Thompson','Martinez','Robinson','Clark','Lewis',
                           'Lee','Walker','Hall','Allen','Young','King','Wright','Scott','Torres','Flores'];
    emails TEXT[];
    i INTEGER;
    student_num TEXT;
BEGIN
    SELECT ARRAY(SELECT email FROM users WHERE role='student' ORDER BY id) INTO emails;
    FOR i IN 1..30 LOOP
        SELECT id INTO uid FROM users WHERE email = emails[i];
        student_num := 'STU2024' || LPAD(i::TEXT, 3, '0');
        INSERT INTO students (user_id, student_id, first_name, last_name, date_of_birth,
                              department_id, enrollment_year, current_year, max_credits, gpa)
        VALUES (uid, student_num, fnames[i], lnames[i],
                ('2000-01-01'::DATE + (i * 37 || ' days')::INTERVAL),
                dept_ids[i],
                2024 - years[i] + 1,
                years[i],
                18,
                ROUND((2.5 + (i % 15) * 0.1)::NUMERIC, 2));
    END LOOP;
END;
$$;

-- ============================================================
-- COMPLETED COURSES (historical transcript for older students)
-- ============================================================
INSERT INTO completed_courses (student_id, course_id, term_id, grade, credits_earned, completed_at)
SELECT s.id,
       c.id,
       3,  -- Spring 2025
       CASE (ROW_NUMBER() OVER ())%5
           WHEN 0 THEN 'A'
           WHEN 1 THEN 'B+'
           WHEN 2 THEN 'A-'
           WHEN 3 THEN 'B'
           ELSE        'A+'
       END,
       c.credits,
       '2025-05-16'
FROM students s
CROSS JOIN courses c
WHERE c.code IN ('CS101', 'MATH101', 'MATH202', 'CS201', 'MATH102', 'MATH201', 'PHY101')
  AND s.current_year >= 2
ON CONFLICT DO NOTHING;

-- Additional completions for year 3+ students
INSERT INTO completed_courses (student_id, course_id, term_id, grade, credits_earned, completed_at)
SELECT s.id, c.id, 4, 'B+', c.credits, '2025-12-12'
FROM students s
CROSS JOIN courses c
WHERE c.code IN ('CS301', 'CS302', 'MATH301', 'PHY201')
  AND s.current_year >= 3
ON CONFLICT DO NOTHING;

-- ============================================================
-- ENROLLMENTS (realistic distribution for Fall 2026)
-- ============================================================
-- Students 1-10 (year 1-2): Enroll in intro courses
INSERT INTO enrollments (student_id, offering_id, status)
SELECT s.id, 1, 'registered'   -- CS101-A
FROM students s WHERE s.current_year = 1 LIMIT 8
ON CONFLICT DO NOTHING;

INSERT INTO enrollments (student_id, offering_id, status)
SELECT s.id, 12, 'registered'  -- MATH101-A
FROM students s WHERE s.current_year = 1 LIMIT 8
ON CONFLICT DO NOTHING;

-- Year 2 students in CS201
INSERT INTO enrollments (student_id, offering_id, status)
SELECT s.id, 3, 'registered'   -- CS201-A
FROM students s WHERE s.current_year = 2 LIMIT 5
ON CONFLICT DO NOTHING;

INSERT INTO enrollments (student_id, offering_id, status)
SELECT s.id, 16, 'registered'  -- MATH202
FROM students s WHERE s.current_year = 2 LIMIT 5
ON CONFLICT DO NOTHING;

-- Year 3 students in CS301, CS302
INSERT INTO enrollments (student_id, offering_id, status)
SELECT s.id, 4, 'registered'   -- CS301
FROM students s WHERE s.current_year = 3 LIMIT 6
ON CONFLICT DO NOTHING;

INSERT INTO enrollments (student_id, offering_id, status)
SELECT s.id, 5, 'registered'   -- CS302
FROM students s WHERE s.current_year = 3 LIMIT 4
ON CONFLICT DO NOTHING;

-- Year 4 students in CS401, CS403
INSERT INTO enrollments (student_id, offering_id, status)
SELECT s.id, 7, 'registered'   -- CS401
FROM students s WHERE s.current_year = 4 LIMIT 4
ON CONFLICT DO NOTHING;

INSERT INTO enrollments (student_id, offering_id, status)
SELECT s.id, 9, 'registered'   -- CS403
FROM students s WHERE s.current_year = 4 LIMIT 4
ON CONFLICT DO NOTHING;

-- Student 1 has a DROPPED course (for history demo)
INSERT INTO enrollments (student_id, offering_id, status, dropped_at, drop_reason)
SELECT id, 2, 'dropped', NOW() - INTERVAL '5 days', 'Schedule conflict with work'
FROM students WHERE student_id = 'STU2024001'
ON CONFLICT DO NOTHING;

-- ============================================================
-- WAITLIST ENTRIES (for near-full CS201-C offering=25)
-- ============================================================
INSERT INTO waitlist_entries (student_id, offering_id, position, status)
SELECT s.id, 25, ROW_NUMBER() OVER (ORDER BY s.id), 'waiting'
FROM students s
WHERE s.current_year >= 2
LIMIT 3;

UPDATE course_offerings SET waitlist_count = 3 WHERE id = 25;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
INSERT INTO notifications (user_id, title, message, type)
SELECT u.id,
       'Welcome to Fall 2026!',
       'Course registration for Fall 2026 is now open. Browse the catalog to register.',
       'info'
FROM users u WHERE u.role = 'student';

INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
SELECT we.student_id + 10,  -- approximate user_id offset
       'You are on the Waitlist',
       'You have been added to the waitlist for CS201-C. You will be notified if a seat opens.',
       'warning',
       25, 'offering'
FROM waitlist_entries we
WHERE we.status = 'waiting';

COMMIT;
