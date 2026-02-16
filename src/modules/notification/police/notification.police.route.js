// src/modules/notifications/police/notifications.police.routes.js

import { Router } from "express";
import { NotificationsPoliceController } from "./notification.police.controller.js";
import {
  validateCreateNotification,
  validateUpdateNotification,
  validateGetAllNotifications,
  validateNotificationId,
} from "../notification.validation.js";
import {
  authenticate,
  authorize,
} from "../../../middlewares/auth.middleware.js";

const router = Router();

/* ============================================
   ADMIN ROUTES
============================================ */

// Create broadcast notification
router.post(
  "/",
  authenticate,
  authorize("admin", "superadmin"),
  validateCreateNotification,
  NotificationsPoliceController.createBroadcastNotification,
);

// Get all notifications (for management)
router.get(
  "/",
  authenticate,
  authorize("admin", "superadmin"),
  validateGetAllNotifications,
  NotificationsPoliceController.getAllNotifications,
);

// Get notification by ID
router.get(
  "/:notificationId",
  authenticate,
  authorize("admin", "superadmin"),
  validateNotificationId,
  NotificationsPoliceController.getNotificationById,
);

// Update notification
router.patch(
  "/:notificationId",
  authenticate,
  authorize("admin", "superadmin"),
  validateUpdateNotification,
  NotificationsPoliceController.updateNotification,
);

// Delete notification
router.delete(
  "/:notificationId",
  authenticate,
  authorize("admin", "superadmin"),
  validateNotificationId,
  NotificationsPoliceController.deleteNotification,
);

export default router;
