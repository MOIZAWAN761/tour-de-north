// src/modules/profile/police/profile.police.routes.js

import { Router } from "express";
import { PoliceProfileController } from "./profile.police.controller.js";
import {
  validateGetAllProfiles,
  validateAdminUpdateUser,
} from "../profile.validation.js";
import {
  authenticate,
  authorize,
} from "../../../middlewares/auth.middleware.js";

const router = Router();

/* ============================================
   ALL ROUTES REQUIRE ADMIN/SUPERADMIN ROLE
============================================ */

// Get all profiles (list view with search & filters)
router.get(
  "/",
  authenticate,
  authorize("admin", "superadmin"),
  validateGetAllProfiles,
  PoliceProfileController.getAllProfiles,
);

// Get profile by ID (detailed view)
router.get(
  "/:userId",
  authenticate,
  authorize("admin", "superadmin"),
  PoliceProfileController.getProfileById,
);

// Update user (including sensitive data)
router.patch(
  "/:userId",
  authenticate,
  authorize("admin", "superadmin"),
  validateAdminUpdateUser,
  PoliceProfileController.updateUser,
);

// Delete user
router.delete(
  "/:userId",
  authenticate,
  authorize("admin", "superadmin"),
  PoliceProfileController.deleteUser,
);

// Get audit history for user
router.get(
  "/:userId/audit-history",
  authenticate,
  authorize("admin", "superadmin"),
  PoliceProfileController.getAuditHistory,
);

export default router;
