import { Router } from "express";
import * as scheduleController from "../controllers/scheduleController";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware";
import { validateBody } from "../middlewares/validationMiddleware";
import * as schema from "@shared/schema";
import { createScheduleSchema } from "@shared/schema";
import { validateSchedule } from "../middlewares/validationMiddleware";

const router = Router();

// Tạo lịch trình mới
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["tutor"]),
  validateBody(createScheduleSchema),
  scheduleController.createSchedule
);

// Lấy lịch trình của gia sư
router.get(
  "/tutor",
  authMiddleware,
  roleMiddleware(["tutor"]),
  scheduleController.getTutorSchedules
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["tutor"]),
  scheduleController.cancelSchedule
);
router.delete(
  "/:id/permanent",
  authMiddleware,
  roleMiddleware(["tutor"]),
  scheduleController.deleteSchedule
);

// Lấy lịch trống của gia sư theo ID (public, không cần xác thực)
router.get("/:tutorId", scheduleController.getAvailableTutorSchedulesByTutorId);

export default router;
