// src/modules/jeeps/jeeps.public.controller.js

import { JeepsService } from "../jeep.service.js";

export const JeepsPublicController = {
  /* ============================================
     JEEP OPERATIONS (PUBLIC)
  ============================================ */

  /* Get jeep by ID (with view increment) */
  async getJeepById(req, res, next) {
    try {
      const { jeepId } = req.params;

      const result = await JeepsService.getJeepById(
        parseInt(jeepId),
        req.user?.id,
        true, // Increment view count for public access
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Get all jeeps (active and available only) */
  async getAllJeeps(req, res, next) {
    try {
      const { search, region, sortBy, order, page, limit } = req.query;

      const result = await JeepsService.getAllJeeps({
        search,
        region,
        isAvailable: true, // Only available jeeps
        isActive: true, // Only active jeeps
        sortBy,
        order,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        userId: req.user?.id,
      });

      res.status(200).json({
        success: true,
        data: result.jeeps,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Get jeeps by region (for places) */
  async getJeepsByRegion(req, res, next) {
    try {
      const { region } = req.params;

      const result = await JeepsService.getJeepsByRegion(region, req.user?.id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Get trending jeeps */
  async getTrendingJeeps(req, res, next) {
    try {
      const { limit } = req.query;

      const result = await JeepsService.getTrendingJeeps(
        limit ? parseInt(limit) : 10,
        req.user?.id,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     SAVED JEEPS OPERATIONS
  ============================================ */

  /* Save jeep */
  async saveJeep(req, res, next) {
    try {
      const { jeepId } = req.params;

      const result = await JeepsService.saveJeep(req.user.id, parseInt(jeepId));

      res.status(200).json({
        success: true,
        message: result.message,
        alreadySaved: result.alreadySaved,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Unsave jeep */
  async unsaveJeep(req, res, next) {
    try {
      const { jeepId } = req.params;

      const result = await JeepsService.unsaveJeep(
        req.user.id,
        parseInt(jeepId),
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  /* Get saved jeeps */
  async getSavedJeeps(req, res, next) {
    try {
      const { page, limit } = req.query;

      const result = await JeepsService.getSavedJeeps(
        req.user.id,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 20,
      );

      res.status(200).json({
        success: true,
        data: result.jeeps,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },
};
