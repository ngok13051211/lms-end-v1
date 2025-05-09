import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Tạo booking mới
export const createBooking = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate booking data
    const validatedData = schema.bookingValidationSchema.parse({
      ...req.body,
      student_id: studentId,
    });

    // Kiểm tra xem gia sư có tồn tại không
    const tutor = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.id, validatedData.tutor_id),
    });

    if (!tutor) {
      return res.status(404).json({ message: "Tutor not found" });
    }

    // Xác định hourly_rate từ course nếu có course_id
    let hourlyRate;
    let selectedCourse;

    if (validatedData.course_id) {
      selectedCourse = await db.query.courses.findFirst({
        where: and(
          eq(schema.courses.id, validatedData.course_id),
          eq(schema.courses.tutor_id, validatedData.tutor_id)
        ),
      });

      if (!selectedCourse) {
        return res.status(404).json({
          message: "Course not found or does not belong to the tutor",
        });
      }

      // Lấy hourly_rate từ course
      hourlyRate = Number(selectedCourse.hourly_rate);
    } else {
      // Nếu không có course_id, sử dụng hourly_rate từ request
      // (KHÔNG khuyến khích, nên yêu cầu client luôn gửi course_id)
      if (!validatedData.hourly_rate) {
        return res.status(400).json({
          message: "Either course_id or hourly_rate must be provided",
        });
      }
      hourlyRate =
        typeof validatedData.hourly_rate === "string"
          ? parseFloat(validatedData.hourly_rate)
          : validatedData.hourly_rate;
    }

    // Tính toán tổng thời gian
    // Đảm bảo xử lý thời gian đúng cách bằng cách thêm thông tin múi giờ
    // Sử dụng 'T' như một phần của chuỗi ISO để đảm bảo JavaScript xử lý đúng múi giờ địa phương
    const bookingDate = validatedData.date as string;

    // Chuẩn hóa định dạng giờ HH:MM
    let startTimeStr = String(validatedData.start_time);
    let endTimeStr = String(validatedData.end_time);

    // Đảm bảo định dạng giờ có đầy đủ 2 chữ số ở phần giờ (HH:MM)
    if (startTimeStr.length === 4) {
      startTimeStr = "0" + startTimeStr;
    }

    if (endTimeStr.length === 4) {
      endTimeStr = "0" + endTimeStr;
    }

    // Tạo đối tượng Date với định dạng chuẩn ISO 8601 (YYYY-MM-DDThh:mm:ss)
    const startTime = new Date(`${bookingDate}T${startTimeStr}:00`);
    const endTime = new Date(`${bookingDate}T${endTimeStr}:00`);

    console.log(
      `Thời gian bắt đầu: ${startTime.toISOString()}, Thời gian kết thúc: ${endTime.toISOString()}`
    );

    const diffMs = endTime.getTime() - startTime.getTime();
    const hours = diffMs / (1000 * 60 * 60);

    if (hours <= 0) {
      return res
        .status(400)
        .json({ message: "End time must be after start time" });
    }

    // Tính toán tổng số tiền dựa trên hourlyRate đã xác định
    const totalAmount = hourlyRate * hours;

    // Tạo booking với dữ liệu đã validate
    const [booking] = await db
      .insert(schema.bookings)
      .values([
        {
          student_id: studentId,
          tutor_id: validatedData.tutor_id,
          course_id: validatedData.course_id,
          title: validatedData.title,
          description: validatedData.description || "",
          start_time: startTime,
          end_time: endTime,
          location: validatedData.location,
          meeting_url: validatedData.meeting_url,
          hourly_rate: hourlyRate.toString(),
          total_hours: hours.toString(),
          total_amount: totalAmount.toString(),
          status: "pending",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
      .returning();

    return res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error("Create booking error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Lấy danh sách booking của học sinh
export const getStudentBookings = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Status filter
    const status = req.query.status as string;
    const conditions = [eq(schema.bookings.student_id, studentId)];

    if (status && status !== "all") {
      conditions.push(eq(schema.bookings.status, status));
    }

    // Get bookings
    const bookings = await db.query.bookings.findMany({
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
      },
      orderBy: [desc(schema.bookings.created_at)],
    });

    return res.status(200).json(bookings);
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
    const conditions = [eq(schema.bookings.tutor_id, tutorProfile.id)];

    if (status && status !== "all") {
      conditions.push(eq(schema.bookings.status, status));
    }

    // Get bookings
    const bookings = await db.query.bookings.findMany({
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
      },
      orderBy: [desc(schema.bookings.created_at)],
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
    const booking = await db.query.bookings.findFirst({
      where: eq(schema.bookings.id, bookingId),
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
        sessionNote: true,
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
    const booking = await db.query.bookings.findFirst({
      where: eq(schema.bookings.id, bookingId),
      with: {
        tutor: true,
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

    // Cập nhật trạng thái
    const [updatedBooking] = await db
      .update(schema.bookings)
      .set({
        status,
        updated_at: new Date(),
      })
      .where(eq(schema.bookings.id, bookingId))
      .returning();

    return res.status(200).json({
      message: "Booking status updated successfully",
      booking: updatedBooking,
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
    const bookingId = parseInt(req.params.id);
    const { tutor_notes, student_rating, student_feedback } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(bookingId)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    // Get booking
    const booking = await db.query.bookings.findFirst({
      where: eq(schema.bookings.id, bookingId),
      with: {
        tutor: true,
        sessionNote: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Kiểm tra quyền truy cập (chỉ học sinh hoặc gia sư liên quan)
    const tutorId = booking.tutor.user_id;
    const isStudent = booking.student_id === userId;
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
    if (booking.sessionNote) {
      [sessionNote] = await db
        .update(schema.sessionNotes)
        .set({
          ...updateData,
          updated_at: new Date(),
        })
        .where(eq(schema.sessionNotes.booking_id, bookingId))
        .returning();
    } else {
      [sessionNote] = await db
        .insert(schema.sessionNotes)
        .values({
          booking_id: bookingId,
          ...updateData,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();
    }

    // Nếu học sinh đánh giá, cập nhật rating trung bình của gia sư
    if (isStudent && updateData.student_rating) {
      // Lấy tất cả đánh giá của gia sư
      const allRatings = await db
        .select({
          rating: schema.sessionNotes.student_rating,
        })
        .from(schema.sessionNotes)
        .innerJoin(
          schema.bookings,
          eq(schema.sessionNotes.booking_id, schema.bookings.id)
        )
        .where(
          and(
            eq(schema.bookings.tutor_id, booking.tutor_id),
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
        .where(eq(schema.tutorProfiles.id, booking.tutor_id));
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
