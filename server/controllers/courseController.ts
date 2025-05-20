import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { db } from "@db";
// import { schema } from "@shared/schema";

import * as schema from "@shared/schema";
import { courseSchema } from "@shared/schema";
import { and, desc, eq, sql } from "drizzle-orm";

/**
 * Create a new course
 */
export const createCourse = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId),
    });
    if (!tutorProfile)
      return res.status(404).json({ message: "Tutor profile not found" });
    if (!tutorProfile.is_verified)
      return res.status(403).json({
        message:
          "Your tutor profile needs to be verified by admin before you can create courses",
      });

    const courseData = courseSchema.parse({
      ...req.body,
      tutor_id: tutorProfile.id,
    });

    // Check if the tutor has an approved teaching request for this subject and level
    const approvedTeachingRequest = await db.query.teachingRequests.findFirst({
      where: and(
        eq(schema.teachingRequests.tutor_id, tutorProfile.id),
        eq(schema.teachingRequests.subject_id, courseData.subject_id),
        eq(schema.teachingRequests.level_id, courseData.level_id),
        eq(schema.teachingRequests.status, "approved")
      ),
    });

    if (!approvedTeachingRequest) {
      return res.status(403).json({
        message:
          "Bạn chưa được phê duyệt để tạo khóa học với môn học và cấp độ này",
      });
    }

    const [newCourse] = await db
      .insert(schema.courses)
      .values({
        ...courseData,
        hourly_rate: courseData.hourly_rate.toString(),
        tutor_id: tutorProfile.id,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    const completeCourse = await db.query.courses.findFirst({
      where: eq(schema.courses.id, newCourse.id),
      with: {
        subject: true,
        level: true,
      },
    });

    return res.status(201).json({
      message: "Course created successfully",
      course: completeCourse,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: fromZodError(error).message,
      });
    }
    console.error("Create course error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get current tutor's courses
 */
export const getOwnCourses = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId),
    });
    if (!tutorProfile)
      return res.status(404).json({ message: "Tutor profile not found" });

    const courses = await db.query.courses.findMany({
      where: eq(schema.courses.tutor_id, tutorProfile.id),
      with: { subject: true, level: true },
      orderBy: desc(schema.courses.created_at),
    });

    return res.status(200).json(courses);
  } catch (error) {
    console.error("Get own courses error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get active courses of a tutor
 */
export const getTutorCourses = async (req: Request, res: Response) => {
  try {
    const tutorId = parseInt(req.params.id);
    if (isNaN(tutorId))
      return res.status(400).json({ message: "Invalid tutor ID" });

    const tutor = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.id, tutorId),
    });
    if (!tutor) return res.status(404).json({ message: "Tutor not found" });

    const courses = await db.query.courses.findMany({
      where: and(
        eq(schema.courses.tutor_id, tutorId),
        eq(schema.courses.status, "active")
      ),
      with: {
        subject: true,
        level: true,
        course_levels: {
          with: {
            level: true,
          },
        },
      },
      orderBy: desc(schema.courses.created_at),
    });

    // Thêm số lượng học sinh và đánh giá cho mỗi khóa học
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        // Đếm số học sinh đã đăng ký khóa học (sử dụng bookingRequests)
        const [{ studentCount }] = await db
          .select({
            studentCount: sql<number>`count(DISTINCT ${schema.bookingRequests.student_id})`,
          })
          .from(schema.bookingRequests)
          .where(eq(schema.bookingRequests.course_id, course.id));

        // Lấy điểm đánh giá trung bình
        const [{ averageRating, reviewCount }] = await db
          .select({
            averageRating: sql<number>`AVG(${schema.reviews.rating})`,
            reviewCount: sql<number>`count(*)`,
          })
          .from(schema.reviews)
          .where(eq(schema.reviews.course_id, course.id));

        // Đảm bảo nếu không có level trực tiếp nhưng có course_levels,
        // chúng ta sẽ sử dụng level đầu tiên từ course_levels
        let courseWithProcessedLevel = { ...course };

        if (
          !courseWithProcessedLevel.level &&
          course.course_levels &&
          course.course_levels.length > 0
        ) {
          courseWithProcessedLevel.level = course.course_levels[0].level;
        }

        return {
          ...courseWithProcessedLevel,
          student_count: Number(studentCount || 0),
          average_rating: Number(averageRating || 0),
          review_count: Number(reviewCount || 0),
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: courses.length,
      total_pages: 1,
      current_page: 1,
      courses: coursesWithStats,
    });
  } catch (error) {
    console.error("Get tutor courses error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update a course
 */
export const updateCourse = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const courseId = parseInt(req.params.id);
    if (!userId || isNaN(courseId))
      return res.status(400).json({ message: "Unauthorized or invalid ID" });

    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId),
    });
    if (!tutorProfile)
      return res.status(404).json({ message: "Tutor profile not found" });

    const existing = await db.query.courses.findFirst({
      where: and(
        eq(schema.courses.id, courseId),
        eq(schema.courses.tutor_id, tutorProfile.id)
      ),
    });
    if (!existing)
      return res
        .status(404)
        .json({ message: "Course not found or unauthorized" });

    const updates = courseSchema.partial().parse(req.body);

    // Create a new object with all updates, ensuring hourly_rate is a string if it exists
    const updatesForDb = {
      ...updates,
      hourly_rate:
        updates.hourly_rate !== undefined
          ? updates.hourly_rate.toString()
          : undefined,
      updated_at: new Date(),
    };

    const [updatedCourse] = await db
      .update(schema.courses)
      .set(updatesForDb)
      .where(eq(schema.courses.id, courseId))
      .returning();

    const completeCourse = await db.query.courses.findFirst({
      where: eq(schema.courses.id, updatedCourse.id),
      with: { subject: true, level: true },
    });

    return res.status(200).json({
      message: "Course updated successfully",
      course: completeCourse,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: fromZodError(error).message });
    }
    console.error("Update course error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete a course
 */
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const courseId = parseInt(req.params.id);
    if (!userId || isNaN(courseId))
      return res.status(400).json({ message: "Invalid request" });

    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId),
    });
    if (!tutorProfile)
      return res.status(403).json({ message: "Not authorized as a tutor" });

    const existing = await db.query.courses.findFirst({
      where: and(
        eq(schema.courses.id, courseId),
        eq(schema.courses.tutor_id, tutorProfile.id)
      ),
    });
    if (!existing)
      return res.status(404).json({ message: "Course not found or not yours" });

    await db.delete(schema.courses).where(eq(schema.courses.id, courseId));

    return res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Delete course error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get all active courses (with filters + pagination)
 */
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const {
      subject,
      level,
      teaching_mode,
      searchTerm,
      page = "1",
      limit = "10",
    } = req.query;

    const pageNumber = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 10;
    const offset = (pageNumber - 1) * pageSize;

    const conditions = [eq(schema.courses.status, "active")];

    if (searchTerm) {
      const search = (searchTerm as string).toLowerCase();
      conditions.push(
        sql`LOWER(${schema.courses.title}) LIKE ${"%" + search + "%"}`
      );
    }

    if (subject && subject !== "all_subjects") {
      const subjectId = parseInt(subject as string);
      if (!isNaN(subjectId)) {
        conditions.push(eq(schema.courses.subject_id, subjectId));
      }
    }

    if (level && level !== "all_levels") {
      const levelId = parseInt(level as string);
      if (!isNaN(levelId)) {
        conditions.push(eq(schema.courses.level_id, levelId));
      }
    }

    if (teaching_mode && teaching_mode !== "all_modes") {
      conditions.push(
        eq(schema.courses.teaching_mode, teaching_mode as string)
      );
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    const courses = await db.query.courses.findMany({
      where,
      with: {
        subject: true,
        level: true,
        tutor: {
          with: { user: true },
        },
      },
      limit: pageSize,
      offset,
      orderBy: [desc(schema.courses.created_at)],
    });

    const total = (await db.query.courses.findMany({ where })).length;
    const totalPages = Math.ceil(total / pageSize);

    return res.status(200).json({
      courses,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        total_pages: totalPages,
      },
    });
  } catch (error) {
    console.error("Get all courses error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get course by ID
 * This endpoint is used to fetch detailed information about a specific course
 * for use in the booking form
 */
export const getCourseById = async (req: Request, res: Response) => {
  try {
    const courseId = parseInt(req.params.id);
    if (isNaN(courseId)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    // Fetch course with related subject, education level, and tutor info
    const course = await db.query.courses.findFirst({
      where: and(
        eq(schema.courses.id, courseId),
        eq(schema.courses.status, "active") // Only return active courses
      ),
      with: {
        subject: true,
        level: true,
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
      },
    });

    if (!course) {
      return res
        .status(404)
        .json({ message: "Course not found or not active" });
    }

    // Format the response to match the frontend expectations
    const formattedCourse = {
      id: course.id.toString(),
      title: course.title,
      description: course.description || "",
      subject: course.subject,
      educationLevel: course.level,
      pricePerSession: parseFloat(course.hourly_rate),
      deliveryModes: course.teaching_mode,
      tutor: {
        id: course.tutor.id,
        name: `${course.tutor.user.first_name} ${course.tutor.user.last_name}`,
        avatar: course.tutor.user.avatar,
      },
      // Default duration if not specified elsewhere
      duration: "60 minutes",
      // Add empty tags array
      tags: [],
    };

    return res.status(200).json(formattedCourse);
  } catch (error) {
    console.error("Get course by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
