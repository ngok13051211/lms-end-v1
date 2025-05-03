import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: string;
      };
    }
  }
}

// Middleware to verify JWT and attach user to request
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from cookies or Authorization header
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    ) as {
      id: number;
      role: string;
    };

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, decoded.id),
      columns: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

// Middleware to check user role
export const roleMiddleware = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    next();
  };
};