/**
 * Ví dụ controller đã cải thiện với cấu trúc phản hồi chuẩn hóa
 * Các controller khác cũng sẽ được cập nhật theo cùng cách thức
 */

import { Request, Response, NextFunction } from "express";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";  // Sửa cách import JWT
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, like, or, desc, sql, count } from "drizzle-orm";
import { ZodError } from "zod";
import { ApiError } from "../middlewares/errorMiddleware";
import otpService from "../services/otpService";
import { z } from "zod";

// Schema for OTP verification
const verifyOtpSchema = z.object({
  email: z.string().email("Địa chỉ email không hợp lệ"),
  otp: z.string().length(6, "Mã OTP phải gồm 6 chữ số"),
});

/**
 * @desc    Đăng ký người dùng mới
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Dữ liệu đã được xác thực bởi validateBody middleware
    const userData = req.body;

    // Chỉ kiểm tra email đã tồn tại
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, userData.email),
    });

    if (existingUser) {
      throw new ApiError(
        409,
        "USER_ALREADY_EXISTS",
        "Email đã được sử dụng"
      );
    }

    // Băm mật khẩu
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Tạo người dùng mới với is_verified=false
    const [newUser] = await db
      .insert(schema.users)
      .values({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        is_verified: false, // User starts as unverified
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        role: schema.users.role,
        avatar: schema.users.avatar,
        created_at: schema.users.created_at,
      });

    try {
      // Gửi OTP đến email của người dùng
      await otpService.generateAndSendOtp(userData.email);

      // Trả về phản hồi thành công mà không tự động đăng nhập
      return res.success(
        { success: true },
        "OTP đã được gửi đến email của bạn",
        201
      );
    } catch (emailError) {
      // Xử lý lỗi gửi email
      console.error("Error sending OTP email:", emailError);

      // Vẫn trả về thành công vì tài khoản đã được tạo
      // nhưng thông báo lỗi gửi email
      return res.success(
        { success: true },
        "Tài khoản đã được tạo nhưng không thể gửi OTP. Vui lòng sử dụng chức năng gửi lại OTP.",
        201
      );
    }
  } catch (error) {
    // Chuyển lỗi cho middleware xử lý lỗi toàn cục
    next(error);
  }
};

/**
 * @desc    Đăng nhập người dùng
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Dữ liệu đã được xác thực bởi validateBody middleware
    const loginData = req.body;
    // Tìm kiếm người dùng theo email
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, loginData.email),
    });
    

    if (!user) {
      throw new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "Email hoặc mật khẩu không đúng"
      );
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(
      loginData.password,
      user.password
    );
    console.log("isPasswordValid=============", isPasswordValid);

    if (!isPasswordValid) {
      throw new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "Email hoặc mật khẩu không đúng"
      );
    }

    // Kiểm tra tài khoản có bị khóa không
    if (!user.is_active) {
      throw new ApiError(
        403,
        "ACCOUNT_DEACTIVATED",
        "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để biết thêm chi tiết."
      );
    }

    // Kiểm tra tài khoản đã được xác thực chưa
    if (!user.is_verified) {
      let otpMessage = "Tài khoản chưa được xác thực.";

      // Gửi lại OTP cho tài khoản chưa xác thực
      try {
        await otpService.generateAndSendOtp(user.email);
        otpMessage += " Một OTP mới đã được gửi đến email của bạn.";
      } catch (emailError) {
        console.error("Error sending OTP email:", emailError);

        // Kiểm tra nếu là lỗi giới hạn tốc độ
        if (emailError instanceof Error && emailError.message.includes("đã được gửi gần đây")) {
          otpMessage += " " + emailError.message;
        } else {
          otpMessage += " Không thể gửi OTP, vui lòng sử dụng nút gửi lại OTP.";
        }
      }

      throw new ApiError(
        403,
        "ACCOUNT_NOT_VERIFIED",
        otpMessage
      );
    }

    // Tạo JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );
    console.log("token=============", token);

    // Đặt cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    // Trả về phản hồi với định dạng chuẩn
    return res.success(
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          avatar: user.avatar,
          is_verified: user.is_verified
        },
        token,
      },
      "Đăng nhập thành công"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đăng xuất người dùng
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = (req: Request, res: Response) => {
  res.clearCookie("token");
  return res.success(null, "Đăng xuất thành công");
};

/**
 * @desc    Lấy thông tin người dùng hiện tại
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "UNAUTHORIZED", "Không có quyền truy cập");
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng");
    }

    // Kiểm tra tài khoản có bị khóa không
    if (!user.is_active) {
      throw new ApiError(
        403,
        "ACCOUNT_DEACTIVATED",
        "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để biết thêm chi tiết."
      );
    }

    // Loại bỏ thông tin nhạy cảm
    const { password, ...userWithoutPassword } = user;

    // Thông báo nếu tài khoản chưa xác thực
    let message = "Lấy thông tin người dùng thành công";
    if (!user.is_verified) {
      message = "Tài khoản chưa được xác thực email";
    }

    return res.success(
      { user: userWithoutPassword },
      message
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật thông tin cá nhân của người dùng
 * @route   PATCH /api/v1/users/profile
 * @access  Private
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Không được phép, vui lòng đăng nhập",
      });
    }

    const {
      first_name,
      last_name,
      phone_number,
      address,
      date_of_birth,
      gender,
      bio,
    } = req.body;

    // Chuẩn bị object update, chỉ bao gồm các trường được gửi lên
    const updateData: Record<string, any> = {};

    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (address !== undefined) updateData.address = address;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (gender !== undefined) updateData.gender = gender;
    if (bio !== undefined) updateData.bio = bio;

    // Nếu không có dữ liệu để cập nhật
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có thông tin nào để cập nhật",
      });
    }

    // Cập nhật thông tin người dùng
    await db
      .update(schema.users)
      .set({
        ...updateData,
        updated_at: new Date(),
      })
      .where(eq(schema.users.id, userId));

    // Lấy thông tin người dùng sau khi cập nhật
    const updatedUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        avatar: true,
        // Remove fields that don't exist in the schema
        // phone_number: true,
        // address: true,
        // date_of_birth: true,
        // gender: true,
        // bio: true,
        role: true,
        created_at: true,
        updated_at: true,
        password: false, // Không trả về password
      },
    });

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin cá nhân thành công",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi cập nhật thông tin cá nhân",
    });
  }
};

/**
 * @desc    Cập nhật avatar người dùng
 * @route   POST /api/v1/users/avatar
 * @access  Private
 */
