import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
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
      where: eq(schema.tutorProfiles.userId, userId)
    });
    
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // Validate ad data
    const adData = schema.adInsertSchema.parse({
      ...req.body,
      tutorId: tutorProfile.id
    });
    
    // Create ad
    const [ad] = await db.insert(schema.ads)
      .values({
        tutorId: tutorProfile.id,
        title: adData.title,
        description: adData.description,
        subjectId: adData.subjectId !== undefined ? parseInt(adData.subjectId as string) : undefined,
        levelId: adData.levelId !== undefined ? parseInt(adData.levelId as string) : undefined,
        hourlyRate: adData.hourlyRate,
        teachingMode: adData.teachingMode,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
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
      where: eq(schema.tutorProfiles.userId, userId)
    });
    
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // Get ads for tutor
    const ads = await db.query.ads.findMany({
      where: eq(schema.ads.tutorId, tutorProfile.id),
      with: {
        subject: true,
        level: true
      },
      orderBy: schema.ads.createdAt
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
        eq(schema.ads.tutorId, tutorId),
        eq(schema.ads.status, "active")
      ),
      with: {
        subject: true,
        level: true
      },
      orderBy: schema.ads.createdAt
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
      where: eq(schema.tutorProfiles.userId, userId)
    });
    
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // Check if ad exists and belongs to the tutor
    const existingAd = await db.query.ads.findFirst({
      where: and(
        eq(schema.ads.id, adId),
        eq(schema.ads.tutorId, tutorProfile.id)
      )
    });
    
    if (!existingAd) {
      return res.status(404).json({ message: "Ad not found or does not belong to you" });
    }
    
    // Validate ad data
    const adData = schema.adInsertSchema.partial().parse({
      ...req.body,
      tutorId: tutorProfile.id
    });
    
    // Update ad
    const [updatedAd] = await db.update(schema.ads)
      .set({
        title: adData.title !== undefined ? adData.title : existingAd.title,
        description: adData.description !== undefined ? adData.description : existingAd.description,
        subjectId: adData.subjectId !== undefined ? parseInt(adData.subjectId as string) : existingAd.subjectId,
        levelId: adData.levelId !== undefined ? parseInt(adData.levelId as string) : existingAd.levelId,
        hourlyRate: adData.hourlyRate !== undefined ? adData.hourlyRate : existingAd.hourlyRate,
        teachingMode: adData.teachingMode !== undefined ? adData.teachingMode : existingAd.teachingMode,
        status: adData.status !== undefined ? adData.status : existingAd.status,
        updatedAt: new Date()
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
      where: eq(schema.tutorProfiles.userId, userId)
    });
    
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }
    
    // Check if ad exists and belongs to the tutor
    const existingAd = await db.query.ads.findFirst({
      where: and(
        eq(schema.ads.id, adId),
        eq(schema.ads.tutorId, tutorProfile.id)
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
