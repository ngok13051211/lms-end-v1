import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, like, or, desc, inArray, not, sql, isNull } from "drizzle-orm";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

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
      where: eq(schema.testimonials.isFeatured, true),
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
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '12');
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const conditions = [eq(schema.tutorProfiles.isVerified, true)];
    
    // Add search condition if provided
    if (search) {
      // We need to join with users table to search by name
      const tutorsByName = await db.select({ id: schema.tutorProfiles.id })
        .from(schema.tutorProfiles)
        .innerJoin(schema.users, eq(schema.tutorProfiles.userId, schema.users.id))
        .where(
          or(
            like(schema.users.firstName, `%${search}%`),
            like(schema.users.lastName, `%${search}%`)
          )
        );
      
      if (tutorsByName.length > 0) {
        conditions.push(inArray(schema.tutorProfiles.id, tutorsByName.map(t => t.id)));
      } else {
        // If no name matches, return empty result
        return res.status(200).json({
          tutors: [],
          total: 0,
          totalPages: 0,
          currentPage: page
        });
      }
    }
    
    // Add subject filter if not 'all'
    if (subject !== 'all') {
      const tutorsWithSubject = await db.select({ tutorId: schema.tutorSubjects.tutorId })
        .from(schema.tutorSubjects)
        .where(eq(schema.tutorSubjects.subjectId, parseInt(subject)));
      
      if (tutorsWithSubject.length > 0) {
        conditions.push(inArray(schema.tutorProfiles.id, tutorsWithSubject.map(t => t.tutorId)));
      } else {
        // If no tutors with subject, return empty result
        return res.status(200).json({
          tutors: [],
          total: 0,
          totalPages: 0,
          currentPage: page
        });
      }
    }
    
    // Add level filter if not 'all'
    if (level !== 'all') {
      const tutorsWithLevel = await db.select({ tutorId: schema.tutorEducationLevels.tutorId })
        .from(schema.tutorEducationLevels)
        .where(eq(schema.tutorEducationLevels.levelId, parseInt(level)));
      
      if (tutorsWithLevel.length > 0) {
        conditions.push(inArray(schema.tutorProfiles.id, tutorsWithLevel.map(t => t.tutorId)));
      } else {
        // If no tutors with level, return empty result
        return res.status(200).json({
          tutors: [],
          total: 0,
          totalPages: 0,
          currentPage: page
        });
      }
    }
    
    // Add teaching mode filter if not 'all'
    if (mode !== 'all') {
      conditions.push(
        or(
          eq(schema.tutorProfiles.teachingMode, mode),
          eq(schema.tutorProfiles.teachingMode, 'both')
        )
      );
    }
    
    // Add price range filter
    conditions.push(
      and(
        sql`CAST(${schema.tutorProfiles.hourlyRate} AS NUMERIC) >= ${minRate}`,
        sql`CAST(${schema.tutorProfiles.hourlyRate} AS NUMERIC) <= ${maxRate}`
      )
    );
    
    // Get tutors with filters and pagination
    const tutors = await db.query.tutorProfiles.findMany({
      where: and(...conditions),
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        subjects: {
          with: {
            subject: true
          }
        },
        educationLevels: {
          with: {
            level: true
          }
        }
      },
      limit,
      offset,
      orderBy: [
        // First featured tutors, then by rating
        desc(schema.tutorProfiles.isFeatured),
        desc(schema.tutorProfiles.rating)
      ]
    });
    
    // Transform tutor data to include subject and level objects directly
    const transformedTutors = tutors.map(tutor => ({
      ...tutor,
      subjects: tutor.subjects.map(ts => ts.subject),
      educationLevels: tutor.educationLevels.map(tel => tel.level)
    }));
    
    // Get total count for pagination
    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.tutorProfiles)
      .where(and(...conditions));
    
    const total = totalResult[0]?.count || 0;
    
    return res.status(200).json({
      tutors: transformedTutors,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("Get tutors error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get featured tutors for homepage
export const getFeaturedTutors = async (req: Request, res: Response) => {
  try {
    // Fetch featured tutors with basic info
    const tutors = await db.query.tutorProfiles.findMany({
      where: and(
        eq(schema.tutorProfiles.isFeatured, true),
        eq(schema.tutorProfiles.isVerified, true)
      ),
      limit: 3,
      orderBy: desc(schema.tutorProfiles.rating)
    });
    
    // Fetch related data separately to avoid relation inference issues
    const transformedTutors = await Promise.all(tutors.map(async (tutor) => {
      // Get user info
      const userData = await db.query.users.findFirst({
        where: eq(schema.users.id, tutor.userId),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      });
      
      // Get subject IDs for this tutor
      const tutorSubjectIds = await db.select({ subjectId: schema.tutorSubjects.subjectId })
        .from(schema.tutorSubjects)
        .where(eq(schema.tutorSubjects.tutorId, tutor.id));
        
      // Get subjects data
      const subjectsData = tutorSubjectIds.length > 0 
        ? await db.query.subjects.findMany({
            where: inArray(schema.subjects.id, tutorSubjectIds.map(s => s.subjectId))
          })
        : [];
        
      // Get level IDs for this tutor  
      const tutorLevelIds = await db.select({ levelId: schema.tutorEducationLevels.levelId })
        .from(schema.tutorEducationLevels)
        .where(eq(schema.tutorEducationLevels.tutorId, tutor.id));
        
      // Get education levels data  
      const levelsData = tutorLevelIds.length > 0
        ? await db.query.educationLevels.findMany({
            where: inArray(schema.educationLevels.id, tutorLevelIds.map(l => l.levelId))
          })
        : [];
      
      // Return tutor with related data
      return {
        ...tutor,
        user: userData,
        subjects: subjectsData,
        educationLevels: levelsData
      };
    }));
    
    return res.status(200).json(transformedTutors);
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
    
    // Get basic tutor profile data
    const tutor = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.id, tutorId)
    });
    
    if (!tutor) {
      return res.status(404).json({ message: "Tutor not found" });
    }
    
    // Get user info
    const userData = await db.query.users.findFirst({
      where: eq(schema.users.id, tutor.userId),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true
      }
    });
    
    // Get subject IDs for this tutor
    const tutorSubjectIds = await db.select({ subjectId: schema.tutorSubjects.subjectId })
      .from(schema.tutorSubjects)
      .where(eq(schema.tutorSubjects.tutorId, tutor.id));
    
    // Get subjects data
    const subjectsData = tutorSubjectIds.length > 0 
      ? await db.query.subjects.findMany({
          where: inArray(schema.subjects.id, tutorSubjectIds.map(s => s.subjectId))
        })
      : [];
    
    // Get level IDs for this tutor  
    const tutorLevelIds = await db.select({ levelId: schema.tutorEducationLevels.levelId })
      .from(schema.tutorEducationLevels)
      .where(eq(schema.tutorEducationLevels.tutorId, tutor.id));
    
    // Get education levels data  
    const levelsData = tutorLevelIds.length > 0
      ? await db.query.educationLevels.findMany({
          where: inArray(schema.educationLevels.id, tutorLevelIds.map(l => l.levelId))
        })
      : [];
    
    // Combine data into a single response
    const transformedTutor = {
      ...tutor,
      user: userData,
      subjects: subjectsData,
      educationLevels: levelsData
    };
    
    // Track profile view (for analytics)
    // This could be implemented with a separate analytics service or table
    
    return res.status(200).json(transformedTutor);
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
    
    // Get the tutor's subjects
    const tutorSubjects = await db.select({ subjectId: schema.tutorSubjects.subjectId })
      .from(schema.tutorSubjects)
      .where(eq(schema.tutorSubjects.tutorId, tutorId));
    
    if (tutorSubjects.length === 0) {
      return res.status(200).json([]);
    }
    
    const subjectIds = tutorSubjects.map(ts => ts.subjectId);
    
    // Get tutors with similar subjects
    const similarTutorIds = await db.select({ tutorId: schema.tutorSubjects.tutorId })
      .from(schema.tutorSubjects)
      .where(
        and(
          inArray(schema.tutorSubjects.subjectId, subjectIds),
          not(eq(schema.tutorSubjects.tutorId, tutorId))
        )
      )
      .groupBy(schema.tutorSubjects.tutorId);
    
    if (similarTutorIds.length === 0) {
      return res.status(200).json([]);
    }
    
    // Get basic tutor profiles for similar tutors
    const tutors = await db.query.tutorProfiles.findMany({
      where: and(
        inArray(schema.tutorProfiles.id, similarTutorIds.map(t => t.tutorId)),
        eq(schema.tutorProfiles.isVerified, true)
      ),
      limit: 3,
      orderBy: [
        desc(schema.tutorProfiles.rating),
        desc(schema.tutorProfiles.isFeatured)
      ]
    });
    
    // Get details for each tutor separately to avoid relation inference issues
    const transformedTutors = await Promise.all(tutors.map(async (tutor) => {
      // Get user info
      const userData = await db.query.users.findFirst({
        where: eq(schema.users.id, tutor.userId),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      });
      
      // Get subject IDs for this tutor
      const tutorSubjectIds = await db.select({ subjectId: schema.tutorSubjects.subjectId })
        .from(schema.tutorSubjects)
        .where(eq(schema.tutorSubjects.tutorId, tutor.id));
        
      // Get subjects data
      const subjectsData = tutorSubjectIds.length > 0 
        ? await db.query.subjects.findMany({
            where: inArray(schema.subjects.id, tutorSubjectIds.map(s => s.subjectId))
          })
        : [];
        
      // Get level IDs for this tutor  
      const tutorLevelIds = await db.select({ levelId: schema.tutorEducationLevels.levelId })
        .from(schema.tutorEducationLevels)
        .where(eq(schema.tutorEducationLevels.tutorId, tutor.id));
        
      // Get education levels data  
      const levelsData = tutorLevelIds.length > 0
        ? await db.query.educationLevels.findMany({
            where: inArray(schema.educationLevels.id, tutorLevelIds.map(l => l.levelId))
          })
        : [];
      
      // Return tutor with related data
      return {
        ...tutor,
        user: userData,
        subjects: subjectsData,
        educationLevels: levelsData
      };
    }));
    
    return res.status(200).json(transformedTutors);
  } catch (error) {
    console.error("Get similar tutors error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get tutor reviews
export const getTutorReviews = async (req: Request, res: Response) => {
  try {
    const tutorId = parseInt(req.params.id);
    
    if (isNaN(tutorId)) {
      return res.status(400).json({ message: "Invalid tutor ID" });
    }
    
    // Get reviews for tutor
    const reviews = await db.query.reviews.findMany({
      where: eq(schema.reviews.tutor_id, tutorId),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      },
      orderBy: desc(schema.reviews.createdAt)
    });
    
    return res.status(200).json(reviews);
  } catch (error) {
    console.error("Get tutor reviews error:", error);
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
    
    // Check if tutor profile already exists
    const existingProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.userId, userId)
    });
    
    if (existingProfile) {
      return res.status(400).json({ message: "Tutor profile already exists" });
    }
    
    // Validate profile data
    const profileData = schema.tutorProfileInsertSchema.parse({
      ...req.body,
      userId
    });
    
    // Check if subjects and education levels are provided
    if (!req.body.subjects || !Array.isArray(req.body.subjects) || req.body.subjects.length === 0) {
      return res.status(400).json({ message: "At least one subject is required" });
    }
    
    if (!req.body.educationLevels || !Array.isArray(req.body.educationLevels) || req.body.educationLevels.length === 0) {
      return res.status(400).json({ message: "At least one education level is required" });
    }
    
    // Create tutor profile
    const [tutorProfile] = await db.insert(schema.tutorProfiles)
      .values({
        userId,
        bio: profileData.bio,
        education: profileData.education,
        experience: profileData.experience,
        hourlyRate: profileData.hourlyRate,
        teachingMode: profileData.teachingMode,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Add subjects to tutor profile
    for (const subjectId of req.body.subjects) {
      await db.insert(schema.tutorSubjects)
        .values({
          tutorId: tutorProfile.id,
          subjectId: parseInt(subjectId),
          createdAt: new Date()
        });
    }
    
    // Add education levels to tutor profile
    for (const levelId of req.body.educationLevels) {
      await db.insert(schema.tutorEducationLevels)
        .values({
          tutorId: tutorProfile.id,
          levelId: parseInt(levelId),
          createdAt: new Date()
        });
    }
    
    // Get the complete tutor profile with related data
    const completeProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.id, tutorProfile.id),
      with: {
        subjects: {
          with: {
            subject: true
          }
        },
        educationLevels: {
          with: {
            level: true
          }
        }
      }
    });
    
    // Transform to include subject and level objects directly
    const transformedProfile = {
      ...completeProfile,
      subjects: completeProfile?.subjects.map(ts => ts.subject) || [],
      educationLevels: completeProfile?.educationLevels.map(tel => tel.level) || []
    };
    
    return res.status(201).json({
      message: "Tutor profile created successfully",
      profile: transformedProfile
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
      where: eq(schema.tutorProfiles.userId, userId)
    });
    
    if (!existingProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // Validate profile data
    const profileData = schema.tutorProfileInsertSchema.partial().parse({
      ...req.body,
      userId
    });
    
    // Check if subjects and education levels are provided
    if (req.body.subjects && (!Array.isArray(req.body.subjects) || req.body.subjects.length === 0)) {
      return res.status(400).json({ message: "At least one subject is required" });
    }
    
    if (req.body.educationLevels && (!Array.isArray(req.body.educationLevels) || req.body.educationLevels.length === 0)) {
      return res.status(400).json({ message: "At least one education level is required" });
    }
    
    // Update tutor profile
    const [updatedProfile] = await db.update(schema.tutorProfiles)
      .set({
        bio: profileData.bio !== undefined ? profileData.bio : existingProfile.bio,
        education: profileData.education !== undefined ? profileData.education : existingProfile.education,
        experience: profileData.experience !== undefined ? profileData.experience : existingProfile.experience,
        hourlyRate: profileData.hourlyRate !== undefined ? profileData.hourlyRate : existingProfile.hourlyRate,
        teachingMode: profileData.teachingMode !== undefined ? profileData.teachingMode : existingProfile.teachingMode,
        updatedAt: new Date()
      })
      .where(eq(schema.tutorProfiles.id, existingProfile.id))
      .returning();
    
    // Update subjects if provided
    if (req.body.subjects) {
      // Delete existing subjects
      await db.delete(schema.tutorSubjects)
        .where(eq(schema.tutorSubjects.tutorId, existingProfile.id));
      
      // Add new subjects
      for (const subjectId of req.body.subjects) {
        await db.insert(schema.tutorSubjects)
          .values({
            tutorId: existingProfile.id,
            subjectId: parseInt(subjectId),
            createdAt: new Date()
          });
      }
    }
    
    // Update education levels if provided
    if (req.body.educationLevels) {
      // Delete existing education levels
      await db.delete(schema.tutorEducationLevels)
        .where(eq(schema.tutorEducationLevels.tutorId, existingProfile.id));
      
      // Add new education levels
      for (const levelId of req.body.educationLevels) {
        await db.insert(schema.tutorEducationLevels)
          .values({
            tutorId: existingProfile.id,
            levelId: parseInt(levelId),
            createdAt: new Date()
          });
      }
    }
    
    // Get the complete updated tutor profile with related data
    const completeProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.id, updatedProfile.id),
      with: {
        subjects: {
          with: {
            subject: true
          }
        },
        educationLevels: {
          with: {
            level: true
          }
        }
      }
    });
    
    // Transform to include subject and level objects directly
    const transformedProfile = {
      ...completeProfile,
      subjects: completeProfile?.subjects.map(ts => ts.subject) || [],
      educationLevels: completeProfile?.educationLevels.map(tel => tel.level) || []
    };
    
    return res.status(200).json({
      message: "Tutor profile updated successfully",
      profile: transformedProfile
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
    
    // Get basic tutor profile info
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.userId, userId)
    });
    
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // Get subjects for this tutor
    const tutorSubjectsData = await db.query.tutorSubjects.findMany({
      where: eq(schema.tutorSubjects.tutorId, tutorProfile.id),
      with: {
        subject: true
      }
    });
    
    // Get education levels for this tutor
    const tutorLevelsData = await db.query.tutorEducationLevels.findMany({
      where: eq(schema.tutorEducationLevels.tutorId, tutorProfile.id),
      with: {
        level: true
      }
    });
    
    // Combine all data into a single response
    const transformedProfile = {
      ...tutorProfile,
      subjects: tutorSubjectsData.map(ts => ts.subject),
      educationLevels: tutorLevelsData.map(tel => tel.level)
    };
    
    return res.status(200).json(transformedProfile);
  } catch (error) {
    console.error("Get own tutor profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get tutor statistics
export const getTutorStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Get tutor profile
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.userId, userId)
    });
    
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // This could be expanded with more detailed statistics from a separate analytics service or table
    const stats = {
      profileViews: Math.floor(Math.random() * 100) + 20, // Mock data for profile views
      totalStudents: Math.floor(Math.random() * 15), // Mock data for total students
      averageRating: tutorProfile.rating,
      completedLessons: Math.floor(Math.random() * 50), // Mock data for completed lessons
    };
    
    return res.status(200).json(stats);
  } catch (error) {
    console.error("Get tutor stats error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get favorite tutors for student
export const getFavoriteTutors = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // This would typically use a favorites or bookmarks table
    // For now, return mock data or empty array
    return res.status(200).json([]);
  } catch (error) {
    console.error("Get favorite tutors error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Add favorite tutor for student
export const addFavoriteTutor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // This would typically add to a favorites or bookmarks table
    return res.status(200).json({ message: "Tutor added to favorites" });
  } catch (error) {
    console.error("Add favorite tutor error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Remove favorite tutor for student
export const removeFavoriteTutor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // This would typically remove from a favorites or bookmarks table
    return res.status(200).json({ message: "Tutor removed from favorites" });
  } catch (error) {
    console.error("Remove favorite tutor error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Create review for tutor
export const createReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const tutorId = parseInt(req.params.tutorId);
    
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
    
    // Validate review data
    const reviewData = schema.reviewInsertSchema.parse({
      ...req.body,
      student_id: userId,
      tutor_id: tutorId
    });
    
    // Create review
    const [review] = await db.insert(schema.reviews)
      .values({
        student_id: userId,
        tutor_id: tutorId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Update tutor's average rating
    const reviews = await db.query.reviews.findMany({
      where: eq(schema.reviews.tutor_id, tutorId)
    });
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    await db.update(schema.tutorProfiles)
      .set({
        rating: averageRating,
        totalReviews: reviews.length
      })
      .where(eq(schema.tutorProfiles.id, tutorId));
    
    return res.status(201).json({
      message: "Review created successfully",
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

// Get tutor verification requests (admin)
export const getTutorVerifications = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string || '';
    const status = req.query.status as string || 'pending';
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '10');
    const offset = (page - 1) * pageSize;
    
    // Build query conditions
    let conditions = [];
    
    // Add status condition
    if (status === 'pending') {
      conditions.push(eq(schema.tutorProfiles.isVerified, false));
    } else if (status === 'approved') {
      conditions.push(eq(schema.tutorProfiles.isVerified, true));
    } else if (status === 'rejected') {
      // This would require a status field which isn't in the current schema
      // For now, we can use isVerified = false as approximation
      conditions.push(eq(schema.tutorProfiles.isVerified, false));
    }
    
    // Add search condition if provided
    if (search) {
      // We need to join with users table to search by name
      const tutorsByName = await db.select({ id: schema.tutorProfiles.id })
        .from(schema.tutorProfiles)
        .innerJoin(schema.users, eq(schema.tutorProfiles.userId, schema.users.id))
        .where(
          or(
            like(schema.users.firstName, `%${search}%`),
            like(schema.users.lastName, `%${search}%`)
          )
        );
      
      if (tutorsByName.length > 0) {
        conditions.push(inArray(schema.tutorProfiles.id, tutorsByName.map(t => t.id)));
      } else {
        // If no name matches, return empty result
        return res.status(200).json({
          tutors: [],
          total: 0,
          totalPages: 0,
          currentPage: page
        });
      }
    }
    
    // Get basic tutor profiles with filters and pagination
    const tutors = await db.query.tutorProfiles.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      },
      limit: pageSize,
      offset,
      orderBy: desc(schema.tutorProfiles.createdAt)
    });
    
    // Get details for each tutor separately to avoid relation inference issues
    const transformedTutors = await Promise.all(tutors.map(async (tutor) => {
      // Get subjects for this tutor
      const tutorSubjectsData = await db.query.tutorSubjects.findMany({
        where: eq(schema.tutorSubjects.tutorId, tutor.id),
        with: {
          subject: true
        }
      });
      
      // Get education levels for this tutor
      const tutorLevelsData = await db.query.tutorEducationLevels.findMany({
        where: eq(schema.tutorEducationLevels.tutorId, tutor.id),
        with: {
          level: true
        }
      });
      
      // Return tutor with related data
      return {
        ...tutor,
        subjects: tutorSubjectsData.map(ts => ts.subject),
        educationLevels: tutorLevelsData.map(tel => tel.level),
        // Add a status field since we don't have one in the schema
        status: tutor.isVerified ? "approved" : "pending"
      };
    }));
    
    // Get total count for pagination
    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.tutorProfiles)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = totalResult[0]?.count || 0;
    
    return res.status(200).json({
      tutors: transformedTutors,
      total,
      totalPages: Math.ceil(total / pageSize),
      currentPage: page
    });
  } catch (error) {
    console.error("Get tutor verifications error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Approve tutor verification
export const approveTutor = async (req: Request, res: Response) => {
  try {
    const tutorId = parseInt(req.params.tutorId);
    
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
    
    // Update tutor verification status
    const [updatedTutor] = await db.update(schema.tutorProfiles)
      .set({
        isVerified: true,
        updatedAt: new Date()
      })
      .where(eq(schema.tutorProfiles.id, tutorId))
      .returning();
    
    return res.status(200).json({
      message: "Tutor approved successfully",
      tutor: updatedTutor
    });
  } catch (error) {
    console.error("Approve tutor error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Reject tutor verification
export const rejectTutor = async (req: Request, res: Response) => {
  try {
    const tutorId = parseInt(req.params.tutorId);
    
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
    
    // Ideally, we would have a status field to set to "rejected"
    // For now, we can just keep isVerified as false and add a rejectReason field in the future
    const [updatedTutor] = await db.update(schema.tutorProfiles)
      .set({
        isVerified: false,
        updatedAt: new Date()
      })
      .where(eq(schema.tutorProfiles.id, tutorId))
      .returning();
    
    return res.status(200).json({
      message: "Tutor rejected successfully",
      tutor: updatedTutor
    });
  } catch (error) {
    console.error("Reject tutor error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
