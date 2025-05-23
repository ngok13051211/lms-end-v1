import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { console } from "inspector";

// Import các controller functions
import { getTutors } from "./adminController/getTutors";
import { getTutorById } from "./adminController/getTutorById";

/**
 * @desc    Lấy danh sách tất cả người dùng
 * @route   GET /api/v1/admin/users
 * @access  Private/Admin
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    // Kiểm tra quyền admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        message:
          "Không có quyền truy cập. Chỉ admin mới có thể xem danh sách người dùng.",
      });
    }

    // Phân trang
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Lọc theo vai trò nếu có
    const role = req.query.role as string;
    const searchQuery = req.query.search as string;

    // Xây dựng điều kiện lọc
    let conditions = [];

    if (role && ["student", "tutor", "admin"].includes(role)) {
      conditions.push(eq(schema.users.role, role));
    }

    if (searchQuery) {
      conditions.push(
        sql`(${schema.users.first_name} ILIKE ${`%${searchQuery}%`} OR 
             ${schema.users.last_name} ILIKE ${`%${searchQuery}%`} OR 
             ${schema.users.email} ILIKE ${`%${searchQuery}%`})`
      );
    }

    // Lấy danh sách người dùng
    const users = await db.query.users.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: desc(schema.users.created_at),
      limit: limit,
      offset: offset,
      columns: {
        password: false, // Loại bỏ trường password
      },
    });

    // Đếm tổng số người dùng
    const [{ count }] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(schema.users)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return res.status(200).json({
      success: true,
      count: Number(count),
      total_pages: Math.ceil(Number(count) / limit),
      current_page: page,
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Lấy chi tiết người dùng theo ID
 * @route   GET /api/v1/admin/users/:id
 * @access  Private/Admin
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    console.log("User ID:", userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: {
        password: false,
      },
    });
    console.log("User:", user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * @desc    Lấy thống kê dành cho admin
 * @route   GET /api/v1/admin/stats
 * @access  Private/Admin
 */
/**
 * @desc    Khóa tài khoản người dùng
 * @route   PATCH /api/v1/admin/users/:id/deactivate
 * @access  Private/Admin
 */
export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "ID người dùng không hợp lệ",
      });
    }

    // Kiểm tra xem người dùng có tồn tại không
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Nếu người dùng là admin, không cho phép khóa
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Không thể khóa tài khoản admin khác",
      });
    }

    // Cập nhật trạng thái tài khoản thành không hoạt động
    await db
      .update(schema.users)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(schema.users.id, userId));

    return res.status(200).json({
      success: true,
      message: "Đã khóa tài khoản người dùng thành công",
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi khóa tài khoản",
    });
  }
};

/**
 * @desc    Mở khóa tài khoản người dùng
 * @route   PATCH /api/v1/admin/users/:id/activate
 * @access  Private/Admin
 */
