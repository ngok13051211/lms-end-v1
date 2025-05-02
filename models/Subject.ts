import mongoose, { Document, Schema } from 'mongoose';
import { z } from 'zod';

// Định nghĩa interface cho Subject document
export interface ISubject extends Document {
  name: string;
  description?: string;
  icon?: string;
  tutorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Schema cho Subject
const SubjectSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  icon: { type: String },
  tutorCount: { type: Number, default: 0 },
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
export const subjectSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters"),
  description: z.string().optional(),
  icon: z.string().optional()
});

// Tạo và export model
const Subject = mongoose.model<ISubject>('Subject', SubjectSchema);
export default Subject;