import { Request, Response } from "express";
import { db } from "../../db";
import {
  users,
  tutorProfiles,
  courses,
  bookingRequests,
  teachingRequests,
} from "../../shared/schema";
import { count, eq, desc, sql, and } from "drizzle-orm";

// Get total number of users
export const getTotalUsers = async (req: Request, res: Response) => {
  try {
    const result = await db.select({ count: count() }).from(users);
    return res.json({ totalUsers: result[0].count });
  } catch (error) {
    console.error("Error getting total users:", error);
    return res.status(500).json({ error: "Failed to get total users count" });
  }
};

// Get active tutors count
export const getActiveTutors = async (req: Request, res: Response) => {
  try {
    const result = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, "tutor"), eq(users.is_active, true)));
    return res.json({ activeTutors: result[0].count });
  } catch (error) {
    console.error("Error getting active tutors:", error);
    return res.status(500).json({ error: "Failed to get active tutors count" });
  }
};

// Get total courses count
export const getTotalCourses = async (req: Request, res: Response) => {
  try {
    const result = await db.select({ count: count() }).from(courses);
    return res.json({ totalCourses: result[0].count });
  } catch (error) {
    console.error("Error getting total courses:", error);
    return res.status(500).json({ error: "Failed to get total courses count" });
  }
};

// Get total bookings count
export const getTotalBookings = async (req: Request, res: Response) => {
  try {
    const result = await db.select({ count: count() }).from(bookingRequests);
    return res.json({ totalBookings: result[0].count });
  } catch (error) {
    console.error("Error getting total bookings:", error);
    return res
      .status(500)
      .json({ error: "Failed to get total bookings count" });
  }
};

// Get overall dashboard summary
export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    // Get total active users count
    const usersCount = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.is_active, true));
    const totalUsers = Number(usersCount[0].count || 0);

    // Get active student count
    const studentsCount = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, "student"), eq(users.is_active, true)));
    const totalStudents = Number(studentsCount[0].count || 0);

    // Get active tutors count
    const activeTutorsCount = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, "tutor"), eq(users.is_active, true)));
    const totalTutors = Number(activeTutorsCount[0].count || 0);

    // Get total courses count
    const coursesCount = await db.select({ count: count() }).from(courses);

    // Get total bookings count
    const bookingsCount = await db
      .select({ count: count() })
      .from(bookingRequests);

    // Calculate percentages
    const studentsPercentage =
      totalUsers > 0 ? Math.round((totalStudents / totalUsers) * 100) : 0;
    const tutorsPercentage =
      totalUsers > 0 ? Math.round((totalTutors / totalUsers) * 100) : 0;

    // Combine all statistics into one response
    const dashboardStats = {
      totalUsers: totalUsers,
      totalStudents: totalStudents,
      studentsPercentage: studentsPercentage,
      activeTutors: totalTutors,
      tutorsPercentage: tutorsPercentage,
      totalCourses: coursesCount[0].count,
      totalBookings: bookingsCount[0].count,
    };
    console.log("Dashboard statistics:", dashboardStats);
    return res.json(dashboardStats);
  } catch (error) {
    console.error("Error getting dashboard overview:", error);
    return res
      .status(500)
      .json({ error: "Failed to get dashboard statistics" });
  }
};

