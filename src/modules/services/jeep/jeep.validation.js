// src/modules/jeeps/jeeps.validation.js

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
   CREATE JEEP VALIDATION (with driver data)
============================================ */
export const validateCreateJeep = [
  // Jeep fields
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Jeep name is required")
    .isLength({ min: 3, max: 255 })
    .withMessage("Jeep name must be between 3 and 255 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must not exceed 2000 characters"),

  body("region")
    .notEmpty()
    .withMessage("Region is required")
    .isIn(["Kaghan", "Naran", "Shogran"])
    .withMessage("Region must be one of: Kaghan, Naran, Shogran"),

  body("jeepNumber")
    .trim()
    .notEmpty()
    .withMessage("Jeep number is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Jeep number must be between 3 and 50 characters"),

  body("vehicleType")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Vehicle type must not exceed 50 characters"),

  body("capacity")
    .notEmpty()
    .withMessage("Capacity is required")
    .isInt({ min: 1, max: 50 })
    .withMessage("Capacity must be between 1 and 50"),

  // Driver fields (for new driver)
  body("driver.fullName")
    .trim()
    .notEmpty()
    .withMessage("Driver full name is required")
    .isLength({ min: 3, max: 255 })
    .withMessage("Driver name must be between 3 and 255 characters"),

  body("driver.cnic")
    .trim()
    .notEmpty()
    .withMessage("Driver CNIC is required")
    .matches(/^\d{13}$|^\d{5}-\d{7}-\d{1}$/)
    .withMessage("CNIC must be 13 digits (format: XXXXX-XXXXXXX-X)"),

  body("driver.phone")
    .trim()
    .notEmpty()
    .withMessage("Driver phone is required")
    .isLength({ min: 10, max: 20 })
    .withMessage("Phone must be between 10 and 20 characters"),

  body("driver.address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters"),

  handleValidationErrors,
];

/* ============================================
   CREATE JEEP WITH EXISTING DRIVER VALIDATION
============================================ */
export const validateCreateJeepWithDriver = [
  // Jeep fields
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Jeep name is required")
    .isLength({ min: 3, max: 255 })
    .withMessage("Jeep name must be between 3 and 255 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must not exceed 2000 characters"),

  body("region")
    .notEmpty()
    .withMessage("Region is required")
    .isIn(["Kaghan", "Naran", "Shogran"])
    .withMessage("Region must be one of: Kaghan, Naran, Shogran"),

  body("jeepNumber")
    .trim()
    .notEmpty()
    .withMessage("Jeep number is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Jeep number must be between 3 and 50 characters"),

  body("vehicleType")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Vehicle type must not exceed 50 characters"),

  body("capacity")
    .notEmpty()
    .withMessage("Capacity is required")
    .isInt({ min: 1, max: 50 })
    .withMessage("Capacity must be between 1 and 50"),

  body("driverId")
    .notEmpty()
    .withMessage("Driver ID is required")
    .isInt({ min: 1 })
    .withMessage("Valid driver ID is required"),

  handleValidationErrors,
];

