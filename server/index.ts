import dotenv from "dotenv";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import { errorHandler, notFoundHandler } from "./middlewares/errorMiddleware";
import { responseMiddleware } from "./middlewares/responseMiddleware";
import { generalLimiter } from "./middlewares/rateLimitMiddleware";
import { swaggerSpec, swaggerUi } from "./config/swagger";
import cookieParser from "cookie-parser";
import path from "path";

dotenv.config();
console.log("NODE_ENV:", process.env.NODE_ENV);
const app = express();

// Cấu hình CORS
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL
        : ["http://localhost:3000", "http://localhost:5000"],
    credentials: true, // Cho phép chia sẻ cookie giữa frontend và backend
  })
);

// Middleware cơ bản
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // Parser cookies

// Middleware rate limiting
app.use("/api", generalLimiter); // Áp dụng rate limit cho tất cả các route API

// Middleware chuẩn hóa phản hồi
app.use(responseMiddleware);

// Swagger UI setup
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
  })
);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Đăng ký các routes
  const server = await registerRoutes(app);

  console.log("Current environment:", app.get("env"));

  // Xử lý route không tồn tại cho API
  app.use("/api/*", notFoundHandler);

  // Middleware xử lý lỗi toàn cục
  app.use(errorHandler);

  if (app.get("env") === "development") {
    console.log("Starting in DEVELOPMENT mode");
    await setupVite(app, server);

    // Route handler cho path gốc trong development mode
    app.get("/", (req, res) => {
      // Chuyển hướng đến client Vite
      res.redirect("http:localhost:3000");
    });
  } else {
    console.log("Starting in PRODUCTION mode");
    app.use(express.static(path.join(__dirname, "../client/dist")));

    // Route handler cho tất cả các path còn lại trong production mode
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../client/dist/index.html"));
    });
    serveStatic(app);
  }

  // Sử dụng PORT từ biến môi trường hoặc 5000 làm giá trị mặc định
  const port = process.env.PORT || 5000;
  server.listen(
    {
      port,
      host: "localhost",
      // reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
