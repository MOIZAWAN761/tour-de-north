// src/modules/profile/police/profile.police.controller.js

import { ProfileService } from "../profile.service.js";

export const PoliceProfileController = {
  /* ============================================
     GET ALL PROFILES (LIST VIEW)
  ============================================ */
  async getAllProfiles(req, res, next) {
    try {
      const {
        search = "",
        sortBy = "created_at",
        order = "desc",
        page = 1,
        limit = 20,
      } = req.query;

      const result = await ProfileService.getAllProfiles({
        search,
        sortBy,
        order,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      return res.status(200).json({
        success: true,
        data: result.profiles,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET PROFILE BY ID (DETAILED VIEW)
  ============================================ */
  async getProfileById(req, res, next) {
    try {
      const { userId } = req.params;
      const adminId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const profile = await ProfileService.getProfileById(
        parseInt(userId),
        adminId,
        ipAddress,
        userAgent,
      );

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     UPDATE USER (INCLUDING SENSITIVE DATA)
  ============================================ */
  async updateUser(req, res, next) {
    try {
      const { userId } = req.params;
      const updates = req.body;
      const adminId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const profile = await ProfileService.updateUserByAdmin(
        parseInt(userId),
        updates,
        adminId,
        ipAddress,
        userAgent,
      );

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     DELETE USER
  ============================================ */
  async deleteUser(req, res, next) {
    try {
      const { userId } = req.params;
      const adminId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const result = await ProfileService.deleteUser(
        parseInt(userId),
        adminId,
        ipAddress,
        userAgent,
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
     GET AUDIT HISTORY
  ============================================ */
  async getAuditHistory(req, res, next) {
    try {
      const { userId } = req.params;
      const { limit = 50 } = req.query;

      const history = await ProfileService.getAuditHistory(
        parseInt(userId),
        parseInt(limit),
      );

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  },
};
