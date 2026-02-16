// src/modules/lost-and-found/lostfound.service.js

import { LostFoundModel } from "./lostFound.model.js";
import {
  uploadItemImage,
  deleteItemImage,
  getPublicIdFromUrl,
  formatLostReport,
  formatLostReportListItem,
  formatFoundReport,
  formatFoundReportListItem,
  formatResolvedCase,
} from "./lostFound.helper.js";

export class LostFoundService {
  /* ============================================
     LOST ITEMS SERVICES
  ============================================ */

  // Create lost report
  static async createLostReport(data, imageFile, userId) {
    try {
      // Upload image if provided
      let imageUrl = data.imageUrl;
      if (imageFile) {
        const uploaded = await uploadItemImage(imageFile, "lost");
        imageUrl = uploaded.url;
      }

      const reportData = {
        itemCategory: data.itemCategory,
        itemName: data.itemName,
        description: data.description,
        lostLocation: data.lostLocation,
        lostDate: data.lostDate,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        imageUrl,
        latitude: data.latitude,
        longitude: data.longitude,
        additionalDetails: data.additionalDetails,
      };

      const report = await LostFoundModel.createLostReport(reportData, userId);
      return formatLostReport(report);
    } catch (error) {
      console.error("Create lost report error:", error);
      throw error;
    }
  }

