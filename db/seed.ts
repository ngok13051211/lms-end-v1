// seed.ts
import { db } from "./index";
import * as schema from "@shared/schema";
import { faker } from "@faker-js/faker/locale/vi";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function seed() {
  try {
    console.log("Seeding database...");

    // Admin
    let [admin] = await db.select().from(schema.users).where(eq(schema.users.email, "admin@homitutor.vn"));
    if (!admin) {
      [admin] = await db.insert(schema.users).values({
        username: "admin",
        email: "admin@homitutor.vn",
        password: await bcrypt.hash("admin123", 10),
        first_name: "Admin",
        last_name: "User",
        role: "admin",
        is_verified: true,
        is_active: true,
        avatar: faker.image.avatar(),
        phone: faker.phone.number("0#########"),
        created_at: new Date(),
        updated_at: new Date(),
      }).returning();
    }

    // Subjects
    const subjects = [
      { name: "Toán học", icon: "calculate", description: "Môn toán học phổ thông" },
      { name: "Tiếng Anh", icon: "language", description: "Môn tiếng Anh phổ thông" },
      { name: "Hóa học", icon: "science", description: "Môn hóa học phổ thông" },
      { name: "Vật lý", icon: "bolt", description: "Môn vật lý phổ thông" },
      { name: "Ngữ văn", icon: "book-open", description: "Môn ngữ văn phổ thông" },
    ];

    for (const sub of subjects) {
      await db.insert(schema.subjects).values({
        ...sub,
        hourly_rate: "150000",
        created_at: new Date(),
        updated_at: new Date(),
      }).onConflictDoNothing();
    }

    // Education Levels
    const levels = [
      { name: "Tiểu học", description: "Dành cho học sinh tiểu học" },
      { name: "Trung học", description: "Dành cho học sinh cấp 2, cấp 3" },
      { name: "Đại học", description: "Dành cho sinh viên đại học" },
    ];

    for (const level of levels) {
      await db.insert(schema.educationLevels).values({
        ...level,
        created_at: new Date(),
        updated_at: new Date(),
      }).onConflictDoNothing();
    }

    // Students
    for (let i = 11; i <= 20; i++) {
      const [student] = await db.insert(schema.users).values({
        username: `student${i}`,
        email: `student${i}@homitutor.vn`,
        password: await bcrypt.hash("student123", 10),
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        role: "student",
        date_of_birth: "2005-01-01",
        address: faker.location.city(),
        phone: faker.phone.number("0#########"),
        avatar: faker.image.avatar(),
        is_verified: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }).onConflictDoNothing().returning();
    }

    // Tutors
    for (let i = 11; i <= 20; i++) {
      const [tutorUser] = await db.insert(schema.users).values({
        username: `tutor${i}`,
        email: `tutor${i}@homitutor.vn`,
        password: await bcrypt.hash("tutor123", 10),
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        role: "tutor",
        date_of_birth: "1990-01-01",
        address: faker.location.city(),
        phone: faker.phone.number("0#########"),
        avatar: faker.image.avatar(),
        is_verified: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }).onConflictDoNothing().returning();

      await db.insert(schema.tutorProfiles).values({
        user_id: tutorUser.id,
        bio: faker.lorem.sentence(),
        availability: JSON.stringify({ monday: ["08:00-10:00"] }),
        is_verified: true,
        is_featured: false,
        rating: "4.0",
        total_reviews: 0,
        created_at: new Date(),
        updated_at: new Date(),
      }).onConflictDoNothing();
    }

    console.log("✅ Seeding completed successfully.");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}

seed();
