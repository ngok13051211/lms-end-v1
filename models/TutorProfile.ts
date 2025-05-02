import mongoose, { Document, Schema } from 'mongoose';
import { z } from 'zod';

// Định nghĩa interface cho TutorProfile document
export interface ITutorProfile extends Document {
  userId: mongoose.Types.ObjectId;
  bio: string;
  education: string;
  experience: string;
  hourlyRate: number;
  teachingMode: string;
  isVerified: boolean;
  isFeatured: boolean;
  rating: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

// Schema cho TutorProfile
const TutorProfileSchema: Schema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  bio: { type: String, required: true },
  education: { type: String, required: true },
  experience: { type: String, required: true },
  hourlyRate: { type: Number, required: true },
  teachingMode: { 
    type: String, 
    required: true,
    enum: ['online', 'offline', 'both']
  },
  isVerified: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  rating: { type: Number, default: 0.0 },
  totalReviews: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { 
    transform: (_doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Định nghĩa các schemas validation
export const tutorProfileSchema = z.object({
  bio: z.string().min(10, "Bio must be at least 10 characters"),
  education: z.string().min(5, "Education details are required"),
  experience: z.string().min(5, "Experience details are required"),
  hourlyRate: z.number().positive("Hourly rate must be a positive number"),
  teachingMode: z.enum(["online", "offline", "both"])
});

// Tạo và export model
const TutorProfile = mongoose.model<ITutorProfile>('TutorProfile', TutorProfileSchema);
export default TutorProfile;