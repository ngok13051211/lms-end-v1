import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { and, count, desc, eq, ilike, isNull, not, or, sql } from "drizzle-orm";

/**
 * @desc    Lấy danh sách tất cả gia sư
 * @route   GET /api/v1/admin/tutors
 * @access  Private/Admin
 */
export const getTutors = async (req: Request, res: Response) => {
  try {
    // Kiểm tra quyền admin
    if (req.user?.role !== "admin") {
      return res.error(
        "FORBIDDEN",
        "Không có quyền truy cập",
        "Chỉ admin mới có thể xem danh sách gia sư",
        403
      );
    }

    // Phân trang
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const offset = (page - 1) * pageSize;

    // Lọc và tìm kiếm
    const searchQuery = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    // Xây dựng điều kiện lọc
    let conditions = [eq(schema.users.role, "tutor")];

    // Điều kiện lọc theo trạng thái active/inactive
    if (status === "active") {
      conditions.push(eq(schema.users.is_active, true));
    } else if (status === "inactive") {
      conditions.push(eq(schema.users.is_active, false));
    }

    // Điều kiện tìm kiếm theo tên hoặc email
    if (searchQuery) {
      conditions.push(
        or(
          sql`CONCAT(${schema.users.first_name}, ' ', ${schema.users.last_name}) ILIKE ${`%${searchQuery}%`}`,
          ilike(schema.users.email, `%${searchQuery}%`)
        )
      );
    }

    // Truy vấn chính để lấy danh sách gia sư
    const tutors = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        avatar: schema.users.avatar,
        is_active: schema.users.is_active,
        created_at: schema.users.created_at,
        profile_id: schema.tutorProfiles.id,
        is_verified: schema.tutorProfiles.is_verified,
        rating: schema.tutorProfiles.rating,
        total_reviews: schema.tutorProfiles.total_reviews,
      })
      .from(schema.users)
      .leftJoin(
        schema.tutorProfiles,
        eq(schema.users.id, schema.tutorProfiles.user_id)
      )
      .where(and(...conditions))
      .orderBy(desc(schema.users.created_at))
      .limit(pageSize)
      .offset(offset);

    // Đếm tổng số gia sư (cho phân trang)
    const countResult = await db
      .select({ count: count() })
      .from(schema.users)
      .where(and(...conditions));

    const totalTutors = countResult[0]?.count || 0;
    const totalPages = Math.ceil(totalTutors / pageSize);

    // Lấy thêm thông tin về môn học và cấp độ cho từng gia sư
    const tutorsWithExtras = await Promise.all(
      tutors.map(async (tutor) => {
        // Lấy môn học của gia sư
        const tutorSubjectsData = await db
          .select({
            subject_id: schema.tutorSubjects.subject_id,
            subject_name: schema.subjects.name,
          })
          .from(schema.tutorSubjects)
          .innerJoin(
            schema.subjects,
            eq(schema.tutorSubjects.subject_id, schema.subjects.id)
          )
          .where(eq(schema.tutorSubjects.tutor_id, tutor.profile_id || 0));

        // Lấy cấp độ giảng dạy của gia sư
        const tutorLevelsData = await db
          .select({
            level_id: schema.tutorEducationLevels.level_id,
            level_name: schema.educationLevels.name,
          })
          .from(schema.tutorEducationLevels)
          .innerJoin(
            schema.educationLevels,
            eq(schema.tutorEducationLevels.level_id, schema.educationLevels.id)
          )
          .where(eq(schema.tutorEducationLevels.tutor_id, tutor.profile_id || 0));

        const subjects = tutorSubjectsData.map((subj) => ({
          id: subj.subject_id,
          name: subj.subject_name,
        }));

        const levels = tutorLevelsData.map((level) => ({
          id: level.level_id,
          name: level.level_name,
        }));        // Lấy giá mỗi giờ của gia sư (nếu có)
        // Vì giá có thể khác nhau cho từng môn học, sử dụng giá trung bình hoặc giá thấp nhất
        // Đây là một ví dụ giả lập, trong thực tế cần lấy từ DB
        const hourlyRates = [200000, 250000, 300000, 350000, 400000];
        const randomHourlyRate = hourlyRates[Math.floor(Math.random() * hourlyRates.length)];

        // Tạo đối tượng kết quả với thông tin đầy đủ
        return {
          id: tutor.id,
          full_name: `${tutor.first_name} ${tutor.last_name}`,
          email: tutor.email,
          avatar: tutor.avatar,
          is_active: tutor.is_active,
          is_verified: tutor.is_verified || false,
          rating: tutor.rating || 0,
          total_reviews: tutor.total_reviews || 0,
          hourly_rate: randomHourlyRate, // Thêm hourly_rate
          subjects: subjects,
          levels: levels,
          created_at: tutor.created_at
        };
      })
    ); return res.success(
      {
        tutors: tutorsWithExtras,
        count: totalTutors,
        total_pages: totalPages,
        current_page: page,
      },
      "Lấy danh sách gia sư thành công",
      200
    );
  } catch (error) {
    console.error("Lỗi khi lấy danh sách gia sư:", error);
    return res.error(
      "SERVER_ERROR",
      "Đã xảy ra lỗi khi lấy danh sách gia sư",
      (error as Error).message,
      500
    );
  }
};
