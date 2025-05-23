import { Router } from "express";
import * as authController from "../controllers/authController";
import { validateBody } from "../middlewares/validationMiddleware";
import * as schema from "@shared/schema";

import { authMiddleware } from "../middlewares/authMiddleware";
import { z } from "zod";

const router = Router();

// Schema for OTP verification
const verifyOtpSchema = z.object({
  email: z.string().email("Địa chỉ email không hợp lệ"),
  otp: z.string().length(6, "Mã OTP phải gồm 6 chữ số"),
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Đăng ký người dùng mới
 *     tags: [Auth]
 */
router.post(
  "/register",
  validateBody(schema.registerSchema),
  authController.register
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [Auth]
 */
router.post(
  "/login",
  validateBody(schema.loginSchema),
  authController.login
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Đăng xuất
 *     tags: [Auth]
 */
router.post("/logout", authController.logout);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Xác minh mã OTP và cập nhật trạng thái xác thực người dùng
 *     tags: [Auth]
 */
router.post(
  "/verify-otp",
  validateBody(verifyOtpSchema),
  authController.verifyOtp
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Lấy thông tin người dùng hiện tại
 *     tags: [Auth]
 */
router.get("/me", authMiddleware, authController.getCurrentUser);

export default router;
