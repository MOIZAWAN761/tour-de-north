// src/modules/places/places.validation.js

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
   CREATE PLACE VALIDATION
============================================ */
export const validateCreatePlace = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Place name is required")
    .isLength({ min: 3, max: 255 })
    .withMessage("Place name must be between 3 and 255 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description must be max 5000 characters"),

  body("region")
    .notEmpty()
    .withMessage("Region is required")
    .isIn(["Kaghan", "Naran", "Shogran"])
    .withMessage("Region must be one of: Kaghan, Naran, Shogran"),

  body("type")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Type must be max 100 characters"),

  body("latitude")
    .notEmpty()
    .withMessage("Latitude is required")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),

  body("longitude")
    .notEmpty()
    .withMessage("Longitude is required")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),

  body("mainImageUrl")
    .optional()
    .isURL()
    .withMessage("Main image URL must be a valid URL"),

  body("safetyStatus")
    .optional()
    .isIn(["safe", "caution", "danger"])
    .withMessage("Safety status must be one of: safe, caution, danger"),

  body("safetyMessage")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Safety message must be max 500 characters"),

  handleValidationErrors,
];

/* ============================================
   UPDATE PLACE VALIDATION
============================================ */
export const validateUpdatePlace = [
  param("placeId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid place ID is required"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage("Place name must be between 3 and 255 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description must be max 5000 characters"),

  body("region")
    .optional()
    .isIn(["Kaghan", "Naran", "Shogran"])
    .withMessage("Region must be one of: Kaghan, Naran, Shogran"),

  body("type")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Type must be max 100 characters"),

  body("latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),

  body("longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),

  body("mainImageUrl")
    .optional()
    .isURL()
    .withMessage("Main image URL must be a valid URL"),

  handleValidationErrors,
];

/* ============================================
   UPDATE SAFETY STATUS VALIDATION
============================================ */
export const validateUpdateSafetyStatus = [
  param("placeId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid place ID is required"),

  body("safetyStatus")
    .notEmpty()
    .withMessage("Safety status is required")
    .isIn(["safe", "caution", "danger"])
    .withMessage("Safety status must be one of: safe, caution, danger"),

  body("safetyMessage")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Safety message must be max 500 characters"),

  body("safetyFlags")
    .optional()
    .isObject()
    .withMessage("Safety flags must be an object"),

  handleValidationErrors,
];

/* ============================================
   UPDATE ACTIVE STATUS VALIDATION
============================================ */
export const validateUpdateActiveStatus = [
  param("placeId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid place ID is required"),

  body("isActive")
    .notEmpty()
    .withMessage("Active status is required")
    .isBoolean()
    .withMessage("Active status must be a boolean"),

  handleValidationErrors,
];

/* ============================================
   GET ALL PLACES VALIDATION
============================================ */
export const validateGetAllPlaces = [
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

  query("region")
    .optional()
    .isIn(["Kaghan", "Naran", "Shogran"])
    .withMessage("Region must be one of: Kaghan, Naran, Shogran"),

  query("type")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Type must be max 100 characters"),

  query("safetyStatus")
    .optional()
    .isIn(["safe", "caution", "danger"])
    .withMessage("Safety status must be one of: safe, caution, danger"),

  query("sortBy")
    .optional()
    .isIn(["created_at", "name", "view_count", "average_rating", "region"])
    .withMessage("Invalid sort field"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Order must be asc or desc"),

  handleValidationErrors,
];

/* ============================================
   PLACE ID VALIDATION
============================================ */
export const validatePlaceId = [
  param("placeId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid place ID is required"),

  handleValidationErrors,
];

/* ============================================
   ADD PLACE IMAGE VALIDATION
============================================ */
export const validateAddPlaceImage = [
  param("placeId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid place ID is required"),

  body("caption")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Caption must be max 255 characters"),

  body("displayOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Display order must be a non-negative integer"),

  handleValidationErrors,
];

/* ============================================
   DELETE IMAGE VALIDATION
============================================ */
export const validateDeletePlaceImage = [
  param("placeId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid place ID is required"),

  param("imageId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid image ID is required"),

  handleValidationErrors,
];
