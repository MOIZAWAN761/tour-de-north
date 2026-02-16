// src/modules/lost-and-found/public/lostfound.public.routes.js

import { Router } from "express";
import { LostFoundPublicController } from "./lostFound.public.controller.js";
import {
  validateCreateLostReport,
  validateCreateFoundReport,
  validateGetAllReports,
  validateUpdateStatus,
  validateClaim,
  validateReportId,
  validateCaseId,
} from "../lostFound.validation.js";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { upload } from "../lostFound.helper.js";

const router = Router();

/* ============================================
   LOST ITEMS ROUTES
============================================ */

// Create lost report
router.post(
  "/lost",
  authenticate,
  upload.single("image"),
  validateCreateLostReport,
  LostFoundPublicController.createLostReport,
);

// Get all lost reports
router.get(
  "/lost",
  authenticate,
  validateGetAllReports,
  LostFoundPublicController.getAllLostReports,
);

// Get lost report by ID
router.get(
  "/lost/:reportId",
  authenticate,
  validateReportId,
  LostFoundPublicController.getLostReportById,
);

// Update lost report status (owner only)
router.patch(
  "/lost/:reportId/status",
  authenticate,
  validateUpdateStatus,
  LostFoundPublicController.updateLostReportStatus,
);

// Delete lost report (owner only)
router.delete(
  "/lost/:reportId",
  authenticate,
  validateReportId,
  LostFoundPublicController.deleteLostReport,
);

// Claim a lost item (I found this item)
router.post(
  "/lost/:reportId/claim",
  authenticate,
  validateClaim,
  LostFoundPublicController.claimLostItem,
);

// Get claims for my lost item
router.get(
  "/lost/:reportId/claims",
  authenticate,
  validateReportId,
  LostFoundPublicController.getLostItemClaims,
);

/* ============================================
   FOUND ITEMS ROUTES
============================================ */

// Create found report
router.post(
  "/found",
  authenticate,
  upload.single("image"),
  validateCreateFoundReport,
  LostFoundPublicController.createFoundReport,
);

// Get all found reports
router.get(
  "/found",
  authenticate,
  validateGetAllReports,
  LostFoundPublicController.getAllFoundReports,
);

// Get found report by ID
router.get(
  "/found/:reportId",
  authenticate,
  validateReportId,
  LostFoundPublicController.getFoundReportById,
);

// Update found report status (owner only)
router.patch(
  "/found/:reportId/status",
  authenticate,
  validateUpdateStatus,
  LostFoundPublicController.updateFoundReportStatus,
);

// Delete found report (owner only)
router.delete(
  "/found/:reportId",
  authenticate,
  validateReportId,
  LostFoundPublicController.deleteFoundReport,
);

// Claim a found item (This is my item)
router.post(
  "/found/:reportId/claim",
  authenticate,
  validateClaim,
  LostFoundPublicController.claimFoundItem,
);

// Get claims for my found item
router.get(
  "/found/:reportId/claims",
  authenticate,
  validateReportId,
  LostFoundPublicController.getFoundItemClaims,
);

/* ============================================
   RESOLVED CASES ROUTES
============================================ */

// Get all resolved cases
router.get(
  "/resolved",
  authenticate,
  validateGetAllReports,
  LostFoundPublicController.getAllResolvedCases,
);

// Get resolved case by ID
router.get(
  "/resolved/:caseId",
  authenticate,
  validateCaseId,
  LostFoundPublicController.getResolvedCaseById,
);

export default router;
