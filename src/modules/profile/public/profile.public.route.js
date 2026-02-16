// src/modules/profile/public/profile.public.routes.js

import { Router } from "express";
import { PublicProfileController } from "./profile.public.controller.js";
import { validateUpdateProfile } from "../profile.validation.js";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { upload } from "../profile.helper.js";

const router = Router();

/* ============================================
   ALL ROUTES REQUIRE AUTHENTICATION
============================================ */

// Get own profile
router.get("/me", authenticate, PublicProfileController.getOwnProfile);

// Update own profile
router.patch(
  "/me",
  authenticate,
  validateUpdateProfile,
  PublicProfileController.updateOwnProfile,
);

// Upload profile image
router.post(
  "/me/image",
  authenticate,
  upload.single("image"),
  PublicProfileController.uploadProfileImage,
);

// Delete profile image
router.delete(
  "/me/image",
  authenticate,
  PublicProfileController.deleteProfileImage,
);

export default router;
