import { Router } from "express";
import * as userController from "../controllers/authController";
import { authMiddleware } from "../middlewares/authMiddleware";
import uploadService from "../services/uploadService";
import { validateBody } from "../middlewares/validationMiddleware";
import * as schema from "@shared/schema";

const router = Router();

// Cập nhật thông tin cá nhân
router.patch(
  "/profile",
  authMiddleware,
  validateBody(schema.updateProfileSchema),
  userController.updateProfile
);

// Tải lên avatar
router.post(
  "/avatar",
  authMiddleware,
  uploadService.uploadAvatar,
  userController.updateAvatar
);

export default router;
