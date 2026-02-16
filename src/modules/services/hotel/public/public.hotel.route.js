// src/modules/hotels/public/public.hotels.routes.js

import { Router } from "express";
import { PublicHotelsController } from "./public.hotel.controller.js";
import {
  validateGetAllHotels,
  validateHotelId,
  validateGetNearbyHotels,
} from "../hotel.validation.js";
import { authenticate } from "../../../../middlewares/auth.middleware.js";

const router = Router();

/* ============================================
   ALL ROUTES REQUIRE AUTHENTICATION
============================================ */

// Get trending hotels
router.get("/trending", authenticate, PublicHotelsController.getTrendingHotels);

// Get all hotels (active only)
router.get(
  "/",
  authenticate,
  validateGetAllHotels,
  PublicHotelsController.getAllHotels,
);

// Get hotel by ID
router.get(
  "/:hotelId",
  authenticate,
  validateHotelId,
  PublicHotelsController.getHotelById,
);

// Get nearby hotels for a place
router.get(
  "/near/place/:placeId",
  authenticate,
  validateGetNearbyHotels,
  PublicHotelsController.getNearbyHotels,
);

// Save hotel
router.post(
  "/:hotelId/save",
  authenticate,
  validateHotelId,
  PublicHotelsController.saveHotel,
);

// Unsave hotel
router.delete(
  "/:hotelId/save",
  authenticate,
  validateHotelId,
  PublicHotelsController.unsaveHotel,
);

// Get saved hotels
router.get(
  "/saved/my-hotels",
  authenticate,
  PublicHotelsController.getSavedHotels,
);

export default router;
