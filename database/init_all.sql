-- ============================================================
-- init_all.sql - Master Orchestration Script
-- Runs all database setup scripts in strict dependency order:
-- 1. Schema Definition & Constraints
-- 2. Stored Functions (PL/pgSQL)
-- 3. Stored Procedures (CALL sp_*)
-- 4. Triggers & Automation
-- 5. Views & Materialized Views
-- 6. Indexes & Full-Text Search
-- 7. Realistic Seed Data & Demo Accounts
-- ============================================================

\echo '---------------------------------------------------'
\echo '1/7: Initializing Schema & Constraints...'
\i schema.sql

\echo '---------------------------------------------------'
\echo '2/7: Compiling PL/pgSQL Functions...'
\i functions.sql

\echo '---------------------------------------------------'
\echo '3/7: Compiling Stored Procedures...'
\i procedures.sql

\echo '---------------------------------------------------'
\echo '4/7: Attaching Database Triggers...'
\i triggers.sql

\echo '---------------------------------------------------'
\echo '5/7: Building Views & Materialized Views...'
\i views.sql

\echo '---------------------------------------------------'
\echo '6/7: Creating B-Tree, Composite, & Partial Indexes...'
\i indexes.sql

\echo '---------------------------------------------------'
\echo '7/7: Seeding Realistic Academic Dataset...'
\i seed.sql

\echo '---------------------------------------------------'
\echo 'Database initialization complete!'
\echo 'Refresh materialized view concurrently...'
REFRESH MATERIALIZED VIEW mv_admin_dashboard_analytics;
\echo 'All 15 tables, 10 functions, 3 procedures, 7 triggers, 6 views, 20+ indexes loaded.'

