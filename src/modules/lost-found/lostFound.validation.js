// src/modules/lost-and-found/lostfound.validation.js

import { body, query, param, validationResult } from "express-validator";

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      code: "validation/error",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }

  next();
};

/* ============================================
   CREATE LOST REPORT VALIDATION
============================================ */
export const validateCreateLostReport = [
  body("itemCategory")
    .notEmpty()
    .withMessage("Item category is required")
    .isIn([
      "Wallet",
      "Phone",
      "Documents",
      "Keys",
      "Bag",
      "Jewelry",
      "Electronics",
      "Clothing",
      "Accessories",
      "Vehicle",
      "Pet",
      "Other",
    ])
    .withMessage("Invalid item category"),

  body("itemName")
    .trim()
    .notEmpty()
    .withMessage("Item name is required")
    .isLength({ min: 3, max: 255 })
    .withMessage("Item name must be between 3 and 255 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),

  body("lostLocation")
    .trim()
    .notEmpty()
    .withMessage("Lost location is required")
    .isLength({ max: 255 })
    .withMessage("Lost location must be max 255 characters"),

  body("lostDate")
    .notEmpty()
    .withMessage("Lost date is required")
    .isISO8601()
    .withMessage("Invalid date format")
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      if (date > today) {
        throw new Error("Lost date cannot be in the future");
      }
      return true;
    }),

  body("contactPhone")
    .trim()
    .notEmpty()
    .withMessage("Contact phone is required")
    .matches(/^(03\d{9}|92\d{10})$/)
    .withMessage(
      "Invalid phone number format. Use 03xxxxxxxxx or 92xxxxxxxxxx",
    ),

  body("contactEmail")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email format"),

  body("imageUrl")
    .optional()
    .isURL()
    .withMessage("Image URL must be a valid URL"),

  body("latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),

  body("longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),

  body("additionalDetails")
    .optional()
    .isObject()
    .withMessage("Additional details must be an object"),

  handleValidationErrors,
];

/* ============================================
   CREATE FOUND REPORT VALIDATION
============================================ */
export const validateCreateFoundReport = [
  body("itemCategory")
    .notEmpty()
    .withMessage("Item category is required")
    .isIn([
      "Wallet",
      "Phone",
      "Documents",
      "Keys",
      "Bag",
      "Jewelry",
      "Electronics",
      "Clothing",
      "Accessories",
      "Vehicle",
      "Pet",
      "Other",
    ])
    .withMessage("Invalid item category"),

  body("itemName")
    .trim()
    .notEmpty()
    .withMessage("Item name is required")
    .isLength({ min: 3, max: 255 })
    .withMessage("Item name must be between 3 and 255 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),

  body("foundLocation")
    .trim()
    .notEmpty()
    .withMessage("Found location is required")
    .isLength({ max: 255 })
    .withMessage("Found location must be max 255 characters"),

  body("foundDate")
    .notEmpty()
    .withMessage("Found date is required")
    .isISO8601()
    .withMessage("Invalid date format")
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      if (date > today) {
        throw new Error("Found date cannot be in the future");
      }
      return true;
    }),

  body("currentLocation")
    .trim()
    .notEmpty()
    .withMessage("Current location is required")
    .isLength({ max: 255 })
    .withMessage("Current location must be max 255 characters"),

  body("contactPhone")
    .trim()
    .notEmpty()
    .withMessage("Contact phone is required")
    .matches(/^(03\d{9}|92\d{10})$/)
    .withMessage(
      "Invalid phone number format. Use 03xxxxxxxxx or 92xxxxxxxxxx",
    ),

  body("contactEmail")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email format"),

  body("imageUrl")
    .optional()
    .isURL()
    .withMessage("Image URL must be a valid URL"),

  body("latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),

  body("longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),

  body("additionalDetails")
    .optional()
    .isObject()
    .withMessage("Additional details must be an object"),

  handleValidationErrors,
];

/* ============================================
   GET ALL REPORTS VALIDATION (shared)
============================================ */
export const validateGetAllReports = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search must be max 100 characters"),

  query("itemCategory")
    .optional()
    .isIn([
      "Wallet",
      "Phone",
      "Documents",
      "Keys",
      "Bag",
      "Jewelry",
      "Electronics",
      "Clothing",
      "Accessories",
      "Vehicle",
      "Pet",
      "Other",
    ])
    .withMessage("Invalid item category"),

  query("lostLocation")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location must be max 100 characters"),

  query("foundLocation")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location must be max 100 characters"),

  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format for dateFrom"),

  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format for dateTo"),

  query("status")
    .optional()
    .isIn(["active", "resolved", "expired", "transferred"])
    .withMessage("Invalid status"),

  query("sortBy")
    .optional()
    .isIn(["created_at", "lost_date", "found_date", "item_name", "claim_count"])
    .withMessage("Invalid sort field"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Order must be asc or desc"),

  query("myItemsOnly")
    .optional()
    .isBoolean()
    .withMessage("myItemsOnly must be a boolean"),

  handleValidationErrors,
];

/* ============================================
   UPDATE STATUS VALIDATION
============================================ */
export const validateUpdateStatus = [
  param("reportId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid report ID is required"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["active", "resolved", "expired", "transferred"])
    .withMessage("Invalid status"),

  handleValidationErrors,
];

/* ============================================
   CLAIM VALIDATION
============================================ */
export const validateClaim = [
  param("reportId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid report ID is required"),

  body("notes")
    .trim()
    .notEmpty()
    .withMessage("Notes are required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Notes must be between 10 and 1000 characters"),

  handleValidationErrors,
];

/* ============================================
   CREATE RESOLVED CASE VALIDATION
============================================ */
export const validateCreateResolvedCase = [
  body("lostReportId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Lost report ID must be a positive integer"),

  body("foundReportId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Found report ID must be a positive integer"),

  body("resolutionType")
    .notEmpty()
    .withMessage("Resolution type is required")
    .isIn([
      "returned_to_owner",
      "claimed_at_station",
      "false_claim",
      "donated",
      "disposed",
      "transferred",
    ])
    .withMessage("Invalid resolution type"),

  body("resolutionNotes")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Resolution notes must be max 2000 characters"),

  body("verificationMethod")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Verification method must be max 500 characters"),

  handleValidationErrors,
];

/* ============================================
   REPORT ID VALIDATION
============================================ */
export const validateReportId = [
  param("reportId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid report ID is required"),

  handleValidationErrors,
];

/* ============================================
   CASE ID VALIDATION
============================================ */
export const validateCaseId = [
  param("caseId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid case ID is required"),

  handleValidationErrors,
];

/* ============================================
   STATISTICS DATE RANGE VALIDATION
============================================ */
export const validateStatisticsQuery = [
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format for dateFrom"),

  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format for dateTo"),

  handleValidationErrors,
];
