// src/modules/places/public/places.public.routes.js

import { Router } from "express";
import { PlacesPublicController } from "./place.public.controller.js";
import { validateGetAllPlaces, validatePlaceId } from "../place.validation.js";
import { authenticate } from "../../../middlewares/auth.middleware.js";


const router = Router();

/* ============================================
   PUBLIC ROUTES (No auth required)
============================================ */

// Get trending places
router.get(
  "/trending",
  authenticate,
  PlacesPublicController.getTrendingPlaces,
);

// Get all places (active only)
router.get(
  "/",
 authenticate,
  validateGetAllPlaces,
  PlacesPublicController.getAllPlaces,
);

// Get place by ID
router.get(
  "/:placeId",
  authenticate, // 
  validatePlaceId,
  PlacesPublicController.getPlaceById,
);



// Save place
router.post(
  "/:placeId/save",
  authenticate,
  validatePlaceId,
  PlacesPublicController.savePlace,
);

// Unsave place
router.delete(
  "/:placeId/save",
  authenticate,
  validatePlaceId,
  PlacesPublicController.unsavePlace,
);

// Get saved places
router.get(
  "/saved/my-places",
  authenticate,
  PlacesPublicController.getSavedPlaces,
);

export default router;
