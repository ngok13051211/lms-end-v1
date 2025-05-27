import { Request, Response, NextFunction } from "express";
import { ApiError } from "./errorMiddleware";

/**
 * Middleware để kiểm tra tin nhắn thông thường
 */
export const validateMessage = (req: Request, _res: Response, next: NextFunction) => {
  try {
    // Nếu có file đính kèm, không cần validate content
    if (req.file) {
      // Không cần validate content khi có file
      return next();
    }

    // Nếu không có file, kiểm tra xem có content không
    if (!req.body.content || req.body.content.trim() === '') {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Tin nhắn phải có nội dung hoặc file đính kèm",
        [{
          field: "content",
          message: "Tin nhắn phải có nội dung hoặc file đính kèm"
        }]
      );
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(
      new ApiError(
        400,
        "VALIDATION_ERROR",
        "Lỗi xác thực tin nhắn",
        []
      )
    );
  }
};

/**
 * Middleware để kiểm tra tin nhắn trực tiếp
 */
export const validateDirectMessage = (req: Request, _res: Response, next: NextFunction) => {
  try {
    // Kiểm tra recipient_id
    if (!req.body.recipient_id) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "ID người nhận là bắt buộc",
        [{
          field: "recipient_id",
          message: "ID người nhận là bắt buộc"
        }]
      );
    }

    // Nếu có file đính kèm, không cần validate content
    if (req.file) {
      return next();
    }

    // Nếu không có file, kiểm tra xem có content không
    if (!req.body.content || req.body.content.trim() === '') {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Tin nhắn phải có nội dung hoặc file đính kèm",
        [{
          field: "content",
          message: "Tin nhắn phải có nội dung hoặc file đính kèm"
        }]
      );
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(
      new ApiError(
        400,
        "VALIDATION_ERROR",
        "Lỗi xác thực tin nhắn",
        []
      )
    );
  }
};
