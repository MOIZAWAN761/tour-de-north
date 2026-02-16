// src/modules/hotels/police/police.hotels.routes.js

import { Router } from "express";
import { PoliceHotelsController } from "./police.hotel.controller.js";
import {
  validateCreateHotel,
  validateUpdateHotel,
  validateUpdateActiveStatus,
  validateHotelId,
  validateImageId,
  validateAddImage,
  validateGetAllHotels,
  validateAuditHistory,
} from "../hotel.validation.js";
import { authenticate,authorize } from "../../../../middlewares/auth.middleware.js";

import { upload } from "../hotel.helper.js";

const router = Router();

/* ============================================
   ALL ROUTES REQUIRE AUTHENTICATION
============================================ */

/* ============================================
   ADMIN ONLY ROUTES
============================================ */

// Create hotel
router.post(
  "/",
  authenticate,
  authorize(["admin", "superadmin"]),
  upload.single("image"),
  validateCreateHotel,
  PoliceHotelsController.createHotel,
);

// Update hotel
router.patch(
  "/:hotelId",
  authenticate,
  authorize(["admin", "superadmin"]),
  upload.single("image"),
  validateUpdateHotel,
  PoliceHotelsController.updateHotel,
);

// Update active status
router.patch(
  "/:hotelId/active-status",
  authenticate,
  authorize(["admin", "superadmin"]),
  validateUpdateActiveStatus,
  PoliceHotelsController.updateActiveStatus,
);

// Delete hotel
router.delete(
  "/:hotelId",
  authenticate,
  authorize(["admin", "superadmin"]),
  validateHotelId,
  PoliceHotelsController.deleteHotel,
);

// Add hotel image
router.post(
  "/:hotelId/images",
  authenticate,
  authorize(["admin", "superadmin"]),
  upload.single("image"),
  validateAddImage,
  PoliceHotelsController.addHotelImage,
);

// Delete hotel image
router.delete(
  "/:hotelId/images/:imageId",
  authenticate,
  authorize(["admin", "superadmin"]),
  validateImageId,
  PoliceHotelsController.deleteHotelImage,
);

// Get audit history
router.get(
  "/:hotelId/audit-history",
  authenticate,
  authorize(["admin", "superadmin"]),
  validateAuditHistory,
  PoliceHotelsController.getAuditHistory,
);

/* ============================================
   ADMIN & POLICE ROUTES
============================================ */

// Get all hotels (includes inactive)
router.get(
  "/",
  authenticate,
  authorize(["admin", "superadmin", "police"]),
  validateGetAllHotels,
  PoliceHotelsController.getAllHotels,
);

// Get hotel by ID
router.get(
  "/:hotelId",
  authenticate,
  authorize(["admin", "superadmin", "police"]),
  validateHotelId,
  PoliceHotelsController.getHotelById,
);

export default router;
