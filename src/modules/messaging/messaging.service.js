// src/modules/messaging/messaging.service.js

import { MessagingModel } from "./messaging.model.js";
import { PanicAlarmModel } from "../panicAlarm/panicAlarm.model.js";
import { formatMessage, formatConversation } from "./messaging.helper.js";
import { getIO } from "../../config/socket.js";

export class MessagingService {
  /* ============================================
     SEND MESSAGE
  ============================================ */
  static async sendMessage(sosId, senderId, senderType, message) {
    try {
      // 1. Check if messaging is allowed
      const permission = await MessagingModel.isMessagingAllowed(
        sosId,
        senderId,
        senderType,
      );

      if (!permission.allowed) {
        throw { status: 403, message: permission.reason };
      }

      // 2. Create message
      const newMessage = await MessagingModel.createMessage(
        sosId,
        senderId,
        senderType,
        message,
      );

      // 3. Get sender info for response
      const messages = await MessagingModel.getConversationMessages(sosId, 1, 0);
      const formattedMessage = formatMessage(messages[0]);

      // 4. Emit via WebSocket
      const io = getIO();
      const conversationInfo = await MessagingModel.getConversationInfo(sosId);

      // Determine recipient
      const recipientId =
        senderType === "user"
          ? conversationInfo.acknowledged_by
          : conversationInfo.user_id;

      // Emit to recipient's room
      io.to(`user:${recipientId}`).emit("new_message", {
        sosId,
        message: formattedMessage,
      });

      // Emit to sender (for multi-device sync)
      io.to(`user:${senderId}`).emit("message_sent", {
        sosId,
        message: formattedMessage,
      });

      return formattedMessage;
    } catch (error) {
      console.error("Send message error:", error);
      throw error;
    }
  }

  /* ============================================
     GET CONVERSATION MESSAGES
  ============================================ */
  static async getConversationMessages(sosId, userId, userType, page = 1, limit = 100) {
    try {
      // 1. Check permissions
      const permission = await MessagingModel.isMessagingAllowed(
        sosId,
        userId,
        userType,
      );

      if (!permission.allowed) {
        throw { status: 403, message: permission.reason };
      }

      // 2. Get messages
      const offset = (page - 1) * limit;
      const messages = await MessagingModel.getConversationMessages(
        sosId,
        limit,
        offset,
      );

      // 3. Mark messages as read
      await MessagingModel.markMessagesAsRead(sosId, userId, userType);

      // 4. Get conversation info
      const conversationInfo = await MessagingModel.getConversationInfo(sosId);

      return {
        conversationInfo: {
          sosId: conversationInfo.sos_id,
          status: conversationInfo.status,
          user: {
            id: conversationInfo.user_id,
            name: conversationInfo.user_name,
            avatar: conversationInfo.user_avatar,
          },
          admin: conversationInfo.acknowledged_by
            ? {
                id: conversationInfo.acknowledged_by,
                name: conversationInfo.admin_name,
                avatar: conversationInfo.admin_avatar,
              }
            : null,
          messagingEnabled: permission.allowed,
        },
        messages: messages.map(formatMessage),
      };
    } catch (error) {
      console.error("Get conversation messages error:", error);
      throw error;
    }
  }

  /* ============================================
     GET USER CONVERSATIONS (List)
  ============================================ */
  static async getUserConversations(userId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const conversations = await MessagingModel.getUserConversations(
      userId,
      limit,
      offset,
    );

    return conversations.map(formatConversation);
  }

  /* ============================================
     GET ADMIN CONVERSATIONS (List)
  ============================================ */
  static async getAdminConversations(adminId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const conversations = await MessagingModel.getAdminConversations(
      adminId,
      limit,
      offset,
    );

    return conversations.map(formatConversation);
  }

  /* ============================================
     GET UNREAD COUNT
  ============================================ */
  static async getUnreadCount(userId, userType) {
    return await MessagingModel.getUnreadCount(userId, userType);
  }

  /* ============================================
     MARK CONVERSATION AS READ
  ============================================ */
  static async markConversationAsRead(sosId, userId, userType) {
    try {
      // Check permissions
      const permission = await MessagingModel.isMessagingAllowed(
        sosId,
        userId,
        userType,
      );

      if (!permission.allowed) {
        throw { status: 403, message: permission.reason };
      }

      await MessagingModel.markMessagesAsRead(sosId, userId, userType);

      // Emit to user's room (update unread count in real-time)
      const io = getIO();
      const unreadCount = await this.getUnreadCount(userId, userType);

      io.to(`user:${userId}`).emit("unread_count_updated", {
        count: unreadCount,
      });

      return { message: "Conversation marked as read" };
    } catch (error) {
      console.error("Mark conversation as read error:", error);
      throw error;
    }
  }

  /* ============================================
     HANDLE TYPING INDICATOR (WebSocket only)
  ============================================ */
  static emitTypingIndicator(sosId, userId, isTyping) {
    try {
      const io = getIO();

      // Get SOS info to determine recipient
      PanicAlarmModel.getSOSById(sosId).then((sos) => {
        if (!sos) return;

        const recipientId =
          sos.user_id === userId ? sos.acknowledged_by : sos.user_id;

        io.to(`user:${recipientId}`).emit("typing_indicator", {
          sosId,
          userId,
          isTyping,
        });
      });
    } catch (error) {
      console.error("Typing indicator error:", error);
    }
  }
}