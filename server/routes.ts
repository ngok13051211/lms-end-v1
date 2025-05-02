import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

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
  app.get(`${apiPrefix}/tutors/:id`, tutorController.getTutorById);
  app.get(`${apiPrefix}/tutors/:id/ads`, adController.getTutorAds);
  app.get(`${apiPrefix}/tutors/:id/reviews`, tutorController.getTutorReviews);
  app.post(`${apiPrefix}/tutors/profile`, authMiddleware, roleMiddleware(["tutor"]), tutorController.createTutorProfile);
  app.patch(`${apiPrefix}/tutors/profile`, authMiddleware, roleMiddleware(["tutor"]), tutorController.updateTutorProfile);
  app.get(`${apiPrefix}/tutors/profile`, authMiddleware, roleMiddleware(["tutor"]), tutorController.getOwnTutorProfile);
  app.get(`${apiPrefix}/tutors/stats`, authMiddleware, roleMiddleware(["tutor"]), tutorController.getTutorStats);

  // Ad routes
  app.post(`${apiPrefix}/tutors/ads`, authMiddleware, roleMiddleware(["tutor"]), adController.createAd);
  app.get(`${apiPrefix}/tutors/ads`, authMiddleware, roleMiddleware(["tutor"]), adController.getOwnAds);
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
  app.post(`${apiPrefix}/students/favorite-tutors/:tutorId`, authMiddleware, roleMiddleware(["student"]), tutorController.addFavoriteTutor);
  app.delete(`${apiPrefix}/students/favorite-tutors/:tutorId`, authMiddleware, roleMiddleware(["student"]), tutorController.removeFavoriteTutor);
  app.post(`${apiPrefix}/tutors/:tutorId/reviews`, authMiddleware, roleMiddleware(["student"]), tutorController.createReview);

  // Admin routes
  app.get(`${apiPrefix}/admin/users`, authMiddleware, roleMiddleware(["admin"]), authController.getUsers);
  app.get(`${apiPrefix}/admin/tutors/verification`, authMiddleware, roleMiddleware(["admin"]), tutorController.getTutorVerifications);
  app.patch(`${apiPrefix}/admin/tutors/:tutorId/approve`, authMiddleware, roleMiddleware(["admin"]), tutorController.approveTutor);
  app.patch(`${apiPrefix}/admin/tutors/:tutorId/reject`, authMiddleware, roleMiddleware(["admin"]), tutorController.rejectTutor);
  app.get(`${apiPrefix}/admin/stats`, authMiddleware, roleMiddleware(["admin"]), authController.getAdminStats);

  return httpServer;
}
