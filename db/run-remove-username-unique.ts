import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  // Check for required environment variable
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  // Create database connection
  const sql = postgres(dbUrl);
  const db = drizzle(sql);

  console.log("Running username unique constraint removal migration...");

  try {
    // Read and execute the SQL
    const sqlFile = path.join(__dirname, "remove_username_unique.sql");
    const sqlContent = fs.readFileSync(sqlFile, "utf8");

    // Execute the SQL directly
    await sql.unsafe(sqlContent);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    // Close database connection
    await sql.end();
  }
}

main();