export const activateUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "ID người dùng không hợp lệ"
      });
    }

    // Kiểm tra xem người dùng có tồn tại không
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng"
      });
    }

    // Cập nhật trạng thái tài khoản thành hoạt động
    await db
      .update(schema.users)
      .set({ is_active: true, updated_at: new Date() })
      .where(eq(schema.users.id, userId));

    return res.status(200).json({
      success: true,
      message: "Đã mở khóa tài khoản người dùng thành công",
    });
  } catch (error) {
    console.error("Activate user error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi mở khóa tài khoản",
    });
  }
};

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    // Đảm bảo người dùng có quyền admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập",
      });
    }

    // 1. Tổng số người dùng theo vai trò
    const [userStats] = await db
      .select({
        total: count(schema.users.id),
        students: sql`SUM(CASE WHEN ${schema.users.role} = 'student' THEN 1 ELSE 0 END)`,
        tutors: sql`SUM(CASE WHEN ${schema.users.role} = 'tutor' THEN 1 ELSE 0 END)`,
        admins: sql`SUM(CASE WHEN ${schema.users.role} = 'admin' THEN 1 ELSE 0 END)`,
      })
      .from(schema.users);

    // 2. Số lượng gia sư theo trạng thái xác minh
    const [tutorStats] = await db
      .select({
        total: count(schema.tutorProfiles.id),
        pending: sql`SUM(CASE WHEN ${schema.tutorProfiles.is_verified} = 'pending' THEN 1 ELSE 0 END)`,
        approved: sql`SUM(CASE WHEN ${schema.tutorProfiles.is_verified} = 'approved' THEN 1 ELSE 0 END)`,
        rejected: sql`SUM(CASE WHEN ${schema.tutorProfiles.is_verified} = 'rejected' THEN 1 ELSE 0 END)`,
      })
      .from(schema.tutorProfiles);

    // 3. Số lượng buổi học theo trạng thái (dùng booking_requests thay cho bookings)
    const [bookingStats] = await db
      .select({
        total: count(schema.bookingRequests.id),
        pending: sql`SUM(CASE WHEN ${schema.bookingRequests.status} = 'pending' THEN 1 ELSE 0 END)`,
        confirmed: sql`SUM(CASE WHEN ${schema.bookingRequests.status} = 'confirmed' THEN 1 ELSE 0 END)`,
        completed: sql`SUM(CASE WHEN ${schema.bookingRequests.status} = 'completed' THEN 1 ELSE 0 END)`,
        cancelled: sql`SUM(CASE WHEN ${schema.bookingRequests.status} = 'cancelled' THEN 1 ELSE 0 END)`,
        rejected: sql`SUM(CASE WHEN ${schema.bookingRequests.status} = 'rejected' THEN 1 ELSE 0 END)`,
      })
      .from(schema.bookingRequests);

    // Thêm thống kê chi tiết về các buổi học (booking_sessions)
    const [sessionStats] = await db
      .select({
        total: count(schema.bookingSessions.id),
        pending: sql`SUM(CASE WHEN ${schema.bookingSessions.status} = 'pending' THEN 1 ELSE 0 END)`,
        confirmed: sql`SUM(CASE WHEN ${schema.bookingSessions.status} = 'confirmed' THEN 1 ELSE 0 END)`,
        completed: sql`SUM(CASE WHEN ${schema.bookingSessions.status} = 'completed' THEN 1 ELSE 0 END)`,
        cancelled: sql`SUM(CASE WHEN ${schema.bookingSessions.status} = 'cancelled' THEN 1 ELSE 0 END)`,
      })
      .from(schema.bookingSessions);

    // 4. Thống kê về thanh toán
    const [paymentStats] = await db
      .select({
        total: count(schema.payments.id),
        totalAmount: sql`SUM(${schema.payments.amount})`,
        completed: sql`SUM(CASE WHEN ${schema.payments.status} = 'completed' THEN 1 ELSE 0 END)`,
        pending: sql`SUM(CASE WHEN ${schema.payments.status} = 'pending' THEN 1 ELSE 0 END)`,
      })
      .from(schema.payments);

    // 5. Thống kê người dùng mới (trong 30 ngày gần đây)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [newUsers] = await db
      .select({
        count: count(schema.users.id),
      })
      .from(schema.users)
      .where(sql`${schema.users.created_at} >= ${thirtyDaysAgo}`);

    return res.status(200).json({
      success: true,
      data: {
        users: {
          total: Number(userStats.total || 0),
          students: Number(userStats.students || 0),
          tutors: Number(userStats.tutors || 0),
          admins: Number(userStats.admins || 0),
          newLast30Days: Number(newUsers.count || 0),
        },
        tutors: {
          total: Number(tutorStats.total || 0),
          pending: Number(tutorStats.pending || 0),
          approved: Number(tutorStats.approved || 0),
          rejected: Number(tutorStats.rejected || 0),
        },
        bookingRequests: {
          total: Number(bookingStats.total || 0),
          pending: Number(bookingStats.pending || 0),
          confirmed: Number(bookingStats.confirmed || 0),
          completed: Number(bookingStats.completed || 0),
          canceled: Number(bookingStats.rejected || 0),
        },
        // Thêm thống kê mới về các buổi học
        bookingSessions: {
          total: Number(sessionStats.total || 0),
          pending: Number(sessionStats.pending || 0),
          confirmed: Number(sessionStats.confirmed || 0),
          completed: Number(sessionStats.completed || 0),
          cancelled: Number(sessionStats.cancelled || 0),
        },
        payments: {
          total: Number(paymentStats.total || 0),
          totalAmount: Number(paymentStats.totalAmount || 0),
          completed: Number(paymentStats.completed || 0),
          pending: Number(paymentStats.pending || 0),
        },
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thống kê",
    });
  }
};

/**
 * @desc    Lấy danh sách booking của một người dùng
 * @route   GET /api/v1/admin/users/:userId/bookings
 * @access  Private/Admin
 */
