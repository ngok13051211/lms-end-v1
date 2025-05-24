// Debug script to check course status values in database
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

async function debugCourseStatus() {
    try {
        console.log('Checking course status values in database...');

        // Get all unique status values
        const statusValues = await db.execute(sql`
      SELECT DISTINCT status, COUNT(*) as count 
      FROM courses 
      GROUP BY status 
      ORDER BY count DESC
    `);

        console.log('Status values found:');
        console.table(statusValues.rows);

        // Get some sample courses with their status
        const sampleCourses = await db.execute(sql`
      SELECT id, title, status, tutor_id, created_at 
      FROM courses 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

        console.log('Sample courses:');
        console.table(sampleCourses.rows);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

debugCourseStatus();
