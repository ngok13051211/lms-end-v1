import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, desc, like, sql } from "drizzle-orm";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Create class course
export const createCourse = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Get tutor profile
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId)
    });
    
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // Validate course data
    const courseData = schema.courseInsertSchema.parse({
      ...req.body,
      tutor_id: tutorProfile.id
    });
    
    // Create course
    const [course] = await db.insert(schema.courses)
      .values({
        tutor_id: tutorProfile.id,
        title: courseData.title,
        description: courseData.description,
        subject_id: courseData.subject_id !== undefined ? (typeof courseData.subject_id === 'string' ? parseInt(courseData.subject_id) : courseData.subject_id) : undefined,
        level_id: courseData.level_id !== undefined ? (typeof courseData.level_id === 'string' ? parseInt(courseData.level_id) : courseData.level_id) : undefined,
        hourly_rate: courseData.hourly_rate,
        teaching_mode: courseData.teaching_mode,
        status: "active",
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();
    
    // Get the complete course with related data
    const completeCourse = await db.query.courses.findFirst({
      where: eq(schema.courses.id, course.id),
      with: {
        subject: true,
        level: true
      }
    });
    
    return res.status(201).json({
      message: "Course created successfully",
      course: completeCourse
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error("Create course error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get tutor's own courses
export const getOwnCourses = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Get tutor profile
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId)
    });
    
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // Get courses for tutor
    const courses = await db.query.courses.findMany({
      where: eq(schema.courses.tutor_id, tutorProfile.id),
      with: {
        subject: true,
        level: true
      },
      orderBy: schema.courses.created_at
    });
    
    return res.status(200).json(courses);
  } catch (error) {
    console.error("Get own courses error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get courses for a specific tutor
export const getTutorCourses = async (req: Request, res: Response) => {
  try {
    const tutorId = parseInt(req.params.id);
    
    if (isNaN(tutorId)) {
      return res.status(400).json({ message: "Invalid tutor ID" });
    }
    
    // Check if tutor exists
    const tutor = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.id, tutorId)
    });
    
    if (!tutor) {
      return res.status(404).json({ message: "Tutor not found" });
    }
    
    // Get active courses for tutor
    const courses = await db.query.courses.findMany({
      where: and(
        eq(schema.courses.tutor_id, tutorId),
        eq(schema.courses.status, "active")
      ),
      with: {
        subject: true,
        level: true
      },
      orderBy: schema.courses.created_at
    });
    
    return res.status(200).json(courses);
  } catch (error) {
    console.error("Get tutor courses error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Update course
export const updateCourse = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const courseId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (isNaN(courseId)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }
    
    // Get tutor profile
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId)
    });
    
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // Check if course exists and belongs to the tutor
    const existingCourse = await db.query.courses.findFirst({
      where: and(
        eq(schema.courses.id, courseId),
        eq(schema.courses.tutor_id, tutorProfile.id)
      )
    });
    
    if (!existingCourse) {
      return res.status(404).json({ message: "Course not found or does not belong to you" });
    }
    
    // Validate course data
    const courseData = schema.courseInsertSchema.partial().parse({
      ...req.body,
      tutor_id: tutorProfile.id
    });
    
    // Update course
    const [updatedCourse] = await db.update(schema.courses)
      .set({
        title: courseData.title !== undefined ? courseData.title : existingCourse.title,
        description: courseData.description !== undefined ? courseData.description : existingCourse.description,
        subject_id: courseData.subject_id !== undefined ? (typeof courseData.subject_id === 'string' ? parseInt(courseData.subject_id) : courseData.subject_id) : existingCourse.subject_id,
        level_id: courseData.level_id !== undefined ? (typeof courseData.level_id === 'string' ? parseInt(courseData.level_id) : courseData.level_id) : existingCourse.level_id,
        hourly_rate: courseData.hourly_rate !== undefined ? courseData.hourly_rate : existingCourse.hourly_rate,
        teaching_mode: courseData.teaching_mode !== undefined ? courseData.teaching_mode : existingCourse.teaching_mode,
        status: courseData.status !== undefined ? courseData.status : existingCourse.status,
        updated_at: new Date()
      })
      .where(eq(schema.courses.id, courseId))
      .returning();
    
    // Get the complete updated course with related data
    const completeCourse = await db.query.courses.findFirst({
      where: eq(schema.courses.id, updatedCourse.id),
      with: {
        subject: true,
        level: true
      }
    });
    
    return res.status(200).json({
      message: "Course updated successfully",
      course: completeCourse
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error("Update course error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Delete course
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const courseId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (isNaN(courseId)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }
    
    // Get tutor profile
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId)
    });
    
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // Check if course exists and belongs to the tutor
    const existingCourse = await db.query.courses.findFirst({
      where: and(
        eq(schema.courses.id, courseId),
        eq(schema.courses.tutor_id, tutorProfile.id)
      )
    });
    
    if (!existingCourse) {
      return res.status(404).json({ message: "Course not found or does not belong to you" });
    }
    
    // Delete course (or set status to inactive)
    await db.delete(schema.courses)
      .where(eq(schema.courses.id, courseId));
    
    return res.status(200).json({
      message: "Course deleted successfully"
    });
  } catch (error) {
    console.error("Delete course error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get all active courses
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    // Parse query params for filtering
    const { subject, level, teaching_mode, searchTerm, page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 10;
    const offset = (pageNumber - 1) * pageSize;
    
    // Build conditions array for the where clause
    const conditions = [];
    
    // Always show only active courses
    conditions.push(eq(schema.courses.status, "active"));
    
    // Add search condition if provided - search by course title (case-insensitive)
    if (searchTerm && searchTerm !== '') {
      const search = (searchTerm as string).toLowerCase();
      conditions.push(sql`LOWER(${schema.courses.title}) LIKE ${'%' + search + '%'}`);
    }
    
    // Add filters if they exist and they're not the "all" option
    if (subject && subject !== '' && subject !== 'all_subjects') {
      const subjectId = parseInt(subject as string);
      if (!isNaN(subjectId)) {
        conditions.push(eq(schema.courses.subject_id, subjectId));
      }
    }
    
    if (level && level !== '' && level !== 'all_levels') {
      const levelId = parseInt(level as string);
      if (!isNaN(levelId)) {
        conditions.push(eq(schema.courses.level_id, levelId));
      }
    }
    
    if (teaching_mode && teaching_mode !== '' && teaching_mode !== 'all_modes') {
      conditions.push(eq(schema.courses.teaching_mode, teaching_mode as string));
    }
    
    // If we have only one condition, use it directly
    // If we have multiple conditions, combine them with AND
    const whereCondition = conditions.length === 1 
      ? conditions[0] 
      : and(...conditions);
    
    // Execute query with filters
    const courses = await db.query.courses.findMany({
      where: whereCondition,
      with: {
        subject: true,
        level: true,
        tutor: {
          with: {
            user: true
          }
        }
      },
      limit: pageSize,
      offset: offset,
      orderBy: [desc(schema.courses.created_at)]
    });
    
    // Get total count for pagination with the same filters (except pagination)
    const totalCoursesCount = await db.query.courses.findMany({
      where: whereCondition
    });
    
    const total = totalCoursesCount.length;
    const totalPages = Math.ceil(total / pageSize);
    
    return res.status(200).json({
      courses,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        total_pages: totalPages
      }
    });
  } catch (error) {
    console.error("Get all courses error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};