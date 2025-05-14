import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// Định nghĩa kiểu dữ liệu cho Swagger Spec
export interface SwaggerOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: any[];
  requestBody?: any;
  responses?: Record<string, any>;
  [key: string]: any;
}

export interface SwaggerPath {
  get?: SwaggerOperation;
  post?: SwaggerOperation;
  put?: SwaggerOperation;
  delete?: SwaggerOperation;
  patch?: SwaggerOperation;
  options?: SwaggerOperation;
  head?: SwaggerOperation;
  parameters?: any[];
  [key: string]: any;
}

export interface SwaggerSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
    [key: string]: any;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, SwaggerPath>;
  components?: Record<string, any>;
  tags?: Array<{ name: string; description?: string }>;
  [key: string]: any;
}

/**
 * Cấu hình OpenAPI/Swagger cho tài liệu API
 */
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "HomiTutor API",
      version: "1.0.0",
      description: "API Documentation cho nền tảng HomiTutor",
      contact: {
        name: "HomiTutor Support",
        email: "support@homitutor.com",
        url: "https://homitutor.com/support",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "API v1",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "token",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            error: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  example: "ERROR_CODE",
                },
                message: {
                  type: "string",
                  example: "Mô tả lỗi",
                },
                details: {
                  type: "object",
                  example: null,
                },
              },
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            data: {
              type: "object",
              example: {},
            },
            message: {
              type: "string",
              example: "Thao tác thành công",
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Không có quyền truy cập",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                success: false,
                error: {
                  code: "UNAUTHORIZED",
                  message: "Bạn không có quyền truy cập",
                },
              },
            },
          },
        },
        ValidationError: {
          description: "Dữ liệu đầu vào không hợp lệ",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Dữ liệu không hợp lệ",
                  details: [
                    { field: "email", message: "Email không hợp lệ" },
                    {
                      field: "password",
                      message: "Mật khẩu phải có ít nhất 8 ký tự",
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Các API liên quan đến xác thực" },
      { name: "Users", description: "Quản lý người dùng" },
      { name: "Tutors", description: "Quản lý gia sư" },
      { name: "Students", description: "Quản lý học sinh" },
      { name: "Courses", description: "Quản lý khóa học" },
      { name: "Bookings", description: "Quản lý đặt lịch" },
      { name: "Payments", description: "Quản lý thanh toán" },
      { name: "Conversations", description: "Quản lý tin nhắn" },
    ],
    security: [
      {
        bearerAuth: [],
        cookieAuth: [],
      },
    ],
  },
  apis: ["./server/docs/**/*.ts", "./server/routes.ts"],
  // Bao gồm đầy đủ đường dẫn tới các file chứa JSDoc
};

// Tạo thông số kỹ thuật Swagger
const swaggerSpec = swaggerJsdoc(swaggerOptions) as SwaggerSpec;

export { swaggerSpec, swaggerUi };
