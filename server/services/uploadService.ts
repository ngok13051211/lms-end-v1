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
  console.log("✅ Avatar upload middleware started");
  
  // Log request information
  console.log("Request headers:", {
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    host: req.headers.host,
    userAgent: req.headers['user-agent']
  });
  console.log("Request method:", req.method);
  console.log("Request body keys:", Object.keys(req.body));
  
  // Verify if uploads directory exists and is writable
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      console.log(`Creating uploads directory at ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Test write permissions
    const testPath = path.join(uploadDir, '.test-write-' + Date.now());
    fs.writeFileSync(testPath, 'test');
    fs.unlinkSync(testPath);
    console.log(`✅ Uploads directory is writable: ${uploadDir}`);
  } catch (error) {
    console.error(`❌ Error with uploads directory:`, error);
    return res.status(500).json({
      message: "Server configuration error: Upload directory issues",
      error: String(error)
    });
  }
  
  const avatarUpload = upload.single("avatar");

  avatarUpload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      console.error("❌ Multer error:", {
        name: err.name,
        message: err.message,
        code: err.code,
        field: err.field,
        stack: err.stack
      });
      return res.status(400).json({
        message: `Upload error: ${err.message}`,
        code: err.code,
        field: err.field
      });
    } else if (err) {
      // An unknown error occurred
      console.error("❌ Unknown upload error:", {
        message: err.message || String(err),
        stack: err.stack
      });
      return res.status(400).json({
        message: err.message || "Error uploading file",
      });
    }
    
    // If no file is uploaded, just continue
    if (!req.file) {
      console.log("❌ No file uploaded in request");
      return res.status(400).json({
        message: "No file uploaded in request. Make sure form uses 'avatar' as the field name and 'multipart/form-data' encoding."
      });
    }
    
    // Log file information
    console.log("✅ File received:", {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      destination: req.file.destination,
      path: req.file.path,
      filename: req.file.filename
    });
    
    try {
      console.log("⏳ Uploading to Cloudinary...");
      // Upload to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(req.file.path, 'homitutor/avatars');
      
      console.log("Cloudinary result:", {
        success: cloudinaryResult.success,
        url: cloudinaryResult.url,
        public_id: cloudinaryResult.public_id,
        error: cloudinaryResult.error ? String(cloudinaryResult.error) : null
      });
      
      if (!cloudinaryResult.success) {
        console.error("❌ Cloudinary upload failed:", cloudinaryResult.error);
        return res.status(500).json({
          message: "Error uploading to Cloudinary. Please try again later.",
          error: String(cloudinaryResult.error)
        });
      }
      
      // Add the Cloudinary URL to the request body
      req.body.avatarUrl = cloudinaryResult.url;
      req.body.avatarPublicId = cloudinaryResult.public_id;
      
      console.log("✅ Avatar upload successful. URL:", cloudinaryResult.url);
      next();
    } catch (error: any) {
      console.error("❌ Avatar upload error:", {
        message: error.message || String(error),
        stack: error.stack
      });
      return res.status(500).json({
        message: "Error processing avatar upload. Please try again.",
        error: error.message || String(error)
      });
    }
  });
};

// Multer middleware for document uploads
const uploadDocuments = (req: Request, res: Response, next: NextFunction) => {
  // Custom file filter for documents (allow PDF files too)
  const documentFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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
    fileFilter: documentFileFilter
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
      console.log("Uploading documents to Cloudinary, files count:", req.files.length);
      
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