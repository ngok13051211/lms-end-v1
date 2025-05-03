import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, like, or, desc } from "drizzle-orm";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const userData = schema.registerSchema.parse(req.body);
    
    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: or(
        eq(schema.users.email, userData.email),
        eq(schema.users.username, userData.username)
      )
    });
    
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === userData.email 
          ? "Email already in use" 
          : "Username already taken"
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Create user
    const [newUser] = await db.insert(schema.users)
      .values({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        role: schema.users.role,
        avatar: schema.users.avatar,
        created_at: schema.users.created_at,
      });
    
    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, role: userData.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return res.status(201).json({
      message: "User registered successfully",
      user: newUser,
      token // Send token to client for storage in localStorage
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const loginData = schema.loginSchema.parse(req.body);
    
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, loginData.email)
    });
    
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    // Compare passwords
    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Return user data (excluding password) and token
    const { password, ...userData } = user;
    
    return res.status(200).json({
      message: "Login successful",
      user: userData,
      token // Send token to client for storage in localStorage
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Logout user
export const logout = (req: Request, res: Response) => {
  res.clearCookie('token');
  return res.status(200).json({ message: "Logout successful" });
};

// Get current authenticated user
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId)
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Return user data (excluding password)
    const { password, ...userData } = user;
    
    return res.status(200).json({
      user: userData
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Update only allowed fields (first_name, last_name)
    const updates = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      updated_at: new Date()
    };
    
    const [updatedUser] = await db.update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, userId))
      .returning({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        role: schema.users.role,
        avatar: schema.users.avatar,
        created_at: schema.users.created_at,
        updated_at: schema.users.updated_at
      });
    
    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Update user avatar
export const updateAvatar = async (req: Request, res: Response) => {
  try {
    console.log("updateAvatar controller called");
    
    const userId = req.user?.id;
    
    if (!userId) {
      console.log("Unauthorized - no user ID in request");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Get uploaded avatar URL from Cloudinary (set by the upload middleware)
    const avatarUrl = req.body.avatarUrl;
    
    console.log("Avatar URL from middleware:", avatarUrl);
    
    if (!avatarUrl) {
      console.log("No avatar URL provided in request body");
      return res.status(400).json({ message: "No avatar provided" });
    }
    
    // Get the user's current avatar to delete it from Cloudinary if it exists
    const currentUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { avatar: true }
    });
    
    console.log("Current user avatar:", currentUser?.avatar);
    
    // Here we could add code to delete the previous avatar from Cloudinary
    // if it exists and was uploaded to Cloudinary (starts with cloudinary URL)
    // using deleteFromCloudinary function
    
    console.log("Updating user avatar in database");
    // Update user's avatar
    const [updatedUser] = await db.update(schema.users)
      .set({
        avatar: avatarUrl,
        updated_at: new Date()
      })
      .where(eq(schema.users.id, userId))
      .returning({
        id: schema.users.id,
        avatar: schema.users.avatar
      });
    
    console.log("User avatar updated successfully:", updatedUser);
    
    return res.status(200).json({
      message: "Avatar updated successfully",
      avatar: updatedUser.avatar
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};

// Get all users (admin only)
export const getUsers = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string || '';
    const role = req.query.role as string || 'all';
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '10');
    const offset = (page - 1) * pageSize;
    
    // Build query conditions
    let conditions = [];
    
    // Add search condition if provided
    if (search) {
      conditions.push(
        or(
          like(schema.users.first_name, `%${search}%`),
          like(schema.users.last_name, `%${search}%`),
          like(schema.users.email, `%${search}%`),
          like(schema.users.username, `%${search}%`)
        )
      );
    }
    
    // Add role condition if not 'all'
    if (role !== 'all') {
      conditions.push(eq(schema.users.role, role));
    }
    
    // Combine conditions
    const whereClause = conditions.length > 0 
      ? and(...conditions) 
      : undefined;
    
    // Get users with pagination
    const users = await db.query.users.findMany({
      where: whereClause,
      limit: pageSize,
      offset,
      orderBy: desc(schema.users.created_at)
    });
    
    // Get total count for pagination
    const countResult = await db.select({ count: count() }).from(schema.users).where(whereClause || undefined);
    const total = countResult[0].count || 0;
    
    // Return users without passwords
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userData } = user;
      return userData;
    });
    
    return res.status(200).json({
      users: usersWithoutPasswords,
      total,
      totalPages: Math.ceil(total / pageSize),
      currentPage: page
    });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get admin dashboard stats
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    // Count total users
    const totalUsersResult = await db.select({ count: count() }).from(schema.users);
    const totalUsers = totalUsersResult[0].count || 0;
    
    // Count verified tutors
    const verifiedTutorsResult = await db.select({ count: count() }).from(schema.tutorProfiles)
      .where(eq(schema.tutorProfiles.is_verified, true));
    const verifiedTutors = verifiedTutorsResult[0].count || 0;
    
    // Count pending verifications
    const pendingVerificationsResult = await db.select({ count: count() }).from(schema.tutorProfiles)
      .where(eq(schema.tutorProfiles.is_verified, false));
    const pendingVerifications = pendingVerificationsResult[0].count || 0;
    
    // Count users by role
    const studentCount = await db.select({ count: count() }).from(schema.users)
      .where(eq(schema.users.role, "student"));
    const tutorCount = await db.select({ count: count() }).from(schema.users)
      .where(eq(schema.users.role, "tutor"));
    const adminCount = await db.select({ count: count() }).from(schema.users)
      .where(eq(schema.users.role, "admin"));
    
    // Return stats
    return res.status(200).json({
      totalUsers,
      verifiedTutors,
      pendingVerifications,
      usersByRole: {
        students: studentCount[0].count || 0,
        tutors: tutorCount[0].count || 0,
        admins: adminCount[0].count || 0
      }
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function for count() with TypeScript
function count() {
  return { aliasedAs: (name: string) => ({ name }) };
}
