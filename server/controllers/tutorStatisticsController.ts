import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Get tutor revenue statistics
 * @route GET /api/v1/tutors/statistics/revenue
 * @description Returns revenue statistics for the authenticated tutor
 * @query type - Time period type: "day", "month", "year"
 * @query month - Specific month (1-12) for filtering
 * @query year - Specific year for filtering  
 * @query fromDate - Start date for filtering (YYYY-MM-DD)
 * @query toDate - End date for filtering (YYYY-MM-DD)
 */
export const getTutorRevenueStats = async (req: Request, res: Response) => {
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

        // Extract query parameters
        const {
            type = "month",
            month,
            year: yearParam,
            fromDate,
            toDate,
        } = req.query;
        const currentDate = new Date();
        const year = yearParam
            ? parseInt(yearParam as string, 10)
            : currentDate.getFullYear();

        let result;

        // Different queries based on type parameter
        switch (type) {
            case "day":
                // Filter by date range if fromDate and toDate are provided
                if (fromDate && toDate) {
                    result = await db.execute(
                        sql`
              SELECT 
                TO_CHAR(created_at, 'YYYY-MM-DD') as period,
                COALESCE(SUM(total_amount), 0) as revenue
              FROM booking_requests
              WHERE 
                status = 'completed' AND
                tutor_id = ${tutorProfile.id} AND
                created_at::date BETWEEN ${fromDate}::date AND ${toDate}::date
              GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
              ORDER BY period ASC
            `
                    );
                } else if (fromDate) {
                    // If only fromDate is provided
                    result = await db.execute(
                        sql`
              SELECT 
                TO_CHAR(created_at, 'YYYY-MM-DD') as period,
                COALESCE(SUM(total_amount), 0) as revenue
              FROM booking_requests
              WHERE 
                status = 'completed' AND
                tutor_id = ${tutorProfile.id} AND
                created_at::date >= ${fromDate}::date
              GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
              ORDER BY period ASC
            `
                    );
                } else {
                    // Default: last 30 days
                    result = await db.execute(
                        sql`
              SELECT 
                TO_CHAR(created_at, 'YYYY-MM-DD') as period,
                COALESCE(SUM(total_amount), 0) as revenue
              FROM booking_requests
              WHERE 
                status = 'completed' AND
                tutor_id = ${tutorProfile.id} AND
                created_at::date >= NOW() - INTERVAL '30 days'
              GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
              ORDER BY period ASC
            `
                    );
                }
                break;

            case "week":
                // Group by week number for the specified year
                result = await db.execute(
                    sql`
            SELECT 
              TO_CHAR(created_at, 'IYYY-IW') as period,
              COALESCE(SUM(total_amount), 0) as revenue
            FROM booking_requests
            WHERE 
              status = 'completed' AND
              tutor_id = ${tutorProfile.id} AND
              EXTRACT(YEAR FROM created_at) = ${year}
            GROUP BY TO_CHAR(created_at, 'IYYY-IW')
            ORDER BY period ASC
          `
                );
                break;

            case "month":
                // If month is specified, group by day within that month
                if (month) {
                    const monthNum = parseInt(month as string, 10);
                    if (monthNum < 1 || monthNum > 12) {
                        return res
                            .status(400)
                            .json({ error: "Month parameter must be between 1 and 12" });
                    }

                    result = await db.execute(
                        sql`
              SELECT 
                TO_CHAR(created_at, 'YYYY-MM-DD') as period,
                COALESCE(SUM(total_amount), 0) as revenue
              FROM booking_requests
              WHERE 
                status = 'completed' AND
                tutor_id = ${tutorProfile.id} AND
                EXTRACT(YEAR FROM created_at) = ${year} AND
                EXTRACT(MONTH FROM created_at) = ${monthNum}
              GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
              ORDER BY period ASC
            `
                    );
                } else {
                    // If no month specified, return all months for the year
                    result = await db.execute(
                        sql`
              SELECT 
                TO_CHAR(created_at, 'YYYY-MM') as period,
                COALESCE(SUM(total_amount), 0) as revenue
              FROM booking_requests
              WHERE 
                status = 'completed' AND
                tutor_id = ${tutorProfile.id} AND
                EXTRACT(YEAR FROM created_at) = ${year}
              GROUP BY TO_CHAR(created_at, 'YYYY-MM')
              ORDER BY period ASC
            `
                    );
                }
                break;

            case "year":
                // Group by month for the specified year
                result = await db.execute(
                    sql`
            SELECT 
              TO_CHAR(created_at, 'YYYY-MM') as period,
              COALESCE(SUM(total_amount), 0) as revenue
            FROM booking_requests
            WHERE 
              status = 'completed' AND
              tutor_id = ${tutorProfile.id} AND
              EXTRACT(YEAR FROM created_at) = ${year}
            GROUP BY TO_CHAR(created_at, 'YYYY-MM')
            ORDER BY period ASC
          `
                );
                break;

            default:
                return res.status(400).json({
                    error:
                        "Invalid type parameter. Use 'day', 'week', 'month', or 'year'",
                });
        }

        // Transform the data: extract rows and convert revenue to number
        const revenueData = result.rows.map((item: Record<string, unknown>) => ({
            period: String(item.period || ""),
            revenue: parseFloat(String(item.revenue || "0")),
        }));

        console.log("Tutor revenue statistics processed:", revenueData);

        // Return revenue data as an array
        return res.json(revenueData);
    } catch (error) {
        console.error("Error getting tutor revenue statistics:", error);
        return res.status(500).json({ error: "Failed to get revenue statistics" });
    }
};
