import { Router } from "express";
import * as adminController from "../controllers/adminController";
import * as tutorController from "../controllers/tutorController";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware";
import { validateParams } from "../middlewares/validationMiddleware";
import * as schema from "@shared/schema";
import { z } from "zod";
import { getBookingsVolume, getCoursesBySubject } from "../controllers/adminSummaryController";

const router = Router();

// Lấy danh sách người dùng
router.get(
  "/users",
  authMiddleware,
  roleMiddleware(["admin"]),
  adminController.getUsers
);

// Lấy chi tiết người dùng theo ID
router.get(
  "/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateParams(schema.idSchema),
  adminController.getUserById
);

// Khóa tài khoản người dùng
router.patch(
  "/users/:id/deactivate",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateParams(schema.idSchema),
  adminController.deactivateUser
);

// Mở khóa tài khoản người dùng
router.patch(
  "/users/:id/activate",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateParams(schema.idSchema),
  adminController.activateUser
);

// Lấy danh sách xác minh gia sư (DEPRECATED - sử dụng /teaching-requests/pending thay thế)
// router.get(
//   "/tutors/verification",
//   authMiddleware,
//   roleMiddleware(["admin"]),
//   tutorController.getTutorVerifications
// );

// Lấy danh sách booking của một user
router.get(
  "/users/:userId/bookings",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateParams(z.object({
    userId: schema.idSchema.shape.id,
  })),
  adminController.getUserBookings
);

// Lấy danh sách tất cả gia sư
router.get(
  "/tutors",
  authMiddleware,
  roleMiddleware(["admin"]),
  adminController.getTutors
);

// Lấy chi tiết gia sư theo ID
router.get(
  "/tutors/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateParams(schema.idSchema),
  adminController.getTutorById
);

// DEPRECATED: Phê duyệt gia sư trực tiếp (sử dụng /teaching-requests/:id/approve thay thế)
// router.patch(
//   "/tutors/:id/approve",
//   authMiddleware,
//   roleMiddleware(["admin"]),
//   validateParams(schema.idSchema),
//   tutorController.approveTutor
// );

// DEPRECATED: Từ chối gia sư trực tiếp (sử dụng /teaching-requests/:id/reject thay thế)
// router.patch(
//   "/tutors/:id/reject",
//   authMiddleware,
//   roleMiddleware(["admin"]),
//   validateParams(schema.idSchema),
//   tutorController.rejectTutor
// );

// Lấy tất cả danh sách yêu cầu đăng ký dạy học
router.get(
  "/teaching-requests",
  authMiddleware,
  roleMiddleware(["admin"]),
  tutorController.getTeachingRequests
);

// Lấy danh sách yêu cầu đăng ký dạy học đang chờ duyệt
router.get(
  "/teaching-requests/pending",
  authMiddleware,
  roleMiddleware(["admin"]),
  tutorController.getPendingTeachingRequests
);

// Phê duyệt yêu cầu đăng ký dạy học
router.patch(
  "/teaching-requests/:id/approve",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateParams(schema.idSchema),
  tutorController.approveTeachingRequest
);

// Từ chối yêu cầu đăng ký dạy học
router.patch(
  "/teaching-requests/:id/reject",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateParams(schema.idSchema),
  tutorController.rejectTeachingRequest
);

// Lấy thống kê admin
router.get(
  "/stats",
  authMiddleware,
  roleMiddleware(["admin"]),
  adminController.getAdminStats
);

// Endpoint cho thống kê khối lượng đặt chỗ
router.get(
  "/statistics/bookings-volume",
  authMiddleware,
  roleMiddleware(["admin"]),
  getBookingsVolume
);

// Endpoint cho thống kê khóa học theo môn học
router.get(
  "/statistics/courses-by-subject",
  authMiddleware,
  roleMiddleware(["admin"]),
  getCoursesBySubject
);

export default router;
