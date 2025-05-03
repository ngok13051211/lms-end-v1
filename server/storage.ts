// This file handles storage for file uploads
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cloudinary from './config/cloudinary';
import { Request, Express } from 'express';

// Create uploads directory if it doesn't exist (for temporary storage)
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure local storage for multer (temporary storage before uploading to Cloudinary)
const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadDir);
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

// Function to upload a file to Cloudinary
const uploadToCloudinary = async (filePath: string, folder: string = 'homitutor') => {
  try {
    // Check if file exists before uploading
    if (!fs.existsSync(filePath)) {
      console.error(`File ${filePath} does not exist!`);
      return {
        url: null,
        public_id: null,
        success: false,
        error: `File ${filePath} not found on server`
      };
    }
    
    // Log file stats before upload
    const stats = fs.statSync(filePath);
    console.log(`Uploading file to Cloudinary: ${filePath}`, {
      size: stats.size,
      permissions: stats.mode.toString(8).slice(-3), // Get octal representation of permissions
      isFile: stats.isFile(),
      created: stats.birthtime
    });
    
    // Upload to Cloudinary
    console.log(`Cloudinary upload starting for ${filePath} to folder ${folder}`);
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto', // auto-detect resource type (image, video, etc.)
    });

    console.log(`Cloudinary upload successful: ${result.secure_url}`);

    try {
      // Remove the local file
      fs.unlinkSync(filePath);
      console.log(`Temporary file ${filePath} removed successfully`);
    } catch (unlinkError) {
      console.error(`Warning: Could not remove temp file ${filePath}:`, unlinkError);
      // Continue despite error deleting file
    }

    // Return the Cloudinary URL
    return {
      url: result.secure_url,
      public_id: result.public_id,
      success: true
    };
  } catch (error: any) {
    // Capture and log detailed error information
    console.error('Error uploading to Cloudinary:', {
      error: error.message || String(error),
      filePath,
      folder,
      stack: error.stack,
      httpCode: error.http_code,
      errorMessage: error.error?.message
    });
    
    return {
      url: null,
      public_id: null,
      success: false,
      error: error.message || String(error)
    };
  }
};

// Function to delete a file from Cloudinary
const deleteFromCloudinary = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result
    };
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return {
      success: false,
      error
    };
  }
};

export { storage, uploadToCloudinary, deleteFromCloudinary };