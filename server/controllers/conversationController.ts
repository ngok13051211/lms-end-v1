import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, desc, or, count } from "drizzle-orm";

// Start a new conversation with a tutor
export const startConversation = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    const tutorId = parseInt(req.params.tutorId);

    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(tutorId)) {
      return res.status(400).json({ message: "Invalid tutor ID" });
    }

    // Check if tutor exists
    const tutorProfile = await db.query.tutorProfiles.findFirst({
      where: eq(schema.tutorProfiles.id, tutorId),
      with: {
        user: true,
      },
    });

    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor not found" });
    }

    // Check if conversation already exists
    const existingConversation = await db.query.conversations.findFirst({
      where: and(
        eq(schema.conversations.student_id, studentId),
        eq(schema.conversations.tutor_id, tutorProfile.user.id)
      ),
    });

    if (existingConversation) {
      return res.status(200).json({
        conversation: existingConversation,
        message: "Conversation already exists",
      });
    }

    // Create new conversation
    const [conversation] = await db
      .insert(schema.conversations)
      .values({
        student_id: studentId,
        tutor_id: tutorProfile.user.id,
        last_message_at: new Date(),
        created_at: new Date(),
      })
      .returning();

    return res.status(201).json({
      message: "Conversation started successfully",
      conversation,
    });
  } catch (error) {
    console.error("Start conversation error:", error);
    // Add more detailed error information
    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      tutorId: req.params.tutorId,
      studentId: req.user?.id,
    };
    console.error(
      "Detailed error info:",
      JSON.stringify(errorDetails, null, 2)
    );
    return res.status(500).json({
      message: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? errorDetails : undefined,
    });
  }
};

// Get user's conversations
export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let conversations;

    if (userRole === "student") {
      // Get student's conversations
      conversations = await db.query.conversations.findMany({
        where: eq(schema.conversations.student_id, userId),
        with: {
          tutor: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
              avatar: true,
              role: true,
              email: true,
            },
          },
          messages: {
            orderBy: desc(schema.messages.created_at),
            limit: 1,
          },
        },
        orderBy: desc(schema.conversations.last_message_at),
      });
    } else if (userRole === "tutor") {
      // Get tutor's conversations
      conversations = await db.query.conversations.findMany({
        where: eq(schema.conversations.tutor_id, userId),
        with: {
          student: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
              avatar: true,
              role: true,
              email: true,
            },
          },
          messages: {
            orderBy: desc(schema.messages.created_at),
            limit: 1,
          },
        },
        orderBy: desc(schema.conversations.last_message_at),
      });
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Add last message to each conversation and unread count
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        // Calculate unread message count
        let unreadQuery;

        if (userRole === "student") {
          // When user is a student, we check for unread messages from the tutor
          if ("tutor" in conv) {
            // Check if tutor property exists
            unreadQuery = await db
              .select({ count: count() })
              .from(schema.messages)
              .where(
                and(
                  eq(schema.messages.conversation_id, conv.id),
                  eq(schema.messages.sender_id, conv.tutor.id),
                  eq(schema.messages.read, false)
                )
              );
          } else {
            // Fallback if tutor property doesn't exist
            unreadQuery = [{ count: 0 }];
          }
        } else {
          // When user is a tutor, we check for unread messages from the student
          if ("student" in conv) {
            // Check if student property exists
            unreadQuery = await db
              .select({ count: count() })
              .from(schema.messages)
              .where(
                and(
                  eq(schema.messages.conversation_id, conv.id),
                  eq(schema.messages.sender_id, conv.student.id),
                  eq(schema.messages.read, false)
                )
              );
          } else {
            // Fallback if student property doesn't exist
            unreadQuery = [{ count: 0 }];
          }
        }

        const unread_count = parseInt(String(unreadQuery[0].count), 10);

        return {
          ...conv,
          last_message: conv.messages[0] || null,
          unread_count,
        };
      })
    );

    return res.status(200).json(conversationsWithLastMessage);
  } catch (error) {
    console.error("Get conversations error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get a specific conversation with messages
export const getConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const conversationId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    // Check if conversation exists and the user is a participant
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(schema.conversations.id, conversationId),
        or(
          eq(schema.conversations.student_id, userId),
          eq(schema.conversations.tutor_id, userId)
        )
      ),
      with: {
        student: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
            email: true,
            role: true,
          },
        },
        tutor: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
            email: true,
            role: true,
          },
        },
        messages: {
          orderBy: schema.messages.created_at,
        },
      },
    });

    if (!conversation) {
      return res
        .status(404)
        .json({
          message: "Conversation not found or you are not a participant",
        });
    }

    // Mark messages as read
    if (userRole === "student") {
      await db
        .update(schema.messages)
        .set({ read: true })
        .where(
          and(
            eq(schema.messages.conversation_id, conversationId),
            eq(schema.messages.sender_id, conversation.tutor.id),
            eq(schema.messages.read, false)
          )
        );
    } else if (userRole === "tutor") {
      await db
        .update(schema.messages)
        .set({ read: true })
        .where(
          and(
            eq(schema.messages.conversation_id, conversationId),
            eq(schema.messages.sender_id, conversation.student.id),
            eq(schema.messages.read, false)
          )
        );
    }

    return res.status(200).json(conversation);
  } catch (error) {
    console.error("Get conversation error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Send a message in a conversation
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const conversationId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    if (!req.body.content?.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    // Check if conversation exists and the user is a participant
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(schema.conversations.id, conversationId),
        or(
          eq(schema.conversations.student_id, userId),
          eq(schema.conversations.tutor_id, userId)
        )
      ),
    });

    if (!conversation) {
      return res
        .status(404)
        .json({
          message: "Conversation not found or you are not a participant",
        });
    }

    // Create new message
    const [message] = await db
      .insert(schema.messages)
      .values({
        conversation_id: conversationId,
        sender_id: userId,
        content: req.body.content.trim(),
        attachment_url: req.body.attachment_url || null,
        read: false,
        created_at: new Date(),
      })
      .returning();

    // Update conversation's last_message_at
    await db
      .update(schema.conversations)
      .set({ last_message_at: new Date() })
      .where(eq(schema.conversations.id, conversationId));

    return res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Mark a message as read
