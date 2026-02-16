// src/modules/profile/public/profile.public.controller.js

import { ProfileService } from "../profile.service.js";

export const PublicProfileController = {
  /* ============================================
     GET OWN PROFILE
  ============================================ */
  async getOwnProfile(req, res, next) {
    try {
      const userId = req.user.id;

      const profile = await ProfileService.getOwnProfile(userId);

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     UPDATE OWN PROFILE
  ============================================ */
  async updateOwnProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const updates = req.body;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const profile = await ProfileService.updateOwnProfile(
        userId,
        updates,
        ipAddress,
        userAgent,
      );

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     UPLOAD PROFILE IMAGE
  ============================================ */
  async uploadProfileImage(req, res, next) {
    try {
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      const result = await ProfileService.uploadProfileImage(
        userId,
        req.file.buffer,
        ipAddress,
        userAgent,
      );

      return res.status(200).json({
        success: true,
        message: "Profile image uploaded successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     DELETE PROFILE IMAGE
  ============================================ */
  async deleteProfileImage(req, res, next) {
    try {
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const result = await ProfileService.deleteProfileImage(
        userId,
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
};
