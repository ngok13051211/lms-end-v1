import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import {
  eq,
  and,
  like,
  or,
  desc,
  inArray,
  not,
  sql,
  isNull,
} from "drizzle-orm";
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
            level: true,
          },
        },
      },
    });

    // Transform the result to include education levels in a more convenient format
    const transformedSubjects = subjects.map((subject) => {
      return {
        ...subject,
        education_levels: subject.educationLevels.map((el) => el.level),
      };
    });

    return res.status(200).json(transformedSubjects);
  } catch (error) {
    console.error("Get subjects error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get subject by ID with education levels and courses
export const getSubjectById = async (req: Request, res: Response) => {
  try {
    const subjectId = parseInt(req.params.id);

    if (isNaN(subjectId)) {
      return res.status(400).json({ message: "Invalid subject ID" });
    }

    const subject = await db.query.subjects.findFirst({
      where: eq(schema.subjects.id, subjectId),
      with: {
        educationLevels: {
          with: {
            level: true,
          },
        },
      },
    });

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // Transform the result to include education levels in a more convenient format
    const transformedSubject = {
      ...subject,
      education_levels: subject.educationLevels.map((el) => el.level),
    };

    return res.status(200).json(transformedSubject);
  } catch (error) {
    console.error("Get subject by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get courses by subject ID
export const getCoursesBySubjectId = async (req: Request, res: Response) => {
  try {
    const subjectId = parseInt(req.params.id);

    if (isNaN(subjectId)) {
      return res.status(400).json({ message: "Invalid subject ID" });
    }

    const courses = await db.query.courses.findMany({
      where: and(
        eq(schema.courses.subject_id, subjectId),
        eq(schema.courses.status, "active")
      ),
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
      },
      orderBy: desc(schema.courses.created_at),
    });

    return res.status(200).json({ courses });
  } catch (error) {
    console.error("Get courses by subject ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get all education levels
export const getEducationLevels = async (req: Request, res: Response) => {
  try {
    const levels = await db.query.educationLevels.findMany({
      orderBy: schema.educationLevels.name,
    });

    return res.status(200).json(levels);
  } catch (error) {
    console.error("Get education levels error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// // Get featured testimonials
// export const getTestimonials = async (req: Request, res: Response) => {
//   try {
//     const testimonials = await db.query.testimonials.findMany({
//       where: eq(schema.testimonials.is_featured, true),
//       limit: 3,
//     });

//     return res.status(200).json(testimonials);
//   } catch (error) {
//     console.error("Get testimonials error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// Get tutors with filters
export const getTutors = async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || "";
    const subject = (req.query.subject as string) || "all";
    const level = (req.query.level as string) || "all";
    const mode = (req.query.mode as string) || "all";
    const minRate = parseFloat((req.query.minRate as string) || "0");
    const maxRate = parseFloat((req.query.maxRate as string) || "1000000");
    const minExperience = parseInt((req.query.minExperience as string) || "0");
    const hasCertifications = req.query.hasCertifications === "true";
    const availability = (req.query.availability as string) || "all";
    const minRating = parseFloat((req.query.minRating as string) || "0");
    const location = (req.query.location as string) || "";
    const specificDay = (req.query.day as string) || "all";
    const specificTime = (req.query.time as string) || "all";
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "12");
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [eq(schema.tutorProfiles.is_verified, true)];

    // Add search condition if provided
    if (search) {
      // Convert search term to lowercase for case-insensitive search
      const searchLower = search.toLowerCase();

      // First, find tutors by subject name match (case-insensitive)
      const tutorsBySubject = await db
        .select({ tutor_id: schema.tutorSubjects.tutor_id })
        .from(schema.tutorSubjects)
        .innerJoin(
          schema.subjects,
          eq(schema.tutorSubjects.subject_id, schema.subjects.id)
        )
        .where(
          sql`LOWER(${schema.subjects.name}) LIKE ${"%" + searchLower + "%"}`
        );

      // Find tutors by name, bio, or certifications (case-insensitive)
      const tutorsByName = await db
        .select({ id: schema.tutorProfiles.id })
        .from(schema.tutorProfiles)
        .innerJoin(
          schema.users,
          eq(schema.tutorProfiles.user_id, schema.users.id)
        )
        .where(
          or(
            sql`LOWER(${schema.users.first_name}) LIKE ${"%" + searchLower + "%"
              }`,
            sql`LOWER(${schema.users.last_name}) LIKE ${"%" + searchLower + "%"
              }`,
            sql`LOWER(${schema.tutorProfiles.bio}) LIKE ${"%" + searchLower + "%"
              }`,
            sql`LOWER(${schema.tutorProfiles.certifications}) LIKE ${"%" + searchLower + "%"
              }`
          )
        );

      // Combine both search results (tutors by name/bio and tutors by subject)
      const tutorIds = [
        ...tutorsByName.map((t) => t.id),
        ...tutorsBySubject.map((t) => t.tutor_id),
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
          current_page: page,
        });
      }
    }

    // Add subject filter if not 'all'
    if (subject !== "all") {
      const tutorsWithSubject = await db
        .select({ tutor_id: schema.tutorSubjects.tutor_id })
        .from(schema.tutorSubjects)
        .where(eq(schema.tutorSubjects.subject_id, parseInt(subject)));

      if (tutorsWithSubject.length > 0) {
        conditions.push(
          inArray(
            schema.tutorProfiles.id,
            tutorsWithSubject.map((t) => t.tutor_id)
          )
        );
      } else {
        // If no tutors with this subject, return empty result
        return res.status(200).json({
          tutors: [],
          total: 0,
          total_pages: 0,
          current_page: page,
        });
      }
    }

    // Add level filter if not 'all'
    if (level !== "all") {
      const tutorsWithLevel = await db
        .select({ tutor_id: schema.tutorEducationLevels.tutor_id })
        .from(schema.tutorEducationLevels)
        .where(eq(schema.tutorEducationLevels.level_id, parseInt(level)));

      if (tutorsWithLevel.length > 0) {
        conditions.push(
          inArray(
            schema.tutorProfiles.id,
            tutorsWithLevel.map((t) => t.tutor_id)
          )
        );
      } else {
        // If no tutors with this level, return empty result
        return res.status(200).json({
          tutors: [],
          total: 0,
          total_pages: 0,
          current_page: page,
        });
      }
    }

    // Add teaching mode filter if not 'all'
    if (mode !== "all") {
      // Find tutors who have at least one course with the specified teaching mode
      const tutorsWithTeachingMode = await db
        .select({ id: schema.tutorProfiles.id })
        .from(schema.tutorProfiles)
        .innerJoin(
          schema.courses,
          eq(schema.tutorProfiles.id, schema.courses.tutor_id)
        )
        .where(
          or(
            eq(schema.courses.teaching_mode, mode),
            eq(schema.courses.teaching_mode, "both")
          )
        )
        .groupBy(schema.tutorProfiles.id);

      if (tutorsWithTeachingMode.length > 0) {
        conditions.push(
          inArray(
            schema.tutorProfiles.id,
            tutorsWithTeachingMode.map((t) => t.id)
          )
        );
      } else {
        // If no tutors with this teaching mode, return empty result
        return res.status(200).json({
          tutors: [],
          total: 0,
          total_pages: 0,
          current_page: page,
        });
      }
    }

    // Add price range filter - now get tutors with at least one course in the price range
    if (minRate > 0 || maxRate < 1000000) {
      // Find tutors with at least one course in the price range
      const tutorsInPriceRange = await db
        .select({ id: schema.tutorProfiles.id })
        .from(schema.tutorProfiles)
        .innerJoin(
          schema.courses,
          eq(schema.tutorProfiles.id, schema.courses.tutor_id)
        )
        .where(
          and(
            sql`${schema.courses.hourly_rate} >= ${minRate}`,
            sql`${schema.courses.hourly_rate} <= ${maxRate}`
          )
        )
        .groupBy(schema.tutorProfiles.id);

      if (tutorsInPriceRange.length > 0) {
        conditions.push(
          inArray(
            schema.tutorProfiles.id,
            tutorsInPriceRange.map((t) => t.id)
          )
        );
      } else {
        // If no tutors in the price range, return empty result
        return res.status(200).json({
          tutors: [],
          total: 0,
          total_pages: 0,
          current_page: page,
        });
      }
    }

    // Add certifications filter
    if (hasCertifications) {
      const certCondition1 = not(isNull(schema.tutorProfiles.certifications));
      const certCondition2 = sql`COALESCE(length(${schema.tutorProfiles.certifications}), 0) > 0`;

      // Add both conditions directly to the conditions array
      conditions.push(certCondition1);
      conditions.push(certCondition2);
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
      const tutorsWithLocationInBio = await db
        .select({ id: schema.tutorProfiles.id })
        .from(schema.tutorProfiles)
        .where(
          sql`LOWER(${schema.tutorProfiles.bio}) LIKE ${"%" + locationLower + "%"
            }`
        );

      if (tutorsWithLocationInBio.length > 0) {
        conditions.push(
          inArray(
            schema.tutorProfiles.id,
            tutorsWithLocationInBio.map((t) => t.id)
          )
        );
      } else {
        // Không tìm thấy gia sư ở địa điểm này
        return res.status(200).json({
          tutors: [],
          total: 0,
          total_pages: 0,
          current_page: page,
        });
      }
    }

    // Đã xóa bỏ filter theo ngày và thời gian vì không có trường availability nữa

    // Count total tutors matching criteria
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
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
            phone: true,
          },
        },
        tutorSubjects: {
          with: {
            subject: true,
          },
        },
        tutorEducationLevels: {
          with: {
            level: true,
          },
        },
        reviews: {
          columns: {
            rating: true,
          },
        },
      },
      orderBy: [
        desc(schema.tutorProfiles.rating),
        desc(schema.tutorProfiles.created_at),
      ],
      limit,
      offset,
    });

    // Calculate average rating for each tutor based on reviews
    const tutorsWithRating = tutors.map((tutor) => {
      const reviews = tutor.reviews || [];
      const total_reviews = reviews.length;

      return {
        ...tutor,
        total_reviews,
        subjects: tutor.tutorSubjects.map((ts) => ts.subject),
        levels: tutor.tutorEducationLevels.map((tl) => tl.level),
      };
    });

    return res.status(200).json({
      tutors: tutorsWithRating,
      total,
      total_pages: totalPages,
      current_page: page,
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
            avatar: true,
          },
        },
        tutorSubjects: {
          with: {
            subject: true,
          },
          limit: 3,
        },

        // Thêm courses vào query để có thông tin hourly_rate và teaching_mode
        courses: {
          where: eq(schema.courses.status, "active"),
          columns: {
            id: true,
            teaching_mode: true,
            hourly_rate: true,
          },
        },
      },
      limit: 6,
    });

    // Format response đơn giản hóa
    const formattedTutors = tutors.map((tutor) => ({
      id: tutor.id,
      user_id: tutor.user_id,
      bio: tutor.bio,
      rating: tutor.rating,
      user: {
        id: tutor.user.id,
        name: `${tutor.user.first_name} ${tutor.user.last_name}`,
        avatar: tutor.user.avatar,
      },
      subjects: tutor.tutorSubjects.map((ts) => ts.subject),
      courses: tutor.courses, // Thêm courses vào response
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

    try {
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
              phone: true,
            },
          },
          tutorSubjects: {
            with: {
              subject: true,
            },
          },
          tutorEducationLevels: {
            with: {
              level: true,
            },
          },
          courses: {
            where: eq(schema.courses.status, "active"),
            columns: {
              id: true,
              title: true,
              teaching_mode: true,
              hourly_rate: true,
            },
          },
          reviews: {
            with: {
              student: {
                columns: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  avatar: true,
                },
              },
            },
            orderBy: desc(schema.reviews.created_at),
            limit: 5,
          },
        },
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
          phone: tutor.user.phone,
        },
        subjects: tutor.tutorSubjects.map((ts) => ts.subject),
        courses: tutor.courses,
        levels: tutor.tutorEducationLevels.map((tl) => tl.level),
        reviews: tutor.reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          created_at: review.created_at,
          student: {
            id: review.student.id,
            name: `${review.student.first_name} ${review.student.last_name}`,
            avatar: review.student.avatar,
          },
        })),
      };

      return res.status(200).json(formattedTutor);
    } catch (queryError) {
      console.error("Database query error in getTutorById:", queryError);
      return res.status(500).json({
        message: "Database query error",
        error:
          queryError instanceof Error ? queryError.message : String(queryError),
      });
    }
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
    const tutorSubjects = await db
      .select({ subject_id: schema.tutorSubjects.subject_id })
      .from(schema.tutorSubjects)
      .where(eq(schema.tutorSubjects.tutor_id, tutorId));

    if (tutorSubjects.length === 0) {
      return res.status(200).json([]);
    }

    const subjectIds = tutorSubjects.map((ts) => ts.subject_id);

    // Find tutors with similar subjects
    const similarTutorIds = await db
      .select({ tutor_id: schema.tutorSubjects.tutor_id })
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
        inArray(
          schema.tutorProfiles.id,
          similarTutorIds.map((t) => t.tutor_id)
        ),
        eq(schema.tutorProfiles.is_verified, true)
      ),
      with: {
        user: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
        tutorSubjects: {
          with: {
            subject: true,
          },
          limit: 3,
        },
        // Thêm courses vào query để có thông tin hourly_rate và teaching_mode
        courses: {
          where: eq(schema.courses.status, "active"),
          columns: {
            id: true,
            teaching_mode: true,
            hourly_rate: true,
          },
        },
      },
      limit: 4,
    });

    // Format response (đơn giản hóa)
    const formattedTutors = similarTutors.map((tutor) => ({
      id: tutor.id,
      rating: tutor.rating,
      user: {
        id: tutor.user.id,
        name: `${tutor.user.first_name} ${tutor.user.last_name}`,
        avatar: tutor.user.avatar,
      },
      subjects: tutor.tutorSubjects.map((ts) => ts.subject),
      courses: tutor.courses, // Thêm courses vào response
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
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "10");
    const offset = (page - 1) * limit;

    if (isNaN(tutorId)) {
      return res.status(400).json({ message: "Invalid tutor ID" });
    }

    try {
      // Kiểm tra xem gia sư có tồn tại không
      const tutorExists = await db.query.tutorProfiles.findFirst({
        where: eq(schema.tutorProfiles.id, tutorId),
        columns: {
          id: true,
        },
      });

      if (!tutorExists) {
        return res.status(404).json({ message: "Tutor not found" });
      }

      // Count total reviews
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
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
              avatar: true,
            },
          },
          // Optionally include course if it exists
          course: {
            columns: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: desc(schema.reviews.created_at),
        limit,
        offset,
      });

      // Format reviews
      const formattedReviews = reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        course: review.course
          ? {
            id: review.course.id,
            title: review.course.title,
          }
          : null,
        student: {
          id: review.student.id,
          name: `${review.student.first_name} ${review.student.last_name}`,
          avatar: review.student.avatar,
        },
      }));

      return res.status(200).json({
        reviews: formattedReviews,
        total,
        total_pages: totalPages,
        current_page: page,
      });
    } catch (queryError) {
      console.error("Database query error in getTutorReviews:", queryError);
      return res.status(500).json({
        message: "Database query error",
        error:
          queryError instanceof Error ? queryError.message : String(queryError),
      });
    }
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
      where: eq(schema.tutorProfiles.user_id, userId),
    });

    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }

    // Get document URLs from middleware
    const documentUrls = req.body.documentUrls || [];

    if (documentUrls.length === 0) {
      return res
        .status(400)
        .json({ message: "No certification documents uploaded" });
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
    await db
      .update(schema.tutorProfiles)
      .set({
        certifications: JSON.stringify(updatedCerts),
        updated_at: new Date(),
      })
      .where(eq(schema.tutorProfiles.id, tutorProfile.id));

    return res.status(200).json({
      message: "Certifications uploaded successfully",
      certifications: updatedCerts,
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
      where: eq(schema.tutorProfiles.user_id, userId),
    });

    if (existingProfile) {
      return res
        .status(400)
        .json({ message: "You already have a tutor profile" });
    }

    // Validate tutor profile data
    const profileData = schema.tutorProfileInsertSchema.parse({
      ...req.body,
      user_id: userId,
      is_verified: false,
      is_featured: false,
      rating: "0",
      created_at: new Date(),
    });

    // Create tutor profile
    const [tutorProfile] = await db
      .insert(schema.tutorProfiles)
      .values(profileData)
      .returning();

    // Associate subjects
    if (req.body.subject_ids && Array.isArray(req.body.subject_ids)) {
      const subjectValues = req.body.subject_ids.map((subjectId: string) => ({
        tutor_id: tutorProfile.id,
        subject_id: parseInt(subjectId),
      }));

      await db.insert(schema.tutorSubjects).values(subjectValues);
    }

    // Associate education levels
    if (req.body.level_ids && Array.isArray(req.body.level_ids)) {
      const levelValues = req.body.level_ids.map((levelId: string) => ({
        tutor_id: tutorProfile.id,
        level_id: parseInt(levelId),
      }));

      await db.insert(schema.tutorEducationLevels).values(levelValues);
    }

    // Update user role to tutor
    await db
      .update(schema.users)
      .set({ role: "tutor" })
      .where(eq(schema.users.id, userId));

    return res.status(201).json({
      message: "Tutor profile created successfully",
      profile: tutorProfile,
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
      console.log("❌ Không có userId từ token.");
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    console.log("✅ Bắt đầu cập nhật hồ sơ cho userId:", userId);
    console.log("📦 Request body:", req.body);

    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!existingUser) {
      console.log("❌ Không tìm thấy người dùng:", userId);
      return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
    }

    // Dữ liệu input - lấy từ req.body gốc trước khi qua validateBody
    // validateBody chỉ giữ lại các trường thuộc tutorProfileSchema và loại bỏ first_name, last_name, phone
    // Lưu ý: Trường hợp này khá đặc biệt vì chúng ta đang cập nhật dữ liệu trên 2 bảng khác nhau
    const originalBody = req.body;
    console.log("🧐 Kiểm tra dữ liệu gốc:", originalBody);

    const {
      first_name = originalBody.first_name,
      last_name = originalBody.last_name,
      phone = originalBody.phone,
      date_of_birth,
      address,
      bio,
      availability,
    } = req.body;

    console.log("✏️ Đang cập nhật bảng users...");
    await db.update(schema.users).set({
      first_name: first_name || existingUser.first_name,
      last_name: last_name || existingUser.last_name,
      phone: phone || existingUser.phone,
      date_of_birth: date_of_birth || existingUser.date_of_birth,
      address: address || existingUser.address,
      role: "tutor",
      updated_at: new Date(),
    }).where(eq(schema.users.id, userId));
    console.log("✅ Bảng users đã được cập nhật.");

    const existingProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId),
    });

    if (existingProfile) {
      console.log("✏️ Đang cập nhật bảng tutor_profiles...");
      await db.update(schema.tutorProfiles).set({
        bio: bio ?? existingProfile.bio,
        availability: availability ?? existingProfile.availability,
        updated_at: new Date(),
      }).where(eq(schema.tutorProfiles.user_id, userId));
      console.log("✅ Bảng tutor_profiles đã được cập nhật.");
    } else {
      console.log("📄 Chưa có tutor profile, tạo mới...");
      const [newProfile] = await db.insert(schema.tutorProfiles).values({
        user_id: userId,
        bio: bio ?? "",
        availability: availability ?? "",
        is_verified: false,
        is_featured: false,
        rating: "0",
        total_reviews: 0,
        created_at: new Date(),
        updated_at: new Date(),
      }).returning();
      console.log("✅ Đã tạo tutor profile mới:", newProfile);
    }

    const updatedUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    const updatedProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId),
    });

    const responseData = {
      ...updatedProfile,
      ...updatedUser,
    };

    console.log("📤 Hồ sơ sau khi cập nhật:", responseData);

    return res.status(200).json({
      success: true,
      message: "Cập nhật hồ sơ thành công",
      data: responseData,
    });

  } catch (error) {
    console.error("❌ Lỗi khi cập nhật hồ sơ tutor:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi cập nhật hồ sơ",
    });
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
        tutorSubjects: {
          with: {
            subject: true,
          },
        },
        tutorEducationLevels: {
          with: {
            level: true,
          },
        },
        user: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            date_of_birth: true,
            address: true,
            phone: true,
            email: true,
            avatar: true,
          }
        }
      },
    });

    if (!tutorProfile) {
      // Return null instead of error to allow frontend to show profile creation form
      return res.status(200).json(null);
    }

    // Đơn giản hóa response - bao gồm cả thông tin từ bảng users
    // Tách thuộc tính user và các thuộc tính còn lại của tutorProfile
    const { user, tutorSubjects, tutorEducationLevels, ...tutorProfileData } = tutorProfile;

    const formattedProfile = {
      ...tutorProfileData, // Chỉ lấy các thuộc tính của tutorProfile, không bao gồm user
      subjects: tutorProfile.tutorSubjects.map((ts) => ts.subject),
      levels: tutorProfile.tutorEducationLevels.map((tl) => tl.level),
      // Thêm các trường từ bảng users
      first_name: user.first_name,
      last_name: user.last_name,
      date_of_birth: user.date_of_birth,
      address: user.address,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar
    };

    console.log(
      "Formatted profile for frontend:",
      JSON.stringify(formattedProfile)
    );

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
      where: eq(schema.tutorProfiles.user_id, userId),
    });

    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }

    // Get active courses count
    const activeCoursesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.courses)
      .where(
        and(
          eq(schema.courses.tutor_id, tutorProfile.id),
          eq(schema.courses.status, "active")
        )
      );

    // Get total courses count
    const totalCoursesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.courses)
      .where(eq(schema.courses.tutor_id, tutorProfile.id));

    // Get total reviews count
    const reviewsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.reviews)
      .where(eq(schema.reviews.tutor_id, tutorProfile.id));

    // Get profile views (to be implemented with separate table)
    const profileViews = 0; // Placeholder

    // Get active conversations count
    const conversationsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.conversations)
      .where(eq(schema.conversations.tutor_id, userId));

    // Get unread messages count
    const unreadMessagesCount = await db
      .select({ count: sql<number>`count(*)` })
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
      unread_messages: Number(unreadMessagesCount[0]?.count || 0),
    };

    return res.status(200).json(stats);
  } catch (error) {
    console.error("Get tutor stats error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// export const getOwnCourses = async (req: Request, res: Response) => {
//   try {
//     const tutorId = req.user?.id;

//     if (!tutorId) {
//       return res.status(401).json({
//         success: false,
//         message: "Không được phép, vui lòng đăng nhập",
//       });
//     }

//     // Kiểm tra xem người dùng có phải là gia sư không
//     const tutorProfile = await db.query.tutorProfiles.findFirst({
//       where: eq(schema.tutorProfiles.user_id, tutorId),
//     });

//     if (!tutorProfile) {
//       return res.status(403).json({
//         success: false,
//         message: "Bạn không phải là gia sư, không thể truy cập tài nguyên này",
//       });
//     }

//     // Tham số phân trang
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 10;
//     const offset = (page - 1) * limit;

//     // Lọc theo trạng thái nếu có
//     const status = req.query.status as string;

//     // Xây dựng điều kiện lọc
//     let conditions = [eq(schema.courses.tutor_id, tutorProfile.id)];

//     if (status && ["draft", "published", "archived"].includes(status)) {
//       conditions.push(eq(schema.courses.status, status));
//     }

//     // Lấy khóa học
//     const courses = await db.query.courses.findMany({
//       where: and(...conditions),
//       with: {
//         subject: true,
//         course_levels: {
//           with: {
//             level: true,
//           },
//         },
//       },
//       orderBy: [desc(schema.courses.updated_at)],
//       limit,
//       offset,
//     });

//     // Đếm tổng số khóa học
//     const [{ count }] = await db
//       .select({
//         count: sql<number>`count(*)`,
//       })
//       .from(schema.courses)
//       .where(and(...conditions));

//     // Thêm thông tin về số lượng học sinh và đánh giá cho mỗi khóa học
//     const coursesWithStats = await Promise.all(
//       courses.map(async (course) => {
//         // Đếm số học sinh đã đăng ký khóa học
//         const [{ studentCount }] = await db
//           .select({
//             studentCount: sql<number>`count(DISTINCT ${schema.bookings.student_id})`,
//           })
//           .from(schema.bookings)
//           .where(eq(schema.bookings.course_id, course.id));

//         // Lấy điểm đánh giá trung bình
//         const [{ averageRating, reviewCount }] = await db
//           .select({
//             averageRating: sql<number>`AVG(${schema.reviews.rating})`,
//             reviewCount: sql<number>`count(*)`,
//           })
//           .from(schema.reviews)
//           .where(eq(schema.reviews.course_id, course.id));

//         return {
//           ...course,
//           student_count: Number(studentCount || 0),
//           average_rating: Number(averageRating || 0),
//           review_count: Number(reviewCount || 0),
//         };
//       })
//     );

//     return res.status(200).json({
//       success: true,
//       count: Number(count),
//       total_pages: Math.ceil(Number(count) / limit),
//       current_page: page,
//       courses: coursesWithStats,
//     });
//   } catch (error) {
//     console.error("Get own courses error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Lỗi máy chủ khi lấy danh sách khóa học",
//     });
//   }
// };
/**
 * @desc    Lấy danh sách khóa học của gia sư đang đăng nhập
 * @route   GET /api/v1/tutors/courses
 * @access  Private (Tutor only)
 */
export const getOwnCourses = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Không được phép, vui lòng đăng nhập",
      });
    }

    // Kiểm tra xem người dùng có phải là gia sư không
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId),
    });

    if (!tutorProfile) {
      return res.status(403).json({
        success: false,
        message: "Bạn không phải là gia sư, không thể truy cập tài nguyên này",
      });
    }

    console.log("Found tutor profile:", tutorProfile.id);

    // Tham số phân trang
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Lọc theo trạng thái nếu có
    const status = req.query.status as string;

    // Xây dựng điều kiện lọc
    let conditions = [eq(schema.courses.tutor_id, tutorProfile.id)];

    if (status && ["active", "pending", "expired"].includes(status)) {
      conditions.push(eq(schema.courses.status, status));
    }

    try {
      // Count total courses matching criteria
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.courses)
        .where(and(...conditions));

      const count = Number(countResult[0]?.count || 0);

      console.log("Fetching courses for tutor ID:", tutorProfile.id);
      console.log("Found", count, "courses matching criteria");

      // Lấy khóa học với level thay vì course_levels
      const courses = await db.query.courses.findMany({
        where: and(...conditions),
        with: {
          subject: true,
          level: true, // Sửa lại ở đây: thay course_levels bằng level
        },
        orderBy: [desc(schema.courses.updated_at)],
        limit,
        offset,
      });

      // Thêm thông tin đánh giá đơn giản hơn
      const coursesWithStats = await Promise.all(
        courses.map(async (course) => {
          try {
            // Lấy số đánh giá và điểm trung bình
            const reviewStats = await db
              .select({
                average_rating: sql<number>`COALESCE(AVG(${schema.reviews.rating}), 0)`,
                review_count: sql<number>`COUNT(${schema.reviews.id})`,
              })
              .from(schema.reviews)
              .where(eq(schema.reviews.course_id, course.id));

            return {
              ...course,
              average_rating: Number(reviewStats[0]?.average_rating || 0),
              review_count: Number(reviewStats[0]?.review_count || 0),
            };
          } catch (err) {
            console.error("Error calculating stats for course", course.id, err);
            return {
              ...course,
              average_rating: 0,
              review_count: 0,
            };
          }
        })
      );

      return res.status(200).json({
        success: true,
        count: Number(count),
        total_pages: Math.ceil(Number(count) / limit),
        current_page: page,
        courses: coursesWithStats,
      });
    } catch (queryError) {
      console.error("Database query error:", queryError);
      return res.status(500).json({
        success: false,
        message: "Lỗi truy vấn cơ sở dữ liệu khi lấy danh sách khóa học",
        error:
          queryError instanceof Error ? queryError.message : String(queryError),
      });
    }
  } catch (error) {
    console.error("Get tutor courses error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách khóa học",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * @desc    Lấy danh sách khóa học của một gia sư theo ID
 * @route   GET /api/v1/tutors/:id/courses
 * @access  Public
 */
export const getTutorCourses = async (req: Request, res: Response) => {
  try {
    console.log(
      `Processing request to get courses for tutor ID: ${req.params.id}`
    );
    const tutorId = parseInt(req.params.id);

    if (isNaN(tutorId)) {
      console.log(`Invalid tutor ID: ${req.params.id}`);
      return res.status(200).json({
        success: true,
        message: "ID không hợp lệ, phải là số nguyên",
        courses: [],
        count: 0,
        current_page: 1,
        total_pages: 0,
      });
    }

    // Kiểm tra xem gia sư có tồn tại và đã được xác minh chưa
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.id, tutorId),
    });

    if (!tutorProfile) {
      console.log(`Tutor not found with ID: ${tutorId}`);
      return res.status(200).json({
        success: true,
        message: "Không tìm thấy gia sư",
        courses: [],
        count: 0,
        current_page: 1,
        total_pages: 0,
      });
    }

    // Tham số phân trang
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Chỉ lấy các khóa học đang hoạt động (active)
    const conditions = [
      eq(schema.courses.tutor_id, tutorId),
      eq(schema.courses.status, "active"),
    ];

    // Đếm tổng số khóa học
    const countResult = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(schema.courses)
      .where(and(...conditions));

    const courseCount =
      countResult.length > 0 ? Number(countResult[0].count) : 0;

    // Lấy khóa học với thông tin môn học và mức độ
    const courses = await db.query.courses.findMany({
      where: and(...conditions),
      with: {
        subject: true,
        course_levels: {
          with: {
            level: true,
          },
        },
      },
      orderBy: [desc(schema.courses.created_at)],
      limit,
      offset,
    });

    // Nếu không có khóa học, trả về ngay
    if (!courses || courses.length === 0) {
      console.log(`No courses found for tutor ${tutorId}`);
      return res.status(200).json({
        success: true,
        count: 0,
        total_pages: 0,
        current_page: page,
        courses: [],
      });
    }

    // Thêm thông tin về số lượng học sinh và đánh giá cho mỗi khóa học
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        try {
          // Đếm số học sinh đã đăng ký khóa học (sử dụng bookingRequests thay vì bookings)
          const studentCountResult = await db
            .select({
              studentCount: sql<number>`count(DISTINCT ${schema.bookingRequests.student_id})`,
            })
            .from(schema.bookingRequests)
            .where(eq(schema.bookingRequests.course_id, course.id));

          const studentCount =
            studentCountResult.length > 0
              ? Number(studentCountResult[0].studentCount)
              : 0;

          // Lấy điểm đánh giá trung bình
          const reviewResult = await db
            .select({
              averageRating: sql<number>`AVG(${schema.reviews.rating})`,
              reviewCount: sql<number>`count(*)`,
            })
            .from(schema.reviews)
            .where(eq(schema.reviews.course_id, course.id));

          const averageRating =
            reviewResult.length > 0 ? Number(reviewResult[0].averageRating) : 0;
          const reviewCount =
            reviewResult.length > 0 ? Number(reviewResult[0].reviewCount) : 0;

          // Courses đã chứa thông tin level (từ relationship trong query)
          let courseWithProcessedLevel = { ...course };

          return {
            ...courseWithProcessedLevel,
            student_count: studentCount,
            average_rating: averageRating,
            review_count: reviewCount,
          };
        } catch (courseError) {
          console.error(`Error processing course ${course.id}:`, courseError);
          // Return course without additional stats if there's an error
          return course;
        }
      })
    );

    console.log(
      `Returning ${coursesWithStats.length} courses for tutor ${tutorId}`
    );

    // Return data with consistent format
    return res.status(200).json({
      success: true,
      count: courseCount,
      total_pages: Math.ceil(courseCount / limit),
      current_page: page,
      courses: coursesWithStats,
    });
  } catch (error) {
    console.error("Get tutor courses error:", error);
    // Trả về thành công với danh sách rỗng thay vì lỗi 500
    return res.status(200).json({
      success: true,
      message: "Không thể tải khóa học do lỗi máy chủ",
      count: 0,
      total_pages: 0,
      current_page: 1,
      courses: [],
    });
  }
};

