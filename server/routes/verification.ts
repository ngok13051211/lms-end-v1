import { Router } from "express";
import * as verificationController from "../controllers/verificationController";
import { validateBody } from "../middlewares/validationMiddleware";
import { authLimiter } from "../middlewares/rateLimitMiddleware";
import { z } from "zod";

const router = Router();

// Schema for email verification request
const sendOtpSchema = z.object({
  email: z.string().email("Địa chỉ email không hợp lệ"),
});

// Schema for OTP verification
const verifyOtpSchema = z.object({
  email: z.string().email("Địa chỉ email không hợp lệ"),
  otp: z.string().length(6, "Mã OTP phải gồm 6 chữ số"),
});

/**
 * Send OTP verification code via email
 * @route POST /verify/send-otp
 */
router.post(
  "/send-otp",
  authLimiter, // Apply rate limiting for security
  validateBody(sendOtpSchema),
  verificationController.sendOtp
);

/**
 * Verify OTP code
 * @route POST /verify/verify-otp
 */
router.post(
  "/verify-otp",
  authLimiter, // Apply rate limiting for security
  validateBody(verifyOtpSchema),
  verificationController.verifyOtp
);

/**
 * Get OTP status for debugging/monitoring
 * @route GET /verify/otp-status
 */
router.get(
  "/otp-status",
  verificationController.getOtpStatus
);

export default router;
