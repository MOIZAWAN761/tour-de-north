// src/modules/places/police/places.police.routes.js

import { Router } from "express";
import { PlacesPoliceController } from "./place.police.controller.js";
import {
  validateCreatePlace,
  validateUpdatePlace,
  validateUpdateSafetyStatus,
  validateUpdateActiveStatus,
  validateGetAllPlaces,
  validatePlaceId,
  validateAddPlaceImage,
  validateDeletePlaceImage,
} from "../place.validation.js";
import {
  authenticate,
  authorize,
} from "../../../middlewares/auth.middleware.js";
import { upload } from "../place.helper.js";

const router = Router();

/* ============================================
   ADMIN-ONLY ROUTES
============================================ */

// Create place
router.post(
  "/",
  authenticate,
  authorize("admin", "superadmin"),
  upload.single("image"),
  validateCreatePlace,
  PlacesPoliceController.createPlace,
);

// Update place
router.patch(
  "/:placeId",
  authenticate,
  authorize("admin", "superadmin"),
  upload.single("image"),
  validateUpdatePlace,
  PlacesPoliceController.updatePlace,
);

// Update active status
router.patch(
  "/:placeId/active-status",
  authenticate,
  authorize("admin", "superadmin"),
  validateUpdateActiveStatus,
  PlacesPoliceController.updateActiveStatus,
);

// Delete place
router.delete(
  "/:placeId",
  authenticate,
  authorize("admin", "superadmin"),
  validatePlaceId,
  PlacesPoliceController.deletePlace,
);

// Add place image
router.post(
  "/:placeId/images",
  authenticate,
  authorize("admin", "superadmin"),
  upload.single("image"),
  validateAddPlaceImage,
  PlacesPoliceController.addPlaceImage,
);

// Delete place image
router.delete(
  "/:placeId/images/:imageId",
  authenticate,
  authorize("admin", "superadmin"),
  validateDeletePlaceImage,
  PlacesPoliceController.deletePlaceImage,
);

// Get audit history (admin only)
router.get(
  "/:placeId/audit-history",
  authenticate,
  authorize("admin", "superadmin"),
  validatePlaceId,
  PlacesPoliceController.getAuditHistory,
);

/* ============================================
   ADMIN & POLICE ROUTES
============================================ */

// Get all places (includes inactive)
router.get(
  "/",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateGetAllPlaces,
  PlacesPoliceController.getAllPlaces,
);

// Get place by ID
router.get(
  "/:placeId",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validatePlaceId,
  PlacesPoliceController.getPlaceById,
);

// Update safety status (admin & police)
router.patch(
  "/:placeId/safety-status",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateUpdateSafetyStatus,
  PlacesPoliceController.updateSafetyStatus,
);

export default router;