export const updateAvatar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Không được phép, vui lòng đăng nhập",
      });
    }

    // Đảm bảo middleware upload đã thêm avatarUrl (Cloudinary) vào req.body
    const avatarUrl = req.body.avatarUrl;
    const avatarPublicId = req.body.avatarPublicId;

    if (!avatarUrl || !avatarPublicId) {
      return res.status(500).json({
        success: false,
        message: "Xảy ra lỗi khi xử lý avatar trên Cloudinary",
      });
    }

    // Cập nhật avatar trong database
    await db
      .update(schema.users)
      .set({
        avatar: avatarUrl,
        updated_at: new Date(),
      })
      .where(eq(schema.users.id, userId));

    return res.status(200).json({
      success: true,
      message: "Cập nhật avatar thành công",
      data: {
        user: {
          avatar: avatarUrl,
          avatar_public_id: avatarPublicId,
        },
      },
    });
  } catch (error) {
    console.error("Avatar update error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi cập nhật avatar",
    });
  }
};

/**
 * @desc    Xác minh OTP và cập nhật trạng thái xác thực của người dùng
 * @route   POST /api/v1/auth/verify-otp
 * @access  Public
 * @deprecated Sử dụng /verify/verify-otp thay thế
 */
export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("⚠️ DEPRECATED: /auth/verify-otp được gọi. Chuyển tiếp đến /verify/verify-otp");

    // Import controller từ verificationController để sử dụng lại logic
    const { verifyOtp: verifyOtpFromVerificationController } = require("../controllers/verificationController");

    // Sử dụng controller từ verificationController
    return verifyOtpFromVerificationController(req, res, next);

  } catch (error) {
    console.error("Error in deprecated auth/verify-otp route:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xác thực mã OTP, vui lòng thử lại sau",
    });
  }
};
