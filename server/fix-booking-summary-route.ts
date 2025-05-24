import { Router } from "express";
import * as adminController from "./controllers/adminController";
import { authMiddleware, roleMiddleware } from "./middlewares/authMiddleware";
import { validateParams } from "./middlewares/validationMiddleware";
import * as schema from "../shared/schema";
import { z } from "zod";

/**
 * File này tạo route handler cho booking-summary riêng biệt
 * để tránh xung đột với cấu trúc route hiện tại
 */
const router = Router();

// Lấy tổng quan lịch sử học tập của học viên theo khóa học
router.get(
    "/users/:userId/booking-summary",
    authMiddleware,
    roleMiddleware(["admin"]),
    validateParams(z.object({
        userId: schema.idSchema.shape.id,
    })),
    adminController.getUserBookingSummaryByCourse
);

export default router;