export const getUserBookings = async (req: Request, res: Response) => {
  try {
    // Kiểm tra quyền admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        message:
          "Không có quyền truy cập. Chỉ admin mới có thể xem thông tin này.",
      });
    }

    const userId = parseInt(req.params.userId);

    // Phân trang
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Lấy danh sách booking của người dùng này
    const bookings = await db.query.bookingRequests.findMany({
      where: eq(schema.bookingRequests.student_id, userId),
      with: {
        course: {
          with: {
            subject: true,
            tutor: {
              with: {
                user: true
              }
            }
          }
        }
      },
      offset,
      limit,
      orderBy: [desc(schema.bookingRequests.created_at)],
    });

    // Lấy tổng số booking để phân trang
    const totalCount = await db
      .select({ count: count() })
      .from(schema.bookingRequests)
      .where(eq(schema.bookingRequests.student_id, userId));

    const total = totalCount[0]?.count || 0;

    // Định dạng dữ liệu trả về
    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      title: booking.title,
      status: booking.status,
      created_at: booking.created_at,
      course_name: booking.course?.title || "N/A",
      subject_name: booking.course?.subject?.name || "N/A",
      tutor_name: booking.course?.tutor?.user
        ? `${booking.course.tutor.user.first_name} ${booking.course.tutor.user.last_name}`
        : "N/A",
      hourly_rate: booking.hourly_rate,
      total_hours: booking.total_hours,
      total_amount: booking.total_amount,
      mode: booking.mode,
      course_id: booking.course_id,
    }));

    return res.json({
      message: "Lấy danh sách booking thành công",
      data: formattedBookings,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getUserBookings:", error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi khi lấy danh sách booking",
      error: (error as Error).message,
    });
  }
};

/**
 * @desc    Lấy tổng quan lịch sử học tập của học viên, nhóm theo khóa học
 * @route   GET /api/v1/admin/users/:userId/booking-summary
 * @access  Private/Admin
 */
export const getUserBookingSummaryByCourse = async (req: Request, res: Response) => {
  try {
    // Kiểm tra quyền admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        message: "Không có quyền truy cập. Chỉ admin mới có thể xem thông tin này.",
      });
    }

    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Kiểm tra user có tồn tại không
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Lấy tất cả bookings của user này để nhóm theo course_id
    const bookings = await db.query.bookingRequests.findMany({
      where: eq(schema.bookingRequests.student_id, userId),
      with: {
        course: {
          with: {
            subject: true,
            tutor: {
              with: {
                user: true
              }
            }
          }
        },
        sessions: true
      },
    });

    // Nhóm bookings theo course_id
    const bookingsByCoursesMap = new Map();

    bookings.forEach(booking => {
      if (!booking.course_id) return;

      const key = booking.course_id;
      if (!bookingsByCoursesMap.has(key)) {
        bookingsByCoursesMap.set(key, {
          course_id: booking.course_id,
          course_name: booking.course?.title || "N/A",
          subject_name: booking.course?.subject?.name || "N/A",
          tutor_name: booking.course?.tutor?.user
            ? `${booking.course.tutor.user.first_name} ${booking.course.tutor.user.last_name}`
            : "N/A",
          sessions: [],
          total_sessions: 0,
          completed_sessions: 0
        });
      }

      // Thêm các sessions của booking này vào group
      if (booking.sessions && Array.isArray(booking.sessions)) {
        const group = bookingsByCoursesMap.get(key);
        booking.sessions.forEach(session => {
          group.sessions.push(session);
          group.total_sessions++;
          if (session.status === "completed") {
            group.completed_sessions++;
          }
        });
      }
    });

    // Convert Map to Array và thêm overall_status
    const bookingSummary = Array.from(bookingsByCoursesMap.values()).map(group => ({
      course_id: group.course_id,
      course_name: group.course_name,
      subject_name: group.subject_name,
      tutor_name: group.tutor_name,
      total_sessions: group.total_sessions,
      completed_sessions: group.completed_sessions,
      overall_status: group.total_sessions === group.completed_sessions && group.total_sessions > 0
        ? "completed"
        : "in_progress"
    }));

    return res.status(200).json(bookingSummary);
  } catch (error) {
    console.error("Error in getUserBookingSummaryByCourse:", error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi khi lấy thông tin lịch sử học tập",
      error: (error as Error).message,
    });
  }
};

// Đã export toàn bộ controller functions trước đó
