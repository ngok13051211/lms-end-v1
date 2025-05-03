import mongoose, { Document, Schema } from 'mongoose';

// Định nghĩa interface cho TutorSubject document
export interface ITutorSubject extends Document {
  tutorId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  createdAt: Date;
}

// Schema cho TutorSubject
const TutorSubjectSchema: Schema = new Schema({
  tutorId: { 
    type: Schema.Types.ObjectId, 
    ref: 'TutorProfile', 
    required: true 
  },
  subjectId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Subject', 
    required: true 
  },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { 
    transform: (_doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Tạo index để đảm bảo mỗi kết hợp tutorId-subjectId là duy nhất
TutorSubjectSchema.index({ tutorId: 1, subjectId: 1 }, { unique: true });

// Tạo và export model
const TutorSubject = mongoose.model<ITutorSubject>('TutorSubject', TutorSubjectSchema);
export default TutorSubject;