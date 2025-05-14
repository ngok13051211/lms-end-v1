import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { storage, uploadToCloudinary } from "../storage";
import path from "path";
import fs from "fs";
import { Express } from "express";

// Set up multer with storage configuration
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
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

/**
 * Middleware: Upload avatar to Cloudinary
 */
const uploadAvatar = (req: Request, res: Response, next: NextFunction) => {
  const avatarUpload = upload.single("avatar");

  avatarUpload(req, res, async (err) => {
    if (err instanceof multer.MulterError || err) {
      return res.status(400).json({
        message: err.message || "Error uploading avatar",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No avatar file found in request",
      });
    }

    try {
      const result = await uploadToCloudinary(
        req.file.path,
        "homitutor/avatars"
      );

      if (!result.success || !result.url) {
        return res.status(500).json({
          message: "Failed to upload avatar to Cloudinary",
          error: result.error,
        });
      }

      // Gán URL vào req.body để controller có thể lưu vào DB
      req.body.avatarUrl = result.url;
      req.body.avatarPublicId = result.public_id;

      next();
    } catch (error: any) {
      return res.status(500).json({
        message: "Unexpected error during Cloudinary upload",
        error: error.message || String(error),
      });
    }
  });
};

// Multer middleware for document uploads
const uploadDocuments = (req: Request, res: Response, next: NextFunction) => {
  // Custom file filter for documents (allow PDF files too)
  const documentFileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }

    cb(new Error("Only image files (JPEG, PNG) and PDF documents are allowed"));
  };

  // Create document-specific multer instance with extended file types
  const documentUpload = multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: documentFileFilter,
  }).array("documents", 5); // Allow up to 5 documents

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
      console.log(
        "Uploading documents to Cloudinary, files count:",
        req.files.length
      );

      // Upload each file to Cloudinary
      const files = req.files as Express.Multer.File[];
      const cloudinaryResults = await Promise.all(
        files.map((file) =>
          uploadToCloudinary(file.path, "homitutor/documents")
        )
      );

      // Check if any upload failed
      const failedUploads = cloudinaryResults.filter(
        (result) => !result.success
      );
      if (failedUploads.length > 0) {
        return res.status(500).json({
          message: "Some documents failed to upload to Cloudinary",
          errors: failedUploads,
        });
      }

      // Add Cloudinary URLs to the request body
      req.body.documentUrls = cloudinaryResults.map((result) => result.url);
      req.body.documentPublicIds = cloudinaryResults.map(
        (result) => result.public_id
      );

      next();
    } catch (error) {
      console.error("Document upload error:", error);
      return res.status(500).json({
        message: "Error uploading documents",
        error,
      });
    }
  });
};

// Export upload middleware functions
export default {
  uploadAvatar,
  uploadDocuments,
};
