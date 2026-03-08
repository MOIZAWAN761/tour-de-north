// src/modules/jeeps/jeeps.police.routes.js

import express from "express";
import { JeepsPoliceController } from "./police.jeep.controller.js";
import { upload } from "../jeep.helper.js";
import {
  authenticate,
  authorize,
} from "../../../../middlewares/auth.middleware.js";
import {
  validateCreateDriver,
  validateUpdateDriver,
  validateUpdateDriverActiveStatus,
  validateDriverId,
  validateGetAllDrivers,
  validateDriverAuditHistory,
  validateCreateJeep,
  validateCreateJeepWithDriver,
  validateUpdateJeep,
  validateUpdateAvailability,
  validateUpdateJeepActiveStatus,
  validateJeepId,
  validateGetAllJeeps,
  validateJeepAuditHistory,
} from "../jeep.validation.js";

const router = express.Router();

/* ============================================
   ALL ROUTES REQUIRE AUTH + ROLE
============================================ */
router.use(authenticate, authorize("admin", "superadmin", "police"));

/* ============================================
   DRIVER ROUTES (ADMIN/POLICE)
============================================ */

// Create driver
router.post(
  "/drivers",
  validateCreateDriver,
  JeepsPoliceController.createDriver,
);

// Get all drivers
router.get(
  "/drivers",
  validateGetAllDrivers,
  JeepsPoliceController.getAllDrivers,
);

// Get driver by ID
router.get(
  "/drivers/:driverId",
  validateDriverId,
  JeepsPoliceController.getDriverById,
);

// Update driver
router.patch(
  "/drivers/:driverId",
  validateUpdateDriver,
  JeepsPoliceController.updateDriver,
);

// Update driver active status
router.patch(
  "/drivers/:driverId/status",
  validateUpdateDriverActiveStatus,
  JeepsPoliceController.updateDriverActiveStatus,
);

// Delete driver
router.delete(
  "/drivers/:driverId",
  validateDriverId,
  JeepsPoliceController.deleteDriver,
);

// Get driver audit history
router.get(
  "/drivers/:driverId/audit",
  validateDriverAuditHistory,
  JeepsPoliceController.getDriverAuditHistory,
);

/* ============================================
   JEEP ROUTES (ADMIN/POLICE)
============================================ */

// Create jeep with new driver
router.post(
  "/jeeps",
  upload.single("image"),
  validateCreateJeep,
  JeepsPoliceController.createJeep,
);

// Create jeep with existing driver
router.post(
  "/jeeps/with-driver",
  upload.single("image"),
  validateCreateJeepWithDriver,
  JeepsPoliceController.createJeepWithExistingDriver,
);

// Get all jeeps
router.get("/jeeps", validateGetAllJeeps, JeepsPoliceController.getAllJeeps);

// Get jeep by ID
router.get("/jeeps/:jeepId", validateJeepId, JeepsPoliceController.getJeepById);

// Update jeep
router.patch(
  "/jeeps/:jeepId",
  upload.single("image"),
  validateUpdateJeep,
  JeepsPoliceController.updateJeep,
);

// Update jeep availability
router.patch(
  "/jeeps/:jeepId/availability",
  validateUpdateAvailability,
  JeepsPoliceController.updateAvailability,
);

// Update jeep active status
router.patch(
  "/jeeps/:jeepId/status",
  validateUpdateJeepActiveStatus,
  JeepsPoliceController.updateActiveStatus,
);

// Delete jeep
router.delete(
  "/jeeps/:jeepId",
  validateJeepId,
  JeepsPoliceController.deleteJeep,
);

// Get jeep audit history
router.get(
  "/jeeps/:jeepId/audit",
  validateJeepAuditHistory,
  JeepsPoliceController.getJeepAuditHistory,
);

export default router;
