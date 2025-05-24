import { Router } from "express";
import * as tutorController from "../controllers/tutorController";

const router = Router();

// Lấy tất cả các môn học
router.get("/", tutorController.getSubjects);

// Lấy môn học theo ID
router.get("/:id", tutorController.getSubjectById);

// Lấy các cấp học phù hợp với môn học
router.get(
  "/:id/education-levels",
  tutorController.getEducationLevelsBySubjectId
);

// Lấy khóa học theo môn học
router.get("/:id/courses", tutorController.getCoursesBySubjectId);

export default router;
