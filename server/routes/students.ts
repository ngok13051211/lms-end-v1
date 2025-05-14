import { Router } from "express";
import * as studentController from "../controllers/tutorController";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware";
import { validateParams } from "../middlewares/validationMiddleware";
import * as schema from "@shared/schema";

const router = Router();

// Lấy danh sách gia sư yêu thích
router.get(
  "/favorite-tutors",
  authMiddleware,
  roleMiddleware(["student"]),
  studentController.getFavoriteTutors
);

// Kiểm tra gia sư có trong danh sách yêu thích không
router.get(
  "/favorite-tutors/check/:id",
  authMiddleware,
  roleMiddleware(["student"]),
  validateParams(schema.idSchema),
  studentController.checkFavoriteTutor
);

// Thêm gia sư vào danh sách yêu thích
router.post(
  "/favorite-tutors/:id",
  authMiddleware,
  roleMiddleware(["student"]),
  validateParams(schema.idSchema),
  studentController.addFavoriteTutor
);

// Xóa gia sư khỏi danh sách yêu thích
router.delete(
  "/favorite-tutors/:id",
  authMiddleware,
  roleMiddleware(["student"]),
  validateParams(schema.idSchema),
  studentController.removeFavoriteTutor
);

export default router;
