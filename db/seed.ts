import { db } from "./index";
import * as schema from "@shared/schema";
import { faker } from "@faker-js/faker/locale/vi";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function seed() {
  try {
    console.log("Seeding database...");

    // Admin user
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
        avatar: faker.image.avatar(),
        phone: faker.phone.number("0#########"),
        created_at: new Date(),
        updated_at: new Date(),
      }).returning();
    }

    // Student
    let [student] = await db.select().from(schema.users).where(eq(schema.users.email, "student1@example.com"));
    if (!student) {
      [student] = await db.insert(schema.users).values({
        username: "student1",
        email: "student1@example.com",
        password: await bcrypt.hash("student123", 10),
        first_name: "Student",
        last_name: "One",
        role: "student",
        is_verified: true,
        avatar: faker.image.avatar(),
        phone: faker.phone.number("0#########"),
        created_at: new Date(),
        updated_at: new Date(),
      }).returning();
    }

    // Tutor
    let [tutorUser] = await db.select().from(schema.users).where(eq(schema.users.email, "tutor1@example.com"));
    if (!tutorUser) {
      [tutorUser] = await db.insert(schema.users).values({
        username: "tutor1",
        email: "tutor1@example.com",
        password: await bcrypt.hash("tutor123", 10),
        first_name: "Tutor",
        last_name: "One",
        role: "tutor",
        is_verified: true,
        avatar: faker.image.avatar(),
        phone: faker.phone.number("0#########"),
        created_at: new Date(),
        updated_at: new Date(),
      }).returning();
    }

    // Tutor Profile
    const [tutorProfile] = await db.insert(schema.tutorProfiles).values({
      user_id: tutorUser.id,
      bio: "Giáo viên có 10 năm kinh nghiệm giảng dạy",
      date_of_birth: "1990-01-01",
      address: "Hà Nội",
      certifications: JSON.stringify(["https://example.com/cert1.jpg"]),
      availability: JSON.stringify({ monday: ["08:00-10:00"] }),
      is_verified: true,
      is_featured: true,
      rating: "4.5",
      total_reviews: 10,
      created_at: new Date(),
      updated_at: new Date(),
    }).returning();

    // Subjects
    const [math] = await db.insert(schema.subjects).values({
      name: "Toán học",
      icon: "calculate",
      description: "Toán học phổ thông",
      hourly_rate: "150000",
      created_at: new Date(),
      updated_at: new Date(),
    }).onConflictDoNothing().returning();

    // Education Levels
    const [level] = await db.insert(schema.educationLevels).values({
      name: "Cấp 2",
      description: "Dành cho học sinh cấp 2",
      created_at: new Date(),
      updated_at: new Date(),
    }).onConflictDoNothing().returning();

    // Course
    const [course] = await db.insert(schema.courses).values({
      tutor_id: tutorProfile.id,
      subject_id: math.id,
      level_id: level.id,
      title: "Toán cấp 2 cơ bản",
      description: "Khóa học giúp nắm chắc kiến thức cơ bản toán học cấp 2",
      hourly_rate: "150000",
      teaching_mode: "online",
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    }).returning();

    // CourseLevels
    await db.insert(schema.courseLevels).values({
      course_id: course.id,
      level_id: level.id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Teaching schedule
    await db.insert(schema.teachingSchedules).values({
      tutor_id: tutorProfile.id,
      course_id: course.id,
      date: new Date(),
      start_time: "08:00",
      end_time: "10:00",
      mode: "online",
      status: "available",
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Booking Request
    const [bookingRequest] = await db.insert(schema.bookingRequests).values({
      student_id: student.id,
      tutor_id: tutorProfile.id,
      course_id: course.id,
      title: "Đặt lịch học toán",
      description: "Em muốn học phần đại số cơ bản",
      mode: "online",
      hourly_rate: "150000",
      total_hours: "2",
      total_amount: "300000",
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
    }).returning();

    // Booking Session
    const [session] = await db.insert(schema.bookingSessions).values({
      request_id: bookingRequest.id,
      date: new Date(),
      start_time: "08:00",
      end_time: "10:00",
      status: "confirmed",
      created_at: new Date(),
      updated_at: new Date(),
    }).returning();

    // Payment
    await db.insert(schema.payments).values({
      request_id: bookingRequest.id,
      amount: "300000",
      net_amount: "290000",
      fee: "10000",
      payer_id: student.id,
      payee_id: tutorUser.id,
      payment_method: "vnpay",
      status: "completed",
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log("✅ Seeding completed successfully.");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}

seed();