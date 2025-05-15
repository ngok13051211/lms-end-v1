import { db } from "./index";
import * as schema from "@shared/schema";
import { faker } from "@faker-js/faker/locale/vi";
import bcrypt from "bcrypt";

async function seed() {
  try {
    console.log("Seeding database...");

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const [admin] = await db
      .insert(schema.users)
      .values({
        username: "admin",
        email: "admin@homitutor.vn",
        password: adminPassword,
        first_name: "Admin",
        last_name: "User",
        role: "admin",
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning()
      .onConflictDoNothing();

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