// Get recent activities
export const getRecentActivities = async (req: Request, res: Response) => {
  try {
    // Get recently approved tutor verifications
    const recentTutorVerifications = await db
      .select({
        id: teachingRequests.id,
        tutorId: teachingRequests.tutor_id,
        subjectId: teachingRequests.subject_id,
        levelId: teachingRequests.level_id,
        status: teachingRequests.status,
        createdAt: teachingRequests.created_at,
        updatedAt: teachingRequests.updated_at,
        type: sql`'tutor_verification'`.as("type"),
        title: sql`'Xác minh giảng viên được chấp thuận'`.as("title"),
        description:
          sql`CONCAT('Yêu cầu xác minh của giảng viên ', (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = ${teachingRequests.tutor_id}), ' đã được chấp thuận')`.as(
            "description"
          ),
      })
      .from(teachingRequests)
      .where(eq(teachingRequests.status, "approved"))
      .orderBy(desc(teachingRequests.updated_at))
      .limit(5);

        // Get recently registered users
        const recentUsers = await db
            .select({
            id: users.id,
            username: users.username,
            email: users.email,
            firstName: users.first_name,
            lastName: users.last_name,
            role: users.role,
            createdAt: users.created_at,
            type: sql`'new_user'`.as("type"),
            title: sql`'Người dùng mới đăng ký'`.as("title"),
            description: sql`CONCAT(${users.first_name}, ' ', ${users.last_name}, ' đã tham gia với vai trò ', 
                CASE 
                WHEN ${users.role} = 'student' THEN 'học viên'
                WHEN ${users.role} = 'tutor' THEN 'giảng viên'
                WHEN ${users.role} = 'admin' THEN 'quản trị viên'
                ELSE ${users.role}
                END)`.as("description")
            })
            .from(users)
            .orderBy(desc(users.created_at))
            .limit(5);

        // Get recently created courses
        const recentCourses = await db
            .select({
                id: courses.id,
                tutorId: courses.tutor_id,
                title: courses.title,
                subjectId: courses.subject_id,
                levelId: courses.level_id,
                hourlyRate: courses.hourly_rate,
                createdAt: courses.created_at,
                type: sql`'new_course'`.as("type"),
                title: sql`'Khóa học mới'`.as("title"),
                description: sql`CONCAT('Khóa học mới: ', ${courses.title})`.as("description")
            })
            .from(courses)
            .orderBy(desc(courses.created_at))
            .limit(5);

        // Get recent booking requests
        const recentBookings = await db
            .select({
                id: bookingRequests.id,
                studentId: bookingRequests.student_id,
                tutorId: bookingRequests.tutor_id,
                title: bookingRequests.title,
                mode: bookingRequests.mode,
                status: bookingRequests.status,
                createdAt: bookingRequests.created_at,
                type: sql`'new_booking'`.as("type"),
                title: sql`'Yêu cầu đặt lịch mới'`.as("title"),
                description: sql`CONCAT('Yêu cầu đặt lịch: ', ${bookingRequests.title})`.as("description")
            })
            .from(bookingRequests)
            .orderBy(desc(bookingRequests.created_at))
            .limit(5);

    // Combine all activities into a single array
    let allActivities = [
      ...recentTutorVerifications,
      ...recentUsers,
      ...recentCourses,
      ...recentBookings,
    ]; // Sort by creation date (most recent first)
    allActivities.sort((a, b) => {
      // For all activities, use createdAt for consistency
      const dateA = a.createdAt;
      const dateB = b.createdAt;
      // Handle null dates (put nulls at the end)
      if (!dateA) return 1; // Move a to the end if its date is null
      if (!dateB) return -1; // Move b to the end if its date is null
      return dateB.getTime() - dateA.getTime();
    });

    // Limit to 20 most recent activities
    allActivities = allActivities.slice(0, 20);

        // Return the combined data in two formats: grouped and as a timeline
        return res.json({
            groupedActivities: {
                tutorVerifications: recentTutorVerifications,
                newUsers: recentUsers,
                newCourses: recentCourses,
                newBookings: recentBookings
            },
            recentActivities: allActivities
        });
    } catch (error) {
        console.error("Error getting recent activities:", error);
        return res.status(500).json({ error: "Không thể lấy hoạt động gần đây" });
    }
};

// Get user growth statistics by month for the current year
export const getUserGrowthByMonth = async (req: Request, res: Response) => {
  try {
    // Get current year
    const currentYear = new Date().getFullYear();

    // Query to get user count by month for current year
    const result = await db.execute(
      sql`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*) as count
        FROM users
        WHERE EXTRACT(YEAR FROM created_at) = ${currentYear}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month ASC
      `
    );

    // Transform the data: extract rows and convert count to number
    const monthlyData = result.rows.map((item: any) => ({
      month: String(item.month),
      count: parseInt(String(item.count), 10), // Convert to string first, then to number
    }));

    console.log("User growth data processed:", monthlyData);

    // Return monthly growth data as an array
    return res.json(monthlyData);
  } catch (error) {
    console.error("Error getting user growth statistics:", error);
    return res
      .status(500)
      .json({ error: "Failed to get user growth statistics" });
  }
};

