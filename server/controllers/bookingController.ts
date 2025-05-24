import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// [DEPRECATED] Tạo booking mới (đã bị xóa)
// Phương thức này đã bị loại bỏ vì sử dụng bookingRequestValidationSchema cũ
// Vui lòng sử dụng createMultipleBookings thay thế

// Lấy danh sách booking của học sinh
export const getStudentBookings = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Status filter
    const status = req.query.status as string;
    const conditions = [eq(schema.bookingRequests.student_id, studentId)];

    if (status && status !== "all") {
      conditions.push(eq(schema.bookingRequests.status, status));
    }

    // Get booking requests
    const bookingRequests = await db.query.bookingRequests.findMany({
      where: conditions.length === 1 ? conditions[0] : and(...conditions),
      with: {
        tutor: {
          with: {
            user: {
              columns: {
                id: true,
                first_name: true,
                last_name: true,
                avatar: true,
              },
            },
          },
        },
        course: true,
        sessions: true,
      },
      orderBy: [desc(schema.bookingRequests.created_at)],
    });

    return res.status(200).json(bookingRequests);
  } catch (error) {
    console.error("Get student bookings error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Lấy danh sách booking của gia sư
export const getTutorBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Lấy thông tin gia sư
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId),
    });

    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }

    // Status filter
    const status = req.query.status as string;
    const conditions = [eq(schema.bookingRequests.tutor_id, tutorProfile.id)];

    if (status && status !== "all") {
      conditions.push(eq(schema.bookingRequests.status, status));
    }

    // Get bookings
    const bookings = await db.query.bookingRequests.findMany({
      where: conditions.length === 1 ? conditions[0] : and(...conditions),
      with: {
        student: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
        course: true,
        sessions: true,
      },
      orderBy: [desc(schema.bookingRequests.created_at)],
    });

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Get tutor bookings error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Lấy thông tin chi tiết booking
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const bookingId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(bookingId)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    // Get booking
    const booking = await db.query.bookingRequests.findFirst({
      where: eq(schema.bookingRequests.id, bookingId),
      with: {
        student: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            avatar: true,
            phone: true,
          },
        },
        tutor: {
          with: {
            user: {
              columns: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                avatar: true,
                phone: true,
              },
            },
          },
        },
        course: true,
        payment: true,
        sessions: {
          with: {
            sessionNote: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Kiểm tra quyền truy cập (chỉ học sinh hoặc gia sư liên quan)
    const tutorId = booking.tutor.user_id;

    if (booking.student_id !== userId && tutorId !== userId) {
      return res
        .status(403)
        .json({ message: "You don't have permission to view this booking" });
    }

    return res.status(200).json(booking);
  } catch (error) {
    console.error("Get booking by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Cập nhật trạng thái booking
export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const bookingId = parseInt(req.params.id);
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(bookingId)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    // Validate status
    const validStatuses = [
      "pending",
      "confirmed",
      "completed",
      "cancelled",
      "rejected",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Get booking
    const booking = await db.query.bookingRequests.findFirst({
      where: eq(schema.bookingRequests.id, bookingId),
      with: {
        tutor: true,
        sessions: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Kiểm tra quyền truy cập (chỉ học sinh hoặc gia sư liên quan)
    const tutorId = booking.tutor.user_id;

    if (booking.student_id !== userId && tutorId !== userId) {
      return res
        .status(403)
        .json({ message: "You don't have permission to update this booking" });
    }

    // Một số ràng buộc về trạng thái
    // - Học sinh chỉ có thể hủy booking
    // - Gia sư có thể xác nhận, từ chối, hoặc đánh dấu đã hoàn thành
    if (booking.student_id === userId) {
      if (status !== "cancelled") {
        return res
          .status(403)
          .json({ message: "Students can only cancel bookings" });
      }
    } else {
      if (status === "cancelled") {
        return res
          .status(403)
          .json({ message: "Tutors cannot cancel bookings" });
      }
    }

    // Cập nhật trạng thái booking request
    const [updatedBooking] = await db
      .update(schema.bookingRequests)
      .set({
        status,
        updated_at: new Date(),
      })
      .where(eq(schema.bookingRequests.id, bookingId))
      .returning();

    // Cập nhật trạng thái tất cả các booking sessions
    await db
      .update(schema.bookingSessions)
      .set({
        status,
        updated_at: new Date(),
      })
      .where(eq(schema.bookingSessions.request_id, bookingId));

    // Nếu gia sư xác nhận booking (status = confirmed), kiểm tra và tạo cuộc hội thoại
    if (status === "confirmed" && tutorId === userId) {
      try {
        // Kiểm tra xem đã có cuộc hội thoại giữa học viên và gia sư chưa
        const existingConversation = await db.query.conversations.findFirst({
          where: and(
            eq(schema.conversations.student_id, booking.student_id),
            eq(schema.conversations.tutor_id, tutorId)
          )
        });

        if (!existingConversation) {
          // Nếu chưa có, tạo mới cuộc hội thoại
          const [newConversation] = await db.insert(schema.conversations)
            .values({
              student_id: booking.student_id,
              tutor_id: tutorId,
              last_message_at: new Date(),
              created_at: new Date()
            })
            .returning();

          console.log(`Tạo mới cuộc hội thoại thành công: ${JSON.stringify(newConversation)}`);
        } else {
          console.log(`Đã tồn tại cuộc hội thoại giữa học viên ${booking.student_id} và gia sư ${tutorId}`);
        }
      } catch (error) {
        // Chỉ ghi log lỗi, không trả về lỗi cho client
        console.error("Lỗi khi tạo cuộc hội thoại:", error);
      }
    }

    // Lấy booking đã cập nhật với sessions
    const completeUpdatedBooking = await db.query.bookingRequests.findFirst({
      where: eq(schema.bookingRequests.id, bookingId),
      with: {
        sessions: true,
      },
    });

    return res.status(200).json({
      message: "Booking status updated successfully",
      booking: completeUpdatedBooking,
    });
  } catch (error) {
    console.error("Update booking status error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Thêm ghi chú và đánh giá cho buổi học
export const addSessionNotes = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const sessionId = parseInt(req.params.id);
    const { tutor_notes, student_rating, student_feedback } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(sessionId)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    // Get session
    const session = await db.query.bookingSessions.findFirst({
      where: eq(schema.bookingSessions.id, sessionId),
      with: {
        request: {
          with: {
            tutor: true,
          },
        },
        sessionNote: true,
      },
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Kiểm tra quyền truy cập (chỉ học sinh hoặc gia sư liên quan)
    const tutorId = session.request.tutor.user_id;
    const studentId = session.request.student_id;
    const isStudent = studentId === userId;
    const isTutor = tutorId === userId;

    if (!isStudent && !isTutor) {
      return res.status(403).json({
        message: "You don't have permission to add notes to this session",
      });
    }

    // Gia sư chỉ có thể thêm tutor_notes
    // Học sinh chỉ có thể thêm student_rating và student_feedback
    let updateData: Partial<schema.NewSessionNote> = {};

    if (isTutor && tutor_notes) {
      updateData.tutor_notes = tutor_notes;
    }

    if (isStudent) {
      if (student_rating !== undefined) {
        // Validate rating (1-5 stars)
        const rating = parseInt(student_rating as any);
        if (isNaN(rating) || rating < 1 || rating > 5) {
          return res
            .status(400)
            .json({ message: "Rating must be between 1 and 5" });
        }
        updateData.student_rating = rating;
      }

      if (student_feedback) {
        updateData.student_feedback = student_feedback;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    let sessionNote;

    // Cập nhật hoặc tạo mới session note
    if (session.sessionNote) {
      [sessionNote] = await db
        .update(schema.sessionNotes)
        .set({
          ...updateData,
          updated_at: new Date(),
        })
        .where(eq(schema.sessionNotes.session_id, sessionId))
        .returning();
    } else {
      [sessionNote] = await db
        .insert(schema.sessionNotes)
        .values({
          session_id: sessionId,
          ...updateData,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();
    }

    // Nếu học sinh đánh giá, cập nhật rating trung bình của gia sư
    if (isStudent && updateData.student_rating) {
      // Lấy tất cả đánh giá của gia sư từ session notes
      const allRatings = await db
        .select({
          rating: schema.sessionNotes.student_rating,
        })
        .from(schema.sessionNotes)
        .innerJoin(
          schema.bookingSessions,
          eq(schema.sessionNotes.session_id, schema.bookingSessions.id)
        )
        .innerJoin(
          schema.bookingRequests,
          eq(schema.bookingSessions.request_id, schema.bookingRequests.id)
        )
        .where(
          and(
            eq(schema.bookingRequests.tutor_id, session.request.tutor_id),
            sql`${schema.sessionNotes.student_rating} IS NOT NULL`
          )
        );

      // Tính trung bình rating
      const totalRatings = allRatings.reduce(
        (sum, item) => sum + Number(item.rating || 0),
        0
      );
      const averageRating =
        allRatings.length > 0 ? totalRatings / allRatings.length : 0;

      // Cập nhật rating của gia sư
      await db
        .update(schema.tutorProfiles)
        .set({ rating: averageRating.toFixed(1) })
        .where(eq(schema.tutorProfiles.id, session.request.tutor_id));
    }

    return res.status(200).json({
      message: "Session notes added successfully",
      sessionNote,
    });
  } catch (error) {
    console.error("Add session notes error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Tạo nhiều bookings cùng lúc
export const createMultipleBookings = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { course_id, tutor_id, mode, location, note, bookings } = req.body;

    const courseIdNumber = Number(course_id);
    const tutorIdNumber = Number(tutor_id);

    // Validate all time slots (ensure end time is after start time)
    for (const booking of bookings) {
      const startTime = new Date(`${booking.date}T${booking.startTime}`);
      const endTime = new Date(`${booking.date}T${booking.endTime}`);

      if (endTime <= startTime) {
        return res.status(400).json({
          message: "Invalid time range",
          error: "Time range validation failed",
          details: `End time must be after start time for booking on ${booking.date}`,
        });
      }
    }

    // Kiểm tra xem gia sư có tồn tại không
    const tutor = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.id, tutorIdNumber),
    });

    if (!tutor) {
      return res.status(404).json({ message: "Tutor not found" });
    }

    // Kiểm tra xem khóa học có tồn tại và thuộc về gia sư không
    const selectedCourse = await db.query.courses.findFirst({
      where: and(
        eq(schema.courses.id, courseIdNumber),
        eq(schema.courses.tutor_id, tutorIdNumber)
      ),
    });

    if (!selectedCourse) {
      return res.status(404).json({
        message: "Course not found or does not belong to the tutor",
      });
    }

    // Validate that the requested mode is compatible with the course's delivery mode
    if (
      (mode === "online" && selectedCourse.teaching_mode === "offline") ||
      (mode === "offline" && selectedCourse.teaching_mode === "online")
    ) {
      return res.status(400).json({
        message: `This course doesn't support ${mode} mode`,
        error: "incompatible_mode",
        courseMode: selectedCourse.teaching_mode,
      });
    }

    // Validate location is provided for offline mode
    if (mode === "offline" && (!location || location.trim() === "")) {
      return res.status(400).json({
        message: "Location is required for offline bookings",
        error: "missing_location",
      });
    }

    // Lấy hourly_rate từ course
    const hourlyRate = Number(selectedCourse.hourly_rate);

    // Định nghĩa interface cho booking
    interface BookingEntry {
      date: string;
      startTime: string;
      endTime: string;
    }

    // Tạo mảng các bookings để insert
    const bookingValues = bookings.map((booking: BookingEntry) => {
      // Chuẩn hóa định dạng thời gian
      const bookingDate = booking.date;
      const startTimeStr = booking.startTime.padStart(5, "0"); // Đảm bảo format HH:MM
      const endTimeStr = booking.endTime.padStart(5, "0"); // Đảm bảo format HH:MM

      // Tạo đối tượng Date
      const startTime = new Date(`${bookingDate}T${startTimeStr}:00`);
      const endTime = new Date(`${bookingDate}T${endTimeStr}:00`);

      // Tính toán số giờ
      const diffMs = endTime.getTime() - startTime.getTime();
      const hours = diffMs / (1000 * 60 * 60);

      // Tính toán tổng số tiền
      const totalAmount = hourlyRate * hours;

      // Tạo tiêu đề cho booking nếu chưa có
      const title = `Buổi học khóa ${selectedCourse.title} ngày ${bookingDate}`;

      // Generate meeting URL for online sessions
      let meetingUrl = null;
      if (mode === "online") {
        // Generate a placeholder meeting URL that will be updated by the tutor later
        // In a real implementation, you might integrate with Zoom/Google Meet API
        meetingUrl = "";
      }

      return {
        student_id: studentId,
        tutor_id: tutorIdNumber,
        course_id: courseIdNumber,
        title,
        description: note || "",
        start_time: startTime,
        end_time: endTime,
        location: mode === "offline" ? location : null,
        meeting_url: meetingUrl,
        hourly_rate: hourlyRate.toString(),
        total_hours: hours.toString(),
        total_amount: totalAmount.toString(),
        status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
      };
    });

    // Định nghĩa interface cho booking value
    interface BookingValue {
      tutor_id: number;
      start_time: Date;
      end_time: Date;
      [key: string]: any; // Cho phép các trường khác
    }

    // Định nghĩa interface cho time range
    interface TimeRange {
      tutorId: number;
      startTime: Date;
      endTime: Date;
    }

    // Kiểm tra xung đột lịch dạy
    const timeRanges = bookingValues.map(
      (booking: BookingValue): TimeRange => ({
        tutorId: booking.tutor_id,
        startTime: booking.start_time,
        endTime: booking.end_time,
      })
    );

    // Kiểm tra các xung đột lịch với gia sư
    const conflicts = await Promise.all(
      timeRanges.map(async (range: TimeRange) => {
        // Kiểm tra nếu gia sư đã có các booking sessions trong khoảng thời gian này
        const existingSessions = await db
          .select()
          .from(schema.bookingSessions)
          .innerJoin(
            schema.bookingRequests,
            eq(schema.bookingSessions.request_id, schema.bookingRequests.id)
          )
          .where(
            and(
              eq(schema.bookingRequests.tutor_id, range.tutorId),
              sql`${schema.bookingSessions.status} IN ('pending', 'confirmed')`,
              sql`(
                (${schema.bookingSessions.date} = ${new Date(range.startTime).toISOString().split("T")[0]
                } AND
                 ${schema.bookingSessions.start_time} < ${new Date(
                  range.endTime
                ).toLocaleTimeString("en-US", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                })} AND
                 ${schema.bookingSessions.end_time} > ${new Date(
                  range.startTime
                ).toLocaleTimeString("en-US", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                })})
              )`
            )
          );

        if (existingSessions.length > 0) {
          return {
            startTime: range.startTime,
            endTime: range.endTime,
            conflictsWith: existingSessions.map((row) => ({
              sessionId: row.booking_sessions.id,
              requestId: row.booking_sessions.request_id,
              date: row.booking_sessions.date,
              startTime: row.booking_sessions.start_time,
              endTime: row.booking_sessions.end_time,
            })),
          };
        }
        return null;
      })
    );

    // Lọc ra các xung đột thực sự (không null)
    const actualConflicts = conflicts.filter(Boolean);

    // Nếu có xung đột, thông báo cho client
    if (actualConflicts.length > 0) {
      return res.status(409).json({
        message: "Scheduling conflicts detected",
        conflicts: actualConflicts,
      });
    }

    // Tính tổng giờ và tổng số tiền cho tất cả các buổi học
    let totalHours = 0;
    const sessionsToCreate = bookings.map((booking: any) => {
      const date = booking.date;
      const startTimeStr = booking.startTime.padStart(5, "0"); // Đảm bảo format HH:MM
      const endTimeStr = booking.endTime.padStart(5, "0"); // Đảm bảo format HH:MM

      // Tính số giờ cho buổi học này
      const startTime = new Date(`${date}T${startTimeStr}:00`);
      const endTime = new Date(`${date}T${endTimeStr}:00`);
      const diffMs = endTime.getTime() - startTime.getTime();
      const hours = diffMs / (1000 * 60 * 60);

      totalHours += hours;

      return {
        date,
        startTimeStr,
        endTimeStr,
        hours,
      };
    });

    // Tính tổng số tiền
    const totalAmount = hourlyRate * totalHours;

    // 1. Tạo booking request
    const [bookingRequest] = await db
      .insert(schema.bookingRequests)
      .values({
        student_id: studentId,
        tutor_id: tutorIdNumber,
        course_id: courseIdNumber,
        title: `Đặt lịch học khóa ${selectedCourse.title}`,
        description: "",
        mode,
        location: mode === "offline" ? location : null,
        note: note || null,
        meeting_url: mode === "online" ? "" : null,
        hourly_rate: hourlyRate.toString(),
        total_hours: totalHours.toString(),
        total_amount: totalAmount.toString(),
        status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    // 2. Tạo các booking sessions
    const bookingSessionValues = sessionsToCreate.map(
      (session: {
        date: string;
        startTimeStr: string;
        endTimeStr: string;
      }) => ({
        request_id: bookingRequest.id,
        date: session.date,
        start_time: session.startTimeStr,
        end_time: session.endTimeStr,
        status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
      })
    );

    const bookingSessions = await db
      .insert(schema.bookingSessions)
      .values(bookingSessionValues)
      .returning();

    // Get detailed booking information with relationships
    const detailedBooking = await db.query.bookingRequests.findFirst({
      where: eq(schema.bookingRequests.id, bookingRequest.id),
      with: {
        tutor: {
          with: {
            user: {
              columns: {
                id: true,
                first_name: true,
                last_name: true,
                avatar: true,
              },
            },
          },
        },
        course: true,
        sessions: true,
      },
    });

    return res.status(201).json({
      message: "Booking created successfully",
      booking: detailedBooking,
      sessionsCount: bookingSessions.length,
      totalHours,
      totalAmount,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({
        message: validationError.message,
        errors: error.errors,
      });
    }

    // Handle specific error types
    if (error instanceof Error) {
      console.error("Create multiple bookings error:", error);

      // Database connection errors
      if (
        error.message.includes("connection") ||
        error.message.includes("database")
      ) {
        return res.status(503).json({
          message: "Database service unavailable, please try again later",
          error: "database_error",
        });
      }

      // Handle foreign key constraint errors
      if (error.message.includes("foreign key constraint")) {
        return res.status(400).json({
          message: "Invalid reference to tutor or course",
          error: "reference_error",
        });
      }
    }

    // Generic error response
    console.error("Create multiple bookings error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: "server_error",
    });
  }
};

// Cập nhật trạng thái buổi học cụ thể (booking session)
export const updateBookingSessionStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const sessionId = parseInt(req.params.id);
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(sessionId)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    // Validate status
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Get session with booking request info
    const session = await db.query.bookingSessions.findFirst({
      where: eq(schema.bookingSessions.id, sessionId),
      with: {
        request: {
          with: {
            tutor: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Kiểm tra quyền truy cập (chỉ học sinh hoặc gia sư liên quan)
    const tutorId = session.request.tutor.user_id;
    const studentId = session.request.student_id;

    if (studentId !== userId && tutorId !== userId) {
      return res
        .status(403)
        .json({ message: "You don't have permission to update this session" });
    }

    // Một số ràng buộc về trạng thái
    // - Học sinh chỉ có thể hủy session
    // - Gia sư có thể xác nhận hoặc đánh dấu đã hoàn thành
    if (studentId === userId) {
      if (status !== "cancelled") {
        return res
          .status(403)
          .json({ message: "Students can only cancel sessions" });
      }
    } else {
      if (status === "cancelled") {
        return res
          .status(403)
          .json({ message: "Tutors cannot cancel sessions" });
      }
    }

    // Cập nhật trạng thái session
    const [updatedSession] = await db
      .update(schema.bookingSessions)
      .set({
        status,
        updated_at: new Date(),
      })
      .where(eq(schema.bookingSessions.id, sessionId))
      .returning();

    // Kiểm tra và cập nhật trạng thái booking request nếu cần
    // Ví dụ: Nếu tất cả các session đã hoàn thành, đánh dấu booking request là completed
    if (status === "completed" || status === "cancelled") {
      const allSessions = await db.query.bookingSessions.findMany({
        where: eq(schema.bookingSessions.request_id, session.request_id),
      });

      // Kiểm tra xem tất cả các session đã có cùng trạng thái chưa
      const allHaveSameStatus = allSessions.every((s) => s.status === status);
      const allCompleted = allSessions.every(
        (s) => s.status === "completed" || s.status === "cancelled"
      );

      if (allHaveSameStatus || allCompleted) {
        // Cập nhật trạng thái booking request
        await db
          .update(schema.bookingRequests)
          .set({
            status: allSessions.every((s) => s.status === "cancelled")
              ? "cancelled"
              : status,
            updated_at: new Date(),
          })
          .where(eq(schema.bookingRequests.id, session.request_id));
      }
    }

    return res.status(200).json({
      message: "Session status updated successfully",
      session: updatedSession,
    });
  } catch (error) {
    console.error("Update session status error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
