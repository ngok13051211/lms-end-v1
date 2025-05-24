import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import { ApiError } from "./errorMiddleware";

/**
 * Middleware xác thực dữ liệu đầu vào sử dụng Zod Schema
 * @param schema Schema Zod để xác thực request body
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validData = schema.parse(req.body);
      req.body = validData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        const details = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        return next(
          new ApiError(
            400,
            "VALIDATION_ERROR",
            validationError.message,
            details
          )
        );
      }

      return next(error);
    }
  };
};

/**
 * Middleware xác thực params trong URLcreateScheduleSchema
 * @param schema Schema Zod để xác thực request params
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validData = schema.parse(req.params);
      req.params = validData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        next(new ApiError(400, "INVALID_PARAMS", validationError.message));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Middleware xác thực query string
 * @param schema Schema Zod để xác thực request query
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validData = schema.parse(req.query);
      req.query = validData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        next(new ApiError(400, "INVALID_QUERY", validationError.message));
      } else {
        next(error);
      }
    }
  };
};

// Thêm hàm mới: validateSchedule
export const validateSchedule = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Bỏ qua các trường không cần thiết cho lịch định kỳ
      let reqBody = { ...req.body };

      // Nếu là recurring schedule, không yêu cầu date, start_time, end_time
      if (reqBody.is_recurring === true) {
        // Thêm các giá trị mặc định nếu không có
        reqBody = {
          ...reqBody,
          date: reqBody.start_date || new Date().toISOString().split("T")[0],
          start_time: reqBody.start_time || "00:00",
          end_time: reqBody.end_time || "00:01",
        };
      }

      // Validate với schema
      const validData = schema.parse(reqBody);
      req.body = validData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        const details = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        next(
          new ApiError(
            400,
            "VALIDATION_ERROR",
            validationError.message,
            details
          )
        );
      } else {
        next(error);
      }
    }
  };
};
