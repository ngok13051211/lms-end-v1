import { Router } from "express";
import * as paymentController from "../controllers/paymentController";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware";
import {
  validateParams,
  validateBody,
} from "../middlewares/validationMiddleware";
import * as schema from "@shared/schema";

const router = Router();

// Tạo thanh toán mới
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["student"]),
  validateBody(schema.paymentSchema),
  paymentController.createPayment
);

// Xử lý callback từ cổng thanh toán
router.get("/callback", paymentController.handlePaymentCallback);

// Lấy chi tiết thanh toán
router.get(
  "/:id",
  authMiddleware,
  validateParams(schema.idSchema),
  paymentController.getPaymentById
);

// Lấy lịch sử thanh toán của người dùng
router.get("/user/history", authMiddleware, paymentController.getUserPayments);

// Phê duyệt thanh toán cho gia sư (admin)
router.patch(
  "/admin/:id/approve",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateParams(schema.idSchema),
  paymentController.approvePaymentToTutor
);

export default router;
