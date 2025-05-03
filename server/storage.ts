// This file handles storage for file uploads
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cloudinary from './config/cloudinary';
import { Request } from 'express';

// Create uploads directory if it doesn't exist (for temporary storage)
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure local storage for multer (temporary storage before uploading to Cloudinary)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

// Function to upload a file to Cloudinary
const uploadToCloudinary = async (filePath: string, folder: string = 'homitutor') => {
  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto', // auto-detect resource type (image, video, etc.)
    });

    // Remove the local file
    fs.unlinkSync(filePath);

    // Return the Cloudinary URL
    return {
      url: result.secure_url,
      public_id: result.public_id,
      success: true
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return {
      url: null,
      public_id: null,
      success: false,
      error
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