import { Router } from "express";
import * as courseController from "../controllers/courseController";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware";
import {
  validateBody,
  validateParams,
} from "../middlewares/validationMiddleware";
import * as schema from "@shared/schema";

const router = Router();

// Tạo khóa học mới
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["tutor"]),
  validateBody(schema.courseSchema),
  courseController.createCourse
);

router.get(
  "/courses",
  authMiddleware,
  roleMiddleware(["tutor"]),
  courseController.getOwnCourses
);

// Get a specific course by ID (public endpoint)
router.get(
  "/:id",
  validateParams(schema.idSchema),
  courseController.getCourseById
);

// Cập nhật khóa học
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(["tutor"]),
  validateParams(schema.idSchema),
  validateBody(schema.courseUpdateSchema),
  courseController.updateCourse
);

// Xóa khóa học
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["tutor"]),
  validateParams(schema.idSchema),
  courseController.deleteCourse
);

export default router;
