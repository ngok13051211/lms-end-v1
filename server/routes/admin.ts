import { Router } from "express";
import * as adminController from "../controllers/adminController";
import * as tutorController from "../controllers/tutorController";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware";
import { validateParams } from "../middlewares/validationMiddleware";
import * as schema from "@shared/schema";

const router = Router();

// Lấy danh sách người dùng
router.get(
  "/users",
  authMiddleware,
  roleMiddleware(["admin"]),
  adminController.getUsers
);

// Lấy danh sách xác minh gia sư
router.get(
  "/tutors/verification",
  authMiddleware,
  roleMiddleware(["admin"]),
  tutorController.getTutorVerifications
);

// Phê duyệt gia sư
router.patch(
  "/tutors/:id/approve",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateParams(schema.idSchema),
  tutorController.approveTutor
);

// Từ chối gia sư
router.patch(
  "/tutors/:id/reject",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateParams(schema.idSchema),
  tutorController.rejectTutor
);

// Lấy thống kê admin
router.get(
  "/stats",
  authMiddleware,
  roleMiddleware(["admin"]),
  adminController.getAdminStats
);

export default router;
