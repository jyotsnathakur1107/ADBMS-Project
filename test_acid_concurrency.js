// test_acid_concurrency.js - Automated Concurrency & ACID Verification Script
const { Pool } = require('./server/node_modules/pg');
require('./server/node_modules/dotenv').config({ path: './server/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'course_registration',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function runConcurrencyTest() {
  console.log('===============================================================');
  console.log('🧪 RUNNING ACID & CONCURRENCY VERIFICATION (SELECT FOR UPDATE)');
  console.log('   Testing Race Condition Prevention on 1 Remaining Seat');
  console.log('===============================================================\n');

  const clientSetup = await pool.connect();
  let testOfferingId;
  let student1Id;
  let student2Id;

  try {
    // 1. Find or create an offering with capacity = 1 and enrolled_count = 0
    await clientSetup.query('BEGIN');

    // Find two distinct active students
    const studentsRes = await clientSetup.query(`
      SELECT s.id, u.email 
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE u.is_active = TRUE
      LIMIT 2
    `);

    if (studentsRes.rows.length < 2) {
      throw new Error('Need at least 2 active students in database for concurrency test.');
    }

    student1Id = studentsRes.rows[0].id;
    student2Id = studentsRes.rows[1].id;
    console.log(`👤 Student A: ID ${student1Id} (${studentsRes.rows[0].email})`);
    console.log(`👤 Student B: ID ${student2Id} (${studentsRes.rows[1].email})`);

    // Get an active term
    const termRes = await clientSetup.query(`SELECT id FROM academic_terms WHERE is_current = TRUE LIMIT 1`);
    const termId = termRes.rows[0].id;

    // Ensure registration period is open for this term and all student years
    await clientSetup.query(`
      INSERT INTO registration_periods (term_id, name, start_datetime, end_datetime, eligible_years, is_active)
      VALUES ($1, 'Fall 2026 Active Period', NOW() - INTERVAL '2 days', NOW() + INTERVAL '30 days', ARRAY[1, 2, 3, 4], TRUE)
      ON CONFLICT DO NOTHING
    `, [termId]);
    await clientSetup.query(`
      UPDATE registration_periods
      SET start_datetime = NOW() - INTERVAL '2 days',
          end_datetime = NOW() + INTERVAL '30 days',
          is_active = TRUE,
          eligible_years = ARRAY[1, 2, 3, 4]
      WHERE term_id = $1
    `, [termId]);

    // Get a course
    const courseRes = await clientSetup.query(`SELECT id, code, name FROM courses WHERE code = 'CS101' LIMIT 1`);
    const courseId = courseRes.rows[0].id;

    // Create a temporary test section with exactly 1 seat
    const offeringRes = await clientSetup.query(`
      INSERT INTO course_offerings (course_id, term_id, section, capacity, enrolled_count, waitlist_count, status, room)
      VALUES ($1, $2, 'CT1', 1, 0, 0, 'open', 'LAB-101')
      ON CONFLICT (course_id, term_id, section)
      DO UPDATE SET capacity = 1, enrolled_count = 0, waitlist_count = 0, status = 'open'
      RETURNING id, capacity, enrolled_count
    `, [courseId, termId]);

    testOfferingId = offeringRes.rows[0].id;

    // Clean up any existing enrollments/waitlists for these students in this test section
    await clientSetup.query(`DELETE FROM waitlist_entries WHERE offering_id = $1`, [testOfferingId]);
    await clientSetup.query(`DELETE FROM enrollments WHERE offering_id = $1`, [testOfferingId]);

    await clientSetup.query('COMMIT');
    console.log(`\n🏫 Created Test Offering: ID ${testOfferingId} (Capacity: 1, Enrolled: 0)`);

  } catch (err) {
    await clientSetup.query('ROLLBACK');
    console.error('Setup failed:', err);
    clientSetup.release();
    process.exit(1);
  } finally {
    clientSetup.release();
  }

  // 2. Spin up two independent connections to simulate two students pressing "Register" at the same millisecond
  console.log('\n⚡ Dispatching simultaneous registration transactions...');
  const clientA = await pool.connect();
  const clientB = await pool.connect();

  const registerStudent = async (client, studentId, studentLabel) => {
    try {
      // Execute the transactional PL/pgSQL function fn_register_student
      // fn_register_student uses SELECT ... FOR UPDATE on course_offerings to serialize concurrent attempts
      const res = await client.query(`
        SELECT result, message 
        FROM fn_register_student($1, $2, $3)
      `, [studentId, testOfferingId, null]);

      return { student: studentLabel, studentId, data: res.rows[0] };
    } catch (err) {
      return { student: studentLabel, studentId, error: err.message };
    }
  };

  const [resA, resB] = await Promise.all([
    registerStudent(clientA, student1Id, 'Student A'),
    registerStudent(clientB, student2Id, 'Student B')
  ]);

  clientA.release();
  clientB.release();

  console.log('\n📊 Concurrency Execution Results:');
  console.log('   Result A:', resA.data ? `${resA.data.result}: ${resA.data.message}` : resA.error);
  console.log('   Result B:', resB.data ? `${resB.data.result}: ${resB.data.message}` : resB.error);

  // 3. Verification of PostgreSQL invariants
  const clientVerify = await pool.connect();
  const finalOffering = await clientVerify.query(`
    SELECT id, enrolled_count, capacity, waitlist_count
    FROM course_offerings
    WHERE id = $1
  `, [testOfferingId]);

  const finalEnrollments = await clientVerify.query(`
    SELECT student_id, status, registered_at
    FROM enrollments
    WHERE offering_id = $1 AND status = 'registered'
  `, [testOfferingId]);

  const auditLogs = await clientVerify.query(`
    SELECT action, status, details, created_at
    FROM registration_audit_logs
    WHERE offering_id = $1
    ORDER BY created_at DESC
  `, [testOfferingId]);

  clientVerify.release();

  console.log('\n🔍 Database Invariant Checks:');
  const enrolledCount = finalOffering.rows[0].enrolled_count;
  const capacity = finalOffering.rows[0].capacity;
  const activeEnrollments = finalEnrollments.rows.length;

  console.log(`   - Enrolled count in database: ${enrolledCount}`);
  console.log(`   - Maximum capacity:           ${capacity}`);
  console.log(`   - Number of registered rows:  ${activeEnrollments}`);
  console.log(`   - Audit log entries created:  ${auditLogs.rows.length}`);

  let testPassed = true;

  if (enrolledCount !== 1) {
    console.error(`   ❌ Invariant Violation: enrolled_count should be exactly 1, found ${enrolledCount}`);
    testPassed = false;
  }

  if (activeEnrollments !== 1) {
    console.error(`   ❌ Invariant Violation: active enrollments should be exactly 1, found ${activeEnrollments}`);
    testPassed = false;
  }

  const successCount = [resA, resB].filter(r => r.data && r.data.result === 'success').length;
  if (successCount !== 1) {
    console.error(`   ❌ Invariant Violation: Exactly 1 transaction should succeed, found ${successCount}`);
    testPassed = false;
  } else {
    console.log(`   ✅ Race condition cleanly handled! Exactly 1 student secured the final seat.`);
  }

  if (auditLogs.rows.length > 0) {
    console.log(`   ✅ PostgreSQL Audit trigger recorded ${auditLogs.rows.length} immutable events in registration_audit_logs.`);
  }

  console.log('===============================================================');
  if (testPassed) {
    console.log('🎉 ACID & CONCURRENCY TEST PASSED (Pessimistic Locking Verified)');
  } else {
    console.log('❌ ACID & CONCURRENCY TEST FAILED');
  }
  console.log('===============================================================');

  await pool.end();
  process.exit(testPassed ? 0 : 1);
}

runConcurrencyTest();
