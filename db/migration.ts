import { db, pool } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Running migration...");

  try {
    console.log("Connected to database successfully");

    try {
      // Check if reviews table exists
      const tableResult = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_name = 'reviews'
        );
      `);

      console.log("Table check result:", tableResult);

      // Check if course_id column exists in reviews table
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'reviews'
          AND column_name = 'course_id'
        );
      `);

      console.log("Column check result:", result);

      const columnExists = result.rows[0]?.exists;

      if (columnExists !== true) {
        console.log("Adding course_id column to reviews table...");
        await db.execute(sql`
          ALTER TABLE reviews
          ADD COLUMN course_id INTEGER REFERENCES courses(id);
        `);
        console.log("Migration completed successfully!");
      } else {
        console.log("course_id column already exists in reviews table.");
      }
    } catch (queryError) {
      console.error("Query error:", queryError);
    }
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    console.log("Closing database connection...");
    await pool.end();
    console.log("Database connection closed");
  }
}

main().catch((err) => {
  console.error("Unhandled error in main:", err);
});
