import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "homitutor",
  api_key: process.env.CLOUDINARY_API_KEY || "259464295597233",
  api_secret:
    process.env.CLOUDINARY_API_SECRET || "ptYzmxwmgdQr0LbODGDv0ovxnZA",
  secure: true,
});

export default cloudinary;
