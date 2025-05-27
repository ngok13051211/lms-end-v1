import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * @desc    Lấy thông tin chi tiết của gia sư theo ID
 * @route   GET /api/v1/admin/tutors/:id
 * @access  Private/Admin
 */
export const getTutorById = async (req: Request, res: Response) => {
  try {
    console.log("==========================================");
    console.log("[DEBUG] getTutorById - Bắt đầu xử lý request");
    console.log("[DEBUG] Request params:", req.params);

    // Kiểm tra quyền admin
    console.log("[DEBUG] User role:", req.user?.role);
    if (req.user?.role !== "admin") {
      console.log("[DEBUG] Không có quyền admin");
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập. Chỉ admin mới có thể xem chi tiết gia sư.",
      });
    }

    const tutorId = parseInt(req.params.id);
    console.log("[DEBUG] Tutor ID sau khi parse:", tutorId, "- Type:", typeof tutorId);

    if (isNaN(tutorId)) {
      console.log("[DEBUG] ID gia sư không hợp lệ");
      return res.status(400).json({
        success: false,
        message: "ID gia sư không hợp lệ",
      });
    }

    // Lấy thông tin cơ bản của user
    console.log("[DEBUG] Đang truy vấn thông tin user với ID:", tutorId);
    const user = await db.query.users.findFirst({
      where: and(
        eq(schema.users.id, tutorId),
        eq(schema.users.role, "tutor")
      ),
      columns: {
        password: false,
      },
    });

    console.log("[DEBUG] Kết quả truy vấn user:", user ? "Tìm thấy user" : "Không tìm thấy user");

    if (!user) {
      console.log("[DEBUG] Không tìm thấy gia sư, trả về lỗi 404");
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy gia sư",
      });
    }

    // Log một số thông tin cơ bản của user
    console.log("[DEBUG] Thông tin cơ bản của user:", {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    });

    // Lấy thông tin profile của gia sư
    console.log("[DEBUG] Đang truy vấn thông tin profile với user_id:", tutorId);
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, tutorId),
    });

    console.log("[DEBUG] Kết quả truy vấn profile:", tutorProfile ? "Tìm thấy profile" : "Không tìm thấy profile");
    if (tutorProfile) {
      console.log("[DEBUG] Thông tin cơ bản của profile:", {
        id: tutorProfile.id,
        user_id: tutorProfile.user_id,
        is_verified: tutorProfile.is_verified
      });
    }

    // Không trả về lỗi nếu không tìm thấy profile, chỉ để giá trị null

    // Khởi tạo biến để lưu trữ yêu cầu dạy học và khóa học
    let teachingRequests = [];
    let courses = [];

    console.log("[DEBUG] Bắt đầu truy vấn danh sách teaching requests và courses");

    // Chỉ lấy danh sách yêu cầu dạy học và khóa học nếu có profile gia sư
    if (tutorProfile) {
      console.log("[DEBUG] Có tutorProfile, sẽ truy vấn thêm dữ liệu");
      console.log("[DEBUG] Truy vấn teaching requests cho tutor_id:", tutorProfile.id);

      try {
        // Lấy danh sách yêu cầu dạy học của gia sư
        teachingRequests = await db
          .select({
            id: schema.teachingRequests.id,
            subject_id: schema.teachingRequests.subject_id,
            level_id: schema.teachingRequests.level_id,
            introduction: schema.teachingRequests.introduction,
            experience: schema.teachingRequests.experience,
            certifications: schema.teachingRequests.certifications,
            status: schema.teachingRequests.status,
            rejection_reason: schema.teachingRequests.rejection_reason,
            created_at: schema.teachingRequests.created_at,
            updated_at: schema.teachingRequests.updated_at,
            approved_by: schema.teachingRequests.approved_by,
            subject_name: schema.subjects.name,
            level_name: schema.educationLevels.name,
            approver_first_name: schema.users.first_name,
            approver_last_name: schema.users.last_name,
            approver_email: schema.users.email,
          })
          .from(schema.teachingRequests)
          .leftJoin(
            schema.subjects,
            eq(schema.teachingRequests.subject_id, schema.subjects.id)
          )
          .leftJoin(
            schema.educationLevels,
            eq(schema.teachingRequests.level_id, schema.educationLevels.id)
          )
          .leftJoin(
            schema.users,
            eq(schema.teachingRequests.approved_by, schema.users.id)
          )
          .where(eq(schema.teachingRequests.tutor_id, tutorProfile.id));

        console.log("[DEBUG] Đã tìm thấy", teachingRequests.length, "yêu cầu dạy học");
      } catch (err) {
        console.error("[DEBUG ERROR] Lỗi khi truy vấn teaching requests:", err);
        // Không throw error, để tiếp tục xử lý
      } try {
        console.log("[DEBUG] Truy vấn courses cho tutor_id:", tutorProfile.id);
        console.log("[DEBUG] SQL sẽ truy vấn khóa học từ bảng courses với điều kiện tutor_id =", tutorProfile.id);
        // Lấy danh sách khóa học của gia sư
        courses = await db
          .select({
            id: schema.courses.id,
            name: schema.courses.title,  // Use title field from the courses table instead of name
            subject_id: schema.courses.subject_id,
            level_id: schema.courses.level_id,
            status: schema.courses.status,
            created_at: schema.courses.created_at,
            hourly_rate: schema.courses.hourly_rate,
            subject_name: schema.subjects.name,
            level_name: schema.educationLevels.name,
          })
          .from(schema.courses)
          .leftJoin(
            schema.subjects,
            eq(schema.courses.subject_id, schema.subjects.id)
          )
          .leftJoin(
            schema.educationLevels,
            eq(schema.courses.level_id, schema.educationLevels.id)
          )
          .where(eq(schema.courses.tutor_id, tutorProfile.id));
        console.log("[DEBUG] Đã tìm thấy", courses.length, "khóa học");
        if (courses.length > 0) {
          console.log("[DEBUG] Mẫu khóa học đầu tiên:", JSON.stringify(courses[0], null, 2));
        } else {
          console.log("[DEBUG] Kiểm tra trong DB xem có khóa học nào với tutor_id =", tutorProfile.id);
        }
      } catch (err) {
        console.error("[DEBUG ERROR] Lỗi khi truy vấn courses:", err);
        // Không throw error, để tiếp tục xử lý
      }
    } console.log("[DEBUG] Bắt đầu format kết quả trả về");
    console.log("[DEBUG] Kiểm tra dữ liệu trước khi format:",
      {
        userExists: !!user,
        profileExists: !!tutorProfile,
        teachingRequestsType: typeof teachingRequests,
        teachingRequestsIsArray: Array.isArray(teachingRequests),
        teachingRequestsLength: Array.isArray(teachingRequests) ? teachingRequests.length : 'N/A',
        coursesType: typeof courses,
        coursesIsArray: Array.isArray(courses),
        coursesLength: Array.isArray(courses) ? courses.length : 'N/A',
      }
    );
    try {
      // Format dữ liệu trả về
      const formattedResult = {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: `${user.first_name} ${user.last_name}`,
          phone: user.phone || null,
          avatar: user.avatar || null,
          address: user.address || null,
          date_of_birth: user.date_of_birth || null,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        tutor_profile: tutorProfile ? {
          id: tutorProfile.id,
          bio: tutorProfile.bio || null,
          availability: tutorProfile.availability || null,
          is_verified: tutorProfile.is_verified,
          rating: tutorProfile.rating,
          total_reviews: tutorProfile.total_reviews
        } : null, teaching_requests: Array.isArray(teachingRequests) ? teachingRequests.map(tr => ({
          id: tr.id,
          subject: {
            id: tr.subject_id,
            name: tr.subject_name,
          },
          level: {
            id: tr.level_id,
            name: tr.level_name,
          },
          introduction: tr.introduction,
          experience: tr.experience,
          certifications: tr.certifications,
          status: tr.status,
          rejection_reason: tr.rejection_reason,
          created_at: tr.created_at,
          updated_at: tr.updated_at,
          approved_by: tr.approved_by ? {
            id: tr.approved_by,
            name: `${tr.approver_first_name} ${tr.approver_last_name}`,
            email: tr.approver_email
          } : undefined
        })) : [], courses: Array.isArray(courses) ? courses.map(course => ({
          id: course.id,
          name: course.name,
          subject: {
            id: course.subject_id,
            name: course.subject_name,
          },
          level: {
            id: course.level_id,
            name: course.level_name,
          },
          status: course.status,
          created_at: course.created_at,
          hourly_rate: course.hourly_rate,
        })) : [],
      };

      console.log("[DEBUG] Kết quả đã được format thành công");

      return res.status(200).json({
        success: true,
        data: formattedResult,
        message: "Lấy thông tin chi tiết gia sư thành công",
      });
    } catch (formatError) {
      console.error("[DEBUG ERROR] Lỗi khi format dữ liệu:", formatError);
      console.error("[DEBUG] Chi tiết:", {
        user: user ? "Có dữ liệu" : "Không có dữ liệu",
        tutorProfile: tutorProfile ? "Có dữ liệu" : "Không có dữ liệu",
        teachingRequestsLength: teachingRequests.length,
        coursesLength: courses.length
      });
      throw formatError; // Re-throw để outer try-catch xử lý
    }
  } catch (error) {
    console.error("[DEBUG ERROR] Lỗi tổng thể trong getTutorById:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thông tin chi tiết gia sư",
    });
  }
};
