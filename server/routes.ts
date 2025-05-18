import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import cloudinary from "./config/cloudinary";
import path from "path";
import fs from "fs";

// Import routers
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import tutorRoutes from "./routes/tutors";
import studentRoutes from "./routes/students";
import courseRoutes from "./routes/courses";
import conversationRoutes from "./routes/conversations";
import bookingRoutes from "./routes/bookings";
import paymentRoutes from "./routes/payments";
import scheduleRoutes from "./routes/schedules";
import subjectRoutes from "./routes/subjects";
import adminRoutes from "./routes/admin";
import docsRoutes from "./routes/docs";
import verificationRoutes from "./routes/verification";

// Import controllers
import * as tutorController from "./controllers/tutorController";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // API prefix
  const apiPrefix = "/api/v1";

  // Debug routes - chỉ sử dụng trong môi trường phát triển
  if (process.env.NODE_ENV !== "production") {
    // Test Cloudinary upload route - DEBUG ONLY
    app.get(`${apiPrefix}/test-cloudinary`, async (req, res) => {
      console.log("Testing Cloudinary connection...");

      try {
        // Test Cloudinary credentials by making a simple API call
        const result = await cloudinary.api.ping();
        console.log("Cloudinary ping result:", result);

        // Get upload folder details
        const folderResult = await cloudinary.api.root_folders();
        console.log("Cloudinary folders:", folderResult);

        return res.success(
          {
            result,
            folders: folderResult,
          },
          "Cloudinary connection test successful",
          200
        );
      } catch (error: any) {
        console.error("Cloudinary test error:", error);
        return res.error(
          "CLOUDINARY_ERROR",
          "Cloudinary connection test failed",
          error.message || String(error),
          500
        );
      }
    });

    // Serve test avatar upload HTML page - DEBUG ONLY
    app.get("/test-avatar-upload", (req, res) => {
      try {
        const htmlContent = fs.readFileSync(
          path.join(process.cwd(), "test-avatar-upload.html"),
          "utf8"
        );
        res.setHeader("Content-Type", "text/html");
        res.send(htmlContent);
      } catch (error: any) {
        console.error("Error serving test HTML:", error);
        res.status(500).send(`Error serving test page: ${error.message}`);
      }
    });
  }

  // Education level routes
  app.get(`${apiPrefix}/education-levels`, tutorController.getEducationLevels);

  // Testimonial routes
  // app.get(`${apiPrefix}/testimonials`, tutorController.getTestimonials);

  // Đăng ký các router
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/users`, userRoutes);
  app.use(`${apiPrefix}/tutors`, tutorRoutes);
  app.use(`${apiPrefix}/students`, studentRoutes);
  app.use(`${apiPrefix}/courses`, courseRoutes);
  app.use(`${apiPrefix}/conversations`, conversationRoutes);
  app.use(`${apiPrefix}/bookings`, bookingRoutes);
  app.use(`${apiPrefix}/payments`, paymentRoutes);
  app.use(`${apiPrefix}/schedules`, scheduleRoutes);
  app.use(`${apiPrefix}/subjects`, subjectRoutes);
  app.use(`${apiPrefix}/admin`, adminRoutes);
  app.use(`${apiPrefix}/verify`, verificationRoutes); // Route xác thực email
  app.use(`${apiPrefix}`, docsRoutes); // Route tài liệu API

  return httpServer;
}
