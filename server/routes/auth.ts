import { Router } from "express";
import * as authController from "../controllers/authController";
import { validateBody } from "../middlewares/validationMiddleware";
import * as schema from "@shared/schema";
import { authLimiter } from "../middlewares/rateLimitMiddleware";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Đăng ký người dùng mới
 *     tags: [Auth]
 */
router.post(
  "/register",
  authLimiter,
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
  authLimiter,
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
 * /auth/me:
 *   get:
 *     summary: Lấy thông tin người dùng hiện tại
 *     tags: [Auth]
 */
router.get("/me", authMiddleware, authController.getCurrentUser);

export default router;
