import mongoose, { Document, Schema } from 'mongoose';
import { z } from 'zod';

// Định nghĩa interface cho EducationLevel document
export interface IEducationLevel extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schema cho EducationLevel
const EducationLevelSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
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
export const educationLevelSchema = z.object({
  name: z.string().min(2, "Education level name must be at least 2 characters"),
  description: z.string().optional()
});

// Tạo và export model
const EducationLevel = mongoose.model<IEducationLevel>('EducationLevel', EducationLevelSchema);
export default EducationLevel;