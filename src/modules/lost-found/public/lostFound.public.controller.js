// src/modules/lost-and-found/public/lostfound.public.controller.js

import { LostFoundService } from "../lostFound.service.js";

export const LostFoundPublicController = {
  /* ============================================
     LOST ITEMS - PUBLIC OPERATIONS
  ============================================ */

  // Create lost report
  async createLostReport(req, res, next) {
    try {
      const userId = req.user.id;
      const imageFile = req.file ? req.file.buffer : null;

      const report = await LostFoundService.createLostReport(
        req.body,
        imageFile,
        userId,
      );

      return res.status(201).json({
        success: true,
        message: "Lost report created successfully",
        data: report,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all lost reports
  async getAllLostReports(req, res, next) {
    try {
      const userId = req.user?.id;
      const {
        search,
        itemCategory,
        lostLocation,
        dateFrom,
        dateTo,
        status = "active",
        sortBy = "created_at",
        order = "desc",
        page = 1,
        limit = 20,
        myItemsOnly = false,
      } = req.query;

      const result = await LostFoundService.getAllLostReports({
        search,
        itemCategory,
        lostLocation,
        dateFrom,
        dateTo,
        status,
        sortBy,
        order,
        page: parseInt(page),
        limit: parseInt(limit),
        userId,
        myItemsOnly: myItemsOnly === "true",
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

  // Get lost report by ID
  async getLostReportById(req, res, next) {
    try {
      const { reportId } = req.params;
      const userId = req.user?.id;

      const report = await LostFoundService.getLostReportById(
        parseInt(reportId),
        userId,
      );

      // If user is owner, include claims
      let response = { ...report };

      if (report.isOwner) {
        const claims = await LostFoundService.getLostItemClaims(
          parseInt(reportId),
          userId,
          req.user.role,
        );
        response.claims = claims;
      }

      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update lost report status (owner only)
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

  // Delete lost report (owner only)
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

  /* ============================================
     FOUND ITEMS - PUBLIC OPERATIONS
  ============================================ */

  // Create found report
  async createFoundReport(req, res, next) {
    try {
      const userId = req.user.id;
      const imageFile = req.file ? req.file.buffer : null;

      const report = await LostFoundService.createFoundReport(
        req.body,
        imageFile,
        userId,
      );

      return res.status(201).json({
        success: true,
        message: "Found report created successfully",
        data: report,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all found reports
  async getAllFoundReports(req, res, next) {
    try {
      const userId = req.user?.id;
      const {
        search,
        itemCategory,
        foundLocation,
        dateFrom,
        dateTo,
        status = "active",
        sortBy = "created_at",
        order = "desc",
        page = 1,
        limit = 20,
        myItemsOnly = false,
      } = req.query;

      const result = await LostFoundService.getAllFoundReports({
        search,
        itemCategory,
        foundLocation,
        dateFrom,
        dateTo,
        status,
        sortBy,
        order,
        page: parseInt(page),
        limit: parseInt(limit),
        userId,
        myItemsOnly: myItemsOnly === "true",
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

  // Get found report by ID
  async getFoundReportById(req, res, next) {
    try {
      const { reportId } = req.params;
      const userId = req.user?.id;

      const report = await LostFoundService.getFoundReportById(
        parseInt(reportId),
        userId,
      );

      // If user is owner, include claims
      let response = { ...report };

      if (report.isOwner) {
        const claims = await LostFoundService.getFoundItemClaims(
          parseInt(reportId),
          userId,
          req.user.role,
        );
        response.claims = claims;
      }

      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update found report status (owner only)
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

  // Delete found report (owner only)
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

  /* ============================================
     CLAIMS - PUBLIC OPERATIONS
  ============================================ */

  // Claim a lost item (I found this lost item)
  async claimLostItem(req, res, next) {
    try {
      const { reportId } = req.params;
      const { notes } = req.body;
      const userId = req.user.id;

      const claim = await LostFoundService.claimLostItem(
        parseInt(reportId),
        userId,
        notes,
      );

      return res.status(201).json({
        success: true,
        message:
          "Claim submitted successfully. The owner will be able to see your claim.",
        data: claim,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get claims for my lost item (owner only)
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

  // Claim a found item (This found item is mine)
  async claimFoundItem(req, res, next) {
    try {
      const { reportId } = req.params;
      const { notes } = req.body;
      const userId = req.user.id;

      const claim = await LostFoundService.claimFoundItem(
        parseInt(reportId),
        userId,
        notes,
      );

      return res.status(201).json({
        success: true,
        message:
          "Claim submitted successfully. The finder will be able to see your claim.",
        data: claim,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get claims for my found item (finder only)
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

  /* ============================================
     RESOLVED CASES - PUBLIC OPERATIONS
  ============================================ */

  // Get all resolved cases
  async getAllResolvedCases(req, res, next) {
    try {
      const userId = req.user?.id;
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
        myItemsOnly = false,
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
        userId,
        myItemsOnly: myItemsOnly === "true",
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
};
