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

// Define valid days of week
const validDaysOfWeek = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

// Define schema for time slot
const timeSlotSchema = z.object({
  startTime: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Invalid time format. Use HH:MM"
    ),
  endTime: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Invalid time format. Use HH:MM"
    ),
});

// Define schema for repeat schedule with strict day name validation
const repeatScheduleSchema = z.record(
  z.string().refine((key) => validDaysOfWeek.includes(key), {
    message:
      "Invalid day name. Must be one of: monday, tuesday, wednesday, thursday, friday, saturday, sunday",
  }),
  z.array(timeSlotSchema)
);

// Sửa phần định nghĩa schema (khoảng dòng 56-90)
const singleScheduleSchema = z.object({
  is_recurring: z.literal(false),
  date: z.string(),
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
  course_id: z.number().optional(),
});

// Define base recurring schema without refinement
const recurringSchemaBase = z.object({
  is_recurring: z.literal(true),
  start_date: z.string(),
  end_date: z.string(),
  course_id: z.number().optional(),
  repeat_schedule: repeatScheduleSchema.optional(),
  repeat_days: z.array(z.string()).optional().default([]),
  start_time: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Invalid time format. Use HH:MM"
    )
    .optional(),
  end_time: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Invalid time format. Use HH:MM"
    )
    .optional(),

  // Xóa bỏ các trường date, start_time, end_time vì chúng không cần thiết cho recurring
  // date: z.string().optional(),
});

// Combined schema with discriminated union based on is_recurring flag
export const createScheduleSchema = z
  .discriminatedUnion("is_recurring", [
    singleScheduleSchema,
    recurringSchemaBase,
  ])
  .refine(
    (data) => {
      if (!data.is_recurring) return true;

      // Đảm bảo có phương thức lặp lại hợp lệ cho recurring schema
      return (
        (data.repeat_schedule &&
          Object.keys(data.repeat_schedule).length > 0) ||
        (data.repeat_days &&
          data.repeat_days.length > 0 &&
          data.start_time &&
          data.end_time)
      );
    },
    {
      message:
        "Cần cung cấp thông tin lặp lại: repeat_schedule hoặc (repeat_days + start_time + end_time)",
      path: ["repeat_schedule"],
    }
  );

// For type inference
const recurringScheduleSchema = recurringSchemaBase;

// Type for the validated request body
type CreateScheduleRequest = z.infer<typeof createScheduleSchema>;

/**
 * Create teaching schedules for a tutor
 * @route POST /api/schedules/create
 */