/* ============================================
   UPDATE JEEP VALIDATION
============================================ */
export const validateUpdateJeep = [
  param("jeepId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid jeep ID is required"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage("Jeep name must be between 3 and 255 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must not exceed 2000 characters"),

  body("region")
    .optional()
    .isIn(["Kaghan", "Naran", "Shogran"])
    .withMessage("Region must be one of: Kaghan, Naran, Shogran"),

  body("jeepNumber")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Jeep number must be between 3 and 50 characters"),

  body("vehicleType")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Vehicle type must not exceed 50 characters"),

  body("capacity")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Capacity must be between 1 and 50"),

  handleValidationErrors,
];

/* ============================================
   UPDATE JEEP AVAILABILITY VALIDATION
============================================ */
export const validateUpdateAvailability = [
  param("jeepId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid jeep ID is required"),

  body("isAvailable")
    .notEmpty()
    .withMessage("isAvailable is required")
    .isBoolean()
    .withMessage("isAvailable must be a boolean"),

  handleValidationErrors,
];

/* ============================================
   UPDATE JEEP ACTIVE STATUS VALIDATION
============================================ */
export const validateUpdateJeepActiveStatus = [
  param("jeepId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid jeep ID is required"),

  body("isActive")
    .notEmpty()
    .withMessage("isActive is required")
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  handleValidationErrors,
];

/* ============================================
   JEEP ID VALIDATION
============================================ */
export const validateJeepId = [
  param("jeepId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid jeep ID is required"),

  handleValidationErrors,
];

/* ============================================
   GET ALL JEEPS VALIDATION
============================================ */
export const validateGetAllJeeps = [
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
    .withMessage("Search query must not exceed 100 characters"),

  query("region")
    .optional()
    .isIn(["Kaghan", "Naran", "Shogran"])
    .withMessage("Region must be one of: Kaghan, Naran, Shogran"),

  query("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable must be a boolean"),

  query("sortBy")
    .optional()
    .isIn([
      "created_at",
      "name",
      "view_count",
      "average_rating",
      "region",
      "capacity",
    ])
    .withMessage("Invalid sort field"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Order must be asc or desc"),

  handleValidationErrors,
];

/* ============================================
   CREATE DRIVER VALIDATION
============================================ */
export const validateCreateDriver = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Driver full name is required")
    .isLength({ min: 3, max: 255 })
    .withMessage("Driver name must be between 3 and 255 characters"),

  body("cnic")
    .trim()
    .notEmpty()
    .withMessage("CNIC is required")
    .matches(/^\d{13}$|^\d{5}-\d{7}-\d{1}$/)
    .withMessage("CNIC must be 13 digits (format: XXXXX-XXXXXXX-X)"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone is required")
    .isLength({ min: 10, max: 20 })
    .withMessage("Phone must be between 10 and 20 characters"),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters"),

  handleValidationErrors,
];

/* ============================================
   UPDATE DRIVER VALIDATION
============================================ */
export const validateUpdateDriver = [
  param("driverId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid driver ID is required"),

  body("fullName")
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage("Driver name must be between 3 and 255 characters"),

  body("cnic")
    .optional()
    .trim()
    .matches(/^\d{13}$|^\d{5}-\d{7}-\d{1}$/)
    .withMessage("CNIC must be 13 digits (format: XXXXX-XXXXXXX-X)"),

  body("phone")
    .optional()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage("Phone must be between 10 and 20 characters"),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters"),

  handleValidationErrors,
];

/* ============================================
   UPDATE DRIVER ACTIVE STATUS VALIDATION
============================================ */
export const validateUpdateDriverActiveStatus = [
  param("driverId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid driver ID is required"),

  body("isActive")
    .notEmpty()
    .withMessage("isActive is required")
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  handleValidationErrors,
];

/* ============================================
   DRIVER ID VALIDATION
============================================ */
export const validateDriverId = [
  param("driverId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid driver ID is required"),

  handleValidationErrors,
];

/* ============================================
   GET ALL DRIVERS VALIDATION
============================================ */
export const validateGetAllDrivers = [
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
    .withMessage("Search query must not exceed 100 characters"),

  query("sortBy")
    .optional()
    .isIn(["created_at", "full_name", "cnic"])
    .withMessage("Invalid sort field"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Order must be asc or desc"),

  handleValidationErrors,
];

/* ============================================
   AUDIT HISTORY VALIDATION
============================================ */
export const validateJeepAuditHistory = [
  param("jeepId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid jeep ID is required"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage("Limit must be between 1 and 200"),

  handleValidationErrors,
];

export const validateDriverAuditHistory = [
  param("driverId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid driver ID is required"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage("Limit must be between 1 and 200"),

  handleValidationErrors,
];
