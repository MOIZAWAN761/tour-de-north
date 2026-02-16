// src/modules/messaging/messaging.routes.js

import { Router } from "express";
import { MessagingController } from "./messaging.controller.js";
import {
  validateSendMessage,
  validateGetConversation,
  validateGetConversations,
  validateMarkAsRead,
} from "./messaging.validation.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

/* ============================================
   MESSAGING ROUTES (All authenticated users)
============================================ */

// Get conversations list (WhatsApp-like)
router.get(
  "/",
  authenticate,
  validateGetConversations,
  MessagingController.getConversations,
);

// Get unread messages count
router.get("/unread-count", authenticate, MessagingController.getUnreadCount);

// Get conversation messages (chat window)
router.get(
  "/:sosId",
  authenticate,
  validateGetConversation,
  MessagingController.getConversation,
);

// Send message
router.post(
  "/:sosId",
  authenticate,
  validateSendMessage,
  MessagingController.sendMessage,
);

// Mark conversation as read
router.patch(
  "/:sosId/read",
  authenticate,
  validateMarkAsRead,
  MessagingController.markAsRead,
);

export default router;