export const createSchedule = async (req: Request, res: Response) => {
  try {
    // Log request body để debug
    console.log("Received request body:", JSON.stringify(req.body, null, 2));
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

    // Log kết quả validation
    console.log(
      "Validation result:",
      validationResult.success
        ? "Success"
        : JSON.stringify(validationResult.error.errors, null, 2)
    );

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        errors: validationResult.error.errors,
      });
    }

    const scheduleData = validationResult.data; // Check if course exists if course_id is provided
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
      // SINGLE SCHEDULE
      // Validation already ensures we have date, start_time and end_time because of Zod schema

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
        date: scheduleData.date,
        start_time: scheduleData.start_time,
        end_time: scheduleData.end_time,
        is_recurring: false,
        status: "available",
      });

      return res.status(201).json({
        success: true,
        totalCreated: 1,
        message: "Schedule created successfully.",
      });
    } else {
      // RECURRING SCHEDULE
      // Validation already ensures we have start_date and end_date from Zod schema
      // Validation already ensures we have either repeat_days+start_time+end_time OR repeat_schedule

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

      // Check for conflicts and prepare schedules
      const scheduleRecords = [];
      let conflictCount = 0; // NEW METHOD: Using repeat_schedule with per-day time slots
      if (scheduleData.repeat_schedule) {
        const selectedDays = Object.keys(scheduleData.repeat_schedule);

        // For each day in the date range
        for (const day of allDays) {
          const dayOfWeek = day.getDay();

          // Find the corresponding day name
          const dayName = Object.keys(dayMap).find(
            (name) => dayMap[name] === dayOfWeek
          );

          // Skip if this day is not selected
          if (!dayName || !selectedDays.includes(dayName)) {
            continue;
          }

          // Get all time slots for this day
          const timeSlots = scheduleData.repeat_schedule[dayName];
          const formattedDate = format(day, "yyyy-MM-dd");

          // Create a schedule for each time slot
          for (const slot of timeSlots) {
            // Check for time conflicts
            const hasConflict = await checkTimeConflict(
              tutorProfile.id,
              formattedDate,
              slot.startTime,
              slot.endTime
            );

            if (hasConflict) {
              conflictCount++;
              continue; // Skip this time slot if there's a conflict
            }

            scheduleRecords.push({
              tutor_id: tutorProfile.id,
              course_id: scheduleData.course_id,
              date: formattedDate,
              start_time: slot.startTime,
              end_time: slot.endTime,
              is_recurring: true,
              status: "available",
            });
          }
        }
      }
      // OLD METHOD: Using repeat_days with common time slots (for backward compatibility)
      else if (
        scheduleData.repeat_days?.length > 0 &&
        scheduleData.start_time &&
        scheduleData.end_time
      ) {
        // Filter days that match the repeat pattern
        const scheduleDays = allDays.filter((day) => {
          const dayName = Object.keys(dayMap).find(
            (name) => dayMap[name] === day.getDay()
          );
          return dayName && scheduleData.repeat_days?.includes(dayName);
        });

        // Create schedules for filtered days
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
            date: formattedDate,
            start_time: scheduleData.start_time,
            end_time: scheduleData.end_time,
            is_recurring: true,
            status: "available",
          });
        }
      } else {
        // This shouldn't happen due to Zod validation, but keeping as a fallback
        return res.status(400).json({
          success: false,
          message:
            "Invalid recurring schedule configuration. Please provide either repeat_schedule or both repeat_days and start_time/end_time.",
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

export const cancelSchedule = async (req: Request, res: Response) => {
  try {
    const scheduleId = Number(req.params.id);
    const userId = req.user?.id; // ID của user từ auth middleware

    if (isNaN(scheduleId) || !userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "ID lịch không hợp lệ hoặc người dùng chưa đăng nhập",
        },
      });
    }

    // Find tutor profile first
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(tutorProfiles.user_id, userId),
    });

    if (!tutorProfile) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Tutor profile not found",
        },
      });
    }

    // Kiểm tra lịch tồn tại và thuộc về tutor hiện tại
    const schedule = await db.query.teachingSchedules.findFirst({
      where: and(
        eq(teachingSchedules.id, scheduleId),
        eq(teachingSchedules.tutor_id, tutorProfile.id)
      ),
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Không tìm thấy lịch hoặc bạn không có quyền hủy lịch này",
        },
      });
    }

    // Kiểm tra nếu lịch đã được đặt (booked) thì không cho phép hủy
    if (schedule.status === "booked") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_OPERATION",
          message: "Không thể hủy lịch đã được đặt",
        },
      });
    }

    // Cập nhật trạng thái của lịch thành "cancelled"
    await db
      .update(teachingSchedules)
      .set({
        status: "cancelled",
        updated_at: new Date(),
      })
      .where(eq(teachingSchedules.id, scheduleId));

    return res.status(200).json({
      success: true,
      data: { message: "Lịch đã được hủy thành công" },
    });
  } catch (error) {
    console.error("Error cancelling schedule:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Đã xảy ra lỗi khi hủy lịch",
      },
    });
  }
};

// API function delete schedule
export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const scheduleId = Number(req.params.id);
    const userId = req.user?.id;

    if (isNaN(scheduleId) || !userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "ID lịch không hợp lệ hoặc người dùng chưa đăng nhập",
        },
      });
    }

    // Find tutor profile first
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(tutorProfiles.user_id, userId),
    });

    if (!tutorProfile) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Tutor profile not found",
        },
      });
    }

    // Kiểm tra lịch tồn tại và thuộc về tutor hiện tại
    const schedule = await db.query.teachingSchedules.findFirst({
      where: and(
        eq(teachingSchedules.id, scheduleId),
        eq(teachingSchedules.tutor_id, tutorProfile.id),
        eq(teachingSchedules.status, "cancelled") // Chỉ xóa được lịch đã hủy
      ),
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message:
            "Không tìm thấy lịch đã hủy hoặc bạn không có quyền xóa lịch này",
        },
      });
    }

    // Xóa lịch khỏi cơ sở dữ liệu
    await db
      .delete(teachingSchedules)
      .where(eq(teachingSchedules.id, scheduleId));

    return res.status(200).json({
      success: true,
      data: { message: "Lịch đã được xóa thành công" },
    });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Đã xảy ra lỗi khi xóa lịch",
      },
    });
  }
};

