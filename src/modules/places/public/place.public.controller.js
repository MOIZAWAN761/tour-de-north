// src/modules/places/public/places.public.controller.js

import { PlacesService } from "../place.service.js";

export const PlacesPublicController = {
  /* ============================================
     GET TRENDING PLACES
  ============================================ */
  async getTrendingPlaces(req, res, next) {
    try {
      const userId = req.user.id; 
      const { limit = 10 } = req.query;

      const places = await PlacesService.getTrendingPlaces(
        parseInt(limit),
        userId,
      );

      return res.status(200).json({
        success: true,
        data: places,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET ALL PLACES (ACTIVE ONLY)
  ============================================ */
  async getAllPlaces(req, res, next) {
    try {
      const userId = req.user.id; 
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

      // Public users can only see active places
      const result = await PlacesService.getAllPlaces({
        search,
        region,
        type,
        safetyStatus,
        isActive: true, // Only active places
        sortBy,
        order,
        page: parseInt(page),
        limit: parseInt(limit),
        userId,
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
     GET PLACE BY ID
  ============================================ */
  async getPlaceById(req, res, next) {
    try {
      const { placeId } = req.params;
      const userId = req.user.id; 

      const place = await PlacesService.getPlaceById(
        parseInt(placeId),
        userId,
        true, // Increment view count
      );

      // Check if place is active (public users should only see active places)
      if (!place.isActive && (!req.user || req.user.role === "tourist")) {
        throw { status: 404, message: "Place not found" };
      }

      return res.status(200).json({
        success: true,
        data: place,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     SAVE PLACE (USER)
  ============================================ */
  async savePlace(req, res, next) {
    try {
      const { placeId } = req.params;
      const userId = req.user.id;

      const result = await PlacesService.savePlace(userId, parseInt(placeId));

      return res.status(200).json({
        success: true,
        message: result.message,
        alreadySaved: result.alreadySaved || false,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     UNSAVE PLACE (USER)
  ============================================ */
  async unsavePlace(req, res, next) {
    try {
      const { placeId } = req.params;
      const userId = req.user.id;

      const result = await PlacesService.unsavePlace(userId, parseInt(placeId));

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET SAVED PLACES (USER)
  ============================================ */
  async getSavedPlaces(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const result = await PlacesService.getSavedPlaces(
        userId,
        parseInt(page),
        parseInt(limit),
      );

      return res.status(200).json({
        success: true,
        data: result.places,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },
};