// Get teaching requests
export const getTeachingRequests = async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "10");
    const offset = (page - 1) * limit;
    const status = (req.query.status as string) || "pending"; // pending, approved, rejected

    const requests = await db.query.teachingRequests.findMany({
      where: eq(schema.teachingRequests.status, status),
      with: {
        tutor: {
          with: {
            user: {
              columns: {
                id: true,
                first_name: true,
                last_name: true,
                avatar: true,
                email: true,
              },
            },
          },
        },
        subject: true,
        level: true,
      },
      orderBy: desc(schema.teachingRequests.created_at),
      limit,
      offset,
    });

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.teachingRequests)
      .where(eq(schema.teachingRequests.status, status));
    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Format dữ liệu đúng cấu trúc frontend mong muốn
    const formattedRequests = requests.map((request) => ({
      id: request.id,
      subject: request.subject,
      level: request.level,
      tutor_profile: {
        id: request.tutor.id,
        bio: request.tutor.bio,
        date_of_birth: request.tutor.user.date_of_birth,
        address: request.tutor.user.address,
        user: {
          id: request.tutor.user.id,
          first_name: request.tutor.user.first_name,
          last_name: request.tutor.user.last_name,
          email: request.tutor.user.email,
          phone: request.tutor.user.phone,
          avatar: request.tutor.user.avatar,
        },
      },
      introduction: request.introduction,
      experience: request.experience,
      certifications: request.certifications,
      status: request.status,
      approved_by: request.approved_by,
      rejection_reason: request.rejection_reason,
      created_at: request.created_at,
    }));

    return res.status(200).json({
      requests: formattedRequests,
      total,
      total_pages: totalPages,
      current_page: page,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu cầu đăng ký dạy học:", error);
    return res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

/**
 * @desc    Lấy danh sách yêu cầu dạy học đang chờ duyệt
 * @route   GET /api/v1/admin/teaching-requests/pending
 * @access  Private (Admin only)
 */
export const getPendingTeachingRequests = async (req: Request, res: Response) => {
  try {
    // Truy vấn danh sách teaching_requests với trạng thái pending
    const pendingRequests = await db.query.teachingRequests.findMany({
      where: eq(schema.teachingRequests.status, "pending"),
      with: {
        tutor: {
          with: {
            user: true
          }
        },
        subject: true,
        level: true
      },
      orderBy: (requests, { desc }) => [desc(requests.created_at)],
    });

    // Chuyển đổi dữ liệu để phù hợp với cấu trúc mà frontend mong đợi
    const formattedRequests = pendingRequests.map(request => ({
      id: request.id,
      subject: request.subject,
      level: request.level,
      tutor_profile: {
        id: request.tutor.id,
        bio: request.tutor.bio,
        date_of_birth: request.tutor.availability, // Sử dụng trường availability để lưu trữ ngày sinh
        address: request.tutor.availability, // Sử dụng trường availability để lưu trữ địa chỉ
        user: {
          id: request.tutor.user.id,
          first_name: request.tutor.user.first_name,
          last_name: request.tutor.user.last_name,
          email: request.tutor.user.email,
          phone: request.tutor.user.phone,
          avatar: request.tutor.user.avatar
        }
      },
      introduction: request.introduction,
      experience: request.experience,
      certifications: request.certifications,
      status: request.status,
      created_at: request.created_at
    }));

    return res.status(200).json(formattedRequests);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu cầu dạy học đang chờ duyệt:", error);
    return res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

/**
 * @desc    Phê duyệt yêu cầu đăng ký dạy học
 * @route   PATCH /api/v1/admin/teaching-requests/:id/approve
 * @access  Private (Admin only)
 */
export const approveTeachingRequest = async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: "Không được phép" });
    }

    if (isNaN(requestId)) {
      return res.status(400).json({ message: "ID yêu cầu không hợp lệ" });
    }

    // Kiểm tra yêu cầu có tồn tại không
    const request = await db.query.teachingRequests.findFirst({
      where: eq(schema.teachingRequests.id, requestId),
    });

    if (!request) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
    }

    // Cập nhật trạng thái yêu cầu thành đã phê duyệt
    await db.update(schema.teachingRequests).set({
      status: "approved",
      approved_by: adminId,
      updated_at: new Date(),
    }).where(eq(schema.teachingRequests.id, requestId));

    // Thêm subject vào tutorSubjects nếu chưa có
    const existingSubject = await db.query.tutorSubjects.findFirst({
      where: and(
        eq(schema.tutorSubjects.tutor_id, request.tutor_id),
        eq(schema.tutorSubjects.subject_id, request.subject_id)
      ),
    });

    if (!existingSubject) {
      await db.insert(schema.tutorSubjects).values({
        tutor_id: request.tutor_id,
        subject_id: request.subject_id,
        created_at: new Date(),
      });
    }

    // Thêm level vào tutorEducationLevels nếu chưa có
    const existingLevel = await db.query.tutorEducationLevels.findFirst({
      where: and(
        eq(schema.tutorEducationLevels.tutor_id, request.tutor_id),
        eq(schema.tutorEducationLevels.level_id, request.level_id)
      ),
    });

    if (!existingLevel) {
      await db.insert(schema.tutorEducationLevels).values({
        tutor_id: request.tutor_id,
        level_id: request.level_id,
        created_at: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      message: "Yêu cầu đăng ký dạy học đã được phê duyệt thành công"
    });
  } catch (error) {
    console.error("Lỗi phê duyệt yêu cầu đăng ký dạy học:", error);
    return res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

/**
 * @desc    Từ chối yêu cầu đăng ký dạy học
 * @route   PATCH /api/v1/admin/teaching-requests/:id/reject
 * @access  Private (Admin only)
 */
export const rejectTeachingRequest = async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    const adminId = req.user?.id;
    const { rejection_reason } = req.body;

    if (!adminId) {
      return res.status(401).json({ message: "Không được phép" });
    }

    if (isNaN(requestId)) {
      return res.status(400).json({ message: "ID yêu cầu không hợp lệ" });
    }

    if (!rejection_reason) {
      return res.status(400).json({ message: "Lý do từ chối là bắt buộc" });
    }

    // Kiểm tra yêu cầu có tồn tại không
    const request = await db.query.teachingRequests.findFirst({
      where: eq(schema.teachingRequests.id, requestId),
    });

    if (!request) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
    }

    // Cập nhật trạng thái yêu cầu thành đã từ chối
    await db.update(schema.teachingRequests).set({
      status: "rejected",
      rejection_reason: rejection_reason,
      approved_by: adminId, // Lưu thông tin người từ chối
      updated_at: new Date(),
    }).where(eq(schema.teachingRequests.id, requestId));

    return res.status(200).json({
      success: true,
      message: "Yêu cầu đăng ký dạy học đã bị từ chối"
    });
  } catch (error) {
    console.error("Lỗi từ chối yêu cầu đăng ký dạy học:", error);
    return res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

/**
 * @desc    Lấy danh sách yêu cầu đăng ký dạy học của gia sư đăng nhập
 * @route   GET /api/v1/tutors/teaching-requests
 * @access  Private (Tutor only)
 */
export const getOwnTeachingRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Không được phép, vui lòng đăng nhập"
      });
    }

    // Tìm tutor profile của người đăng nhập
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId),
    });

    if (!tutorProfile) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ gia sư của bạn"
      });
    }

    // Tham số phân trang
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "10");
    const offset = (page - 1) * limit;
    const status = (req.query.status as string) || undefined; // undefined để lấy tất cả trạng thái

    // Xây dựng điều kiện lọc
    let conditions = [eq(schema.teachingRequests.tutor_id, tutorProfile.id)];

    if (status && ["pending", "approved", "rejected"].includes(status)) {
      conditions.push(eq(schema.teachingRequests.status, status));
    }

    // Lấy danh sách yêu cầu
    const requests = await db.query.teachingRequests.findMany({
      where: and(...conditions),
      with: {
        subject: true,
        level: true,
        approvedBy: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: [
        desc(schema.teachingRequests.created_at)
      ],
      limit,
      offset,
    });

    // Đếm tổng số yêu cầu
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.teachingRequests)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Format lại dữ liệu trả về
    const formattedRequests = requests.map(request => ({
      id: request.id,
      subject: request.subject,
      level: request.level,
      introduction: request.introduction,
      experience: request.experience,
      certifications: request.certifications,
      status: request.status,
      rejection_reason: request.rejection_reason,
      created_at: request.created_at,
      updated_at: request.updated_at,
      approved_by: request.approvedBy ? {
        id: request.approvedBy.id,
        name: `${request.approvedBy.first_name} ${request.approvedBy.last_name}`,
        email: request.approvedBy.email
      } : null
    }));

    return res.status(200).json({
      success: true,
      requests: formattedRequests,
      total,
      total_pages: totalPages,
      current_page: page,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách yêu cầu đăng ký dạy học của gia sư:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ"
    });
  }
};

