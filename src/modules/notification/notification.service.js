// src/modules/notifications/notifications.service.js

import { NotificationsModel } from "./notification.model.js";
import {
  sendFCMNotification,
  sendFCMBatch,
  formatNotificationData,
  formatNotificationListItem,
  validateNotificationData,
  getPriorityLevel,
  buildFCMPayload,
  sanitizeNotificationBody,
} from "./notification.helper.js";

export class NotificationsService {
  /* ============================================
     CREATE NOTIFICATION (Internal - called by other services)
  ============================================ */
  static async createNotification(data) {
    try {
      // Validate data
      const validation = validateNotificationData(data);
      if (!validation.valid) {
        throw {
          status: 400,
          message: validation.errors.join(", "),
        };
      }

      // Sanitize body
      data.body = sanitizeNotificationBody(data.body);

      // Auto-determine priority if not set
      if (!data.priority) {
        data.priority = getPriorityLevel(data.type, data.category);
      }

      // Create notification
      const notification = await NotificationsModel.createNotification(data);

      // // Send FCM if userId is provided
      // if (data.userId) {
      //   await this.sendFCMToUser(data.userId, notification);
      // }

      return formatNotificationData(notification);
    } catch (error) {
      console.error("Create notification error:", error);
      throw error;
    }
  }

  /* ============================================
     CREATE BROADCAST NOTIFICATION (ADMIN)
  ============================================ */
  static async createBroadcastNotification(data, createdBy) {
    try {
      // Validate data
      const validation = validateNotificationData(data);
      if (!validation.valid) {
        throw {
          status: 400,
          message: validation.errors.join(", "),
        };
      }

      // Sanitize body
      data.body = sanitizeNotificationBody(data.body);

      // Auto-determine priority if not set
      if (!data.priority) {
        data.priority = getPriorityLevel(data.type, data.category);
      }

      // Create broadcast notification
      const notification = await NotificationsModel.createBroadcastNotification(
        data,
        createdBy,
      );

      // Send FCM to all users (async - don't wait)
      this.sendFCMToAllUsers(notification);

      return formatNotificationData(notification);
    } catch (error) {
      console.error("Create broadcast notification error:", error);
      throw error;
    }
  }

  /* ============================================
     SEND FCM TO USER
  ============================================ */
  static async sendFCMToUser(userId, notification) {
    try {
      const tokens = await NotificationsModel.getUserDeviceTokens(userId);

      if (tokens.length === 0) {
        console.log(`No device tokens found for user ${userId}`);
        return;
      }

      const fcmPayload = buildFCMPayload(notification);

      for (const tokenData of tokens) {
        await sendFCMNotification(
          tokenData.token,
          {
            title: fcmPayload.title,
            body: fcmPayload.body,
          },
          fcmPayload.data,
        );
      }
    } catch (error) {
      console.error("Send FCM to user error:", error);
      // Don't throw - FCM failure shouldn't break notification creation
    }
  }

  /* ============================================
     SEND FCM TO ALL USERS (Broadcast)
  ============================================ */
  static async sendFCMToAllUsers(notification) {
    try {
      // Get all active user tokens
      const query = `
        SELECT dt.token, dt.device_type
        FROM device_tokens dt
        JOIN users u ON dt.user_id = u.id
        WHERE u.is_active = TRUE
        AND dt.is_active = TRUE;
      `;

      // This would need to be added to NotificationsModel, or we can use a direct query here
      // For simplicity, let's assume we have this method
      const allTokens = await NotificationsModel.getAllUserDeviceTokens();

      if (allTokens.length === 0) {
        console.log("No device tokens found for broadcast");
        return;
      }

      const fcmPayload = buildFCMPayload(notification);
      const tokenStrings = allTokens.map((t) => t.token);

      // Send in batches
      await sendFCMBatch(
        tokenStrings,
        {
          title: fcmPayload.title,
          body: fcmPayload.body,
        },
        fcmPayload.data,
      );
    } catch (error) {
      console.error("Send FCM to all users error:", error);
      // Don't throw - FCM failure shouldn't break notification creation
    }
  }

  /* ============================================
     SEND FCM TO ADMINS (for SOS alerts)
  ============================================ */
  static async sendFCMToAdmins(notification) {
    try {
      const adminTokens = await NotificationsModel.getAdminDeviceTokens();

      if (adminTokens.length === 0) {
        console.log("No admin device tokens found");
        return;
      }

      const fcmPayload = buildFCMPayload(notification);
      const tokenStrings = adminTokens.map((t) => t.token);

      // Send in batches
      const result = await sendFCMBatch( 
        tokenStrings,
        {
          title: fcmPayload.title,
          body: fcmPayload.body,
        },
        fcmPayload.data,
      );

      console.log(
        `FCM sent to ${result.successCount} admins, ${result.failureCount} failed`,
      );

      return result;
    } catch (error) {
      console.error("Send FCM to admins error:", error);
      return { successCount: 0, failureCount: 0 };
    }
  }

