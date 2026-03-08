// src/modules/jeeps/jeeps.public.routes.js

import express from "express";
import { JeepsPublicController } from "./public.jeep.controller.js";
import { validateJeepId, validateGetAllJeeps } from "../jeep.validation.js";
import { param } from "express-validator";
import { handleValidationErrors } from "../jeep.validation.js";
import { authenticate } from "../../../../middlewares/auth.middleware.js";

const router = express.Router();

/* ============================================
   ALL ROUTES REQUIRE AUTHENTICATION
============================================ */
router.use(authenticate);

/* ============================================
   PUBLIC JEEP ROUTES (USERS)
============================================ */

// Get all jeeps (active and available only)
router.get("/", validateGetAllJeeps, JeepsPublicController.getAllJeeps);

// Get trending jeeps
router.get("/trending", JeepsPublicController.getTrendingJeeps);

// Get jeeps by region
router.get(
  "/region/:region",
  [
    param("region")
      .notEmpty()
      .isIn(["Kaghan", "Naran", "Shogran"])
      .withMessage("Region must be one of: Kaghan, Naran, Shogran"),
    handleValidationErrors,
  ],
  JeepsPublicController.getJeepsByRegion,
);

// Get jeep by ID (with view increment)
router.get("/:jeepId", validateJeepId, JeepsPublicController.getJeepById);

/* ============================================
   SAVED JEEPS ROUTES (AUTHENTICATED USERS)
   Note: These routes require authentication middleware
============================================ */

// Get saved jeeps
router.get("/saved/all", JeepsPublicController.getSavedJeeps);

// Save jeep
router.post("/:jeepId/save", validateJeepId, JeepsPublicController.saveJeep);

// Unsave jeep
router.delete(
  "/:jeepId/save",
  validateJeepId,
  JeepsPublicController.unsaveJeep,
);

export default router;
