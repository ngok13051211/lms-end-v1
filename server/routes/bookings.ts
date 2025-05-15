import { Router } from "express";
import * as bookingController from "../controllers/bookingController";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware";
import {
  validateParams,
  validateBody,
} from "../middlewares/validationMiddleware";
import * as schema from "@shared/schema";

const router = Router();

/**
 * @api {post} /api/v1/bookings/single Create a single booking
 * @apiName CreateSingleBooking
 * @apiGroup Bookings
 * @apiDescription Create a new booking with legacy format (deprecated)
 * @apiPermission student
 */
router.post(
  "/single",
  authMiddleware,
  roleMiddleware(["student"]),
  validateBody(schema.bookingRequestValidationSchema),
  bookingController.createBooking
);

/**
 * @api {post} /api/v1/bookings Create multiple bookings
 * @apiName CreateMultipleBookings
 * @apiGroup Bookings
 * @apiDescription Create multiple bookings at once with dates, times and course/tutor selections
 * @apiPermission student
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["student"]),
  validateBody(schema.bookingSchema),
  bookingController.createMultipleBookings
);

// Lấy chi tiết booking
router.get(
  "/:id",
  authMiddleware,
  validateParams(schema.idSchema),
  bookingController.getBookingById
);

// Cập nhật trạng thái booking
router.patch(
  "/:id/status",
  authMiddleware,
  validateParams(schema.idSchema),
  validateBody(schema.bookingSchema),
  bookingController.updateBookingStatus
);

// Cập nhật trạng thái buổi học cụ thể
router.patch(
  "/sessions/:id/status",
  authMiddleware,
  validateParams(schema.idSchema),
  validateBody(schema.bookingSessionStatusSchema),
  bookingController.updateBookingSessionStatus
);

// Thêm ghi chú cho buổi học
router.post(
  "/sessions/:id/notes",
  authMiddleware,
  validateParams(schema.idSchema),
  validateBody(schema.sessionNotesSchema),
  bookingController.addSessionNotes
);

// Lấy danh sách booking của học sinh
router.get(
  "/student",
  authMiddleware,
  roleMiddleware(["student"]),
  bookingController.getStudentBookings
);

// Lấy danh sách booking của gia sư
router.get(
  "/tutor",
  authMiddleware,
  roleMiddleware(["tutor"]),
  bookingController.getTutorBookings
);

export default router;
