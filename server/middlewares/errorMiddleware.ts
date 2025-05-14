import { Request, Response, NextFunction } from "express";

/**
 * Lớp ApiError tùy chỉnh để xử lý lỗi API
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = "ApiError";
  }
}

/**
 * Middleware xử lý lỗi toàn cục
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("API Error:", err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Xử lý lỗi ZodError
  if (err.name === "ZodError") {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu không hợp lệ",
        details: err,
      },
    });
  }

  // Xử lý lỗi JWT
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Token không hợp lệ hoặc đã hết hạn",
      },
    });
  }

  // Xử lý lỗi server khác
  return res.status(500).json({
    success: false,
    error: {
      code: "SERVER_ERROR",
      message: "Đã xảy ra lỗi không mong muốn",
    },
  });
};

/**
 * Middleware bắt lỗi route không tồn tại
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Không tìm thấy route: ${req.method} ${req.originalUrl}`,
    },
  });
};