  // Get all lost reports
  static async getAllLostReports({
    search = "",
    itemCategory,
    lostLocation,
    dateFrom,
    dateTo,
    status = "active",
    sortBy = "created_at",
    order = "desc",
    page = 1,
    limit = 20,
    userId = null,
    myItemsOnly = false,
  }) {
    const offset = (page - 1) * limit;

    const reports = await LostFoundModel.getAllLostReports({
      search,
      itemCategory,
      lostLocation,
      dateFrom,
      dateTo,
      status,
      sortBy,
      order,
      limit,
      offset,
      userId,
      myItemsOnly,
    });

    const total = await LostFoundModel.countLostReports({
      search,
      itemCategory,
      lostLocation,
      dateFrom,
      dateTo,
      status,
      userId,
      myItemsOnly,
    });

    return {
      reports: reports.map(formatLostReportListItem), // Use list formatter
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get lost report by ID
  static async getLostReportById(reportId, userId = null) {
    const report = await LostFoundModel.getLostReportById(reportId, userId);

    if (!report) {
      throw { status: 404, message: "Lost report not found" };
    }

    return formatLostReport(report);
  }

  // Update lost report status
  static async updateLostReportStatus(reportId, status, userId, userRole) {
    const report = await LostFoundModel.getLostReportById(reportId, userId);

    if (!report) {
      throw { status: 404, message: "Lost report not found" };
    }

    // Check permissions
    if (userRole !== "admin" && userRole !== "superadmin" && userRole !== "police") {
      if (report.user_id !== userId) {
        throw { status: 403, message: "You can only update your own reports" };
      }
    }

    const resolvedDate = status === "resolved" ? new Date() : null;
    const updatedReport = await LostFoundModel.updateLostReportStatus(
      reportId,
      status,
      resolvedDate
    );

    return formatLostReport(updatedReport);
  }

  // Delete lost report
  static async deleteLostReport(reportId, userId, userRole) {
    const report = await LostFoundModel.getLostReportById(reportId, userId);

    if (!report) {
      throw { status: 404, message: "Lost report not found" };
    }

    // Check permissions
    if (userRole !== "admin" && userRole !== "superadmin") {
      if (report.user_id !== userId) {
        throw { status: 403, message: "You can only delete your own reports" };
      }
    }

    // Delete image from Cloudinary if exists
    if (report.image_url) {
      const publicId = getPublicIdFromUrl(report.image_url);
      if (publicId) {
        try {
          await deleteItemImage(publicId);
        } catch (error) {
          console.error("Failed to delete image:", error);
        }
      }
    }

    await LostFoundModel.deleteLostReport(reportId);
    return { message: "Lost report deleted successfully" };
  }

  /* ============================================
     FOUND ITEMS SERVICES
  ============================================ */

  // Create found report
  static async createFoundReport(data, imageFile, userId) {
    try {
      // Upload image if provided
      let imageUrl = data.imageUrl;
      if (imageFile) {
        const uploaded = await uploadItemImage(imageFile, "found");
        imageUrl = uploaded.url;
      }

      const reportData = {
        itemCategory: data.itemCategory,
        itemName: data.itemName,
        description: data.description,
        foundLocation: data.foundLocation,
        foundDate: data.foundDate,
        currentLocation: data.currentLocation,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        imageUrl,
        latitude: data.latitude,
        longitude: data.longitude,
        additionalDetails: data.additionalDetails,
      };

      const report = await LostFoundModel.createFoundReport(reportData, userId);
      return formatFoundReport(report);
    } catch (error) {
      console.error("Create found report error:", error);
      throw error;
    }
  }

  // Get all found reports
  static async getAllFoundReports({
    search = "",
    itemCategory,
    foundLocation,
    dateFrom,
    dateTo,
    status = "active",
    sortBy = "created_at",
    order = "desc",
    page = 1,
    limit = 20,
    userId = null,
    myItemsOnly = false,
  }) {
    const offset = (page - 1) * limit;

    const reports = await LostFoundModel.getAllFoundReports({
      search,
      itemCategory,
      foundLocation,
      dateFrom,
      dateTo,
      status,
      sortBy,
      order,
      limit,
      offset,
      userId,
      myItemsOnly,
    });

    const total = await LostFoundModel.countFoundReports({
      search,
      itemCategory,
      foundLocation,
      dateFrom,
      dateTo,
      status,
      userId,
      myItemsOnly,
    });

    return {
      reports: reports.map(formatFoundReportListItem), // Use list formatter
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get found report by ID
  static async getFoundReportById(reportId, userId = null) {
    const report = await LostFoundModel.getFoundReportById(reportId, userId);

    if (!report) {
      throw { status: 404, message: "Found report not found" };
    }

    return formatFoundReport(report);
  }

  // Update found report status
  static async updateFoundReportStatus(reportId, status, userId, userRole) {
    const report = await LostFoundModel.getFoundReportById(reportId, userId);

    if (!report) {
      throw { status: 404, message: "Found report not found" };
    }

    // Check permissions
    if (userRole !== "admin" && userRole !== "superadmin" && userRole !== "police") {
      if (report.user_id !== userId) {
        throw { status: 403, message: "You can only update your own reports" };
      }
    }

    const resolvedDate = status === "resolved" ? new Date() : null;
    const updatedReport = await LostFoundModel.updateFoundReportStatus(
      reportId,
      status,
      resolvedDate
    );

    return formatFoundReport(updatedReport);
  }

  // Delete found report
  static async deleteFoundReport(reportId, userId, userRole) {
    const report = await LostFoundModel.getFoundReportById(reportId, userId);

    if (!report) {
      throw { status: 404, message: "Found report not found" };
    }

    // Check permissions
    if (userRole !== "admin" && userRole !== "superadmin") {
      if (report.user_id !== userId) {
        throw { status: 403, message: "You can only delete your own reports" };
      }
    }

    // Delete image from Cloudinary if exists
    if (report.image_url) {
      const publicId = getPublicIdFromUrl(report.image_url);
      if (publicId) {
        try {
          await deleteItemImage(publicId);
        } catch (error) {
          console.error("Failed to delete image:", error);
        }
      }
    }

    await LostFoundModel.deleteFoundReport(reportId);
    return { message: "Found report deleted successfully" };
  }

  /* ============================================
     CLAIMS SERVICES
  ============================================ */

  // Claim a lost item (I found this lost item)
  static async claimLostItem(lostReportId, userId, notes) {
    const report = await LostFoundModel.getLostReportById(lostReportId, userId);

    if (!report) {
      throw { status: 404, message: "Lost report not found" };
    }

    if (report.status !== "active") {
      throw { status: 400, message: "This item is no longer active" };
    }

    // Check if user is the owner
    if (report.user_id === userId) {
      throw { status: 400, message: "You cannot claim your own lost item" };
    }

    // Check if already claimed
    const existingClaim = await LostFoundModel.checkLostClaim(lostReportId, userId);
    if (existingClaim) {
      throw { status: 409, message: "You have already claimed this item" };
    }

    const claim = await LostFoundModel.createLostClaim(lostReportId, userId, notes);

    return {
      id: claim.id,
      lostReportId: claim.lost_report_id,
      claimerId: claim.claimer_id,
      notes: claim.notes,
      createdAt: claim.created_at,
    };
  }

  // Get claims for a lost item (owner only)
  static async getLostItemClaims(lostReportId, userId, userRole) {
    const report = await LostFoundModel.getLostReportById(lostReportId, userId);

    if (!report) {
      throw { status: 404, message: "Lost report not found" };
    }

    // Only owner or admin/police can see claims
    if (userRole !== "admin" && userRole !== "superadmin" && userRole !== "police") {
      if (report.user_id !== userId) {
        throw { status: 403, message: "You can only view claims for your own items" };
      }
    }

    const claims = await LostFoundModel.getLostClaims(lostReportId);
    return claims;
  }

  // Claim a found item (This found item is mine)
  static async claimFoundItem(foundReportId, userId, notes) {
    const report = await LostFoundModel.getFoundReportById(foundReportId, userId);

    if (!report) {
      throw { status: 404, message: "Found report not found" };
    }

    if (report.status !== "active") {
      throw { status: 400, message: "This item is no longer active" };
    }

    // Check if user is the finder
    if (report.user_id === userId) {
      throw { status: 400, message: "You cannot claim your own found item" };
    }

    // Check if already claimed
    const existingClaim = await LostFoundModel.checkFoundClaim(foundReportId, userId);
    if (existingClaim) {
      throw { status: 409, message: "You have already claimed this item" };
    }

    const claim = await LostFoundModel.createFoundClaim(foundReportId, userId, notes);

    return {
      id: claim.id,
      foundReportId: claim.found_report_id,
      claimerId: claim.claimer_id,
      notes: claim.notes,
      createdAt: claim.created_at,
    };
  }

  // Get claims for a found item (finder only)
  static async getFoundItemClaims(foundReportId, userId, userRole) {
    const report = await LostFoundModel.getFoundReportById(foundReportId, userId);

    if (!report) {
      throw { status: 404, message: "Found report not found" };
    }

    // Only finder or admin/police can see claims
    if (userRole !== "admin" && userRole !== "superadmin" && userRole !== "police") {
      if (report.user_id !== userId) {
        throw { status: 403, message: "You can only view claims for your own items" };
      }
    }

    const claims = await LostFoundModel.getFoundClaims(foundReportId);
    return claims;
  }

  /* ============================================
     RESOLVED CASES SERVICES
  ============================================ */

  // Create resolved case (police/admin only)
  static async createResolvedCase(data, userId) {
    try {
      // Validate that at least one report is provided
      if (!data.lostReportId && !data.foundReportId) {
        throw { 
          status: 400, 
          message: "At least one report (lost or found) must be provided" 
        };
      }

      // Update report statuses to resolved
      if (data.lostReportId) {
        await LostFoundModel.updateLostReportStatus(
          data.lostReportId,
          "resolved",
          new Date()
        );
      }

      if (data.foundReportId) {
        await LostFoundModel.updateFoundReportStatus(
          data.foundReportId,
          "resolved",
          new Date()
        );
      }

      const resolvedCase = await LostFoundModel.createResolvedCase(data, userId);
      return formatResolvedCase(resolvedCase);
    } catch (error) {
      console.error("Create resolved case error:", error);
      throw error;
    }
  }

  // Get all resolved cases
  static async getAllResolvedCases({
    search = "",
    itemCategory,
    resolutionType,
    dateFrom,
    dateTo,
    sortBy = "created_at",
    order = "desc",
    page = 1,
    limit = 20,
    userId = null,
    myItemsOnly = false,
  }) {
    const offset = (page - 1) * limit;

    const cases = await LostFoundModel.getAllResolvedCases({
      search,
      itemCategory,
      resolutionType,
      dateFrom,
      dateTo,
      sortBy,
      order,
      limit,
      offset,
      userId,
      myItemsOnly,
    });

    const total = await LostFoundModel.countResolvedCases({
      search,
      itemCategory,
      resolutionType,
      dateFrom,
      dateTo,
      userId,
      myItemsOnly,
    });

    return {
      cases: cases.map(formatResolvedCase),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get resolved case by ID
  static async getResolvedCaseById(caseId) {
    const resolvedCase = await LostFoundModel.getResolvedCaseById(caseId);

    if (!resolvedCase) {
      throw { status: 404, message: "Resolved case not found" };
    }

    return formatResolvedCase(resolvedCase);
  }

  /* ============================================
     MATCHING SERVICES (police/admin only)
  ============================================ */

  // Find potential matches for a lost item
  static async findMatchesForLost(lostReportId) {
    const report = await LostFoundModel.getLostReportById(lostReportId);

    if (!report) {
      throw { status: 404, message: "Lost report not found" };
    }

    const matches = await LostFoundModel.findPotentialMatches(lostReportId);
    return matches.map(match => formatFoundReport(match));
  }

  // Find potential matches for a found item
  static async findMatchesForFound(foundReportId) {
    const report = await LostFoundModel.getFoundReportById(foundReportId);

    if (!report) {
      throw { status: 404, message: "Found report not found" };
    }

    const matches = await LostFoundModel.findLostMatches(foundReportId);
    return matches.map(match => formatLostReport(match));
  }

  /* ============================================
     STATISTICS SERVICES (admin only)
  ============================================ */

  // Get statistics
  static async getStatistics(dateFrom, dateTo) {
    const stats = await LostFoundModel.getStatistics(dateFrom, dateTo);

    return {
      lostItems: {
        active: parseInt(stats.active_lost_count),
        resolved: parseInt(stats.resolved_lost_count),
        total: parseInt(stats.active_lost_count) + parseInt(stats.resolved_lost_count),
      },
      foundItems: {
        active: parseInt(stats.active_found_count),
        resolved: parseInt(stats.resolved_found_count),
        total: parseInt(stats.active_found_count) + parseInt(stats.resolved_found_count),
      },
      resolvedCases: parseInt(stats.total_resolved_cases),
      topLostCategories: stats.top_lost_categories || [],
      topFoundCategories: stats.top_found_categories || [],
      topLostLocations: stats.top_lost_locations || [],
      topFoundLocations: stats.top_found_locations || [],
    };
  }
}