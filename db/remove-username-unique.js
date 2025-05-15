// Migration script to remove the unique constraint from username field
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Running migration to remove unique constraint from username...');

    // Read SQL file
    const sqlFile = path.join(__dirname, 'remove_username_unique.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // Execute SQL
    await pool.query(sqlContent);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();