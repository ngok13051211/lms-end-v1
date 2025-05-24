import { Router } from "express";
import * as conversationController from "../controllers/conversationController";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware";
import {
  validateParams,
  validateBody,
} from "../middlewares/validationMiddleware";
import * as schema from "@shared/schema";
import { tutorIdParamSchema } from "@shared/schema";

const router = Router();

// Bắt đầu cuộc hội thoại với gia sư (phương thức cũ - chỉ dành cho học viên)
router.post(
  "/tutor/:tutorId",
  authMiddleware,
  roleMiddleware(["student"]),
  validateParams(tutorIdParamSchema),
  conversationController.startConversation
);

// Bắt đầu cuộc hội thoại với bất kỳ người dùng nào (học viên hoặc gia sư)
router.post(
  "/user/:id",
  authMiddleware,
  validateParams(schema.idSchema),
  conversationController.startConversationWithUser
);

// Lấy danh sách cuộc hội thoại
router.get("/", authMiddleware, conversationController.getConversations);

// Lấy chi tiết cuộc hội thoại
router.get(
  "/:id",
  authMiddleware,
  validateParams(schema.idSchema),
  conversationController.getConversation
);

// Gửi tin nhắn mới
router.post(
  "/:id/messages",
  authMiddleware,
  validateParams(schema.idSchema),
  validateBody(schema.messageSchema),
  conversationController.sendMessage
);

// Lấy danh sách tin nhắn của một cuộc trò chuyện
router.get(
  "/:id/messages",
  authMiddleware,
  validateParams(schema.idSchema),
  conversationController.getMessages
);

// Lấy danh sách tin nhắn của một cuộc trò chuyện
router.get(
  "/:id/messages",
  authMiddleware,
  validateParams(schema.idSchema),
  conversationController.getMessages
);

// Đánh dấu tin nhắn đã đọc
router.patch(
  "/:id/messages/:messageId/read",
  authMiddleware,
  validateParams(schema.idSchema),
  conversationController.markMessageAsRead
);

export default router;
