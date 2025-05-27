import { Router } from "express";
import * as tutorController from "../controllers/tutorController";
import * as tutorStatisticsController from "../controllers/tutorStatisticsController";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware";
import uploadService from "../services/uploadService";
import {
  validateBody,
  validateParams,
} from "../middlewares/validationMiddleware";
import * as schema from "@shared/schema";

const router = Router();

// Lấy danh sách gia sư
router.get("/", tutorController.getTutors);

// Lấy danh sách gia sư nổi bật
router.get("/featured", tutorController.getFeaturedTutors);

// Xử lý yêu cầu dạy học
router.post(
  "/teaching-requests",
  authMiddleware,
  roleMiddleware(["tutor"]),
  tutorController.handleTeachingRequest
);

// Lấy danh sách yêu cầu đăng ký dạy học của bản thân
router.get(
  "/teaching-requests",
  authMiddleware,
  roleMiddleware(["tutor"]),
  tutorController.getOwnTeachingRequests
);

// Lấy các gia sư tương tự
router.get(
  "/similar/:id",
  validateParams(schema.idSchema),
  tutorController.getSimilarTutors
);

// Tạo hồ sơ gia sư
router.post(
  "/profile",
  authMiddleware,
  roleMiddleware(["tutor"]),
  validateBody(schema.tutorProfileSchema),
  tutorController.createTutorProfile
);

// Cập nhật hồ sơ gia sư
router.patch(
  "/profile",
  authMiddleware,
  roleMiddleware(["tutor"]),
  validateBody(schema.tutorProfileSchema),
  tutorController.updateTutorProfile
);

// Lấy hồ sơ gia sư của chính mình
router.get(
  "/profile",
  authMiddleware,
  roleMiddleware(["tutor"]),
  tutorController.getOwnTutorProfile
);

// Tải lên chứng chỉ
router.post(
  "/certifications",
  authMiddleware,
  roleMiddleware(["tutor"]),
  uploadService.uploadDocuments,
  tutorController.uploadCertifications
);

// Lấy thống kê gia sư
router.get(
  "/stats",
  authMiddleware,
  roleMiddleware(["tutor"]),
  tutorController.getTutorStats
);

// Lấy thống kê doanh thu gia sư
router.get(
  "/statistics/revenue",
  authMiddleware,
  roleMiddleware(["tutor"]),
  tutorStatisticsController.getTutorRevenueStats
);

// Lấy khóa học của gia sư đang đăng nhập
router.get(
  "/courses",
  authMiddleware,
  roleMiddleware(["tutor"]),
  tutorController.getOwnCourses
);

// Lấy đánh giá của gia sư
router.get(
  "/:id/reviews",
  validateParams(schema.idSchema),
  tutorController.getTutorReviews
);

// Lấy khóa học của gia sư theo ID
router.get("/:id/courses", validateParams(schema.idSchema), (req, res) => {
  console.log(`Router handling courses request for tutor ID: ${req.params.id}`);
  return tutorController.getTutorCourses(req, res);
});

// Lấy thông tin gia sư theo ID
router.get(
  "/:id",
  validateParams(schema.idSchema),
  tutorController.getTutorById
);

export default router;
