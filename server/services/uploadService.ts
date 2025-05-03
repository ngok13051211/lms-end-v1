import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { storage, uploadToCloudinary } from "../storage";
import path from "path";
import { Express } from "express";

// Set up multer with storage configuration
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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
  console.log("Avatar upload middleware started");
  
  // Log request information
  console.log("Request headers:", req.headers);
  console.log("Request method:", req.method);
  console.log("Content-Type:", req.headers['content-type']);
  
  const avatarUpload = upload.single("avatar");

  avatarUpload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      console.error("Multer error:", err);
      return res.status(400).json({
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      // An unknown error occurred
      console.error("Unknown upload error:", err);
      return res.status(400).json({
        message: err.message || "Error uploading file",
      });
    }
    
    // If no file is uploaded, just continue
    if (!req.file) {
      console.log("No file uploaded in request");
      return res.status(400).json({
        message: "No file uploaded in request"
      });
    }
    
    // Log file information
    console.log("File received:", {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });
    
    try {
      console.log("Uploading to Cloudinary...");
      // Upload to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(req.file.path, 'homitutor/avatars');
      
      console.log("Cloudinary result:", cloudinaryResult);
      
      if (!cloudinaryResult.success) {
        console.error("Cloudinary upload failed:", cloudinaryResult.error);
        return res.status(500).json({
          message: "Error uploading to Cloudinary",
          error: cloudinaryResult.error
        });
      }
      
      // Add the Cloudinary URL to the request body
      req.body.avatarUrl = cloudinaryResult.url;
      req.body.avatarPublicId = cloudinaryResult.public_id;
      
      console.log("Avatar upload successful. URL:", cloudinaryResult.url);
      next();
    } catch (error) {
      console.error("Avatar upload error:", error);
      return res.status(500).json({
        message: "Error uploading avatar",
        error
      });
    }
  });
};

// Multer middleware for document uploads
const uploadDocuments = (req: Request, res: Response, next: NextFunction) => {
  const documentUpload = upload.array("documents", 5); // Allow up to 5 documents

  documentUpload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        message: err.message || "Error uploading files",
      });
    }
    
    // If no files uploaded, just continue
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      console.log("No documents uploaded");
      return next();
    }
    
    try {
      // Upload each file to Cloudinary
      const files = req.files as Express.Multer.File[];
      const cloudinaryResults = await Promise.all(
        files.map(file => uploadToCloudinary(file.path, 'homitutor/documents'))
      );
      
      // Check if any upload failed
      const failedUploads = cloudinaryResults.filter(result => !result.success);
      if (failedUploads.length > 0) {
        return res.status(500).json({
          message: "Some documents failed to upload to Cloudinary",
          errors: failedUploads
        });
      }
      
      // Add Cloudinary URLs to the request body
      req.body.documentUrls = cloudinaryResults.map(result => result.url);
      req.body.documentPublicIds = cloudinaryResults.map(result => result.public_id);
      
      next();
    } catch (error) {
      console.error("Document upload error:", error);
      return res.status(500).json({
        message: "Error uploading documents",
        error
      });
    }
  });
};

// Export upload middleware functions
export default {
  uploadAvatar,
  uploadDocuments,
};