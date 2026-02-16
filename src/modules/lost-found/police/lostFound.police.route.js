// src/modules/lost-and-found/police/lostfound.police.routes.js

import { Router } from "express";
import { LostFoundPoliceController } from "./lostFound.police.controller.js";
import {
  validateGetAllReports,
  validateUpdateStatus,
  validateCreateResolvedCase,
  validateReportId,
  validateCaseId,
  validateStatisticsQuery,
} from "../lostFound.validation.js";
import {
  authenticate,
  authorize,
} from "../../../middlewares/auth.middleware.js";

const router = Router();

/* ============================================
   LOST ITEMS - POLICE/ADMIN ROUTES
============================================ */

// Get all lost reports (with admin filters)
router.get(
  "/lost",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateGetAllReports,
  LostFoundPoliceController.getAllLostReports,
);

// Get lost report by ID
router.get(
  "/lost/:reportId",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateReportId,
  LostFoundPoliceController.getLostReportById,
);

// Get claims for any lost report
router.get(
  "/lost/:reportId/claims",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateReportId,
  LostFoundPoliceController.getLostItemClaims,
);

// Find potential matches for a lost item
router.get(
  "/lost/:reportId/matches",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateReportId,
  LostFoundPoliceController.findMatchesForLost,
);

// Update any lost report status (admin only)
router.patch(
  "/lost/:reportId/status",
  authenticate,
  authorize("admin", "superadmin"),
  validateUpdateStatus,
  LostFoundPoliceController.updateLostReportStatus,
);

// Delete any lost report (admin only)
router.delete(
  "/lost/:reportId",
  authenticate,
  authorize("admin", "superadmin"),
  validateReportId,
  LostFoundPoliceController.deleteLostReport,
);

/* ============================================
   FOUND ITEMS - POLICE/ADMIN ROUTES
============================================ */

// Get all found reports (with admin filters)
router.get(
  "/found",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateGetAllReports,
  LostFoundPoliceController.getAllFoundReports,
);

// Get found report by ID
router.get(
  "/found/:reportId",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateReportId,
  LostFoundPoliceController.getFoundReportById,
);

// Get claims for any found report
router.get(
  "/found/:reportId/claims",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateReportId,
  LostFoundPoliceController.getFoundItemClaims,
);

// Find potential matches for a found item
router.get(
  "/found/:reportId/matches",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateReportId,
  LostFoundPoliceController.findMatchesForFound,
);

// Update any found report status (admin only)
router.patch(
  "/found/:reportId/status",
  authenticate,
  authorize("admin", "superadmin"),
  validateUpdateStatus,
  LostFoundPoliceController.updateFoundReportStatus,
);

// Delete any found report (admin only)
router.delete(
  "/found/:reportId",
  authenticate,
  authorize("admin", "superadmin"),
  validateReportId,
  LostFoundPoliceController.deleteFoundReport,
);

/* ============================================
   RESOLVED CASES - POLICE/ADMIN ROUTES
============================================ */

// Create resolved case (mark as resolved)
router.post(
  "/resolved",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateCreateResolvedCase,
  LostFoundPoliceController.createResolvedCase,
);

// Get all resolved cases
router.get(
  "/resolved",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateGetAllReports,
  LostFoundPoliceController.getAllResolvedCases,
);

// Get resolved case by ID
router.get(
  "/resolved/:caseId",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateCaseId,
  LostFoundPoliceController.getResolvedCaseById,
);

/* ============================================
   USER PROFILE - ADMIN ONLY
============================================ */

// Get full user profile (for verification)
router.get(
  "/user/:userId/profile",
  authenticate,
  authorize("admin", "superadmin", "police"),
  LostFoundPoliceController.getUserProfile,
);

/* ============================================
   STATISTICS - ADMIN ONLY
============================================ */

// Get statistics
router.get(
  "/statistics",
  authenticate,
  authorize("admin", "superadmin"),
  validateStatisticsQuery,
  LostFoundPoliceController.getStatistics,
);

export default router;
