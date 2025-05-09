import { Request, Response } from "express";
import { db } from "../../db";
import {
  teachingSchedules,
  teachingScheduleInsertSchema,
  tutorProfiles,
  courses,
} from "../../shared/schema";
import { eq, and, between, or, asc } from "drizzle-orm";
import { z } from "zod";
import {
  eachDayOfInterval,
  format,
  isWithinInterval,
  parseISO,
  setHours,
  setMinutes,
} from "date-fns";

// Validation schema for creating a schedule
export const createScheduleSchema = z.object({
  date: z.string().optional(), // Required for single schedule, optional for recurring
  start_time: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Invalid time format. Use HH:MM"
    ),
  end_time: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Invalid time format. Use HH:MM"
    ),
  mode: z.enum(["online", "offline"]),
  location: z.string().optional(),
  course_id: z.number().optional(),
  is_recurring: z.boolean().default(false),
  // Recurring schedule fields
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  repeat_days: z.array(z.string()).optional(), // Array of day names: ["monday", "wednesday", "friday"]
});

// Type for the validated request body
type CreateScheduleRequest = z.infer<typeof createScheduleSchema>;

/**
 * Create teaching schedules for a tutor
 * @route POST /api/schedules/create
 */
export const createSchedule = async (req: Request, res: Response) => {
  try {
    // Get tutor ID from authenticated user
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in to create a teaching schedule.",
      });
    }

    // Find tutor profile
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(tutorProfiles.user_id, userId),
    });

    if (!tutorProfile) {
      return res.status(404).json({
        success: false,
        message: "Tutor profile not found.",
      });
    }

    // Validate request body
    const validationResult = createScheduleSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        errors: validationResult.error.errors,
      });
    }

    const scheduleData = validationResult.data;

    // Check if course exists if course_id is provided
    if (scheduleData.course_id) {
      const course = await db.query.courses.findFirst({
        where: and(
          eq(courses.id, scheduleData.course_id),
          eq(courses.tutor_id, tutorProfile.id)
        ),
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found or doesn't belong to you.",
        });
      }
    }

    // Handle single schedule or recurring schedule
    if (!scheduleData.is_recurring) {
      // Single schedule
      if (!scheduleData.date) {
        return res.status(400).json({
          success: false,
          message: "Date is required for single schedules.",
        });
      }

      // Check for time conflicts
      const hasConflict = await checkTimeConflict(
        tutorProfile.id,
        scheduleData.date,
        scheduleData.start_time,
        scheduleData.end_time
      );

      if (hasConflict) {
        return res.status(409).json({
          success: false,
          message: "You already have a schedule during this time.",
        });
      }

      // Insert single schedule
      await db.insert(teachingSchedules).values({
        tutor_id: tutorProfile.id,
        course_id: scheduleData.course_id,
        date: scheduleData.date, // Use the string date directly instead of creating a Date object
        start_time: scheduleData.start_time,
        end_time: scheduleData.end_time,
        mode: scheduleData.mode,
        location:
          scheduleData.mode === "offline" ? scheduleData.location : null,
        is_recurring: false,
        status: "available",
      });

      return res.status(201).json({
        success: true,
        totalCreated: 1,
        message: "Schedule created successfully.",
      });
    } else {
      // Recurring schedule
      if (
        !scheduleData.start_date ||
        !scheduleData.end_date ||
        !scheduleData.repeat_days
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Start date, end date, and repeat days are required for recurring schedules.",
        });
      }

      const startDate = parseISO(scheduleData.start_date);
      const endDate = parseISO(scheduleData.end_date);

      // Get all days between start and end date
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });

      // Map day names to their corresponding day number (0 = Sunday, 1 = Monday, etc.)
      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      // Filter days that match the repeat pattern
      const scheduleDays = allDays.filter((day) => {
        const dayName = Object.keys(dayMap).find(
          (name) => dayMap[name] === day.getDay()
        );
        return dayName && scheduleData.repeat_days?.includes(dayName);
      });

      // Check for conflicts and prepare schedules
      const scheduleRecords = [];
      let conflictCount = 0;

      for (const day of scheduleDays) {
        const formattedDate = format(day, "yyyy-MM-dd");

        // Check for time conflicts
        const hasConflict = await checkTimeConflict(
          tutorProfile.id,
          formattedDate,
          scheduleData.start_time,
          scheduleData.end_time
        );

        if (hasConflict) {
          conflictCount++;
          continue; // Skip this day if there's a conflict
        }

        scheduleRecords.push({
          tutor_id: tutorProfile.id,
          course_id: scheduleData.course_id,
          date: formattedDate, // Using the formatted date string instead of Date object
          start_time: scheduleData.start_time,
          end_time: scheduleData.end_time,
          mode: scheduleData.mode,
          location:
            scheduleData.mode === "offline" ? scheduleData.location : null,
          is_recurring: true,
          status: "available",
        });
      }

      // Insert all valid schedules
      if (scheduleRecords.length > 0) {
        await db.insert(teachingSchedules).values(scheduleRecords);
      }

      // Return response with counts
      return res.status(201).json({
        success: true,
        totalCreated: scheduleRecords.length,
        skipped: conflictCount,
        message: `${scheduleRecords.length} schedules created successfully. ${conflictCount} schedules skipped due to conflicts.`,
      });
    }
  } catch (error: any) {
    console.error("Error creating schedule:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create schedule.",
      error: error.message,
    });
  }
};