// Get booking volume statistics with different time-based filters
export const getBookingsVolume = async (req: Request, res: Response) => {
  try {
    // Extract query parameters
    const {
      type = "week",
      month,
      year: yearParam,
      fromDate,
      toDate,
    } = req.query;
    const currentDate = new Date();
    const year = yearParam
      ? parseInt(yearParam as string, 10)
      : currentDate.getFullYear();

    let result;

    // Different queries based on type parameter
    switch (type) {
      case "day":
        // Filter by date range if fromDate and toDate are provided
        if (fromDate && toDate) {
          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM-DD') as period,
                          COUNT(*) as count
                        FROM booking_requests
                        WHERE created_at::date BETWEEN ${fromDate}::date AND ${toDate}::date
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
                        ORDER BY period ASC
                        `
          );
        } else if (fromDate) {
          // If only fromDate is provided
          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM-DD') as period,
                          COUNT(*) as count
                        FROM booking_requests
                        WHERE created_at::date >= ${fromDate}::date
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
                        ORDER BY period ASC
                        `
          );
        } else {
          // Default: last 30 days
          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM-DD') as period,
                          COUNT(*) as count
                        FROM booking_requests
                        WHERE created_at::date >= NOW() - INTERVAL '30 days'
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
                        ORDER BY period ASC
                        `
          );
        }
        break;

      case "week":
        // Group by week number for the specified year
        result = await db.execute(
          sql`
                    SELECT 
                      TO_CHAR(created_at, 'IYYY-IW') as period,
                      COUNT(*) as count
                    FROM booking_requests
                    WHERE EXTRACT(YEAR FROM created_at) = ${year}
                    GROUP BY TO_CHAR(created_at, 'IYYY-IW')
                    ORDER BY period ASC
                    `
        );
        break;

      case "month":
        // If month is specified, group by day within that month
        if (month) {
          const monthNum = parseInt(month as string, 10);
          if (monthNum < 1 || monthNum > 12) {
            return res
              .status(400)
              .json({ error: "Month parameter must be between 1 and 12" });
          }

          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM-DD') as period,
                          COUNT(*) as count
                        FROM booking_requests
                        WHERE 
                          EXTRACT(YEAR FROM created_at) = ${year} AND
                          EXTRACT(MONTH FROM created_at) = ${monthNum}
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
                        ORDER BY period ASC
                        `
          );
        } else {
          // If no month specified, return all months for the year
          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM') as period,
                          COUNT(*) as count
                        FROM booking_requests
                        WHERE EXTRACT(YEAR FROM created_at) = ${year}
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
                        ORDER BY period ASC
                        `
          );
        }
        break;

      case "year":
        // Group by month for the specified year
        result = await db.execute(
          sql`
                    SELECT 
                      TO_CHAR(created_at, 'YYYY-MM') as period,
                      COUNT(*) as count
                    FROM booking_requests
                    WHERE EXTRACT(YEAR FROM created_at) = ${year}
                    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
                    ORDER BY period ASC
                    `
        );
        break;

      default:
        return res.status(400).json({
          error:
            "Invalid type parameter. Use 'day', 'week', 'month', or 'year'",
        });
    }

    // Transform the data: extract rows and convert count to number
    const volumeData = result.rows.map((item: Record<string, unknown>) => ({
      period: String(item.period),
      count: parseInt(String(item.count), 10), // Convert to string first, then to number
    }));

    console.log("Booking volume data processed:", volumeData);

    // Return booking volume data as an array
    return res.json(volumeData);
  } catch (error) {
    console.error("Error getting booking volume statistics:", error);
    return res
      .status(500)
      .json({ error: "Failed to get booking volume statistics" });
  }
};

// Get user growth statistics with time filter parameters
export const getUserGrowthLatest12Months = async (
  req: Request,
  res: Response
) => {
  try {
    // Extract query parameters
    const {
      type = "month",
      month,
      year: yearParam,
      fromDate,
      toDate,
    } = req.query;
    const currentDate = new Date();
    const year = yearParam
      ? parseInt(yearParam as string, 10)
      : currentDate.getFullYear();

    let result;

    // Different queries based on type parameter
    switch (type) {
      case "day":
        // Filter by date range if fromDate and toDate are provided
        if (fromDate && toDate) {
          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM-DD') as month,
                          COUNT(*) as count
                        FROM users
                        WHERE created_at::date BETWEEN ${fromDate}::date AND ${toDate}::date
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
                        ORDER BY month ASC
                        `
          );
        } else if (fromDate) {
          // If only fromDate is provided
          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM-DD') as month,
                          COUNT(*) as count
                        FROM users
                        WHERE created_at::date >= ${fromDate}::date
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
                        ORDER BY month ASC
                        `
          );
        } else {
          // Default: last 30 days
          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM-DD') as month,
                          COUNT(*) as count
                        FROM users
                        WHERE created_at::date >= NOW() - INTERVAL '30 days'
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
                        ORDER BY month ASC
                        `
          );
        }
        break;

      case "month":
        // If month is specified, group by day within that month
        if (month) {
          const monthNum = parseInt(month as string, 10);
          if (monthNum < 1 || monthNum > 12) {
            return res
              .status(400)
              .json({ error: "Month parameter must be between 1 and 12" });
          }

          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM-DD') as month,
                          COUNT(*) as count
                        FROM users
                        WHERE 
                          EXTRACT(YEAR FROM created_at) = ${year} AND
                          EXTRACT(MONTH FROM created_at) = ${monthNum}
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
                        ORDER BY month ASC
                        `
          );
        } else {
          // If no month specified, return all months for the year
          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM') as month,
                          COUNT(*) as count
                        FROM users
                        WHERE EXTRACT(YEAR FROM created_at) = ${year}
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
                        ORDER BY month ASC
                        `
          );
        }
        break;

      case "year":
        // Group by month for the specified year
        result = await db.execute(
          sql`
                    SELECT 
                      TO_CHAR(created_at, 'YYYY-MM') as month,
                      COUNT(*) as count
                    FROM users
                    WHERE EXTRACT(YEAR FROM created_at) = ${year}
                    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
                    ORDER BY month ASC
                    `
        );
        break;

      default:
        // Default behavior: latest 12 months
        result = await db.execute(
          sql`
                    SELECT 
                      TO_CHAR(created_at, 'YYYY-MM') as month,
                      COUNT(*) as count
                    FROM users
                    WHERE created_at >= NOW() - INTERVAL '12 months'
                    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
                    ORDER BY month ASC
                    `
        );
        break;
    }

    // Transform the data: extract rows and convert count to number
    const monthlyData = result.rows.map((item: Record<string, unknown>) => ({
      month: String(item.month || ""),
      count: parseInt(String(item.count || "0"), 10), // Convert to string first, then to number
    }));

    console.log("User growth data processed:", monthlyData);

    // Return monthly growth data as an array
    return res.json(monthlyData);
  } catch (error) {
    console.error("Error getting user growth statistics:", error);
    return res
      .status(500)
      .json({ error: "Failed to get user growth statistics" });
  }
};

