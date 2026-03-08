// src/modules/places/police/places.police.controller.js

import { PlacesService } from "../place.service.js";

export const PlacesPoliceController = {
  /* ============================================
     CREATE PLACE (ADMIN ONLY)
  ============================================ */
  async createPlace(req, res, next) {
    try {
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const mainImageFile = req.file ? req.file.buffer : null;

      const place = await PlacesService.createPlace(
        req.body,
        mainImageFile,
        userId,
        ipAddress,
        userAgent,
      );

      return res.status(201).json({
        success: true,
        message: "Place created successfully",
        data: place,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET ALL PLACES (ADMIN/POLICE)
  ============================================ */
  async getAllPlaces(req, res, next) {
    try {
      const {
        search,
        region,
        type,
        safetyStatus,
        sortBy = "created_at",
        order = "desc",
        page = 1,
        limit = 20,
      } = req.query;
      console.log(req.user);

      // Admin can see all places (active and inactive)
      const result = await PlacesService.getAllPlaces({
        search,
        region,
        type,
        safetyStatus,
        isActive: undefined, // Show all
        sortBy,
        order,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      return res.status(200).json({
        success: true,
        data: result.places,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET PLACE BY ID (ADMIN/POLICE)
  ============================================ */
  async getPlaceById(req, res, next) {
    try {
      const { placeId } = req.params;

      const place = await PlacesService.getPlaceById(
        parseInt(placeId),
        null,
        false, // Don't increment view count for admin/police
      );

      return res.status(200).json({
        success: true,
        data: place,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     UPDATE PLACE (ADMIN ONLY)
  ============================================ */
  async updatePlace(req, res, next) {
    try {
      const { placeId } = req.params;
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const newMainImage = req.file ? req.file.buffer : null;

      const place = await PlacesService.updatePlace(
        parseInt(placeId),
        req.body,
        newMainImage,
        userId,
        ipAddress,
        userAgent,
      );

      return res.status(200).json({
        success: true,
        message: "Place updated successfully",
        data: place,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     UPDATE SAFETY STATUS (ADMIN & POLICE)
  ============================================ */
  async updateSafetyStatus(req, res, next) {
    try {
      const { placeId } = req.params;
      const { safetyStatus, safetyMessage, safetyFlags } = req.body;
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const place = await PlacesService.updateSafetyStatus(
        parseInt(placeId),
        safetyStatus,
        safetyMessage,
        safetyFlags,
        userId,
        ipAddress,
        userAgent,
      );

      return res.status(200).json({
        success: true,
        message: "Safety status updated successfully",
        data: place,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     UPDATE ACTIVE STATUS (ADMIN ONLY)
  ============================================ */
  async updateActiveStatus(req, res, next) {
    try {
      const { placeId } = req.params;
      const { isActive } = req.body;
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const place = await PlacesService.updateActiveStatus(
        parseInt(placeId),
        isActive,
        userId,
        ipAddress,
        userAgent,
      );

      return res.status(200).json({
        success: true,
        message: `Place ${isActive ? "activated" : "deactivated"} successfully`,
        data: place,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     DELETE PLACE (ADMIN ONLY)
  ============================================ */
  async deletePlace(req, res, next) {
    try {
      const { placeId } = req.params;
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const result = await PlacesService.deletePlace(
        parseInt(placeId),
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

  /* ============================================
     ADD PLACE IMAGE (ADMIN ONLY)
  ============================================ */
  async addPlaceImage(req, res, next) {
    try {
      const { placeId } = req.params;
      const { caption, displayOrder } = req.body;
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Image file is required",
        });
      }

      const image = await PlacesService.addPlaceImage(
        parseInt(placeId),
        req.file.buffer,
        caption,
        parseInt(displayOrder) || 0,
        userId,
        ipAddress,
        userAgent,
      );

      return res.status(201).json({
        success: true,
        message: "Image added successfully",
        data: image,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     DELETE PLACE IMAGE (ADMIN ONLY)
  ============================================ */
  async deletePlaceImage(req, res, next) {
    try {
      const { placeId, imageId } = req.params;
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const result = await PlacesService.deletePlaceImage(
        parseInt(placeId),
        parseInt(imageId),
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

  /* ============================================
     GET AUDIT HISTORY (ADMIN ONLY)
  ============================================ */
  async getAuditHistory(req, res, next) {
    try {
      const { placeId } = req.params;
      const { limit = 50 } = req.query;

      const history = await PlacesService.getPlaceAuditHistory(
        parseInt(placeId),
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
