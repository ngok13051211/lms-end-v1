import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { and, eq } from "drizzle-orm";

/**
 * @desc    Get a student's favorite tutors
 * @route   GET /api/v1/students/favorite-tutors
 * @access  Private (Student only)
 */
export const getFavoriteTutors = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Get favorite tutors
        const favorites = await db.query.favoriteTutors.findMany({
            where: eq(schema.favoriteTutors.student_id, userId),
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
                        tutorSubjects: {
                            with: {
                                subject: true,
                            },
                            limit: 3,
                        },
                    },
                },
            },
        });

        // Format response
        const formattedFavorites = favorites.map((fav) => ({
            id: fav.id,
            tutor_id: fav.tutor_id,
            tutor: {
                id: fav.tutor.id,
                rating: fav.tutor.rating,
                bio: fav.tutor.bio,
                user: {
                    id: fav.tutor.user.id,
                    name: `${fav.tutor.user.first_name} ${fav.tutor.user.last_name}`,
                    avatar: fav.tutor.user.avatar,
                },
                subjects: fav.tutor.tutorSubjects.map((ts) => ts.subject),
            },
            created_at: fav.created_at,
        }));

        return res.status(200).json(formattedFavorites);
    } catch (error) {
        console.error("Get favorite tutors error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Check if a tutor is in student's favorites
 * @route   GET /api/v1/students/favorite-tutors/check/:id
 * @access  Private (Student only)
 */
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

        // Check if tutor exists in favorites
        const favorite = await db.query.favoriteTutors.findFirst({
            where: and(
                eq(schema.favoriteTutors.student_id, userId),
                eq(schema.favoriteTutors.tutor_id, tutorId)
            ),
        });

        return res.status(200).json({
            isFavorite: !!favorite,
        });
    } catch (error) {
        console.error("Check favorite tutor error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Add a tutor to favorites
 * @route   POST /api/v1/students/favorite-tutors/:id
 * @access  Private (Student only)
 */
export const addFavoriteTutor = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const tutorId = parseInt(req.params.id);

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (isNaN(tutorId)) {
            return res.status(400).json({ message: "Invalid tutor ID" });
        }    // Check if tutor exists
        const tutor = await db.query.tutorProfiles.findFirst({
            where: eq(schema.tutorProfiles.id, tutorId),
        });

        if (!tutor) {
            return res.status(404).json({ message: "Tutor not found" });
        }

        // Check if already in favorites
        const existingFavorite = await db.query.favoriteTutors.findFirst({
            where: and(
                eq(schema.favoriteTutors.student_id, userId),
                eq(schema.favoriteTutors.tutor_id, tutorId)
            ),
        });

        if (existingFavorite) {
            return res.status(400).json({ message: "Tutor already in favorites" });
        }

        // Add to favorites
        const [favorite] = await db
            .insert(schema.favoriteTutors)
            .values({
                student_id: userId,
                tutor_id: tutorId,
                created_at: new Date(),
            })
            .returning();

        return res.status(201).json({
            message: "Tutor added to favorites",
            favorite,
        });
    } catch (error) {
        console.error("Add favorite tutor error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Remove a tutor from favorites
 * @route   DELETE /api/v1/students/favorite-tutors/:id
 * @access  Private (Student only)
 */
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

        // Check if exists in favorites
        const favorite = await db.query.favoriteTutors.findFirst({
            where: and(
                eq(schema.favoriteTutors.student_id, userId),
                eq(schema.favoriteTutors.tutor_id, tutorId)
            ),
        });

        if (!favorite) {
            return res.status(404).json({ message: "Tutor not in favorites" });
        }

        // Remove from favorites
        await db
            .delete(schema.favoriteTutors)
            .where(
                and(
                    eq(schema.favoriteTutors.student_id, userId),
                    eq(schema.favoriteTutors.tutor_id, tutorId)
                )
            );

        return res.status(200).json({
            message: "Tutor removed from favorites",
        });
    } catch (error) {
        console.error("Remove favorite tutor error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
