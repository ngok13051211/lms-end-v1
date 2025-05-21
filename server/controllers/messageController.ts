import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, or, count } from "drizzle-orm";

// Gửi tin nhắn trực tiếp (tự động tạo conversation nếu chưa tồn tại)
export const sendDirectMessage = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const recipientId = req.body.recipient_id;
        const content = req.body.content?.trim();
        const attachmentUrl = req.body.attachment_url;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!content) {
            return res.status(400).json({ message: "Message content is required" });
        }

        // Kiểm tra vai trò người dùng và xác định student_id, tutor_id
        let studentId: number;
        let tutorId: number;

        if (userRole === "student") {
            studentId = userId;
            tutorId = recipientId;

            // Kiểm tra xem recipient có phải là tutor không
            const tutorExists = await db.query.users.findFirst({
                where: and(
                    eq(schema.users.id, recipientId),
                    eq(schema.users.role, "tutor")
                )
            });

            if (!tutorExists) {
                return res.status(400).json({ message: "Recipient must be a tutor" });
            }
        } else if (userRole === "tutor") {
            tutorId = userId;
            studentId = recipientId;

            // Kiểm tra xem recipient có phải là student không
            const studentExists = await db.query.users.findFirst({
                where: and(
                    eq(schema.users.id, recipientId),
                    eq(schema.users.role, "student")
                )
            });

            if (!studentExists) {
                return res.status(400).json({ message: "Recipient must be a student" });
            }
        } else {
            return res.status(403).json({ message: "Only students and tutors can send messages" });
        }

        // Tìm conversation hiện tại giữa student và tutor
        let conversation = await db.query.conversations.findFirst({
            where: and(
                eq(schema.conversations.student_id, studentId),
                eq(schema.conversations.tutor_id, tutorId)
            )
        });

        // Nếu không tồn tại conversation, tạo mới
        if (!conversation) {
            try {
                const [newConversation] = await db.insert(schema.conversations)
                    .values({
                        student_id: studentId,
                        tutor_id: tutorId,
                        last_message_at: new Date(),
                        created_at: new Date()
                    })
                    .returning();

                conversation = newConversation;
            } catch (error) {
                // Xử lý lỗi khi conversation đã tồn tại (ràng buộc UNIQUE)
                // Có thể là do race condition, thử tìm lại conversation
                conversation = await db.query.conversations.findFirst({
                    where: and(
                        eq(schema.conversations.student_id, studentId),
                        eq(schema.conversations.tutor_id, tutorId)
                    )
                });

                if (!conversation) {
                    throw new Error("Failed to find or create conversation");
                }
            }
        }

        // Tạo tin nhắn mới
        const [message] = await db.insert(schema.messages)
            .values({
                conversation_id: conversation.id,
                sender_id: userId,
                content: content,
                attachment_url: attachmentUrl || null,
                read: false,
                created_at: new Date()
            })
            .returning();

        // Cập nhật last_message_at
        await db.update(schema.conversations)
            .set({ last_message_at: new Date() })
            .where(eq(schema.conversations.id, conversation.id));

        return res.status(201).json({
            message: "Message sent successfully",
            data: {
                conversation_id: conversation.id,
                message
            }
        });
    } catch (error) {
        console.error("Send direct message error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