/**
 * Helper function to check if there's a time conflict with existing schedules
 */
async function checkTimeConflict(
  tutorId: number,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  // Get all schedules for that day
  const existingSchedules = await db.query.teachingSchedules.findMany({
    where: and(
      eq(teachingSchedules.tutor_id, tutorId),
      eq(teachingSchedules.date, date) // Use the string date directly
    ),
  });

  // Check for overlapping time slots
  for (const schedule of existingSchedules) {
    // Compare time strings
    const existingStart = schedule.start_time;
    const existingEnd = schedule.end_time;

    // Check if times overlap
    if (
      (startTime >= existingStart && startTime < existingEnd) || // New start time falls within existing schedule
      (endTime > existingStart && endTime <= existingEnd) || // New end time falls within existing schedule
      (startTime <= existingStart && endTime >= existingEnd) // New schedule completely encompasses existing schedule
    ) {
      return true; // Conflict found
    }
  }

  return false; // No conflict
}

/**
 * Get schedules for a tutor
 * @route GET /api/schedules/tutor
 */
export const getTutorSchedules = async (req: Request, res: Response) => {
  try {
    // Get tutor ID from authenticated user
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in to view your schedules.",
      });
    }

    // Find tutor profile
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(tutorProfiles.user_id, userId),
    });

    if (!tutorProfile) {
      return res.status(404).json({
        success: false,
        message: "Tutor profile not found.",
      });
    }

    // Get query parameters for filtering
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Tạo mảng điều kiện
    const conditions = [eq(teachingSchedules.tutor_id, tutorProfile.id)];

    // Thêm điều kiện ngày nếu có
    if (startDate && endDate) {
      conditions.push(between(teachingSchedules.date, startDate, endDate));
    }

    // Lấy danh sách lịch dạy
    const schedules = await db.query.teachingSchedules.findMany({
      where: and(...conditions),
      orderBy: [asc(teachingSchedules.date), asc(teachingSchedules.start_time)],
    });

    // Lấy thông tin khóa học nếu có course_id
    const schedulesWithCourseInfo = await Promise.all(
      schedules.map(async (schedule) => {
        if (schedule.course_id) {
          const course = await db.query.courses.findFirst({
            where: eq(courses.id, schedule.course_id),
            columns: {
              id: true,
              title: true,
            },
          });

          return {
            ...schedule,
            course,
          };
        }
        return schedule;
      })
    );

    return res.status(200).json({
      success: true,
      schedules: schedulesWithCourseInfo,
    });
  } catch (error: any) {
    console.error("Error fetching tutor schedules:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch schedules.",
      error: error.message,
    });
  }
};
