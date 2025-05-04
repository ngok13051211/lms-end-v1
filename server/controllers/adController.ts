import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Create class ad
export const createAd = async (req: Request, res: Response) => {
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
    
    // Validate ad data
    const adData = schema.adInsertSchema.parse({
      ...req.body,
      tutor_id: tutorProfile.id
    });
    
    // Create ad
    const [ad] = await db.insert(schema.ads)
      .values({
        tutor_id: tutorProfile.id,
        title: adData.title,
        description: adData.description,
        subject_id: adData.subject_id !== undefined ? (typeof adData.subject_id === 'string' ? parseInt(adData.subject_id) : adData.subject_id) : undefined,
        level_id: adData.level_id !== undefined ? (typeof adData.level_id === 'string' ? parseInt(adData.level_id) : adData.level_id) : undefined,
        hourly_rate: adData.hourly_rate,
        teaching_mode: adData.teaching_mode,
        status: "active",
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();
    
    // Get the complete ad with related data
    const completeAd = await db.query.ads.findFirst({
      where: eq(schema.ads.id, ad.id),
      with: {
        subject: true,
        level: true
      }
    });
    
    return res.status(201).json({
      message: "Ad created successfully",
      ad: completeAd
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error("Create ad error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get tutor's own ads
export const getOwnAds = async (req: Request, res: Response) => {
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
    
    // Get ads for tutor
    const ads = await db.query.ads.findMany({
      where: eq(schema.ads.tutor_id, tutorProfile.id),
      with: {
        subject: true,
        level: true
      },
      orderBy: schema.ads.created_at
    });
    
    return res.status(200).json(ads);
  } catch (error) {
    console.error("Get own ads error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get ads for a specific tutor
export const getTutorAds = async (req: Request, res: Response) => {
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
    
    // Get active ads for tutor
    const ads = await db.query.ads.findMany({
      where: and(
        eq(schema.ads.tutor_id, tutorId),
        eq(schema.ads.status, "active")
      ),
      with: {
        subject: true,
        level: true
      },
      orderBy: schema.ads.created_at
    });
    
    return res.status(200).json(ads);
  } catch (error) {
    console.error("Get tutor ads error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Update ad
export const updateAd = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const adId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (isNaN(adId)) {
      return res.status(400).json({ message: "Invalid ad ID" });
    }
    
    // Get tutor profile
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId)
    });
    
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // Check if ad exists and belongs to the tutor
    const existingAd = await db.query.ads.findFirst({
      where: and(
        eq(schema.ads.id, adId),
        eq(schema.ads.tutor_id, tutorProfile.id)
      )
    });
    
    if (!existingAd) {
      return res.status(404).json({ message: "Ad not found or does not belong to you" });
    }
    
    // Validate ad data
    const adData = schema.adInsertSchema.partial().parse({
      ...req.body,
      tutor_id: tutorProfile.id
    });
    
    // Update ad
    const [updatedAd] = await db.update(schema.ads)
      .set({
        title: adData.title !== undefined ? adData.title : existingAd.title,
        description: adData.description !== undefined ? adData.description : existingAd.description,
        subject_id: adData.subject_id !== undefined ? (typeof adData.subject_id === 'string' ? parseInt(adData.subject_id) : adData.subject_id) : existingAd.subject_id,
        level_id: adData.level_id !== undefined ? (typeof adData.level_id === 'string' ? parseInt(adData.level_id) : adData.level_id) : existingAd.level_id,
        hourly_rate: adData.hourly_rate !== undefined ? adData.hourly_rate : existingAd.hourly_rate,
        teaching_mode: adData.teaching_mode !== undefined ? adData.teaching_mode : existingAd.teaching_mode,
        status: adData.status !== undefined ? adData.status : existingAd.status,
        updated_at: new Date()
      })
      .where(eq(schema.ads.id, adId))
      .returning();
    
    // Get the complete updated ad with related data
    const completeAd = await db.query.ads.findFirst({
      where: eq(schema.ads.id, updatedAd.id),
      with: {
        subject: true,
        level: true
      }
    });
    
    return res.status(200).json({
      message: "Ad updated successfully",
      ad: completeAd
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error("Update ad error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Delete ad
export const deleteAd = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const adId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (isNaN(adId)) {
      return res.status(400).json({ message: "Invalid ad ID" });
    }
    
    // Get tutor profile
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.user_id, userId)
    });
    
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // Check if ad exists and belongs to the tutor
    const existingAd = await db.query.ads.findFirst({
      where: and(
        eq(schema.ads.id, adId),
        eq(schema.ads.tutor_id, tutorProfile.id)
      )
    });
    
    if (!existingAd) {
      return res.status(404).json({ message: "Ad not found or does not belong to you" });
    }
    
    // Delete ad (or set status to inactive)
    await db.delete(schema.ads)
      .where(eq(schema.ads.id, adId));
    
    return res.status(200).json({
      message: "Ad deleted successfully"
    });
  } catch (error) {
    console.error("Delete ad error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get all active ads for courses page
export const getAllAds = async (req: Request, res: Response) => {
  try {
    // Parse query params for filtering
    const { subject, level, teaching_mode, searchTerm, page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 10;
    const offset = (pageNumber - 1) * pageSize;
    
    // Build conditions array for the where clause
    const conditions = [];
    
    // Always show only active ads
    conditions.push(eq(schema.ads.status, "active"));
    
    // Add filters if they exist and they're not the "all" option
    if (subject && subject !== '' && subject !== 'all_subjects') {
      const subjectId = parseInt(subject as string);
      if (!isNaN(subjectId)) {
        conditions.push(eq(schema.ads.subject_id, subjectId));
      }
    }
    
    if (level && level !== '' && level !== 'all_levels') {
      const levelId = parseInt(level as string);
      if (!isNaN(levelId)) {
        conditions.push(eq(schema.ads.level_id, levelId));
      }
    }
    
    if (teaching_mode && teaching_mode !== '' && teaching_mode !== 'all_modes') {
      conditions.push(eq(schema.ads.teaching_mode, teaching_mode as string));
    }
    
    // If we have only one condition, use it directly
    // If we have multiple conditions, combine them with AND
    const whereCondition = conditions.length === 1 
      ? conditions[0] 
      : and(...conditions);
    
    // Execute query with filters
    const ads = await db.query.ads.findMany({
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
      orderBy: [desc(schema.ads.created_at)]
    });
    
    // Get total count for pagination with the same filters (except pagination)
    const totalAdsCount = await db.query.ads.findMany({
      where: whereCondition
    });
    
    const total = totalAdsCount.length;
    const totalPages = Math.ceil(total / pageSize);
    
    return res.status(200).json({
      ads,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        total_pages: totalPages
      }
    });
  } catch (error) {
    console.error("Get all ads error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};