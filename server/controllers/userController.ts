import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql, or } from "drizzle-orm";

/**
 * @desc    Search for users by name or email
 * @route   GET /api/v1/users/search
 * @access  Private
 */
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const searchQuery = req.query.query as string;

    if (!searchQuery || searchQuery.trim() === "") {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Phân trang
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Xây dựng điều kiện tìm kiếm
    const searchCondition = sql`(
      ${schema.users.first_name} ILIKE ${`%${searchQuery}%`} OR 
      ${schema.users.last_name} ILIKE ${`%${searchQuery}%`} OR 
      ${schema.users.email} ILIKE ${`%${searchQuery}%`}
    )`;

    // Đảm bảo không tìm kiếm chính mình
    const userCondition = and(
      searchCondition,
      sql`${schema.users.id} != ${userId}`
    );

    // Tùy vào vai trò mà có điều kiện tìm kiếm khác nhau
    let roleCondition;
    if (userRole === "student") {
      // Học viên chỉ được tìm kiếm gia sư
      roleCondition = eq(schema.users.role, "tutor");
    } else if (userRole === "tutor") {
      // Gia sư chỉ được tìm kiếm học viên
      roleCondition = eq(schema.users.role, "student");
    } else if (userRole === "admin") {
      // Admin được tìm kiếm tất cả
      roleCondition = or(
        eq(schema.users.role, "student"),
        eq(schema.users.role, "tutor")
      );
    }

    // Kết hợp các điều kiện
    const conditions = and(userCondition, roleCondition);

    // Lấy danh sách người dùng phù hợp
    const users = await db.query.users.findMany({
      where: conditions,
      orderBy: [
        desc(schema.users.role),  // Ưu tiên sắp xếp theo vai trò
        desc(schema.users.created_at)
      ],
      limit: limit,
      offset: offset,
      columns: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        avatar: true,
        role: true,
        created_at: true,
        // Không chọn password và các trường nhạy cảm khác
      },
    });

    // Đếm tổng số người dùng khớp
    const [{ value }] = await db
      .select({
        value: sql<number>`count(*)`,
      })
      .from(schema.users)
      .where(conditions);

    const count = Number(value);

    return res.status(200).json({
      users,
      total: count,
      total_pages: Math.ceil(count / limit),
      current_page: page,
    });
  } catch (error) {
    console.error("Search users error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};