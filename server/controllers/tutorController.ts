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
      orderBy: schema.subjects.name
    });
    
    return res.status(200).json(subjects);
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
      // We need to join with users table to search by name
      const tutorsByName = await db.select({ id: schema.tutorProfiles.id })
        .from(schema.tutorProfiles)
        .innerJoin(schema.users, eq(schema.tutorProfiles.user_id, schema.users.id))
        .where(
          or(
            like(schema.users.first_name, `%${search}%`),
            like(schema.users.last_name, `%${search}%`),
            like(schema.tutorProfiles.bio, `%${search}%`),
            like(schema.tutorProfiles.certifications, `%${search}%`)
          )
        );
      
      if (tutorsByName.length > 0) {
        conditions.push(inArray(schema.tutorProfiles.id, tutorsByName.map(t => t.id)));
      } else {
        // If no name matches, return empty result
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
      const tutorsWithTeachingMode = await db.select({ id: schema.tutorProfiles.id })
        .from(schema.tutorProfiles)
        .where(or(
          eq(schema.tutorProfiles.teaching_mode, mode),
          eq(schema.tutorProfiles.teaching_mode, 'both')
        ));
      
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
    
    // Add price range filter
    if (minRate > 0 || maxRate < 1000000) {
      conditions.push(
        and(
          sql`${schema.tutorProfiles.hourly_rate} >= ${minRate}`,
          sql`${schema.tutorProfiles.hourly_rate} <= ${maxRate}`
        )
      );
    }
    
    // Add experience filter
    if (minExperience > 0) {
      conditions.push(
        sql`${schema.tutorProfiles.experience_years} >= ${minExperience}`
      );
    }
    
    // Add certifications filter
    if (hasCertifications) {
      conditions.push(
        and(
          not(isNull(schema.tutorProfiles.certifications)),
          sql`length(${schema.tutorProfiles.certifications}) > 0`
        )
      );
    }
    
    // Add availability filter
    if (availability !== 'all') {
      conditions.push(
        like(schema.tutorProfiles.availability, `%${availability}%`)
      );
    }
    
    // Add minimum rating filter
    if (minRating > 0) {
      conditions.push(
        sql`CAST(${schema.tutorProfiles.rating} AS DECIMAL) >= ${minRating}`
      );
    }
    
    // Add location filter for offline tutoring
    if (location && (mode === 'offline' || mode === 'both' || mode === 'all')) {
      // Search for location in user profile - this would be better with proper location fields
      const tutorsInLocation = await db.select({ id: schema.tutorProfiles.id })
        .from(schema.tutorProfiles)
        .innerJoin(schema.users, eq(schema.tutorProfiles.user_id, schema.users.id))
        .where(
          and(
            or(
              eq(schema.tutorProfiles.teaching_mode, 'offline'),
              eq(schema.tutorProfiles.teaching_mode, 'both')
            ),
            // Here we're assuming the location might be stored in the bio or description 
            // In a real app, you'd have proper location fields
            like(schema.tutorProfiles.bio, `%${location}%`)
          )
        );
      
      if (tutorsInLocation.length > 0) {
        conditions.push(inArray(schema.tutorProfiles.id, tutorsInLocation.map(t => t.id)));
      } else {
        // No tutors in this location
        return res.status(200).json({
          tutors: [],
          total: 0,
          total_pages: 0,
          current_page: page
        });
      }
    }
    
    // Filter by specific day and time in availability
    if (specificDay !== 'all' || specificTime !== 'all') {
      // This is a simplified approach - in a real app, you'd parse the JSON availability properly
      // For now, we're doing a simple string search in the JSON data
      let timePattern = '';
      
      if (specificDay !== 'all' && specificTime !== 'all') {
        timePattern = `"day":"${specificDay}".*"startTime":"${specificTime}"`;
      } else if (specificDay !== 'all') {
        timePattern = `"day":"${specificDay}"`;
      } else if (specificTime !== 'all') {
        timePattern = `"startTime":"${specificTime}"`;
      }
      
      if (timePattern) {
        conditions.push(
          like(schema.tutorProfiles.availability, `%${timePattern}%`)
        );
      }
    }
    
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
    
    // Format response to include only necessary data
    const formattedTutors = tutors.map(tutor => ({
      id: tutor.id,
      user_id: tutor.user_id,
      bio: tutor.bio,
      hourly_rate: tutor.hourly_rate,
      teaching_mode: tutor.teaching_mode,
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
    
    // Format response data
    const formattedTutor = {
      id: tutor.id,
      user_id: tutor.user_id,
      bio: tutor.bio,
      experience_years: tutor.experience_years,
      hourly_rate: tutor.hourly_rate,
      teaching_mode: tutor.teaching_mode,
      education: tutor.education,
      certifications: tutor.certifications,
      availability: tutor.availability,
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
    
    // Format response
    const formattedTutors = similarTutors.map(tutor => ({
      id: tutor.id,
      hourly_rate: tutor.hourly_rate,
      teaching_mode: tutor.teaching_mode,
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
    
    // Prepare update data manually to ensure correct field preservation
    const updateData = {
      bio: req.body.bio || existingProfile.bio,
      education: req.body.education || existingProfile.education,
      experience: req.body.experience || existingProfile.experience,
      experience_years: req.body.experience_years || existingProfile.experience_years,
      // Ensure hourly_rate is always a number - explicitly parse if needed
      hourly_rate: req.body.hourly_rate !== undefined 
        ? (typeof req.body.hourly_rate === 'string' ? parseFloat(req.body.hourly_rate) : req.body.hourly_rate) 
        : existingProfile.hourly_rate,
      teaching_mode: req.body.teaching_mode || existingProfile.teaching_mode || 'online',
      // Update availability if provided
      availability: req.body.availability !== undefined ? req.body.availability : existingProfile.availability,
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
    
    // Ensure numeric fields are properly formatted
    const hourlyRate = typeof tutorProfile.hourly_rate === 'string'
      ? parseFloat(tutorProfile.hourly_rate)
      : tutorProfile.hourly_rate;
    
    // Format response
    const formattedProfile = {
      ...tutorProfile,
      hourly_rate: hourlyRate,
      teaching_mode: tutorProfile.teaching_mode || 'online',
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
    
    // Get active ads count
    const activeAdsCount = await db.select({ count: sql<number>`count(*)` })
      .from(schema.ads)
      .where(
        and(
          eq(schema.ads.tutor_id, tutorProfile.id),
          eq(schema.ads.status, "active")
        )
      );
    
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
      active_ads: Number(activeAdsCount[0]?.count || 0),
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
    
    // Get favorite tutors (to be implemented)
    // Placeholder implementation - will need a favorites table
    
    return res.status(200).json([]);
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
    
    // Add to favorites (to be implemented)
    // Placeholder implementation - will need a favorites table
    
    return res.status(200).json({ message: "Tutor added to favorites" });
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
    
    // Remove from favorites (to be implemented)
    // Placeholder implementation - will need a favorites table
    
    return res.status(200).json({ message: "Tutor removed from favorites" });
  } catch (error) {
    console.error("Remove favorite tutor error:", error);
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
    
    // Format response
    const formattedTutors = pendingTutors.map(tutor => ({
      id: tutor.id,
      bio: tutor.bio,
      experience_years: tutor.experience_years,
      education: tutor.education,
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