import { Request, Response, NextFunction } from "express";

/**
 * Mở rộng đối tượng Response của Express để thêm các phương thức tiện ích
 */
declare global {
  namespace Express {
    interface Response {
      /**
       * Phương thức trả về phản hồi thành công với cấu trúc chuẩn hóa
       */
      success: (data?: any, message?: string, statusCode?: number) => void;

      /**
       * Phương thức trả về lỗi với cấu trúc chuẩn hóa
       */
      error: (
        code: string,
        message: string,
        details?: any,
        statusCode?: number
      ) => void;
    }
  }
}

/**
 * Middleware để chuẩn hóa định dạng phản hồi API
 * Thêm các phương thức tiện ích vào đối tượng Response
 */
export const responseMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  /**
   * Phương thức trả về phản hồi thành công
   * @param data Dữ liệu trả về
   * @param message Thông báo thành công
   * @param statusCode Mã HTTP status (mặc định là 200)
   */
  res.success = function (
    data?: any,
    message?: string,
    statusCode: number = 200
  ) {
    return this.status(statusCode).json({
      success: true,
      data: data || null,
      message: message || "Thao tác thành công",
    });
  };

  /**
   * Phương thức trả về lỗi
   * @param code Mã lỗi
   * @param message Thông báo lỗi
   * @param details Chi tiết lỗi (tùy chọn)
   * @param statusCode Mã HTTP status (mặc định là 400)
   */
  res.error = function (
    code: string,
    message: string,
    details?: any,
    statusCode: number = 400
  ) {
    return this.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details: details || undefined,
      },
    });
  };

  next();
};
