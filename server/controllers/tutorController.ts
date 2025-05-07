import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, like, or, desc, inArray, not, sql, isNull } from "drizzle-orm";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { uploadToCloudinary } from "../storage";

// Get all subjects
export const getSubjects = async (req: Request, res: Response) => {
  try {
    const subjects = await db.query.subjects.findMany({
      orderBy: schema.subjects.name,
      with: {
        educationLevels: {
          with: {
            level: true
          }
        }
      }
    });
    
    // Transform the result to include education levels in a more convenient format
    const transformedSubjects = subjects.map(subject => {
      return {
        ...subject,
        education_levels: subject.educationLevels.map(el => el.level)
      };
    });
    
    return res.status(200).json(transformedSubjects);
  } catch (error) {
    console.error("Get subjects error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get all education levels
export const getEducationLevels = async (req: Request, res: Response) => {
  try {
    const levels = await db.query.educationLevels.findMany({
      orderBy: schema.educationLevels.name
    });
    
    return res.status(200).json(levels);
  } catch (error) {
    console.error("Get education levels error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get featured testimonials
export const getTestimonials = async (req: Request, res: Response) => {
  try {
    const testimonials = await db.query.testimonials.findMany({
      where: eq(schema.testimonials.is_featured, true),
      limit: 3
    });
    
    return res.status(200).json(testimonials);
  } catch (error) {
    console.error("Get testimonials error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get tutors with filters
export const getTutors = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string || '';
    const subject = req.query.subject as string || 'all';
    const level = req.query.level as string || 'all';
    const mode = req.query.mode as string || 'all';
    const minRate = parseFloat(req.query.minRate as string || '0');
    const maxRate = parseFloat(req.query.maxRate as string || '1000000');
    const minExperience = parseInt(req.query.minExperience as string || '0');
    const hasCertifications = req.query.hasCertifications === 'true';
    const availability = req.query.availability as string || 'all';
    const minRating = parseFloat(req.query.minRating as string || '0');
    const location = req.query.location as string || '';
    const specificDay = req.query.day as string || 'all';
    const specificTime = req.query.time as string || 'all';
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '12');
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const conditions = [eq(schema.tutorProfiles.is_verified, true)];
    
    // Add search condition if provided
    if (search) {
      // Convert search term to lowercase for case-insensitive search
      const searchLower = search.toLowerCase();
      
      // First, find tutors by subject name match (case-insensitive)
      const tutorsBySubject = await db.select({ tutor_id: schema.tutorSubjects.tutor_id })
        .from(schema.tutorSubjects)
        .innerJoin(schema.subjects, eq(schema.tutorSubjects.subject_id, schema.subjects.id))
        .where(sql`LOWER(${schema.subjects.name}) LIKE ${'%' + searchLower + '%'}`);

      // Find tutors by name, bio, or certifications (case-insensitive)
      const tutorsByName = await db.select({ id: schema.tutorProfiles.id })
        .from(schema.tutorProfiles)
        .innerJoin(schema.users, eq(schema.tutorProfiles.user_id, schema.users.id))
        .where(
          or(
            sql`LOWER(${schema.users.first_name}) LIKE ${'%' + searchLower + '%'}`,
            sql`LOWER(${schema.users.last_name}) LIKE ${'%' + searchLower + '%'}`,
            sql`LOWER(${schema.tutorProfiles.bio}) LIKE ${'%' + searchLower + '%'}`,
            sql`LOWER(${schema.tutorProfiles.certifications}) LIKE ${'%' + searchLower + '%'}`
          )
        );
      
      // Combine both search results (tutors by name/bio and tutors by subject)
      const tutorIds = [
        ...tutorsByName.map(t => t.id),
        ...tutorsBySubject.map(t => t.tutor_id)
      ];

      // Remove duplicates from the IDs
      const uniqueTutorIds = Array.from(new Set(tutorIds));
      
      if (uniqueTutorIds.length > 0) {
        conditions.push(inArray(schema.tutorProfiles.id, uniqueTutorIds));
      } else {
        // If no matches, return empty result
        return res.status(200).json({
          tutors: [],
          total: 0,
          total_pages: 0,
          current_page: page
        });
      }
    }
    
    // Add subject filter if not 'all'
    if (subject !== 'all') {
      const tutorsWithSubject = await db.select({ tutor_id: schema.tutorSubjects.tutor_id })
        .from(schema.tutorSubjects)
        .where(eq(schema.tutorSubjects.subject_id, parseInt(subject)));
      
      if (tutorsWithSubject.length > 0) {
        conditions.push(inArray(schema.tutorProfiles.id, tutorsWithSubject.map(t => t.tutor_id)));
      } else {
        // If no tutors with this subject, return empty result
        return res.status(200).json({
          tutors: [],
          total: 0,
          total_pages: 0,
          current_page: page
        });
      }
    }
    
    // Add level filter if not 'all'
    if (level !== 'all') {
      const tutorsWithLevel = await db.select({ tutor_id: schema.tutorEducationLevels.tutor_id })
        .from(schema.tutorEducationLevels)
        .where(eq(schema.tutorEducationLevels.level_id, parseInt(level)));
      
      if (tutorsWithLevel.length > 0) {
        conditions.push(inArray(schema.tutorProfiles.id, tutorsWithLevel.map(t => t.tutor_id)));
      } else {
        // If no tutors with this level, return empty result
        return res.status(200).json({
          tutors: [],
          total: 0,
          total_pages: 0,
          current_page: page
        });
      }
    }
    
    // Add teaching mode filter if not 'all'
    if (mode !== 'all') {
      // Find tutors who have at least one course with the specified teaching mode
      const tutorsWithTeachingMode = await db.select({ id: schema.tutorProfiles.id })
        .from(schema.tutorProfiles)
        .innerJoin(schema.courses, eq(schema.tutorProfiles.id, schema.courses.tutor_id))
        .where(or(
          eq(schema.courses.teaching_mode, mode),
          eq(schema.courses.teaching_mode, 'both')
        ))
        .groupBy(schema.tutorProfiles.id);
      
      if (tutorsWithTeachingMode.length > 0) {
        conditions.push(inArray(schema.tutorProfiles.id, tutorsWithTeachingMode.map(t => t.id)));
      } else {
        // If no tutors with this teaching mode, return empty result
        return res.status(200).json({
          tutors: [],
          total: 0,
          total_pages: 0,
          current_page: page
        });
      }
    }
    
    // Add price range filter - now get tutors with at least one course in the price range
    if (minRate > 0 || maxRate < 1000000) {
      // Find tutors with at least one course in the price range
      const tutorsInPriceRange = await db.select({ id: schema.tutorProfiles.id })
        .from(schema.tutorProfiles)
        .innerJoin(schema.courses, eq(schema.tutorProfiles.id, schema.courses.tutor_id))
        .where(
          and(
            sql`${schema.courses.hourly_rate} >= ${minRate}`,
            sql`${schema.courses.hourly_rate} <= ${maxRate}`
          )
        )
        .groupBy(schema.tutorProfiles.id);
      
      if (tutorsInPriceRange.length > 0) {
        conditions.push(inArray(schema.tutorProfiles.id, tutorsInPriceRange.map(t => t.id)));
      } else {
        // If no tutors in the price range, return empty result
        return res.status(200).json({
          tutors: [],
          total: 0,
          total_pages: 0,
          current_page: page
        });
      }
    }
    
    // Experience filter is no longer needed as we removed experience_years from tutorProfiles
    
    // Add certifications filter
    if (hasCertifications) {
      conditions.push(
        and(
          not(isNull(schema.tutorProfiles.certifications)),
          sql`length(${schema.tutorProfiles.certifications}) > 0`
        )
      );
    }
    
    // Add minimum rating filter (giữ lại)
    if (minRating > 0) {
      conditions.push(
        sql`COALESCE(CAST(${schema.tutorProfiles.rating} AS DECIMAL), 0) >= ${minRating}`
      );
    }
    
    // Tìm kiếm theo location trong bio
    if (location) {
      const locationLower = location.toLowerCase();
      
      // Tìm kiếm trong bio
      const tutorsWithLocationInBio = await db.select({ id: schema.tutorProfiles.id })
        .from(schema.tutorProfiles)
        .where(
          sql`LOWER(${schema.tutorProfiles.bio}) LIKE ${'%' + locationLower + '%'}`
        );
      
      if (tutorsWithLocationInBio.length > 0) {
        conditions.push(inArray(schema.tutorProfiles.id, tutorsWithLocationInBio.map(t => t.id)));
      } else {
        // Không tìm thấy gia sư ở địa điểm này
        return res.status(200).json({
          tutors: [],
          total: 0,
          total_pages: 0,
          current_page: page
        });
      }
    }
    
    // Đã xóa bỏ filter theo ngày và thời gian vì không có trường availability nữa
    
    // Count total tutors matching criteria
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.tutorProfiles)
      .where(and(...conditions));
      
    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);
    
    // Get paginated tutors
    const tutors = await db.query.tutorProfiles.findMany({
      where: and(...conditions),
      with: {
        user: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            avatar: true,
            phone: true
          }
        },
        subjects: {
          with: {
            subject: true
          }
        },
        levels: {
          with: {
            level: true
          }
        },
        reviews: {
          columns: {
            rating: true
          }
        }
      },
      orderBy: [
        desc(schema.tutorProfiles.rating),
        desc(schema.tutorProfiles.created_at)
      ],
      limit,
      offset
    });
    
    // Calculate average rating for each tutor based on reviews
    const tutorsWithRating = tutors.map(tutor => {
      const reviews = tutor.reviews || [];
      const total_reviews = reviews.length;
      
      return {
        ...tutor,
        total_reviews,
        subjects: tutor.subjects.map(ts => ts.subject),
        levels: tutor.levels.map(tl => tl.level)
      };
    });
    
    return res.status(200).json({
      tutors: tutorsWithRating,
      total,
      total_pages: totalPages,
      current_page: page
    });
  } catch (error) {
    console.error("Get tutors error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get featured tutors
export const getFeaturedTutors = async (req: Request, res: Response) => {
  try {
    const tutors = await db.query.tutorProfiles.findMany({
      where: and(
        eq(schema.tutorProfiles.is_verified, true),
        eq(schema.tutorProfiles.is_featured, true)
      ),
      with: {
        user: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            avatar: true
          }
        },
        subjects: {
          with: {
            subject: true
          },
          limit: 3
        }
      },
      limit: 6
    });
    
    // Format response đơn giản hóa
    const formattedTutors = tutors.map(tutor => ({
      id: tutor.id,
      user_id: tutor.user_id,
      bio: tutor.bio,
      rating: tutor.rating,
      user: {
        id: tutor.user.id,
        name: `${tutor.user.first_name} ${tutor.user.last_name}`,
        avatar: tutor.user.avatar
      },
      subjects: tutor.subjects.map(ts => ts.subject)
    }));
    
    return res.status(200).json(formattedTutors);
  } catch (error) {
    console.error("Get featured tutors error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get tutor by ID
export const getTutorById = async (req: Request, res: Response) => {
  try {
    const tutorId = parseInt(req.params.id);
    
    if (isNaN(tutorId)) {
      return res.status(400).json({ message: "Invalid tutor ID" });
    }
    
    // Get tutor with details
    const tutor = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.id, tutorId),
      with: {
        user: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            avatar: true,
            phone: true
          }
        },
        subjects: {
          with: {
            subject: true
          }
        },
        levels: {
          with: {
            level: true
          }
        },
        reviews: {
          with: {
            student: {
              columns: {
                id: true,
                first_name: true,
                last_name: true,
                avatar: true
              }
            }
          },
          orderBy: desc(schema.reviews.created_at),
          limit: 5
        }
      }
    });
    
    if (!tutor) {
      return res.status(404).json({ message: "Tutor not found" });
    }
    
    // Format response data (đơn giản hóa)
    const formattedTutor = {
      id: tutor.id,
      user_id: tutor.user_id,
      bio: tutor.bio,
      certifications: tutor.certifications,
      is_verified: tutor.is_verified,
      is_featured: tutor.is_featured,
      rating: tutor.rating,
      created_at: tutor.created_at,
      user: {
        id: tutor.user.id,
        name: `${tutor.user.first_name} ${tutor.user.last_name}`,
        first_name: tutor.user.first_name,
        last_name: tutor.user.last_name,
        email: tutor.user.email,
        avatar: tutor.user.avatar,
        phone: tutor.user.phone
      },
      subjects: tutor.subjects.map(ts => ts.subject),
      levels: tutor.levels.map(tl => tl.level),
      reviews: tutor.reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        student: {
          id: review.student.id,
          name: `${review.student.first_name} ${review.student.last_name}`,
          avatar: review.student.avatar
        }
      }))
    };
    
    return res.status(200).json(formattedTutor);
  } catch (error) {
    console.error("Get tutor by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get similar tutors
export const getSimilarTutors = async (req: Request, res: Response) => {
  try {
    const tutorId = parseInt(req.params.id);
    
    if (isNaN(tutorId)) {
      return res.status(400).json({ message: "Invalid tutor ID" });
    }
    
    // Get original tutor's subjects
    const tutorSubjects = await db.select({ subject_id: schema.tutorSubjects.subject_id })
      .from(schema.tutorSubjects)
      .where(eq(schema.tutorSubjects.tutor_id, tutorId));
    
    if (tutorSubjects.length === 0) {
      return res.status(200).json([]);
    }
    
    const subjectIds = tutorSubjects.map(ts => ts.subject_id);
    
    // Find tutors with similar subjects
    const similarTutorIds = await db.select({ tutor_id: schema.tutorSubjects.tutor_id })
      .from(schema.tutorSubjects)
      .where(
        and(
          inArray(schema.tutorSubjects.subject_id, subjectIds),
          not(eq(schema.tutorSubjects.tutor_id, tutorId))
        )
      )
      .groupBy(schema.tutorSubjects.tutor_id);
    
    if (similarTutorIds.length === 0) {
      return res.status(200).json([]);
    }
    
    // Get tutor details
    const similarTutors = await db.query.tutorProfiles.findMany({
      where: and(
        inArray(schema.tutorProfiles.id, similarTutorIds.map(t => t.tutor_id)),
        eq(schema.tutorProfiles.is_verified, true)
      ),
      with: {
        user: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true
          }
        },
        subjects: {
          with: {
            subject: true
          },
          limit: 3
        }
      },
      limit: 4
    });
    
    // Format response (đơn giản hóa)
    const formattedTutors = similarTutors.map(tutor => ({
      id: tutor.id,
      rating: tutor.rating,
      user: {
        id: tutor.user.id,
        name: `${tutor.user.first_name} ${tutor.user.last_name}`,
        avatar: tutor.user.avatar
      },
      subjects: tutor.subjects.map(ts => ts.subject)
    }));
    
    return res.status(200).json(formattedTutors);
  } catch (error) {
    console.error("Get similar tutors error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get tutor reviews
export const getTutorReviews = async (req: Request, res: Response) => {
  try {
    const tutorId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '10');
    const offset = (page - 1) * limit;
    
    if (isNaN(tutorId)) {
      return res.status(400).json({ message: "Invalid tutor ID" });
    }
    
    // Count total reviews
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.reviews)
      .where(eq(schema.reviews.tutor_id, tutorId));
    
    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);
    
    // Get paginated reviews
    const reviews = await db.query.reviews.findMany({
      where: eq(schema.reviews.tutor_id, tutorId),
      with: {
        student: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true
          }
        }
      },
      orderBy: desc(schema.reviews.created_at),
      limit,
      offset
    });
    
    // Format reviews
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      student: {
        id: review.student.id,
        name: `${review.student.first_name} ${review.student.last_name}`,
        avatar: review.student.avatar
      }
    }));
    
    return res.status(200).json({
      reviews: formattedReviews,
      total,
      total_pages: totalPages,
      current_page: page
    });
  } catch (error) {
    console.error("Get tutor reviews error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Upload tutor certifications
export const uploadCertifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Check if tutor profile exists
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId)
    });
    
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // Get document URLs from middleware
    const documentUrls = req.body.documentUrls || [];
    
    if (documentUrls.length === 0) {
      return res.status(400).json({ message: "No certification documents uploaded" });
    }
    
    // Save certification URLs as JSON string in the database
    // We'll store the previous certifications if they exist, plus the new ones
    let existingCerts: string[] = [];
    if (tutorProfile.certifications) {
      try {
        existingCerts = JSON.parse(tutorProfile.certifications);
        if (!Array.isArray(existingCerts)) {
          existingCerts = [tutorProfile.certifications];
        }
      } catch (e) {
        existingCerts = [tutorProfile.certifications];
      }
    }
    
    const updatedCerts = [...existingCerts, ...documentUrls];
    
    // Update tutor profile with new certifications
    await db.update(schema.tutorProfiles)
      .set({ 
        certifications: JSON.stringify(updatedCerts),
        updated_at: new Date()
      })
      .where(eq(schema.tutorProfiles.id, tutorProfile.id));
    
    return res.status(200).json({ 
      message: "Certifications uploaded successfully",
      certifications: updatedCerts
    });
  } catch (error) {
    console.error("Upload certifications error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Create tutor profile
export const createTutorProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Check if user already has a tutor profile
    const existingProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId)
    });
    
    if (existingProfile) {
      return res.status(400).json({ message: "You already have a tutor profile" });
    }
    
    // Validate tutor profile data
    const profileData = schema.tutorProfileInsertSchema.parse({
      ...req.body,
      user_id: userId,
      is_verified: false,
      is_featured: false,
      rating: "0",
      created_at: new Date()
    });
    
    // Create tutor profile
    const [tutorProfile] = await db.insert(schema.tutorProfiles)
      .values(profileData)
      .returning();
    
    // Associate subjects
    if (req.body.subject_ids && Array.isArray(req.body.subject_ids)) {
      const subjectValues = req.body.subject_ids.map((subjectId: string) => ({
        tutor_id: tutorProfile.id,
        subject_id: parseInt(subjectId)
      }));
      
      await db.insert(schema.tutorSubjects)
        .values(subjectValues);
    }
    
    // Associate education levels
    if (req.body.level_ids && Array.isArray(req.body.level_ids)) {
      const levelValues = req.body.level_ids.map((levelId: string) => ({
        tutor_id: tutorProfile.id,
        level_id: parseInt(levelId)
      }));
      
      await db.insert(schema.tutorEducationLevels)
        .values(levelValues);
    }
    
    // Update user role to tutor
    await db.update(schema.users)
      .set({ role: 'tutor' })
      .where(eq(schema.users.id, userId));
    
    return res.status(201).json({
      message: "Tutor profile created successfully",
      profile: tutorProfile
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error("Create tutor profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Update tutor profile
export const updateTutorProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Get existing tutor profile
    const existingProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId),
      with: {
        subjects: true,
        levels: true
      }
    });
    
    if (!existingProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // Log original request data
    console.log("Original request body:", JSON.stringify(req.body));
    
    // Đơn giản hóa cấu trúc dữ liệu - chỉ giữ lại bio và các thông tin cần thiết
    const updateData = {
      bio: req.body.bio || existingProfile.bio,
      user_id: userId
    };
    
    // Log the data being sent to the update operation
    console.log("Updating tutor profile with data:", JSON.stringify(updateData));
    
    // Update tutor profile
    const [updatedProfile] = await db.update(schema.tutorProfiles)
      .set(updateData)
      .where(eq(schema.tutorProfiles.id, existingProfile.id))
      .returning();
      
    console.log("Updated profile:", JSON.stringify(updatedProfile));
    
    // Update subjects if provided
    if (req.body.subject_ids && Array.isArray(req.body.subject_ids)) {
      // Delete existing subject associations
      await db.delete(schema.tutorSubjects)
        .where(eq(schema.tutorSubjects.tutor_id, existingProfile.id));
      
      // Create new subject associations
      const subjectValues = req.body.subject_ids.map((subjectId: string) => ({
        tutor_id: existingProfile.id,
        subject_id: parseInt(subjectId)
      }));
      
      await db.insert(schema.tutorSubjects)
        .values(subjectValues);
    }
    
    // Update education levels if provided
    if (req.body.level_ids && Array.isArray(req.body.level_ids)) {
      // Delete existing level associations
      await db.delete(schema.tutorEducationLevels)
        .where(eq(schema.tutorEducationLevels.tutor_id, existingProfile.id));
      
      // Create new level associations
      const levelValues = req.body.level_ids.map((levelId: string) => ({
        tutor_id: existingProfile.id,
        level_id: parseInt(levelId)
      }));
      
      await db.insert(schema.tutorEducationLevels)
        .values(levelValues);
    }
    
    return res.status(200).json({
      message: "Tutor profile updated successfully",
      profile: updatedProfile
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error("Update tutor profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get own tutor profile
export const getOwnTutorProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Get tutor profile with details
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId),
      with: {
        subjects: {
          with: {
            subject: true
          }
        },
        levels: {
          with: {
            level: true
          }
        }
      }
    });
    
    if (!tutorProfile) {
      // Return null instead of error to allow frontend to show profile creation form
      return res.status(200).json(null);
    }
    
    // Đơn giản hóa response
    const formattedProfile = {
      ...tutorProfile,
      subjects: tutorProfile.subjects.map(ts => ts.subject),
      levels: tutorProfile.levels.map(tl => tl.level)
    };
    
    console.log("Formatted profile for frontend:", JSON.stringify(formattedProfile));
    
    return res.status(200).json(formattedProfile);
  } catch (error) {
    console.error("Get own tutor profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get tutor stats
export const getTutorStats = async (req: Request, res: Response) => {
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
    
    // Get active courses count
    const activeCoursesCount = await db.select({ count: sql<number>`count(*)` })
      .from(schema.courses)
      .where(
        and(
          eq(schema.courses.tutor_id, tutorProfile.id),
          eq(schema.courses.status, "active")
        )
      );
      
    // Get total courses count
    const totalCoursesCount = await db.select({ count: sql<number>`count(*)` })
      .from(schema.courses)
      .where(eq(schema.courses.tutor_id, tutorProfile.id));
    
    // Get total reviews count
    const reviewsCount = await db.select({ count: sql<number>`count(*)` })
      .from(schema.reviews)
      .where(eq(schema.reviews.tutor_id, tutorProfile.id));
    
    // Get profile views (to be implemented with separate table)
    const profileViews = 0; // Placeholder
    
    // Get active conversations count
    const conversationsCount = await db.select({ count: sql<number>`count(*)` })
      .from(schema.conversations)
      .where(eq(schema.conversations.tutor_id, userId));
    
    // Get unread messages count
    const unreadMessagesCount = await db.select({ count: sql<number>`count(*)` })
      .from(schema.messages)
      .innerJoin(
        schema.conversations,
        eq(schema.messages.conversation_id, schema.conversations.id)
      )
      .where(
        and(
          eq(schema.conversations.tutor_id, userId),
          not(eq(schema.messages.sender_id, userId)),
          eq(schema.messages.read, false)
        )
      );
    
    const stats = {
      profile_status: tutorProfile.is_verified ? "Đã xác minh" : "Chờ xác minh",
      active_courses: Number(activeCoursesCount[0]?.count || 0),
      courses_created: Number(totalCoursesCount[0]?.count || 0),
      reviews: Number(reviewsCount[0]?.count || 0),
      rating: tutorProfile.rating,
      profile_views: profileViews,
      active_conversations: Number(conversationsCount[0]?.count || 0),
      unread_messages: Number(unreadMessagesCount[0]?.count || 0)
    };
    
    return res.status(200).json(stats);
  } catch (error) {
    console.error("Get tutor stats error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get favorite tutors
export const getFavoriteTutors = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Get favorite tutors with tutor profile information
    const favorites = await db.query.favoriteTutors.findMany({
      where: eq(schema.favoriteTutors.student_id, userId),
      with: {
        tutor: {
          with: {
            user: true,
            subjects: {
              with: {
                subject: true
              }
            }
          }
        }
      }
    });
    
    // Format the result to include the information needed for the UI
    const formattedFavorites = favorites.map(favorite => {
      const tutor = favorite.tutor;
      
      return {
        id: tutor.id,
        user_id: tutor.user_id,
        bio: tutor.bio,
        rating: tutor.rating,
        favorite_id: favorite.id,
        created_at: favorite.created_at,
        user: {
          id: tutor.user.id,
          first_name: tutor.user.first_name,
          last_name: tutor.user.last_name,
          avatar: tutor.user.avatar,
        },
        subjects: tutor.subjects.map(s => ({
          id: s.subject.id,
          name: s.subject.name
        }))
      };
    });
    
    return res.status(200).json(formattedFavorites);
  } catch (error) {
    console.error("Get favorite tutors error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Add favorite tutor
export const addFavoriteTutor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const tutorId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
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
    
    // Check if tutor is already in favorites
    const existingFavorite = await db.query.favoriteTutors.findFirst({
      where: and(
        eq(schema.favoriteTutors.student_id, userId),
        eq(schema.favoriteTutors.tutor_id, tutorId)
      )
    });
    
    if (existingFavorite) {
      return res.status(400).json({ message: "Tutor is already in favorites" });
    }
    
    // Add to favorites
    const [favorite] = await db.insert(schema.favoriteTutors)
      .values({
        student_id: userId,
        tutor_id: tutorId,
        created_at: new Date()
      })
      .returning();
    
    // Get complete tutor information to return to the client
    const tutorWithDetails = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.id, tutorId),
      with: {
        user: true,
        subjects: {
          with: {
            subject: true
          }
        }
      }
    });
    
    if (!tutorWithDetails) {
      return res.status(500).json({ message: "Failed to retrieve tutor details" });
    }
    
    const formattedTutor = {
      id: tutorWithDetails.id,
      user_id: tutorWithDetails.user_id,
      bio: tutorWithDetails.bio,
      rating: tutorWithDetails.rating,
      favorite_id: favorite.id,
      created_at: favorite.created_at,
      user: {
        id: tutorWithDetails.user.id,
        first_name: tutorWithDetails.user.first_name,
        last_name: tutorWithDetails.user.last_name,
        avatar: tutorWithDetails.user.avatar,
      },
      subjects: tutorWithDetails.subjects.map(s => ({
        id: s.subject.id,
        name: s.subject.name
      }))
    };
    
    return res.status(201).json({
      message: "Tutor added to favorites",
      tutor: formattedTutor
    });
  } catch (error) {
    console.error("Add favorite tutor error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Remove favorite tutor
export const removeFavoriteTutor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const tutorId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (isNaN(tutorId)) {
      return res.status(400).json({ message: "Invalid tutor ID" });
    }
    
    // Find the favorite entry
    const favorite = await db.query.favoriteTutors.findFirst({
      where: and(
        eq(schema.favoriteTutors.student_id, userId),
        eq(schema.favoriteTutors.tutor_id, tutorId)
      )
    });
    
    if (!favorite) {
      return res.status(404).json({ message: "Tutor not found in favorites" });
    }
    
    // Remove from favorites
    await db.delete(schema.favoriteTutors)
      .where(eq(schema.favoriteTutors.id, favorite.id));
    
    return res.status(200).json({ 
      message: "Tutor removed from favorites",
      tutorId // Return the removed tutor ID for frontend state updates
    });
  } catch (error) {
    console.error("Remove favorite tutor error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Check if a tutor is in favorites
export const checkFavoriteTutor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const tutorId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (isNaN(tutorId)) {
      return res.status(400).json({ message: "Invalid tutor ID" });
    }
    
    // Check if tutor is in favorites
    const favorite = await db.query.favoriteTutors.findFirst({
      where: and(
        eq(schema.favoriteTutors.student_id, userId),
        eq(schema.favoriteTutors.tutor_id, tutorId)
      )
    });
    
    return res.status(200).json({ 
      isFavorite: !!favorite,
      favoriteId: favorite ? favorite.id : null
    });
  } catch (error) {
    console.error("Check favorite tutor error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Create a review for a tutor
export const createReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const tutorId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
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
    
    // Check if user has already reviewed this tutor
    const existingReview = await db.query.reviews.findFirst({
      where: and(
        eq(schema.reviews.student_id, userId),
        eq(schema.reviews.tutor_id, tutorId)
      )
    });
    
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this tutor" });
    }
    
    // Validate review data
    const reviewData = schema.reviewInsertSchema.parse({
      tutor_id: tutorId,
      student_id: userId,
      rating: req.body.rating,
      comment: req.body.comment,
      created_at: new Date()
    });
    
    // Create review
    const [review] = await db.insert(schema.reviews)
      .values(reviewData)
      .returning();
    
    // Update tutor average rating
    const allReviews = await db.query.reviews.findMany({
      where: eq(schema.reviews.tutor_id, tutorId),
      columns: {
        rating: true
      }
    });
    
    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / allReviews.length;
    
    await db.update(schema.tutorProfiles)
      .set({ rating: averageRating.toString() })
      .where(eq(schema.tutorProfiles.id, tutorId));
    
    return res.status(201).json({
      message: "Review submitted successfully",
      review
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error("Create review error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get tutor verification requests (admin only)
export const getTutorVerifications = async (req: Request, res: Response) => {
  try {
    // Get pending verification requests
    const pendingTutors = await db.query.tutorProfiles.findMany({
      where: and(
        eq(schema.tutorProfiles.is_verified, false),
        isNull(schema.tutorProfiles.rejection_reason)
      ),
      with: {
        user: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            avatar: true,
            phone: true
          }
        },
        subjects: {
          with: {
            subject: true
          }
        },
        levels: {
          with: {
            level: true
          }
        }
      }
    });
    
    // Format response - đơn giản hóa
    const formattedTutors = pendingTutors.map(tutor => ({
      id: tutor.id,
      bio: tutor.bio,
      certifications: tutor.certifications,
      created_at: tutor.created_at,
      user: {
        id: tutor.user.id,
        name: `${tutor.user.first_name} ${tutor.user.last_name}`,
        email: tutor.user.email,
        avatar: tutor.user.avatar,
        phone: tutor.user.phone
      },
      subjects: tutor.subjects.map(ts => ts.subject),
      levels: tutor.levels.map(tl => tl.level)
    }));
    
    return res.status(200).json(formattedTutors);
  } catch (error) {
    console.error("Get tutor verifications error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Approve tutor (admin only)
export const approveTutor = async (req: Request, res: Response) => {
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
    
    // Update tutor to verified
    await db.update(schema.tutorProfiles)
      .set({
        is_verified: true,
        rejection_reason: null
      })
      .where(eq(schema.tutorProfiles.id, tutorId));
    
    return res.status(200).json({
      message: "Tutor approved successfully"
    });
  } catch (error) {
    console.error("Approve tutor error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Reject tutor (admin only)
export const rejectTutor = async (req: Request, res: Response) => {
  try {
    const tutorId = parseInt(req.params.id);
    const { reason } = req.body;
    
    if (isNaN(tutorId)) {
      return res.status(400).json({ message: "Invalid tutor ID" });
    }
    
    if (!reason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }
    
    // Check if tutor exists
    const tutor = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.id, tutorId)
    });
    
    if (!tutor) {
      return res.status(404).json({ message: "Tutor not found" });
    }
    
    // Update tutor with rejection reason
    await db.update(schema.tutorProfiles)
      .set({
        is_verified: false,
        rejection_reason: reason
      })
      .where(eq(schema.tutorProfiles.id, tutorId));
    
    return res.status(200).json({
      message: "Tutor application rejected"
    });
  } catch (error) {
    console.error("Reject tutor error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};