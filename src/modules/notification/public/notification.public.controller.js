// src/modules/notifications/public/notifications.public.controller.js

import { NotificationsService } from "../notification.service.js";

export const NotificationsPublicController = {
  /* ============================================
     GET MY NOTIFICATIONS
  ============================================ */
  async getMyNotifications(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        category = "all",
        isRead,
        type,
        page = 1,
        limit = 20,
      } = req.query;

      const result = await NotificationsService.getUserNotifications({
        userId,
        category,
        isRead: isRead !== undefined ? isRead === "true" : undefined,
        type,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      return res.status(200).json({
        success: true,
        data: result.notifications,
        pagination: result.pagination,
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

      const counts = await NotificationsService.getUnreadCount(userId);

      return res.status(200).json({
        success: true,
        data: counts,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET NOTIFICATION BY ID
  ============================================ */
  async getNotificationById(req, res, next) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const notification = await NotificationsService.getNotificationById(
        parseInt(notificationId),
        userId,
        userRole,
      );

      return res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     MARK NOTIFICATION AS READ
  ============================================ */
  async markAsRead(req, res, next) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await NotificationsService.markAsRead(
        parseInt(notificationId),
        userId,
      );

      return res.status(200).json({
        success: true,
        message: "Notification marked as read",
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     MARK ALL AS READ
  ============================================ */
  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      const { category = "all" } = req.body;

      const result = await NotificationsService.markAllAsRead(userId, category);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     SAVE DEVICE TOKEN
  ============================================ */
  async saveDeviceToken(req, res, next) {
    try {
      const userId = req.user.id;
      const { token, deviceType, deviceInfo } = req.body;

      const result = await NotificationsService.saveDeviceToken(
        userId,
        token,
        deviceType,
        deviceInfo,
      );

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     DELETE DEVICE TOKEN
  ============================================ */
  async deleteDeviceToken(req, res, next) {
    try {
      const { token } = req.body;

      const result = await NotificationsService.deleteDeviceToken(token);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },
};
