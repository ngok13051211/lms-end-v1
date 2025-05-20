import express from "express";
import {
    getTotalUsers,
    getActiveTutors,
    getTotalCourses,
    getTotalBookings,
    getDashboardOverview,
    getRecentActivities,
    getUserGrowthByMonth,
    getUserGrowthLatest12Months,
    getBookingsVolume,
    getCoursesBySubject
} from "../controllers/adminSummaryController";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

// Comment tạm thời để test API
// Apply authentication and admin authorization middleware to all routes
// router.use(authMiddleware, roleMiddleware(["admin"]));

// Individual statistic endpoints
router.get("/total-users", getTotalUsers);
router.get("/active-tutors", getActiveTutors);
router.get("/total-courses", getTotalCourses);
router.get("/total-bookings", getTotalBookings);

// Combined dashboard overview endpoint
router.get("/overview", getDashboardOverview);

// Recent activities endpoint
router.get("/recent-activities", getRecentActivities);

// User growth statistics by month endpoint
router.get("/statistics/user-growth", getUserGrowthByMonth);

// User growth statistics for latest 12 months endpoint
router.get("/statistics/user-growth-latest-12-months", getUserGrowthLatest12Months);

// Booking volume statistics endpoint
router.get("/statistics/bookings-volume", getBookingsVolume);

// Courses by subject statistics endpoint
router.get("/statistics/courses-by-subject", getCoursesBySubject);

export default router;