/**
 * @desc    Xử lý yêu cầu giảng dạy mới từ gia sư
 * @route   POST /api/v1/tutors/teaching-requests
 * @access  Private (Tutor only)
 */
export const handleTeachingRequest = async (req: Request, res: Response) => {
  try {
    // Lấy thông tin từ JWT token
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập để thực hiện hành động này" });
    }

    // Validate dữ liệu từ frontend
    const validationResult = schema.teachingRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      const errorMessage = fromZodError(validationResult.error).message;
      return res.status(400).json({ message: errorMessage });
    }

    // Lấy dữ liệu đã validate
    const { subject_id, level_id, introduction, experience, certifications } = validationResult.data;

    // Lấy thông tin profile của gia sư
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId)
    });

    if (!tutorProfile) {
      return res.status(404).json({ message: "Không tìm thấy hồ sơ gia sư của bạn" });
    }

    // Kiểm tra xem đã có yêu cầu đang chờ duyệt với môn học và cấp độ này chưa
    const existingRequest = await db.query.teachingRequests.findFirst({
      where: and(
        eq(schema.teachingRequests.tutor_id, tutorProfile.id),
        eq(schema.teachingRequests.subject_id, subject_id),
        eq(schema.teachingRequests.level_id, level_id),
        eq(schema.teachingRequests.status, "pending")
      )
    });

    if (existingRequest) {
      return res.status(400).json({
        message: "Bạn đã có yêu cầu giảng dạy đang chờ duyệt cho môn học và cấp độ này"
      });
    }

    // Tạo yêu cầu giảng dạy mới
    const newRequest = await db.insert(schema.teachingRequests).values({
      tutor_id: tutorProfile.id,
      subject_id,
      level_id,
      introduction,
      experience: experience || null,
      certifications: certifications || null,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date()
    }).returning();

    return res.status(201).json({
      success: true,
      message: "Yêu cầu giảng dạy của bạn đã được gửi và đang chờ duyệt",
      data: newRequest[0]
    });
  } catch (error) {
    console.error("Lỗi khi xử lý yêu cầu giảng dạy:", error);
    return res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
