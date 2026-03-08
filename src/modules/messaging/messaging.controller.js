// src/modules/messaging/messaging.controller.js

import { MessagingService } from "./messaging.service.js";

export const MessagingController = {
  /* ============================================
     SEND MESSAGE
  ============================================ */
  async sendMessage(req, res, next) {
    try {
      const { sosId } = req.params;
      const { message } = req.body;
      const userId = req.user.id;
      const userType = req.user.role === "user" ? "user" : req.user.role;

      const newMessage = await MessagingService.sendMessage(
        parseInt(sosId),
        userId,
        userType === "user" ? "user" : "admin",
        message,
      );

      return res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: newMessage,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET CONVERSATION MESSAGES
  ============================================ */
  async getConversation(req, res, next) {
    try {
      const { sosId } = req.params;
      const { page = 1, limit = 100 } = req.query;
      const userId = req.user.id;
      const userType = req.user.role === "user" ? "user" : req.user.role;

      const conversation = await MessagingService.getConversationMessages(
        parseInt(sosId),
        userId,
        userType,
        parseInt(page),
        parseInt(limit),
      );

      return res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET CONVERSATIONS LIST
  ============================================ */
  async getConversations(req, res, next) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const userId = req.user.id;
      const userRole = req.user.role;

      let conversations;

      if (userRole === "user") {
        // User's conversations
        conversations = await MessagingService.getUserConversations(
          userId,
          parseInt(page),
          parseInt(limit),
        );
      } else {
        // Admin's conversations
        conversations = await MessagingService.getAdminConversations(
          userId,
          parseInt(page),
          parseInt(limit),
        );
      }

      return res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET UNREAD COUNT
  ============================================ */
  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user.id;
      const userType = req.user.role === "user" ? "user" : req.user.role;

      const count = await MessagingService.getUnreadCount(userId, userType);

      return res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     MARK CONVERSATION AS READ
  ============================================ */
  async markAsRead(req, res, next) {
    try {
      const { sosId } = req.params;
      const userId = req.user.id;
      const userType = req.user.role === "user" ? "user" : req.user.role;

      const result = await MessagingService.markConversationAsRead(
        parseInt(sosId),
        userId,
        userType,
      );

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },
};