export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const conversationId = parseInt(req.params.id);
    const messageId = parseInt(req.params.messageId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(conversationId) || isNaN(messageId)) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    // Check if conversation exists and the user is a participant
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(schema.conversations.id, conversationId),
        or(
          eq(schema.conversations.student_id, userId),
          eq(schema.conversations.tutor_id, userId)
        )
      ),
    });

    if (!conversation) {
      return res
        .status(404)
        .json({
          message: "Conversation not found or you are not a participant",
        });
    }

    // Check if message exists in the conversation
    const message = await db.query.messages.findFirst({
      where: and(
        eq(schema.messages.id, messageId),
        eq(schema.messages.conversation_id, conversationId)
      ),
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Mark message as read if not the sender
    if (message.sender_id !== userId) {
      await db
        .update(schema.messages)
        .set({ read: true })
        .where(eq(schema.messages.id, messageId));
    }

    return res.status(200).json({ message: "Message marked as read" });
  } catch (error) {
    console.error("Mark message as read error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get messages for a specific conversation
export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const conversationId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    // Check if conversation exists and the user is a participant
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(schema.conversations.id, conversationId),
        or(
          eq(schema.conversations.student_id, userId),
          eq(schema.conversations.tutor_id, userId)
        )
      ),
      columns: {
        id: true,
        student_id: true,
        tutor_id: true,
      },
    });

    if (!conversation) {
      return res
        .status(404)
        .json({
          message: "Conversation not found or you are not a participant",
        });
    }

    // Fetch messages for the conversation, ordered by creation time ascending
    const messages = await db.query.messages.findMany({
      where: eq(schema.messages.conversation_id, conversationId),
      orderBy: schema.messages.created_at,
      with: {
        sender: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // Mark messages as read
    if (userRole === "student") {
      await db
        .update(schema.messages)
        .set({ read: true })
        .where(
          and(
            eq(schema.messages.conversation_id, conversationId),
            eq(schema.messages.sender_id, conversation.tutor_id),
            eq(schema.messages.read, false)
          )
        );
    } else if (userRole === "tutor") {
      await db
        .update(schema.messages)
        .set({ read: true })
        .where(
          and(
            eq(schema.messages.conversation_id, conversationId),
            eq(schema.messages.sender_id, conversation.student_id),
            eq(schema.messages.read, false)
          )
        );
    }

    return res.status(200).json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
