// src/modules/lost-and-found/police/lostfound.police.controller.js

import { LostFoundService } from "../lostFound.service.js";
import { AuthModel } from "../../auth/auth.model.js";

export const LostFoundPoliceController = {
  /* ============================================
     LOST ITEMS - POLICE/ADMIN OPERATIONS
  ============================================ */

  // Get all lost reports (admin can see all)
  async getAllLostReports(req, res, next) {
    try {
      const {
        search,
        itemCategory,
        lostLocation,
        dateFrom,
        dateTo,
        status,
        sortBy = "created_at",
        order = "desc",
        page = 1,
        limit = 20,
      } = req.query;

      const result = await LostFoundService.getAllLostReports({
        search,
        itemCategory,
        lostLocation,
        dateFrom,
        dateTo,
        status, // Admin can see all statuses
        sortBy,
        order,
        page: parseInt(page),
        limit: parseInt(limit),
        userId: null,
        myItemsOnly: false,
      });

      return res.status(200).json({
        success: true,
        data: result.reports,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get lost report by ID with full details
  async getLostReportById(req, res, next) {
    try {
      const { reportId } = req.params;

      const report = await LostFoundService.getLostReportById(
        parseInt(reportId),
        null,
      );

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get claims for any lost report (admin access)
  async getLostItemClaims(req, res, next) {
    try {
      const { reportId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const claims = await LostFoundService.getLostItemClaims(
        parseInt(reportId),
        userId,
        userRole,
      );

      return res.status(200).json({
        success: true,
        data: claims,
      });
    } catch (error) {
      next(error);
    }
  },

  // Find potential matches for a lost item
  async findMatchesForLost(req, res, next) {
    try {
      const { reportId } = req.params;

      const matches = await LostFoundService.findMatchesForLost(
        parseInt(reportId),
      );

      return res.status(200).json({
        success: true,
        data: matches,
        message:
          matches.length > 0
            ? `Found ${matches.length} potential matches`
            : "No potential matches found",
      });
    } catch (error) {
      next(error);
    }
  },

  // Get full user profile (for verification)
  async getUserProfile(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await AuthModel.findUserById(parseInt(userId));

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Return full user details (admin only)
      return res.status(200).json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          cnic: user.cnic,
          role: user.role,
          address: user.address,
          isVerified: user.is_verified,
          createdAt: user.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     FOUND ITEMS - POLICE/ADMIN OPERATIONS
  ============================================ */

  // Get all found reports (admin can see all)
  async getAllFoundReports(req, res, next) {
    try {
      const {
        search,
        itemCategory,
        foundLocation,
        dateFrom,
        dateTo,
        status,
        sortBy = "created_at",
        order = "desc",
        page = 1,
        limit = 20,
      } = req.query;

      const result = await LostFoundService.getAllFoundReports({
        search,
        itemCategory,
        foundLocation,
        dateFrom,
        dateTo,
        status, // Admin can see all statuses
        sortBy,
        order,
        page: parseInt(page),
        limit: parseInt(limit),
        userId: null,
        myItemsOnly: false,
      });

      return res.status(200).json({
        success: true,
        data: result.reports,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get found report by ID with full details
  async getFoundReportById(req, res, next) {
    try {
      const { reportId } = req.params;

      const report = await LostFoundService.getFoundReportById(
        parseInt(reportId),
        null,
      );

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get claims for any found report (admin access)
  async getFoundItemClaims(req, res, next) {
    try {
      const { reportId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const claims = await LostFoundService.getFoundItemClaims(
        parseInt(reportId),
        userId,
        userRole,
      );

      return res.status(200).json({
        success: true,
        data: claims,
      });
    } catch (error) {
      next(error);
    }
  },

  // Find potential matches for a found item
  async findMatchesForFound(req, res, next) {
    try {
      const { reportId } = req.params;

      const matches = await LostFoundService.findMatchesForFound(
        parseInt(reportId),
      );

      return res.status(200).json({
        success: true,
        data: matches,
        message:
          matches.length > 0
            ? `Found ${matches.length} potential matches`
            : "No potential matches found",
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     RESOLVED CASES - POLICE/ADMIN OPERATIONS
  ============================================ */

  // Create resolved case (mark case as resolved)
  async createResolvedCase(req, res, next) {
    try {
      const userId = req.user.id;

      const resolvedCase = await LostFoundService.createResolvedCase(
        req.body,
        userId,
      );

      return res.status(201).json({
        success: true,
        message: "Case resolved successfully",
        data: resolvedCase,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all resolved cases (admin view)
  async getAllResolvedCases(req, res, next) {
    try {
      const {
        search,
        itemCategory,
        resolutionType,
        dateFrom,
        dateTo,
        sortBy = "created_at",
        order = "desc",
        page = 1,
        limit = 20,
      } = req.query;

      const result = await LostFoundService.getAllResolvedCases({
        search,
        itemCategory,
        resolutionType,
        dateFrom,
        dateTo,
        sortBy,
        order,
        page: parseInt(page),
        limit: parseInt(limit),
        userId: null,
        myItemsOnly: false,
      });

      return res.status(200).json({
        success: true,
        data: result.cases,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get resolved case by ID
  async getResolvedCaseById(req, res, next) {
    try {
      const { caseId } = req.params;

      const resolvedCase = await LostFoundService.getResolvedCaseById(
        parseInt(caseId),
      );

      return res.status(200).json({
        success: true,
        data: resolvedCase,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     STATISTICS - ADMIN ONLY
  ============================================ */

  // Get statistics
  async getStatistics(req, res, next) {
    try {
      const { dateFrom, dateTo } = req.query;

      const stats = await LostFoundService.getStatistics(
        dateFrom || null,
        dateTo || null,
      );

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     ADMIN ACTIONS
  ============================================ */

  // Update any lost report status (admin only)
  async updateLostReportStatus(req, res, next) {
    try {
      const { reportId } = req.params;
      const { status } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const report = await LostFoundService.updateLostReportStatus(
        parseInt(reportId),
        status,
        userId,
        userRole,
      );

      return res.status(200).json({
        success: true,
        message: "Lost report status updated successfully",
        data: report,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update any found report status (admin only)
  async updateFoundReportStatus(req, res, next) {
    try {
      const { reportId } = req.params;
      const { status } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const report = await LostFoundService.updateFoundReportStatus(
        parseInt(reportId),
        status,
        userId,
        userRole,
      );

      return res.status(200).json({
        success: true,
        message: "Found report status updated successfully",
        data: report,
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete any lost report (admin only)
  async deleteLostReport(req, res, next) {
    try {
      const { reportId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await LostFoundService.deleteLostReport(
        parseInt(reportId),
        userId,
        userRole,
      );

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete any found report (admin only)
  async deleteFoundReport(req, res, next) {
    try {
      const { reportId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await LostFoundService.deleteFoundReport(
        parseInt(reportId),
        userId,
        userRole,
      );

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },
};