  /* ============================================
     GET USER NOTIFICATIONS
  ============================================ */
  static async getUserNotifications({
    userId,
    category = "all",
    isRead,
    type,
    page = 1,
    limit = 20,
  }) {
    const offset = (page - 1) * limit;

    const notifications = await NotificationsModel.getUserNotifications({
      userId,
      category,
      isRead,
      type,
      limit,
      offset,
    });

    const total = await NotificationsModel.countUserNotifications({
      userId,
      category,
      isRead,
      type,
    });

    return {
      notifications: notifications.map(formatNotificationListItem),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /* ============================================
     GET UNREAD COUNT
  ============================================ */
  static async getUnreadCount(userId) {
    return await NotificationsModel.getUnreadCount(userId);
  }

  /* ============================================
     GET NOTIFICATION BY ID
  ============================================ */
  static async getNotificationById(notificationId, userId, userRole) {
    const notification =
      await NotificationsModel.getNotificationById(notificationId);

    if (!notification) {
      throw { status: 404, message: "Notification not found" };
    }

    // Check permissions (users can only see their own or broadcast notifications)
    if (userRole === "tourist") {
      if (notification.user_id && notification.user_id !== userId) {
        throw { status: 403, message: "Access denied" };
      }
    }

    return formatNotificationData(notification);
  }

  /* ============================================
     MARK NOTIFICATION AS READ
  ============================================ */
  static async markAsRead(notificationId, userId) {
    const notification =
      await NotificationsModel.getNotificationById(notificationId);

    if (!notification) {
      throw { status: 404, message: "Notification not found" };
    }

    // Can only mark own notifications as read
    if (notification.user_id !== userId) {
      throw {
        status: 403,
        message: "You can only mark your own notifications as read",
      };
    }

    if (notification.is_read) {
      return formatNotificationData(notification);
    }

    const updated = await NotificationsModel.markAsRead(notificationId, userId);
    return formatNotificationData(updated);
  }

  /* ============================================
     MARK ALL AS READ
  ============================================ */
  static async markAllAsRead(userId, category = "all") {
    await NotificationsModel.markAllAsRead(userId, category);

    return {
      message: `All ${category === "all" ? "" : category} notifications marked as read`,
    };
  }

  /* ============================================
     UPDATE NOTIFICATION (ADMIN)
  ============================================ */
  static async updateNotification(notificationId, data, adminId) {
    const notification =
      await NotificationsModel.getNotificationById(notificationId);

    if (!notification) {
      throw { status: 404, message: "Notification not found" };
    }

    // Only creator can update (or superadmin)
    if (notification.created_by !== adminId) {
      throw {
        status: 403,
        message: "You can only update notifications you created",
      };
    }

    // Sanitize body if provided
    if (data.body) {
      data.body = sanitizeNotificationBody(data.body);
    }

    const updated = await NotificationsModel.updateNotification(
      notificationId,
      data,
    );

    return formatNotificationData(updated);
  }

  /* ============================================
     DELETE NOTIFICATION (ADMIN)
  ============================================ */
  static async deleteNotification(notificationId, adminId, isSuperAdmin) {
    const notification =
      await NotificationsModel.getNotificationById(notificationId);

    if (!notification) {
      throw { status: 404, message: "Notification not found" };
    }

    // Only creator can delete (or superadmin)
    if (!isSuperAdmin && notification.created_by !== adminId) {
      throw {
        status: 403,
        message: "You can only delete notifications you created",
      };
    }

    await NotificationsModel.deleteNotification(notificationId);

    return { message: "Notification deleted successfully" };
  }

  /* ============================================
     GET ALL NOTIFICATIONS (ADMIN - for management)
  ============================================ */
  static async getAllNotifications({
    category = "all",
    type,
    createdBy,
    sortBy = "created_at",
    order = "desc",
    page = 1,
    limit = 20,
  }) {
    const offset = (page - 1) * limit;

    const notifications = await NotificationsModel.getAllNotifications({
      category,
      type,
      createdBy,
      sortBy,
      order,
      limit,
      offset,
    });

    const total = await NotificationsModel.countAllNotifications({
      category,
      type,
      createdBy,
    });

    return {
      notifications: notifications.map(formatNotificationData),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /* ============================================
     SAVE DEVICE TOKEN
  ============================================ */
  static async saveDeviceToken(userId, token, deviceType, deviceInfo) {
    const savedToken = await NotificationsModel.saveDeviceToken(
      userId,
      token,
      deviceType,
      deviceInfo,
    );

    return {
      message: "Device token saved successfully",
      token: savedToken.token,
    };
  }

  /* ============================================
     DELETE DEVICE TOKEN
  ============================================ */
  static async deleteDeviceToken(token) {
    await NotificationsModel.deleteDeviceToken(token);

    return {
      message: "Device token deleted successfully",
    };
  }
}