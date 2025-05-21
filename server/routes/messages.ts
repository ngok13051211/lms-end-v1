import { Router } from "express";
import * as messageController from "../controllers/messageController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validateBody } from "../middlewares/validationMiddleware";
import * as schema from "@shared/schema";

const router = Router();

// Gửi tin nhắn mới (tự động tạo conversation nếu chưa tồn tại)
router.post(
    "/",
    authMiddleware,
    validateBody(schema.directMessageSchema),
    messageController.sendDirectMessage
);

export default router;
