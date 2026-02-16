// // src/routes/auth.routes.js

import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import {
  validateSignup,
  validateLogin,
  validateResetPassword,
  validateUpdateProfile,
  validateUpdateUser,
  validateRefreshToken,
  validateLogout,
} from "./auth.validation.js";

import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { rateLimiter } from "../../middlewares/auth.rateLimiter.middleware.js";

const router = Router();
/* ======================================================
   PUBLIC ROUTES
====================================================== */

// Signup - Rate limit: 5 requests per 15 minutes per IP
router.post(
  "/signup",
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }),
  validateSignup,
  AuthController.signup
);

// Login - Rate limit: 10 requests per 15 minutes per IP
router.post(
  "/login",
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  validateLogin,
  AuthController.login
);

// Reset password - Rate limit: 3 requests per 15 minutes per IP
router.post(
  "/reset-password",
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 3 }),
  validateResetPassword,
  AuthController.resetPassword
);

// Refresh token - Rate limit: 20 requests per 15 minutes
router.post(
  "/refresh-token",
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }),
  validateRefreshToken,
  AuthController.refreshToken
);

/* ======================================================
   USER PROTECTED ROUTES
====================================================== */

// Logout
router.post(
  "/logout",
  authenticate,
  validateLogout,
  AuthController.logout
);

// Update own profile
// router.patch(
//   "/profile",
//   authenticate,
//   validateUpdateProfile,
//   AuthController.updateProfile
// );

// Get trusted devices
router.get(
  "/devices",
  authenticate,
  AuthController.getTrustedDevices
);

// Remove trusted device
router.delete(
  "/devices/:deviceId",
  authenticate,
  AuthController.removeTrustedDevice
);

// Get login history
router.get(
  "/login-history",
  authenticate,
  AuthController.getLoginHistory
);

/* ======================================================
   ADMIN ROUTES
====================================================== */

// Update any user (admin)
// router.patch(
//   "/user/:userId",
//   authenticate,
//   authorize("admin", "superadmin"),
//   validateUpdateUser,
//   AuthController.updateUser
// );

// Get all users (admin)
// router.get(
//   "/users",
//   authenticate,
//   authorize("admin", "superadmin"),
//   AuthController.getAllUsers
// );

export default router;