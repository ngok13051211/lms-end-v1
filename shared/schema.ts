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
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("student"), // "student", "tutor", "admin"
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tutor Profile Model
export const tutorProfiles = pgTable("tutor_profiles", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  bio: text("bio").notNull(),
  education: text("education").notNull(),
  experience: text("experience").notNull(),
  hourly_rate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  teaching_mode: text("teaching_mode").notNull(), // "online", "offline", "both"
  is_verified: boolean("is_verified").default(false),
  is_featured: boolean("is_featured").default(false),
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
  tutorCount: integer("tutor_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Education Levels Model
export const educationLevels = pgTable("education_levels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// Tutor Ads Model
export const ads = pgTable("ads", {
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
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Messages Model
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversation_id: integer("conversation_id").notNull().references(() => conversations.id),
  sender_id: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reviews Model
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  student_id: integer("student_id").notNull().references(() => users.id),
  tutor_id: integer("tutor_id").notNull().references(() => tutorProfiles.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(users, ({ one, many }) => ({
  tutorProfile: one(tutorProfiles, {
    fields: [users.id],
    references: [tutorProfiles.user_id],
  }),
  sentMessages: many(messages, {
    fields: [users.id],
    references: [messages.sender_id],
  }),
  studentConversations: many(conversations, {
    fields: [users.id],
    references: [conversations.student_id],
  }),
  tutorConversations: many(conversations, {
    fields: [users.id],
    references: [conversations.tutor_id],
  }),
  reviews: many(reviews, {
    fields: [users.id],
    references: [reviews.student_id],
  }),
}));

export const tutorProfilesRelations = relations(tutorProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [tutorProfiles.user_id],
    references: [users.id],
  }),
  subjects: many(tutorSubjects, {
    fields: [tutorProfiles.id],
    references: [tutorSubjects.tutor_id],
  }),
  educationLevels: many(tutorEducationLevels, {
    fields: [tutorProfiles.id],
    references: [tutorEducationLevels.tutor_id],
  }),
  ads: many(ads, {
    fields: [tutorProfiles.id],
    references: [ads.tutor_id],
  }),
  reviews: many(reviews, {
    fields: [tutorProfiles.id],
    references: [reviews.tutor_id],
  }),
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

export const subjectsRelations = relations(subjects, ({ many }) => ({
  tutors: many(tutorSubjects, {
    fields: [subjects.id],
    references: [tutorSubjects.subject_id],
  }),
  ads: many(ads, {
    fields: [subjects.id],
    references: [ads.subject_id],
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
  tutors: many(tutorEducationLevels, {
    fields: [educationLevels.id],
    references: [tutorEducationLevels.level_id],
  }),
  ads: many(ads, {
    fields: [educationLevels.id],
    references: [ads.level_id],
  }),
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
  messages: many(messages, {
    fields: [conversations.id],
    references: [messages.conversation_id],
  }),
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

// Create Schemas for validation
export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  role: z.enum(["student", "tutor", "admin"]).default("student"),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const userInsertSchema = createInsertSchema(users);
export const userSelectSchema = createSelectSchema(users);

export const tutorProfileInsertSchema = createInsertSchema(tutorProfiles);
export const tutorProfileSelectSchema = createSelectSchema(tutorProfiles);

export const adInsertSchema = createInsertSchema(ads);
export const adSelectSchema = createSelectSchema(ads);

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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type TutorProfile = typeof tutorProfiles.$inferSelect;
export type NewTutorProfile = typeof tutorProfiles.$inferInsert;

export type Ad = typeof ads.$inferSelect;
export type NewAd = typeof ads.$inferInsert;

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
