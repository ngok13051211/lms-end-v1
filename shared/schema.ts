import { pgTable, text, serial, integer, boolean, timestamp, json, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User Model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),
  role: text("role").notNull().default("student"), // "student", "tutor", "admin"
  avatar: text("avatar"),
  phone: text("phone"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Tutor Profile Model (Đã đơn giản hóa)
export const tutorProfiles = pgTable("tutor_profiles", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  bio: text("bio").notNull(),
  // Đã loại bỏ các trường:
  // education, experience, experience_years, hourly_rate, teaching_mode, availability
  certifications: text("certifications"),
  is_verified: boolean("is_verified").default(false),
  is_featured: boolean("is_featured").default(false),
  rejection_reason: text("rejection_reason"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.0"),
  total_reviews: integer("total_reviews").default(0),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Subject Categories Model
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  tutor_count: integer("tutor_count").default(0),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Education Levels Model
export const educationLevels = pgTable("education_levels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Tutor-Subject Many-to-Many Relationship
export const tutorSubjects = pgTable("tutor_subjects", {
  id: serial("id").primaryKey(),
  tutor_id: integer("tutor_id").notNull().references(() => tutorProfiles.id),
  subject_id: integer("subject_id").notNull().references(() => subjects.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Tutor-Education Level Many-to-Many Relationship
export const tutorEducationLevels = pgTable("tutor_education_levels", {
  id: serial("id").primaryKey(),
  tutor_id: integer("tutor_id").notNull().references(() => tutorProfiles.id),
  level_id: integer("level_id").notNull().references(() => educationLevels.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Tutor Courses Model
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  tutor_id: integer("tutor_id").notNull().references(() => tutorProfiles.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  subject_id: integer("subject_id").references(() => subjects.id),
  level_id: integer("level_id").references(() => educationLevels.id),
  hourly_rate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  teaching_mode: text("teaching_mode").notNull(), // "online", "offline", "both"
  status: text("status").notNull().default("active"), // "active", "inactive"
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Conversations Model
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  student_id: integer("student_id").notNull().references(() => users.id),
  tutor_id: integer("tutor_id").notNull().references(() => users.id),
  last_message_at: timestamp("last_message_at").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Messages Model
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversation_id: integer("conversation_id").notNull().references(() => conversations.id),
  sender_id: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Reviews Model
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  student_id: integer("student_id").notNull().references(() => users.id),
  tutor_id: integer("tutor_id").notNull().references(() => tutorProfiles.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Testimonials Model (Featured reviews to display on homepage)
export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  avatar: text("avatar"),
  is_featured: boolean("is_featured").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Favorite Tutors Model
export const favoriteTutors = pgTable("favorite_tutors", {
  id: serial("id").primaryKey(),
  student_id: integer("student_id").notNull().references(() => users.id),
  tutor_id: integer("tutor_id").notNull().references(() => tutorProfiles.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Relations for favorite tutors
export const favoriteTutorsRelations = relations(favoriteTutors, ({ one }) => ({
  student: one(users, {
    fields: [favoriteTutors.student_id],
    references: [users.id],
  }),
  tutor: one(tutorProfiles, {
    fields: [favoriteTutors.tutor_id],
    references: [tutorProfiles.id],
  }),
}));

// Define relations
export const usersRelations = relations(users, ({ one, many }) => ({
  tutorProfile: one(tutorProfiles, {
    fields: [users.id],
    references: [tutorProfiles.user_id],
  }),
  sentMessages: many(messages),
  studentConversations: many(conversations),
  tutorConversations: many(conversations),
  reviews: many(reviews),
  favoriteTutors: many(favoriteTutors),
}));

export const tutorProfilesRelations = relations(tutorProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [tutorProfiles.user_id],
    references: [users.id],
  }),
  subjects: many(tutorSubjects),
  levels: many(tutorEducationLevels),
  courses: many(courses),
  reviews: many(reviews),
  favoritedBy: many(favoriteTutors),
}));

export const tutorSubjectsRelations = relations(tutorSubjects, ({ one }) => ({
  tutor: one(tutorProfiles, {
    fields: [tutorSubjects.tutor_id],
    references: [tutorProfiles.id],
  }),
  subject: one(subjects, {
    fields: [tutorSubjects.subject_id],
    references: [subjects.id],
  }),
}));

// Defining Subject-Education Level Many-to-Many Relationship
export const subjectEducationLevels = pgTable("subject_education_levels", {
  id: serial("id").primaryKey(),
  subject_id: integer("subject_id").notNull().references(() => subjects.id),
  level_id: integer("level_id").notNull().references(() => educationLevels.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const subjectEducationLevelsRelations = relations(subjectEducationLevels, ({ one }) => ({
  subject: one(subjects, {
    fields: [subjectEducationLevels.subject_id],
    references: [subjects.id],
  }),
  level: one(educationLevels, {
    fields: [subjectEducationLevels.level_id],
    references: [educationLevels.id],
  }),
}));

export const subjectsRelations = relations(subjects, ({ many }) => ({
  tutors: many(tutorSubjects),
  courses: many(courses),
  educationLevels: many(subjectEducationLevels),
}));

export const coursesRelations = relations(courses, ({ one }) => ({
  tutor: one(tutorProfiles, {
    fields: [courses.tutor_id],
    references: [tutorProfiles.id],
  }),
  subject: one(subjects, {
    fields: [courses.subject_id],
    references: [subjects.id],
  }),
  level: one(educationLevels, {
    fields: [courses.level_id],
    references: [educationLevels.id],
  }),
}));

export const tutorEducationLevelsRelations = relations(tutorEducationLevels, ({ one }) => ({
  tutor: one(tutorProfiles, {
    fields: [tutorEducationLevels.tutor_id],
    references: [tutorProfiles.id],
  }),
  level: one(educationLevels, {
    fields: [tutorEducationLevels.level_id],
    references: [educationLevels.id],
  }),
}));

export const educationLevelsRelations = relations(educationLevels, ({ many }) => ({
  tutors: many(tutorEducationLevels),
  courses: many(courses),
  subjects: many(subjectEducationLevels),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  student: one(users, {
    fields: [conversations.student_id],
    references: [users.id],
  }),
  tutor: one(users, {
    fields: [conversations.tutor_id],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversation_id],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.sender_id],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  student: one(users, {
    fields: [reviews.student_id],
    references: [users.id],
  }),
  tutor: one(tutorProfiles, {
    fields: [reviews.tutor_id],
    references: [tutorProfiles.id],
  }),
}));

// Create Schemas for validation
export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  first_name: z.string().min(2, "First name is required"),
  last_name: z.string().min(2, "Last name is required"),
  role: z.enum(["student", "tutor", "admin"]).default("student"),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const userInsertSchema = createInsertSchema(users);
export const userSelectSchema = createSelectSchema(users);

// Đơn giản hóa schema để chỉ giữ lại bio và certifications
export const tutorProfileInsertSchema = createInsertSchema(tutorProfiles);
export const tutorProfileSelectSchema = createSelectSchema(tutorProfiles);

export const courseInsertSchema = createInsertSchema(courses);
export const courseSelectSchema = createSelectSchema(courses);

export const subjectInsertSchema = createInsertSchema(subjects);
export const subjectSelectSchema = createSelectSchema(subjects);

export const educationLevelInsertSchema = createInsertSchema(educationLevels);
export const educationLevelSelectSchema = createSelectSchema(educationLevels);

export const testimonialInsertSchema = createInsertSchema(testimonials);
export const testimonialSelectSchema = createSelectSchema(testimonials);

export const messageInsertSchema = createInsertSchema(messages);
export const messageSelectSchema = createSelectSchema(messages);

export const reviewInsertSchema = createInsertSchema(reviews);
export const reviewSelectSchema = createSelectSchema(reviews);

export const favoriteTutorInsertSchema = createInsertSchema(favoriteTutors);
export const favoriteTutorSelectSchema = createSelectSchema(favoriteTutors);

export const subjectEducationLevelInsertSchema = createInsertSchema(subjectEducationLevels);
export const subjectEducationLevelSelectSchema = createSelectSchema(subjectEducationLevels);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type TutorProfile = typeof tutorProfiles.$inferSelect;
export type NewTutorProfile = typeof tutorProfiles.$inferInsert;

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type EducationLevel = typeof educationLevels.$inferSelect;
export type NewEducationLevel = typeof educationLevels.$inferInsert;

export type Testimonial = typeof testimonials.$inferSelect;
export type NewTestimonial = typeof testimonials.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

export type FavoriteTutor = typeof favoriteTutors.$inferSelect;
export type NewFavoriteTutor = typeof favoriteTutors.$inferInsert;

export type SubjectEducationLevel = typeof subjectEducationLevels.$inferSelect;
export type NewSubjectEducationLevel = typeof subjectEducationLevels.$inferInsert;

// Bảng đặt lịch (bookings)
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  student_id: integer("student_id").notNull().references(() => users.id),
  tutor_id: integer("tutor_id").notNull().references(() => tutorProfiles.id),
  course_id: integer("course_id").references(() => courses.id),
  
  // Thông tin lịch học
  title: text("title").notNull(),
  description: text("description"),
  start_time: timestamp("start_time").notNull(),
  end_time: timestamp("end_time").notNull(),
  location: text("location"),  // Địa điểm nếu dạy trực tiếp
  meeting_url: text("meeting_url"), // URL nếu dạy trực tuyến
  
  // Thông tin thanh toán
  hourly_rate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  total_hours: decimal("total_hours", { precision: 5, scale: 2 }).notNull(),
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Trạng thái đặt lịch
  status: text("status").notNull().default("pending"), // pending, confirmed, completed, cancelled, rejected
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Bảng thanh toán (payments)
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  booking_id: integer("booking_id").notNull().references(() => bookings.id),
  transaction_id: text("transaction_id"),  // ID giao dịch từ VNPay
  
  // Thông tin thanh toán
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  fee: decimal("fee", { precision: 10, scale: 2 }).default("0"),
  net_amount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Thông tin người thanh toán/nhận tiền
  payer_id: integer("payer_id").notNull().references(() => users.id),
  payee_id: integer("payee_id").notNull().references(() => users.id),
  
  // Trạng thái thanh toán
  status: text("status").notNull().default("pending"), // pending, completed, refunded, failed
  payment_method: text("payment_method").notNull(),  // vnpay, bank_transfer, wallet
  
  // Data bổ sung
  payment_data: json("payment_data"),  // Lưu dữ liệu phản hồi từ cổng thanh toán
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Bảng ghi chú và đánh giá buổi học (session_notes)
export const sessionNotes = pgTable("session_notes", {
  id: serial("id").primaryKey(),
  booking_id: integer("booking_id").notNull().references(() => bookings.id),
  
  // Ghi chú của gia sư
  tutor_notes: text("tutor_notes"),
  
  // Đánh giá của học sinh
  student_rating: integer("student_rating"),  // 1-5 sao
  student_feedback: text("student_feedback"),
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Relations
export const bookingsRelations = relations(bookings, ({ one }) => ({
  student: one(users, { fields: [bookings.student_id], references: [users.id] }),
  tutor: one(tutorProfiles, { fields: [bookings.tutor_id], references: [tutorProfiles.id] }),
  course: one(courses, { fields: [bookings.course_id], references: [courses.id] }),
  payment: one(payments, { fields: [bookings.id], references: [payments.booking_id] }),
  sessionNote: one(sessionNotes, { fields: [bookings.id], references: [sessionNotes.booking_id] })
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.booking_id], references: [bookings.id] }),
  payer: one(users, { fields: [payments.payer_id], references: [users.id] }),
  payee: one(users, { fields: [payments.payee_id], references: [users.id] })
}));

export const sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
  booking: one(bookings, { fields: [sessionNotes.booking_id], references: [bookings.id] })
}));

// Schemas
export const bookingInsertSchema = createInsertSchema(bookings);
// Bổ sung validation riêng
export const bookingValidationSchema = z.object({
  title: z.string().min(3, "Tiêu đề phải có ít nhất 3 ký tự"),
  date: z.string(), // Thêm trường date để xử lý đúng múi giờ
  start_time: z.string(), // Điều chỉnh để chỉ nhận string format "HH:MM"
  end_time: z.string(), // Điều chỉnh để chỉ nhận string format "HH:MM"
  student_id: z.number(),
  tutor_id: z.number(),
  course_id: z.number().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  meeting_url: z.string().optional(),
  hourly_rate: z.number().or(z.string().transform(val => parseFloat(val))),
  total_hours: z.number().optional(), // Trở thành optional vì sẽ tính toán trên server
  total_amount: z.number().optional(), // Trở thành optional vì sẽ tính toán trên server
  status: z.string().default("pending")
});
export const bookingSelectSchema = createSelectSchema(bookings);

export const paymentInsertSchema = createInsertSchema(payments);
export const paymentSelectSchema = createSelectSchema(payments);

// Validation schema cho thanh toán
export const paymentValidationSchema = z.object({
  booking_id: z.number(),
  transaction_id: z.string().optional(),
  amount: z.number().or(z.string().transform(val => parseFloat(val))),
  fee: z.number().or(z.string().transform(val => parseFloat(val))).optional(),
  net_amount: z.number().or(z.string().transform(val => parseFloat(val))),
  payer_id: z.number(),
  payee_id: z.number(),
  status: z.string().default("pending"),
  payment_method: z.string(),
  payment_data: z.any().optional()
});

export const sessionNoteInsertSchema = createInsertSchema(sessionNotes);
export const sessionNoteSelectSchema = createSelectSchema(sessionNotes);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type SessionNote = typeof sessionNotes.$inferSelect;
export type NewSessionNote = typeof sessionNotes.$inferInsert;
