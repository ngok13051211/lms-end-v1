import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, desc, or } from "drizzle-orm";

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
        user: true
      }
    });
    
    if (!tutorProfile) {
      return res.status(404).json({ message: "Tutor not found" });
    }

    // Check if conversation already exists
    const existingConversation = await db.query.conversations.findFirst({
      where: and(
        eq(schema.conversations.student_id, studentId),
        eq(schema.conversations.tutor_id, tutorProfile.user.id)
      )
    });
    
    if (existingConversation) {
      return res.status(200).json({
        conversation: existingConversation,
        message: "Conversation already exists"
      });
    }
    
    // Create new conversation
    const [conversation] = await db.insert(schema.conversations)
      .values({
        student_id: studentId,
        tutor_id: tutorProfile.user.id,
        createdAt: new Date(),
        lastMessageAt: new Date()
      })
      .returning();
    
    // Create initial message if provided
    if (req.body.message) {
      await db.insert(schema.messages)
        .values({
          conversation_id: conversation.id,
          sender_id: studentId,
          content: req.body.message,
          createdAt: new Date()
        });
      
      // Update conversation's lastMessageAt
      await db.update(schema.conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(schema.conversations.id, conversation.id));
    }
    
    return res.status(201).json({
      message: "Conversation started successfully",
      conversation
    });
  } catch (error) {
    console.error("Start conversation error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get conversations for the current user
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
        where: eq(schema.conversations.studentId, userId),
        with: {
          tutor: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          messages: {
            orderBy: desc(schema.messages.createdAt),
            limit: 1
          }
        },
        orderBy: desc(schema.conversations.lastMessageAt)
      });
    } else if (userRole === "tutor") {
      // Get tutor's conversations
      conversations = await db.query.conversations.findMany({
        where: eq(schema.conversations.tutorId, userId),
        with: {
          student: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          messages: {
            orderBy: desc(schema.messages.createdAt),
            limit: 1
          }
        },
        orderBy: desc(schema.conversations.lastMessageAt)
      });
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Add last message to each conversation
    const conversationsWithLastMessage = conversations.map(conv => ({
      ...conv,
      lastMessage: conv.messages[0] || null
    }));
    
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
          eq(schema.conversations.studentId, userId),
          eq(schema.conversations.tutorId, userId)
        )
      ),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true
          }
        },
        tutor: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true
          }
        },
        messages: {
          orderBy: schema.messages.createdAt
        }
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found or you are not a participant" });
    }
    
    // Mark messages as read
    if (userRole === "student") {
      await db.update(schema.messages)
        .set({ isRead: true })
        .where(and(
          eq(schema.messages.conversationId, conversationId),
          eq(schema.messages.senderId, conversation.tutor.id),
          eq(schema.messages.isRead, false)
        ));
    } else if (userRole === "tutor") {
      await db.update(schema.messages)
        .set({ isRead: true })
        .where(and(
          eq(schema.messages.conversationId, conversationId),
          eq(schema.messages.senderId, conversation.student.id),
          eq(schema.messages.isRead, false)
        ));
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
          eq(schema.conversations.studentId, userId),
          eq(schema.conversations.tutorId, userId)
        )
      )
    });
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found or you are not a participant" });
    }
    
    // Create new message
    const [message] = await db.insert(schema.messages)
      .values({
        conversationId,
        senderId: userId,
        content: req.body.content.trim(),
        isRead: false,
        createdAt: new Date()
      })
      .returning();
    
    // Update conversation's lastMessageAt
    await db.update(schema.conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(schema.conversations.id, conversationId));
    
    return res.status(201).json({
      message: "Message sent successfully",
      data: message
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
          eq(schema.conversations.studentId, userId),
          eq(schema.conversations.tutorId, userId)
        )
      )
    });
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found or you are not a participant" });
    }
    
    // Check if message exists in the conversation
    const message = await db.query.messages.findFirst({
      where: and(
        eq(schema.messages.id, messageId),
        eq(schema.messages.conversationId, conversationId)
      )
    });
    
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }
    
    // Mark message as read if not the sender
    if (message.senderId !== userId) {
      await db.update(schema.messages)
        .set({ isRead: true })
        .where(eq(schema.messages.id, messageId));
    }
    
    return res.status(200).json({ message: "Message marked as read" });
  } catch (error) {
    console.error("Mark message as read error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};