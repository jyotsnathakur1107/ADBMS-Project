const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const hash = '$2b$10$xRp/sFXHrkIGeLIz9jXduOPMplwFHQMZfsHrxH6gGNmnjwxP1yG0a';

pool.query('UPDATE users SET password_hash = $1', [hash], (err, res) => {
  if (err) {
    console.error('Error updating passwords:', err);
    process.exit(1);
  }
  console.log(`Successfully updated ${res.rowCount} users with bcrypt hash for 'Demo@1234'`);
  pool.end();
});