/**
 * Get available schedules for a specific tutor
 * @route GET /api/v1/schedules/:tutorId
 * @query courseId - Optional filter by course ID
 * @returns {Object} Response object
 * @returns {Boolean} Response.success - Whether the request was successful
 * @returns {String} [Response.message] - Message if no schedules are found
 * @returns {Array} [Response.data] - Array of schedule days with date and timeSlots
 * @returns {String} [Response.data[].date] - Date in YYYY-MM-DD format
 * @returns {Array} [Response.data[].timeSlots] - Array of time slot objects
 * @returns {String} [Response.data[].timeSlots[].startTime] - Start time in HH:MM format
 * @returns {String} [Response.data[].timeSlots[].endTime] - End time in HH:MM format
 * @access Public
 */
export const getAvailableTutorSchedulesByTutorId = async (
  req: Request,
  res: Response
) => {
  try {
    const tutorId = parseInt(req.params.tutorId);
    const courseId = req.query.courseId
      ? parseInt(req.query.courseId as string)
      : undefined;
    const startDate = req.query.startDate
      ? String(req.query.startDate)
      : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

    if (isNaN(tutorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tutor ID",
      });
    }

    // Get current date without time component
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const formattedCurrentDate = format(currentDate, "yyyy-MM-dd");

    // Build query conditions
    const conditions = [
      eq(teachingSchedules.tutor_id, tutorId),
      eq(teachingSchedules.status, "available"),
    ];

    // Add date condition based on provided date range or default to 3 months
    let fromDate = formattedCurrentDate;
    let toDate: string;

    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      // If startDate is provided and valid, use it (but not before today)
      const parsedStartDate = parseISO(startDate);
      if (!isNaN(parsedStartDate.getTime()) && parsedStartDate >= currentDate) {
        fromDate = startDate;
      }
    }

    if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      // If endDate is provided and valid, use it
      const parsedEndDate = parseISO(endDate);
      if (!isNaN(parsedEndDate.getTime())) {
        toDate = endDate;
      } else {
        // Default to 3 months from now if endDate is invalid
        const threeMonthsLater = new Date();
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
        toDate = format(threeMonthsLater, "yyyy-MM-dd");
      }
    } else {
      // Default to 3 months from now
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      toDate = format(threeMonthsLater, "yyyy-MM-dd");
    }

    conditions.push(between(teachingSchedules.date, fromDate, toDate));

    // Optional: Filter by course ID if provided
    if (courseId && !isNaN(courseId)) {
      conditions.push(eq(teachingSchedules.course_id, courseId));
    }
    console.log(`Fetching schedules for tutor ID ${tutorId} with conditions:`, {
      tutorId,
      courseId,
      dateRange: { from: fromDate, to: toDate },
      // Don't stringify conditions as it contains circular references
    });

    // Query available schedules
    const availableSchedules = await db.query.teachingSchedules.findMany({
      where: and(...conditions),
      orderBy: [asc(teachingSchedules.date), asc(teachingSchedules.start_time)],
    });

    console.log(
      `Found ${availableSchedules.length} available schedules:`,
      availableSchedules
    );

    // If no schedules found
    if (availableSchedules.length === 0) {
      console.log("No available schedules found for this tutor");
      return res.status(200).json({
        success: true,
        message: "Không có lịch trống",
        data: [],
      });
    } // Group schedules by date
    const schedulesByDate: Record<
      string,
      {
        id: number;
        startTime: string;
        endTime: string;
      }[]
    > = {};

    availableSchedules.forEach((schedule) => {
      const dateStr = format(schedule.date, "yyyy-MM-dd");

      if (!schedulesByDate[dateStr]) {
        schedulesByDate[dateStr] = [];
      } // Format times to HH:MM - time is stored as string in PostgreSQL
      // Ensure we have proper HH:MM format for frontend
      const startTime = schedule.start_time;
      const endTime = schedule.end_time;

      schedulesByDate[dateStr].push({
        id: schedule.id, // Add schedule ID for easier reference
        startTime,
        endTime,
      });
    }); // Format the response as specified
    const formattedSchedules = Object.keys(schedulesByDate).map((date) => ({
      date,
      timeSlots: schedulesByDate[date],
    }));

    console.log("Formatted schedules for response:", formattedSchedules);

    // Return the formatted schedules
    return res.status(200).json({
      success: true,
      data: formattedSchedules,
    });
  } catch (error: any) {
    console.error("Error fetching tutor's available schedules:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi lấy lịch trống của gia sư",
      error: error.message || String(error),
    });
  }
};