// Get statistics for courses by subject
export const getCoursesBySubject = async (req: Request, res: Response) => {
  try {
    // Thực hiện truy vấn courses và join với bảng subjects
    const result = await db.execute(
      sql`
            SELECT 
                s.name as subject,
                COUNT(c.id) as count
            FROM courses c
            JOIN subjects s ON c.subject_id = s.id
            GROUP BY s.name
            ORDER BY count DESC
            `
    ); // Transform the data: extract rows and convert count to number
    const coursesBySubject = result.rows.map((item) => ({
      subject: item.subject as string,
      count: parseInt(String(item.count), 10), // Chuyển đổi sang string rồi parse thành number
    }));

    console.log("Courses by subject statistics:", coursesBySubject);

    // Return courses by subject data as an array
    return res.json(coursesBySubject);
  } catch (error) {
    console.error("Error getting courses by subject statistics:", error);
    return res
      .status(500)
      .json({ error: "Failed to get courses by subject statistics" });
  }
};

// Get revenue statistics from booking_requests
export const getRevenueStats = async (req: Request, res: Response) => {
  try {
    // Extract query parameters
    const {
      type = "month",
      month,
      year: yearParam,
      fromDate,
      toDate,
    } = req.query;
    const currentDate = new Date();
    const year = yearParam
      ? parseInt(yearParam as string, 10)
      : currentDate.getFullYear();

    let result;

    // Different queries based on type parameter
    switch (type) {
      case "day":
        // Filter by date range if fromDate and toDate are provided
        if (fromDate && toDate) {
          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM-DD') as period,
                          COALESCE(SUM(total_amount), 0) as revenue
                        FROM booking_requests
                        WHERE 
                          status = 'completed' AND
                          created_at::date BETWEEN ${fromDate}::date AND ${toDate}::date
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
                        ORDER BY period ASC
                        `
          );
        } else if (fromDate) {
          // If only fromDate is provided
          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM-DD') as period,
                          COALESCE(SUM(total_amount), 0) as revenue
                        FROM booking_requests
                        WHERE 
                          status = 'completed' AND
                          created_at::date >= ${fromDate}::date
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
                        ORDER BY period ASC
                        `
          );
        } else {
          // Default: last 30 days
          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM-DD') as period,
                          COALESCE(SUM(total_amount), 0) as revenue
                        FROM booking_requests
                        WHERE 
                          status = 'completed' AND
                          created_at::date >= NOW() - INTERVAL '30 days'
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
                        ORDER BY period ASC
                        `
          );
        }
        break;

      case "week":
        // Group by week number for the specified year
        result = await db.execute(
          sql`
                    SELECT 
                      TO_CHAR(created_at, 'IYYY-IW') as period,
                      COALESCE(SUM(total_amount), 0) as revenue
                    FROM booking_requests
                    WHERE 
                      status = 'completed' AND
                      EXTRACT(YEAR FROM created_at) = ${year}
                    GROUP BY TO_CHAR(created_at, 'IYYY-IW')
                    ORDER BY period ASC
                    `
        );
        break;

      case "month":
        // If month is specified, group by day within that month
        if (month) {
          const monthNum = parseInt(month as string, 10);
          if (monthNum < 1 || monthNum > 12) {
            return res
              .status(400)
              .json({ error: "Month parameter must be between 1 and 12" });
          }

          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM-DD') as period,
                          COALESCE(SUM(total_amount), 0) as revenue
                        FROM booking_requests
                        WHERE 
                          status = 'completed' AND
                          EXTRACT(YEAR FROM created_at) = ${year} AND
                          EXTRACT(MONTH FROM created_at) = ${monthNum}
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
                        ORDER BY period ASC
                        `
          );
        } else {
          // If no month specified, return all months for the year
          result = await db.execute(
            sql`
                        SELECT 
                          TO_CHAR(created_at, 'YYYY-MM') as period,
                          COALESCE(SUM(total_amount), 0) as revenue
                        FROM booking_requests
                        WHERE 
                          status = 'completed' AND
                          EXTRACT(YEAR FROM created_at) = ${year}
                        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
                        ORDER BY period ASC
                        `
          );
        }
        break;

      case "year":
        // Group by month for the specified year
        result = await db.execute(
          sql`
                    SELECT 
                      TO_CHAR(created_at, 'YYYY-MM') as period,
                      COALESCE(SUM(total_amount), 0) as revenue
                    FROM booking_requests
                    WHERE 
                      status = 'completed' AND
                      EXTRACT(YEAR FROM created_at) = ${year}
                    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
                    ORDER BY period ASC
                    `
        );
        break;

      default:
        return res.status(400).json({
          error:
            "Invalid type parameter. Use 'day', 'week', 'month', or 'year'",
        });
    }

    // Transform the data: extract rows and convert revenue to number
    const revenueData = result.rows.map((item: Record<string, unknown>) => ({
      period: String(item.period || ""),
      revenue: parseFloat(String(item.revenue || "0")), // Convert to string first, then to float
    }));
    console.log("Revenue statistics processed:", revenueData);

    // Return revenue data as an array
    return res.json(revenueData);
  } catch (error) {
    console.error("Error getting revenue statistics:", error);
    return res.status(500).json({ error: "Failed to get revenue statistics" });
  }
};
