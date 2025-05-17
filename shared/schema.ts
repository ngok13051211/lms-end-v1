import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  json,
  decimal,
  date,
  time,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Email OTP Model for email verification
export const emailOtps = pgTable("email_otps", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  otp: text("otp").notNull(), // Hashed OTP
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  used: boolean("used").default(false),
});

// Subject Categories Model
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  tutor_count: integer("tutor_count").default(0),
  teaching_mode: text("teaching_mode").default("both"), // "online", "offline", "both"
  hourly_rate: decimal("hourly_rate", { precision: 10, scale: 2 }).default("0"),
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

// Favorite Tutors Model
export const favoriteTutors = pgTable("favorite_tutors", {
  id: serial("id").primaryKey(),
  student_id: integer("student_id")
    .notNull()
    .references(() => users.id),
  tutor_id: integer("tutor_id")
    .notNull()
    .references(() => tutorProfiles.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Defining Subject-Education Level Many-to-Many Relationship ?????
export const subjectEducationLevels = pgTable("subject_education_levels", {
  id: serial("id").primaryKey(),
  subject_id: integer("subject_id")
    .notNull()
    .references(() => subjects.id),
  level_id: integer("level_id")
    .notNull()
    .references(() => educationLevels.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// --------------------------------------------------------------------------------

// User Model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),

  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),

  date_of_birth: text("date_of_birth"), // Ngày sinh (string, format YYYY-MM-DD)
  address: text("address"),
  phone: text("phone"),
  avatar: text("avatar"),

  role: text("role").notNull().default("student"), // "student" | "tutor" | "admin"
  is_verified: boolean("is_verified").default(false).notNull(),

  is_active: boolean("is_active").default(true).notNull(), // ✅ Thêm: để quản lý trạng thái khoá tài khoản

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Tutor Profile Model
export const tutorProfiles = pgTable("tutor_profiles", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  bio: text("bio"),
  availability: text("availability"),
  is_verified: boolean("is_verified").default(false),
  is_featured: boolean("is_featured").default(false),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.0"),
  total_reviews: integer("total_reviews").default(0),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const teachingRequests = pgTable("teaching_requests", {
  id: serial("id").primaryKey(),

  tutor_id: integer("tutor_id")
    .notNull()
    .references(() => tutorProfiles.id), // ✅ Sửa: từ users.id → tutorProfiles.id

  subject_id: integer("subject_id")
    .notNull()
    .references(() => subjects.id),

  level_id: integer("level_id")
    .notNull()
    .references(() => educationLevels.id),

  introduction: text("introduction"), // Giới thiệu lĩnh vực muốn dạy
  experience: text("experience"), // Kinh nghiệm giảng dạy
  certifications: text("certifications"), // URL chứng chỉ liên quan (JSON string)

  status: text("status").notNull().default("pending"), // pending | approved | rejected
  rejection_reason: text("rejection_reason"), // Lý do nếu bị từ chối

  approved_by: integer("approved_by").references(() => users.id), // ✅ Thêm: ID admin đã duyệt

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Tutor-Subject Many-to-Many Relationship
export const tutorSubjects = pgTable("tutor_subjects", {
  id: serial("id").primaryKey(),
  tutor_id: integer("tutor_id")
    .notNull()
    .references(() => tutorProfiles.id),
  subject_id: integer("subject_id")
    .notNull()
    .references(() => subjects.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Tutor-Education Level Many-to-Many Relationship
export const tutorEducationLevels = pgTable("tutor_education_levels", {
  id: serial("id").primaryKey(),
  tutor_id: integer("tutor_id")
    .notNull()
    .references(() => tutorProfiles.id),
  level_id: integer("level_id")
    .notNull()
    .references(() => educationLevels.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Tutor Courses Model
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  tutor_id: integer("tutor_id")
    .notNull()
    .references(() => tutorProfiles.id),
  subject_id: integer("subject_id")
    .notNull()
    .references(() => subjects.id),
  level_id: integer("level_id") // Đảm bảo field này tồn tại
    .notNull()
    .references(() => educationLevels.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  hourly_rate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  teaching_mode: varchar("teaching_mode", { length: 50 })
    .notNull()
    .default("online"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Bảng yêu cầu đặt lịch (booking_requests)
export const bookingRequests = pgTable("booking_requests", {
  id: serial("id").primaryKey(),
  student_id: integer("student_id")
    .notNull()
    .references(() => users.id),
  tutor_id: integer("tutor_id")
    .notNull()
    .references(() => tutorProfiles.id),
  course_id: integer("course_id").references(() => courses.id),

  // Thông tin chung về yêu cầu đặt lịch
  title: text("title").notNull(),
  description: text("description"),
  mode: text("mode").notNull(), // "online", "offline"
  location: text("location"), // Địa điểm nếu dạy trực tiếp
  note: text("note"), // Ghi chú từ học sinh
  meeting_url: text("meeting_url"), // URL nếu dạy trực tuyến

  // Thông tin thanh toán
  hourly_rate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  total_hours: decimal("total_hours", { precision: 5, scale: 2 }).notNull(),
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),

  // Trạng thái yêu cầu
  status: text("status").notNull().default("pending"), // pending, confirmed, completed, cancelled, rejected
  rejection_reason: text("rejection_reason"),

  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Bảng buổi học (booking_sessions)
export const bookingSessions = pgTable("booking_sessions", {
  id: serial("id").primaryKey(),
  request_id: integer("request_id")
    .notNull()
    .references(() => bookingRequests.id),

  // Thông tin lịch học
  date: date("date").notNull(), // Ngày học (YYYY-MM-DD)
  start_time: time("start_time").notNull(), // Thời gian bắt đầu (HH:MM)
  end_time: time("end_time").notNull(), // Thời gian kết thúc (HH:MM)

  // Trạng thái buổi học
  status: text("status").notNull().default("pending"), // pending, confirmed, completed, cancelled

  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Bảng thanh toán (payments)
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  request_id: integer("request_id")
    .notNull()
    .references(() => bookingRequests.id),
  transaction_id: text("transaction_id"), // ID giao dịch từ VNPay

  // Thông tin thanh toán
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  fee: decimal("fee", { precision: 10, scale: 2 }).default("0"),
  net_amount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),

  // Thông tin người thanh toán/nhận tiền
  payer_id: integer("payer_id")
    .notNull()
    .references(() => users.id),
  payee_id: integer("payee_id")
    .notNull()
    .references(() => users.id),

  // Trạng thái thanh toán
  status: text("status").notNull().default("pending"), // pending, completed, refunded, failed
  payment_method: text("payment_method").notNull(), // vnpay, bank_transfer, wallet

  // Data bổ sung
  payment_data: json("payment_data"), // Lưu dữ liệu phản hồi từ cổng thanh toán

  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Bảng ghi chú và đánh giá buổi học (session_notes)
export const sessionNotes = pgTable("session_notes", {
  id: serial("id").primaryKey(),
  session_id: integer("session_id")
    .notNull()
    .references(() => bookingSessions.id),

  // Ghi chú của gia sư
  tutor_notes: text("tutor_notes"),

  // Đánh giá của học sinh
  student_rating: integer("student_rating"), // 1-5 sao
  student_feedback: text("student_feedback"),

  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Teaching Schedules Model for tutor availability
export const teachingSchedules = pgTable("teaching_schedules", {
  id: serial("id").primaryKey(),
  tutor_id: integer("tutor_id")
    .notNull()
    .references(() => tutorProfiles.id),
  course_id: integer("course_id").references(() => courses.id),
  date: date("date").notNull(),
  start_time: time("start_time").notNull(),
  end_time: time("end_time").notNull(),
  mode: text("mode").notNull(), // "online", "offline"
  location: text("location"),
  is_recurring: boolean("is_recurring").default(false),
  status: text("status").default("available"), // "available", "booked", "completed", "cancelled"
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
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

// Relations for teaching schedules
export const teachingSchedulesRelations = relations(
  teachingSchedules,
  ({ one }) => ({
    tutor: one(tutorProfiles, {
      fields: [teachingSchedules.tutor_id],
      references: [tutorProfiles.id],
    }),
    course: one(courses, {
      fields: [teachingSchedules.course_id],
      references: [courses.id],
    }),
  })
);

export const tutorProfilesRelations = relations(
  tutorProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [tutorProfiles.user_id],
      references: [users.id],
    }),
    tutorSubjects: many(tutorSubjects),
    tutorEducationLevels: many(tutorEducationLevels),
    courses: many(courses),
    favoritedBy: many(favoriteTutors),
    teachingSchedules: many(teachingSchedules), // Relation to teaching schedules
  })
);

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

export const subjectEducationLevelsRelations = relations(
  subjectEducationLevels,
  ({ one }) => ({
    subject: one(subjects, {
      fields: [subjectEducationLevels.subject_id],
      references: [subjects.id],
    }),
    level: one(educationLevels, {
      fields: [subjectEducationLevels.level_id],
      references: [educationLevels.id],
    }),
  })
);

export const subjectsRelations = relations(subjects, ({ many }) => ({
  tutors: many(tutorSubjects),
  courses: many(courses),
  educationLevels: many(subjectEducationLevels),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
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
  teachingSchedules: many(teachingSchedules),
}));

export const tutorEducationLevelsRelations = relations(
  tutorEducationLevels,
  ({ one }) => ({
    tutor: one(tutorProfiles, {
      fields: [tutorEducationLevels.tutor_id],
      references: [tutorProfiles.id],
    }),
    level: one(educationLevels, {
      fields: [tutorEducationLevels.level_id],
      references: [educationLevels.id],
    }),
  })
);

export const educationLevelsRelations = relations(
  educationLevels,
  ({ many }) => ({
    tutors: many(tutorEducationLevels),
    courses: many(courses),
    subjects: many(subjectEducationLevels),
  })
);

export const bookingRequestsRelations = relations(
  bookingRequests,
  ({ one, many }) => ({
    student: one(users, {
      fields: [bookingRequests.student_id],
      references: [users.id],
    }),
    tutor: one(tutorProfiles, {
      fields: [bookingRequests.tutor_id],
      references: [tutorProfiles.id],
    }),
    course: one(courses, {
      fields: [bookingRequests.course_id],
      references: [courses.id],
    }),
    payment: one(payments, {
      fields: [bookingRequests.id],
      references: [payments.request_id],
    }),
    sessions: many(bookingSessions),
  })
);

export const bookingSessionsRelations = relations(
  bookingSessions,
  ({ one, many }) => ({
    request: one(bookingRequests, {
      fields: [bookingSessions.request_id],
      references: [bookingRequests.id],
    }),
    sessionNote: one(sessionNotes, {
      fields: [bookingSessions.id],
      references: [sessionNotes.session_id],
    }),
  })
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  request: one(bookingRequests, {
    fields: [payments.request_id],
    references: [bookingRequests.id],
  }),
  payer: one(users, { fields: [payments.payer_id], references: [users.id] }),
  payee: one(users, { fields: [payments.payee_id], references: [users.id] }),
}));

export const sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
  session: one(bookingSessions, {
    fields: [sessionNotes.session_id],
    references: [bookingSessions.id],
  }),
}));

export const teachingRequestsRelations = relations(
  teachingRequests,
  ({ one }) => ({
    tutor: one(tutorProfiles, {
      fields: [teachingRequests.tutor_id],
      references: [tutorProfiles.id],
    }),
    subject: one(subjects, {
      fields: [teachingRequests.subject_id],
      references: [subjects.id],
    }),
    level: one(educationLevels, {
      fields: [teachingRequests.level_id],
      references: [educationLevels.id],
    }),
    approvedBy: one(users, {
      fields: [teachingRequests.approved_by],
      references: [users.id],
    }),
  })
);

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

// Schema cho cập nhật thông tin người dùng
export const updateProfileSchema = z.object({
  first_name: z.string().min(2, "Tên phải có ít nhất 2 ký tự").optional(),
  last_name: z.string().min(2, "Họ phải có ít nhất 2 ký tự").optional(),
  phone: z.string().optional(),
});

export const userInsertSchema = createInsertSchema(users);
export const userSelectSchema = createSelectSchema(users);

// Schema cho hồ sơ gia sư đã bổ sung thêm các trường mới
export const tutorProfileInsertSchema = createInsertSchema(tutorProfiles);
export const tutorProfileSelectSchema = createSelectSchema(tutorProfiles);

// Schema cho tạo/cập nhật hồ sơ gia sư
export const tutorProfileSchema = z.object({
  bio: z.string().optional(),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày sinh phải là YYYY-MM-DD")
    .optional(),
  address: z.string().optional(),
  certifications: z.string().optional(), // JSON string chứa URLs
  availability: z.string().optional(), // JSON string
});

export const courseInsertSchema = createInsertSchema(courses);
export const courseSelectSchema = createSelectSchema(courses);

// Schema cho tạo khóa học mới
export const courseSchema = z.object({
  title: z.string().min(3, "Tiêu đề phải có ít nhất 3 ký tự"),
  description: z.string().min(10, "Mô tả phải có ít nhất 10 ký tự"),
  subject_id: z.number(),
  level_id: z.number(),
  hourly_rate: z.coerce.number().min(10000, "Minimum is 10,000 VND"),
  teaching_mode: z.enum(["online", "offline", "both"]),
  status: z.enum(["active", "inactive"]).default("active"),
});

// Schema cho việc cập nhật khóa học (cho phép các trường optional)
export const courseUpdateSchema = z.object({
  title: z.string().min(3, "Tiêu đề phải có ít nhất 3 ký tự").optional(),
  description: z.string().min(10, "Mô tả phải có ít nhất 10 ký tự").optional(),
  subject_id: z.number().optional(),
  level_id: z.number().optional(),
  hourly_rate: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .optional(),
  teaching_mode: z.enum(["online", "offline", "both"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const subjectInsertSchema = createInsertSchema(subjects);
export const subjectSelectSchema = createSelectSchema(subjects);

export const educationLevelInsertSchema = createInsertSchema(educationLevels);
export const educationLevelSelectSchema = createSelectSchema(educationLevels);

// Schema cho việc gửi tin nhắn mới
export const messageSchema = z.object({
  content: z.string().min(1, "Nội dung tin nhắn không được để trống"),
});

export const favoriteTutorInsertSchema = createInsertSchema(favoriteTutors);
export const favoriteTutorSelectSchema = createSelectSchema(favoriteTutors);

export const subjectEducationLevelInsertSchema = createInsertSchema(
  subjectEducationLevels
);
export const subjectEducationLevelSelectSchema = createSelectSchema(
  subjectEducationLevels
);

export const bookingRequestInsertSchema = createInsertSchema(bookingRequests);
export const bookingSessionInsertSchema = createInsertSchema(bookingSessions);

// Bổ sung validation riêng cho booking request
export const bookingRequestValidationSchema = z.object({
  title: z.string().min(3, "Tiêu đề phải có ít nhất 3 ký tự"),
  student_id: z.number(),
  tutor_id: z.number(),
  course_id: z.number().optional(),
  description: z.string().optional(),
  mode: z.enum(["online", "offline"]),
  location: z.string().optional(),
  meeting_url: z.string().optional(),
  hourly_rate: z.number().or(z.string().transform((val) => parseFloat(val))),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  total_hours: z.number().optional(), // Trở thành optional vì sẽ tính toán trên server
  total_amount: z.number().optional(), // Trở thành optional vì sẽ tính toán trên server
  status: z.string().default("pending"),
});

// Schema cho booking session
export const bookingSessionValidationSchema = z.object({
  request_id: z.number(),
  title: z.string().min(3, "Tiêu đề phải có ít nhất 3 ký tự"),
  date: z.string(), // Hỗ trợ nhập ngày và chuyển đổi sang timestamp
  start_time: z.string(), // Định dạng "HH:MM"
  end_time: z.string(), // Định dạng "HH:MM"
  status: z.string().default("pending"),
});

export const bookingRequestSelectSchema = createSelectSchema(bookingRequests);
export const bookingSessionSelectSchema = createSelectSchema(bookingSessions);

// Schema cho cập nhật trạng thái booking request
export const bookingRequestStatusSchema = z.object({
  status: z.enum(
    ["pending", "confirmed", "completed", "cancelled", "rejected"],
    {
      errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
    }
  ),
  reason: z.string().optional(), // Lý do nếu từ chối hoặc hủy
});

// Schema cho cập nhật trạng thái booking session
export const bookingSessionStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
  }),
  reason: z.string().optional(), // Lý do nếu hủy buổi học
});

export const paymentInsertSchema = createInsertSchema(payments);
export const paymentSelectSchema = createSelectSchema(payments);

// Schema cho tạo thanh toán từ client
export const paymentSchema = z.object({
  booking_id: z.number(),
  payment_method: z.enum(["vnpay", "bank_transfer", "wallet"], {
    errorMap: () => ({ message: "Phương thức thanh toán không hợp lệ" }),
  }),
  return_url: z.string().url("URL trả về không hợp lệ").optional(),
});

export const sessionNoteInsertSchema = createInsertSchema(sessionNotes);
export const sessionNoteSelectSchema = createSelectSchema(sessionNotes);

// Schema cho thêm ghi chú buổi học
export const sessionNotesSchema = z.object({
  tutor_notes: z.string().optional(),
  student_rating: z.number().min(1).max(5).optional(),
  student_feedback: z.string().optional(),
});

// Schema for teaching schedules
export const teachingScheduleInsertSchema =
  createInsertSchema(teachingSchedules);
export const teachingScheduleSelectSchema =
  createSelectSchema(teachingSchedules);

// Schema validation cho lịch dạy
export const scheduleSchema = z.object({
  tutor_id: z.number().optional(), // Có thể lấy từ JWT token
  course_id: z.number().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày phải là YYYY-MM-DD"),
  start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Định dạng giờ phải là HH:MM"),
  end_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Định dạng giờ phải là HH:MM"),
  mode: z.enum(["online", "offline"], {
    errorMap: () => ({ message: "Chế độ dạy phải là online hoặc offline" }),
  }),
  location: z.string().optional(),
  is_recurring: z.boolean().default(false),
  status: z
    .enum(["available", "booked", "completed", "cancelled"])
    .default("available"),
});

// Schema cho việc tạo nhiều lịch cùng lúc (nếu cần)
export const batchScheduleSchema = z.object({
  schedules: z.array(scheduleSchema),
});

// Schema cho param id
export const idSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID phải là một số").transform(Number),
});

// Schema cho đặt lịch học (booking form)
export const bookingSchema = z
  .object({
    courseId: z.string({
      required_error: "Vui lòng chọn khóa học",
    }),
    tutorId: z.string({
      required_error: "Vui lòng chọn gia sư",
    }),
    mode: z.enum(["online", "offline"], {
      required_error: "Vui lòng chọn hình thức học",
    }),
    location: z.string().optional(),
    note: z
      .string()
      .max(300, "Lời nhắn không được vượt quá 300 ký tự")
      .optional(),
    bookings: z
      .array(
        z
          .object({
            date: z
              .string({
                required_error: "Vui lòng chọn ngày học",
              })
              .regex(
                /^\d{4}-\d{2}-\d{2}$/,
                "Định dạng ngày phải là YYYY-MM-DD"
              ),
            startTime: z
              .string({
                required_error: "Vui lòng chọn giờ bắt đầu",
              })
              .regex(
                /^([01]\d|2[0-3]):([0-5]\d)$/,
                "Định dạng giờ phải là HH:mm"
              ),
            endTime: z
              .string({
                required_error: "Vui lòng chọn giờ kết thúc",
              })
              .regex(
                /^([01]\d|2[0-3]):([0-5]\d)$/,
                "Định dạng giờ phải là HH:mm"
              ),
          })
          .refine(
            (data) => {
              // Convert time strings to comparable values
              const [startHour, startMinute] = data.startTime
                .split(":")
                .map(Number);
              const [endHour, endMinute] = data.endTime.split(":").map(Number);

              // Compare times to ensure end time is after start time
              if (endHour > startHour) return true;
              if (endHour === startHour) return endMinute > startMinute;
              return false;
            },
            {
              message: "Thời gian kết thúc phải sau thời gian bắt đầu",
              path: ["endTime"],
            }
          )
      )
      .min(1, { message: "Vui lòng chọn ít nhất một buổi học" }),
  })
  .refine(
    (data) => {
      // Validate that if mode is offline, location is provided
      if (data.mode === "offline") {
        return !!data.location && data.location.trim() !== "";
      }
      return true;
    },
    {
      message: "Vui lòng nhập địa điểm học khi chọn hình thức học trực tiếp",
      path: ["location"], // Path of the field where the error should be shown
    }
  );

// Schema cho lịch một buổi (không định kỳ)
const singleScheduleSchema = z.object({
  date: z.string({ required_error: "date is required" }),
  start_time: z.string({ required_error: "start_time is required" }),
  end_time: z.string({ required_error: "end_time is required" }),
  is_recurring: z.literal(false),
  mode: z.enum(["online", "offline"]),
  location: z.string().optional(),
});

// Schema cho lịch định kỳ
const recurringScheduleSchema = z.object({
  is_recurring: z.literal(true),
  start_date: z.string({ required_error: "start_date is required" }),
  end_date: z.string({ required_error: "end_date is required" }),
  repeat_schedule: z.record(
    z.string(),
    z.array(
      z.object({
        startTime: z.string({ required_error: "startTime is required" }),
        endTime: z.string({ required_error: "endTime is required" }),
      })
    )
  ),
  // Các trường dưới đây optional để chấp nhận nếu frontend gửi thừa
  date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  mode: z.enum(["online", "offline"]),
  location: z.string().optional(),
});

// Export schema dùng cho validate middleware
export const createScheduleSchema = z.union([
  singleScheduleSchema,
  recurringScheduleSchema,
]);

export const schema = {
  users,
  tutorProfiles,
  subjects,
  educationLevels,
  courses,
  bookingRequests,
  bookingSessions,
};

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

export type FavoriteTutor = typeof favoriteTutors.$inferSelect;
export type NewFavoriteTutor = typeof favoriteTutors.$inferInsert;

export type SubjectEducationLevel = typeof subjectEducationLevels.$inferSelect;
export type NewSubjectEducationLevel =
  typeof subjectEducationLevels.$inferInsert;

export type BookingRequest = typeof bookingRequests.$inferSelect;
export type NewBookingRequest = typeof bookingRequests.$inferInsert;

export type BookingSession = typeof bookingSessions.$inferSelect;
export type NewBookingSession = typeof bookingSessions.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type SessionNote = typeof sessionNotes.$inferSelect;
export type NewSessionNote = typeof sessionNotes.$inferInsert;

// Types for teaching schedules
export type TeachingSchedule = typeof teachingSchedules.$inferSelect;
export type NewTeachingSchedule = typeof teachingSchedules.$inferInsert;

// Add types for email OTPs
export type EmailOtp = typeof emailOtps.$inferSelect;
export type NewEmailOtp = typeof emailOtps.$inferInsert;

