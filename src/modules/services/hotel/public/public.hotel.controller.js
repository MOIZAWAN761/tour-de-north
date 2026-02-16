// src/modules/hotels/public/public.hotels.controller.js

import { HotelsService } from "../hotel.service.js";

export const PublicHotelsController = {
  /* ============================================
     GET TRENDING HOTELS
  ============================================ */
  async getTrendingHotels(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit = 10 } = req.query;

      const hotels = await HotelsService.getTrendingHotels(
        parseInt(limit),
        userId,
      );

      return res.status(200).json({
        success: true,
        data: hotels,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET ALL HOTELS (Active only)
  ============================================ */
  async getAllHotels(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        search,
        region,
        isAllSeason,
        sortBy = "created_at",
        order = "desc",
        page = 1,
        limit = 20,
      } = req.query;

      // Users can only see active hotels
      const result = await HotelsService.getAllHotels({
        search,
        region,
        isAllSeason:
          isAllSeason === "true"
            ? true
            : isAllSeason === "false"
              ? false
              : undefined,
        isActive: true, // Only active hotels
        sortBy,
        order,
        page: parseInt(page),
        limit: parseInt(limit),
        userId,
      });

      return res.status(200).json({
        success: true,
        data: result.hotels,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET HOTEL BY ID
  ============================================ */
  async getHotelById(req, res, next) {
    try {
      const { hotelId } = req.params;
      const userId = req.user.id;

      const hotel = await HotelsService.getHotelById(
        parseInt(hotelId),
        userId,
        true, // Increment view count
      );

      // Check if hotel is active (users should only see active hotels)
      if (!hotel.isActive && req.user.role === "tourist") {
        throw { status: 404, message: "Hotel not found" };
      }

      return res.status(200).json({
        success: true,
        data: hotel,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET NEARBY HOTELS (for a specific place)
  ============================================ */
  async getNearbyHotels(req, res, next) {
    try {
      const { placeId } = req.params;
      const userId = req.user.id;
      const { radius = 10 } = req.query;

      const hotels = await HotelsService.getNearbyHotels(
        parseInt(placeId),
        userId,
        parseInt(radius),
      );

      return res.status(200).json({
        success: true,
        data: hotels,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     SAVE HOTEL
  ============================================ */
  async saveHotel(req, res, next) {
    try {
      const { hotelId } = req.params;
      const userId = req.user.id;

      const result = await HotelsService.saveHotel(userId, parseInt(hotelId));

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
     UNSAVE HOTEL
  ============================================ */
  async unsaveHotel(req, res, next) {
    try {
      const { hotelId } = req.params;
      const userId = req.user.id;

      const result = await HotelsService.unsaveHotel(userId, parseInt(hotelId));

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET SAVED HOTELS
  ============================================ */
  async getSavedHotels(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const result = await HotelsService.getSavedHotels(
        userId,
        parseInt(page),
        parseInt(limit),
      );

      return res.status(200).json({
        success: true,
        data: result.hotels,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },
};
