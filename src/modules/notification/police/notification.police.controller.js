// src/modules/notifications/police/notifications.police.controller.js

import { NotificationsService } from "../notification.service.js";

export const NotificationsPoliceController = {
  /* ============================================
     CREATE BROADCAST NOTIFICATION (ADMIN)
  ============================================ */
  async createBroadcastNotification(req, res, next) {
    try {
      const adminId = req.user.id;

      const notification =
        await NotificationsService.createBroadcastNotification(
          req.body,
          adminId,
        );

      return res.status(201).json({
        success: true,
        message: "Broadcast notification created successfully",
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET ALL NOTIFICATIONS (ADMIN - for management)
  ============================================ */
  async getAllNotifications(req, res, next) {
    try {
      const {
        category = "all",
        type,
        createdBy,
        sortBy = "created_at",
        order = "desc",
        page = 1,
        limit = 20,
      } = req.query;

      const result = await NotificationsService.getAllNotifications({
        category,
        type,
        createdBy: createdBy ? parseInt(createdBy) : null,
        sortBy,
        order,
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
     GET NOTIFICATION BY ID (ADMIN)
  ============================================ */
  async getNotificationById(req, res, next) {
    try {
      const { notificationId } = req.params;
      const adminId = req.user.id;
      const userRole = req.user.role;

      const notification = await NotificationsService.getNotificationById(
        parseInt(notificationId),
        adminId,
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
     UPDATE NOTIFICATION (ADMIN)
  ============================================ */
  async updateNotification(req, res, next) {
    try {
      const { notificationId } = req.params;
      const adminId = req.user.id;

      const notification = await NotificationsService.updateNotification(
        parseInt(notificationId),
        req.body,
        adminId,
      );

      return res.status(200).json({
        success: true,
        message: "Notification updated successfully",
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     DELETE NOTIFICATION (ADMIN)
  ============================================ */
  async deleteNotification(req, res, next) {
    try {
      const { notificationId } = req.params;
      const adminId = req.user.id;
      const isSuperAdmin = req.user.role === "superadmin";

      const result = await NotificationsService.deleteNotification(
        parseInt(notificationId),
        adminId,
        isSuperAdmin,
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
