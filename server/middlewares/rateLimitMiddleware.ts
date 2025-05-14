import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";

/**
 * Middleware giới hạn tốc độ yêu cầu API tổng quát
 */
export const generalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // giới hạn 100 yêu cầu trong 15 phút cho mỗi IP
  standardHeaders: true,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Quá nhiều yêu cầu, vui lòng thử lại sau.",
    },
  },
});

/**
 * Middleware giới hạn tốc độ cho các route đăng nhập/đăng ký
 * Giúp ngăn chặn tấn công brute force
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 10, // giới hạn 10 yêu cầu trong 1 giờ cho mỗi IP
  standardHeaders: true,
  message: {
    success: false,
    error: {
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      message: "Quá nhiều yêu cầu xác thực, vui lòng thử lại sau 1 giờ.",
    },
  },
});

/**
 * Middleware giới hạn tốc độ cho API upload file
 */
export const uploadLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 20, // giới hạn 20 yêu cầu upload trong 1 giờ
  standardHeaders: true,
  message: {
    success: false,
    error: {
      code: "UPLOAD_RATE_LIMIT_EXCEEDED",
      message: "Quá nhiều yêu cầu tải lên, vui lòng thử lại sau.",
    },
  },
});
