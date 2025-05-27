// Test script to verify booking conflict detection
import { db } from "./db/index";
import { bookingRequests, bookingSessions } from "./shared/schema";
import { eq } from "drizzle-orm";

async function testBookingConflict() {
  try {
    console.log("🔍 Testing booking conflict detection...");

    // 1. Check current schedules for tutor 1
    console.log("\n📅 Current schedules for tutor 1:");
    const response = await fetch("http://localhost:5000/api/v1/schedules/1");
    const scheduleData = await response.json();
    console.log(JSON.stringify(scheduleData, null, 2));

    // 2. Create a booking request for tutor 1
    console.log("\n📝 Creating a test booking request...");
    const [bookingRequest] = await db
      .insert(bookingRequests)
      .values({
        student_id: 1, // Assuming student with ID 1 exists
        tutor_id: 1,
        course_id: 1, // Assuming course with ID 1 exists
        mode: "online",
        note: "Test booking for conflict detection",
        payment_method: "direct",
        hourly_rate: 200000,
        total_hours: 2,
        total_amount: 400000,
        status: "confirmed",
      })
      .returning();

    console.log("✅ Created booking request:", bookingRequest);

    // 3. Create a booking session that conflicts with the schedule (9:00-11:00)
    console.log("\n📝 Creating a conflicting booking session...");
    const [bookingSession] = await db
      .insert(bookingSessions)
      .values({
        request_id: bookingRequest.id,
        date: "2025-05-26", // Same date as the schedule
        start_time: "09:30", // Overlaps with 09:00-11:00
        end_time: "10:30", // Overlaps with 09:00-11:00
        status: "confirmed",
      })
      .returning();

    console.log("✅ Created booking session:", bookingSession);

    // 4. Check schedules again - the conflicting slot should be filtered out
    console.log("\n📅 Checking schedules after creating conflict:");
    const responseAfter = await fetch(
      "http://localhost:5000/api/v1/schedules/1"
    );
    const scheduleDataAfter = await responseAfter.json();
    console.log(JSON.stringify(scheduleDataAfter, null, 2));

    // 5. Clean up - remove the test data
    console.log("\n🧹 Cleaning up test data...");
    await db
      .delete(bookingSessions)
      .where(eq(bookingSessions.id, bookingSession.id));
    await db
      .delete(bookingRequests)
      .where(eq(bookingRequests.id, bookingRequest.id));
    console.log("✅ Cleanup completed");

    console.log("\n🎉 Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    process.exit(0);
  }
}

testBookingConflict();
