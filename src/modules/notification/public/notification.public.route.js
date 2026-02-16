// src/modules/notifications/public/notifications.public.routes.js

import { Router } from "express";
import { NotificationsPublicController } from "./notification.public.controller.js";
import {
  validateGetUserNotifications,
  validateNotificationId,
  validateMarkAsRead,
  validateMarkAllAsRead,
  validateSaveDeviceToken,
  validateDeleteDeviceToken,
} from "../notification.validation.js";
import { authenticate } from "../../../middlewares/auth.middleware.js";

const router = Router();

/* ============================================
   USER ROUTES (Authenticated)
============================================ */

// Get my notifications
router.get(
  "/",
  authenticate,
  validateGetUserNotifications,
  NotificationsPublicController.getMyNotifications,
);

// Get unread count
router.get(
  "/unread-count",
  authenticate,
  NotificationsPublicController.getUnreadCount,
);

// Get notification by ID
router.get(
  "/:notificationId",
  authenticate,
  validateNotificationId,
  NotificationsPublicController.getNotificationById,
);

// Mark notification as read
router.patch(
  "/:notificationId/read",
  authenticate,
  validateMarkAsRead,
  NotificationsPublicController.markAsRead,
);

// Mark all as read
router.post(
  "/mark-all-read",
  authenticate,
  validateMarkAllAsRead,
  NotificationsPublicController.markAllAsRead,
);

// Save device token (for FCM)
router.post(
  "/device-token",
  authenticate,
  validateSaveDeviceToken,
  NotificationsPublicController.saveDeviceToken,
);

// Delete device token
router.delete(
  "/device-token",
  authenticate,
  validateDeleteDeviceToken,
  NotificationsPublicController.deleteDeviceToken,
);

export default router;
