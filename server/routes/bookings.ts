import { Router } from "express";
import * as bookingController from "../controllers/bookingController";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware";
import {
  validateParams,
  validateBody,
} from "../middlewares/validationMiddleware";
import * as schema from "@shared/schema";

const router = Router();

// Tạo booking mới
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["student"]),
  validateBody(schema.bookingSchema),
  bookingController.createBooking
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
  validateBody(schema.bookingStatusSchema),
  bookingController.updateBookingStatus
);

// Thêm ghi chú cho buổi học
router.post(
  "/:id/notes",
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
