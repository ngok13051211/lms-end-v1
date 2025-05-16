import { Request, Response } from "express";
import otpService from "../services/otpService";
import { db } from "@db";
import { users, emailOtps } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

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
 * Get OTP status for an email (for debugging/monitoring purposes)
 */
export const getOtpStatus = async (req: Request, res: Response) => {
  try {
    // Validate email parameter
    const email = req.query.email as string;
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
      });
    }

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: {
        id: true,
        email: true,
        is_verified: true,
        created_at: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại trong hệ thống",
      });
    }

    // Get latest OTP info
    const latestOtp = await db.query.emailOtps.findFirst({
      where: eq(emailOtps.email, email),
      orderBy: (otps) => [desc(otps.created_at)],
    });

    // Get active OTPs count
    const activeOtps = await db.query.emailOtps.findMany({
      where: and(
        eq(emailOtps.email, email),
        eq(emailOtps.used, false),
      ),
    });

    // Prepare response
    const now = new Date();
    const otpStatus = latestOtp ? {
      created_at: latestOtp.created_at,
      time_elapsed: Math.floor((now.getTime() - new Date(latestOtp.created_at).getTime()) / 1000),
      is_used: latestOtp.used,
      is_expired: now > new Date(latestOtp.expires_at),
      expires_at: latestOtp.expires_at,
      time_remaining: Math.max(0, Math.floor((new Date(latestOtp.expires_at).getTime() - now.getTime()) / 1000)),
      active_otps_count: activeOtps.length,
    } : null;

    return res.status(200).json({
      success: true,
      message: "OTP status retrieved",
      data: {
        user: {
          email: user.email,
          is_verified: user.is_verified,
          registration_date: user.created_at,
        },
        otp_status: otpStatus,
        can_request_new_otp: !latestOtp ||
          (now.getTime() - new Date(latestOtp.created_at).getTime()) / 1000 >= 60,
      }
    });

  } catch (error) {
    console.error("Error checking OTP status:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể kiểm tra trạng thái OTP, vui lòng thử lại sau",
    });
  }
};

/**
 * Send OTP verification code via email
 */
export const sendOtp = async (req: Request, res: Response) => {
  try {
    // Validate request
    const { email } = sendOtpSchema.parse(req.body);

    // Check if email exists in the system
    const userExists = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại trong hệ thống",
      });
    }

    try {
      // Generate and send OTP with rate limiting
      await otpService.generateAndSendOtp(email);

      return res.status(200).json({
        success: true,
        message: "Mã xác thực đã được gửi đến email của bạn",
      });
    } catch (otpError) {
      // Check if this is a rate limiting error
      if (otpError instanceof Error && otpError.message.includes("đã được gửi gần đây")) {
        return res.status(429).json({
          success: false,
          message: otpError.message,
        });
      }
      throw otpError; // Re-throw for general error handling
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: error.errors,
      });
    }

    console.error("Error sending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể gửi mã xác thực, vui lòng thử lại sau",
    });
  }
};

/**
 * Verify OTP code
 */
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    // Validate request
    const { email, otp } = verifyOtpSchema.parse(req.body);

    // Check if user exists first
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    // Check if user is already verified
    if (user.is_verified) {
      return res.status(200).json({
        success: true,
        message: "Tài khoản đã được xác thực trước đó",
        verified: true,
      });
    }

    // Verify OTP
    const isValid = await otpService.verifyOtp(email, otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Mã xác thực không hợp lệ hoặc đã hết hạn",
      });
    }

    // Update user verification status
    await db.update(users)
      .set({ is_verified: true })
      .where(eq(users.email, email));

    // Log success for debugging
    console.log(`User ${email} successfully verified with OTP ${otp}`);

    return res.status(200).json({
      success: true,
      message: "Xác thực thành công",
      verified: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: error.errors,
      });
    }

    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xác thực mã OTP, vui lòng thử lại sau",
    });
  }
};
