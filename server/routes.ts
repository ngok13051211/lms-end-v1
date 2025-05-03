import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import cloudinary from './config/cloudinary';
import path from 'path';
import fs from 'fs';

// Import controllers
import * as authController from "./controllers/authController";
import * as tutorController from "./controllers/tutorController";
import * as adController from "./controllers/adController";
import * as conversationController from "./controllers/conversationController";

// Import middlewares
import { authMiddleware, roleMiddleware } from "./middlewares/authMiddleware";
import uploadService from "./services/uploadService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // API prefix
  const apiPrefix = "/api/v1";
  
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
      
      return res.status(200).json({ 
        message: "Cloudinary connection test successful", 
        status: "OK",
        result,
        folders: folderResult
      });
    } catch (error: any) {
      console.error("Cloudinary test error:", error);
      return res.status(500).json({
        message: "Cloudinary connection test failed",
        error: error.message || String(error)
      });
    }
  });
  
  // Serve test avatar upload HTML page - DEBUG ONLY
  app.get('/test-avatar-upload', (req, res) => {
    try {
      const htmlContent = fs.readFileSync(path.join(process.cwd(), 'test-avatar-upload.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error: any) {
      console.error('Error serving test HTML:', error);
      res.status(500).send(`Error serving test page: ${error.message}`);
    }
  });

  // Auth routes
  app.post(`${apiPrefix}/auth/register`, authController.register);
  app.post(`${apiPrefix}/auth/login`, authController.login);
  app.post(`${apiPrefix}/auth/logout`, authController.logout);
  app.get(`${apiPrefix}/auth/me`, authMiddleware, authController.getCurrentUser);

  // User routes
  app.patch(`${apiPrefix}/users/profile`, authMiddleware, authController.updateProfile);
  app.post(`${apiPrefix}/users/avatar`, authMiddleware, uploadService.uploadAvatar, authController.updateAvatar);

  // Subject routes
  app.get(`${apiPrefix}/subjects`, tutorController.getSubjects);
  
  // Education level routes
  app.get(`${apiPrefix}/education-levels`, tutorController.getEducationLevels);

  // Testimonial routes
  app.get(`${apiPrefix}/testimonials`, tutorController.getTestimonials);

  // Tutor routes
  app.get(`${apiPrefix}/tutors`, tutorController.getTutors);
  app.get(`${apiPrefix}/tutors/featured`, tutorController.getFeaturedTutors);
  app.get(`${apiPrefix}/tutors/similar/:id`, tutorController.getSimilarTutors);
  
  // Special routes for tutors - these must be defined before routes with :id to avoid conflicts
  app.post(`${apiPrefix}/tutors/profile`, authMiddleware, roleMiddleware(["tutor"]), tutorController.createTutorProfile);
  app.patch(`${apiPrefix}/tutors/profile`, authMiddleware, roleMiddleware(["tutor"]), tutorController.updateTutorProfile);
  app.get(`${apiPrefix}/tutors/profile`, authMiddleware, roleMiddleware(["tutor"]), tutorController.getOwnTutorProfile); 
  app.post(`${apiPrefix}/tutors/certifications`, authMiddleware, roleMiddleware(["tutor"]), uploadService.uploadDocuments, tutorController.uploadCertifications);
  app.get(`${apiPrefix}/tutors/stats`, authMiddleware, roleMiddleware(["tutor"]), tutorController.getTutorStats);
  app.get(`${apiPrefix}/tutors/ads`, authMiddleware, roleMiddleware(["tutor"]), adController.getOwnAds);
  
  // Routes with :id parameters must come after specific routes
  app.get(`${apiPrefix}/tutors/:id/reviews`, tutorController.getTutorReviews);
  app.get(`${apiPrefix}/tutors/:id/ads`, adController.getTutorAds);
  
  // This route must be last to avoid conflicts with other routes
  app.get(`${apiPrefix}/tutors/:id`, tutorController.getTutorById);

  // Ad routes
  app.post(`${apiPrefix}/tutors/ads`, authMiddleware, roleMiddleware(["tutor"]), adController.createAd);
  app.patch(`${apiPrefix}/tutors/ads/:id`, authMiddleware, roleMiddleware(["tutor"]), adController.updateAd);
  app.delete(`${apiPrefix}/tutors/ads/:id`, authMiddleware, roleMiddleware(["tutor"]), adController.deleteAd);

  // Conversation & message routes
  app.post(`${apiPrefix}/conversations/tutor/:tutorId`, authMiddleware, roleMiddleware(["student"]), conversationController.startConversation);
  app.get(`${apiPrefix}/conversations`, authMiddleware, conversationController.getConversations);
  app.get(`${apiPrefix}/conversations/:id`, authMiddleware, conversationController.getConversation);
  app.post(`${apiPrefix}/conversations/:id/messages`, authMiddleware, conversationController.sendMessage);
  app.patch(`${apiPrefix}/conversations/:id/messages/:messageId/read`, authMiddleware, conversationController.markMessageAsRead);

  // Student-specific routes
  app.get(`${apiPrefix}/students/favorite-tutors`, authMiddleware, roleMiddleware(["student"]), tutorController.getFavoriteTutors);
  app.post(`${apiPrefix}/students/favorite-tutors/:id`, authMiddleware, roleMiddleware(["student"]), tutorController.addFavoriteTutor);
  app.delete(`${apiPrefix}/students/favorite-tutors/:id`, authMiddleware, roleMiddleware(["student"]), tutorController.removeFavoriteTutor);
  app.post(`${apiPrefix}/tutors/:id/reviews`, authMiddleware, roleMiddleware(["student"]), tutorController.createReview);

  // Admin routes
  app.get(`${apiPrefix}/admin/users`, authMiddleware, roleMiddleware(["admin"]), authController.getUsers);
  app.get(`${apiPrefix}/admin/tutors/verification`, authMiddleware, roleMiddleware(["admin"]), tutorController.getTutorVerifications);
  app.patch(`${apiPrefix}/admin/tutors/:id/approve`, authMiddleware, roleMiddleware(["admin"]), tutorController.approveTutor);
  app.patch(`${apiPrefix}/admin/tutors/:id/reject`, authMiddleware, roleMiddleware(["admin"]), tutorController.rejectTutor);
  app.get(`${apiPrefix}/admin/stats`, authMiddleware, roleMiddleware(["admin"]), authController.getAdminStats);

  return httpServer;
}
