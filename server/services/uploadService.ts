import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { storage } from "../storage";
import path from "path";

// Set up multer with storage configuration
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    
    cb(new Error("Only image files are allowed"));
  },
});

// Upload avatar middleware
const uploadAvatar = (req: Request, res: Response, next: NextFunction) => {
  const avatarUpload = upload.single("avatar");

  avatarUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      return res.status(400).json({
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      // An unknown error occurred
      return res.status(400).json({
        message: err.message || "Error uploading file",
      });
    }
    
    // If no file is uploaded, just continue
    if (!req.file) {
      console.log("No file uploaded");
    }
    
    next();
  });
};

// Multer middleware for document uploads
const uploadDocuments = (req: Request, res: Response, next: NextFunction) => {
  const documentUpload = upload.array("documents", 5); // Allow up to 5 documents

  documentUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        message: err.message || "Error uploading files",
      });
    }
    
    next();
  });
};

// Export upload middleware functions
export default {
  uploadAvatar,
  uploadDocuments,
};