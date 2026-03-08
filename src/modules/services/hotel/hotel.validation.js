// // src/modules/hotels/hotels.validation.js

// import { body, query, param, validationResult } from "express-validator";

// export const handleValidationErrors = (req, res, next) => {
//   const errors = validationResult(req);

//   if (!errors.isEmpty()) {
//     return res.status(400).json({
//       success: false,
//       code: "validation/error",
//       errors: errors.array().map((err) => ({
//         field: err.path,
//         message: err.msg,
//       })),
//     });
//   }

//   next();
// };

// /* ============================================
//    CREATE HOTEL VALIDATION
// ============================================ */
// export const validateCreateHotel = [
//   body("name")
//     .trim()
//     .notEmpty()
//     .withMessage("Hotel name is required")
//     .isLength({ min: 3, max: 255 })
//     .withMessage("Hotel name must be between 3 and 255 characters"),

//   body("address")
//     .trim()
//     .notEmpty()
//     .withMessage("Address is required")
//     .isLength({ max: 500 })
//     .withMessage("Address must not exceed 500 characters"),

//   body("region")
//     .notEmpty()
//     .withMessage("Region is required")
//     .isIn(["Kaghan", "Naran", "Shogran"])
//     .withMessage("Region must be one of: Kaghan, Naran, Shogran"),

//   body("latitude")
//     .notEmpty()
//     .withMessage("Latitude is required")
//     .isFloat({ min: -90, max: 90 })
//     .withMessage("Latitude must be between -90 and 90"),

//   body("longitude")
//     .notEmpty()
//     .withMessage("Longitude is required")
//     .isFloat({ min: -180, max: 180 })
//     .withMessage("Longitude must be between -180 and 180"),

//   body("phone")
//     .optional()
//     .trim()
//     .isLength({ max: 20 })
//     .withMessage("Phone must not exceed 20 characters"),

//   body("email")
//     .optional()
//     .trim()
//     .isEmail()
//     .withMessage("Invalid email format")
//     .isLength({ max: 100 })
//     .withMessage("Email must not exceed 100 characters"),

//   body("description")
//     .optional()
//     .trim()
//     .isLength({ max: 5000 })
//     .withMessage("Description must not exceed 5000 characters"),

//   body("amenities")
//     .optional()
//     .isArray()
//     .withMessage("Amenities must be an array"),

//   body("isAllSeason")
//     .optional()
//     .isBoolean()
//     .withMessage("isAllSeason must be a boolean"),

//   body("seasonOpenFrom")
//     .optional()
//     .isInt({ min: 1, max: 12 })
//     .withMessage("Season open from must be between 1 and 12"),

//   body("seasonOpenTo")
//     .optional()
//     .isInt({ min: 1, max: 12 })
//     .withMessage("Season open to must be between 1 and 12"),

//   handleValidationErrors,
// ];

// /* ============================================
//    UPDATE HOTEL VALIDATION
// ============================================ */
// export const validateUpdateHotel = [
//   param("hotelId")
//     .notEmpty()
//     .isInt({ min: 1 })
//     .withMessage("Valid hotel ID is required"),

//   body("name")
//     .optional()
//     .trim()
//     .isLength({ min: 3, max: 255 })
//     .withMessage("Hotel name must be between 3 and 255 characters"),

//   body("address")
//     .optional()
//     .trim()
//     .isLength({ max: 500 })
//     .withMessage("Address must not exceed 500 characters"),

//   body("region")
//     .optional()
//     .isIn(["Kaghan", "Naran", "Shogran"])
//     .withMessage("Region must be one of: Kaghan, Naran, Shogran"),

//   body("latitude")
//     .optional()
//     .isFloat({ min: -90, max: 90 })
//     .withMessage("Latitude must be between -90 and 90"),

//   body("longitude")
//     .optional()
//     .isFloat({ min: -180, max: 180 })
//     .withMessage("Longitude must be between -180 and 180"),

//   body("phone")
//     .optional()
//     .trim()
//     .isLength({ max: 20 })
//     .withMessage("Phone must not exceed 20 characters"),

//   body("email")
//     .optional()
//     .trim()
//     .isEmail()
//     .withMessage("Invalid email format")
//     .isLength({ max: 100 })
//     .withMessage("Email must not exceed 100 characters"),

//   body("description")
//     .optional()
//     .trim()
//     .isLength({ max: 5000 })
//     .withMessage("Description must not exceed 5000 characters"),

//   body("amenities")
//     .optional()
//     .isArray()
//     .withMessage("Amenities must be an array"),

//   body("isAllSeason")
//     .optional()
//     .isBoolean()
//     .withMessage("isAllSeason must be a boolean"),

//   body("seasonOpenFrom")
//     .optional()
//     .isInt({ min: 1, max: 12 })
//     .withMessage("Season open from must be between 1 and 12"),

//   body("seasonOpenTo")
//     .optional()
//     .isInt({ min: 1, max: 12 })
//     .withMessage("Season open to must be between 1 and 12"),

//   handleValidationErrors,
// ];

// /* ============================================
//    UPDATE ACTIVE STATUS VALIDATION
// ============================================ */
// export const validateUpdateActiveStatus = [
//   param("hotelId")
//     .notEmpty()
//     .isInt({ min: 1 })
//     .withMessage("Valid hotel ID is required"),

//   body("isActive")
//     .notEmpty()
//     .withMessage("isActive is required")
//     .isBoolean()
//     .withMessage("isActive must be a boolean"),

//   handleValidationErrors,
// ];

// /* ============================================
//    HOTEL ID VALIDATION
// ============================================ */
// export const validateHotelId = [
//   param("hotelId")
//     .notEmpty()
//     .isInt({ min: 1 })
//     .withMessage("Valid hotel ID is required"),

//   handleValidationErrors,
// ];

// /* ============================================
//    IMAGE ID VALIDATION
// ============================================ */
// export const validateImageId = [
//   param("hotelId")
//     .notEmpty()
//     .isInt({ min: 1 })
//     .withMessage("Valid hotel ID is required"),

//   param("imageId")
//     .notEmpty()
//     .isInt({ min: 1 })
//     .withMessage("Valid image ID is required"),

//   handleValidationErrors,
// ];

// /* ============================================
//    ADD IMAGE VALIDATION
// ============================================ */
// export const validateAddImage = [
//   param("hotelId")
//     .notEmpty()
//     .isInt({ min: 1 })
//     .withMessage("Valid hotel ID is required"),

//   body("caption")
//     .optional()
//     .trim()
//     .isLength({ max: 255 })
//     .withMessage("Caption must not exceed 255 characters"),

//   body("displayOrder")
//     .optional()
//     .isInt({ min: 0 })
//     .withMessage("Display order must be a positive integer"),

//   handleValidationErrors,
// ];

// /* ============================================
//    GET ALL HOTELS VALIDATION
// ============================================ */
// export const validateGetAllHotels = [
//   query("page")
//     .optional()
//     .isInt({ min: 1 })
//     .withMessage("Page must be a positive integer"),

//   query("limit")
//     .optional()
//     .isInt({ min: 1, max: 100 })
//     .withMessage("Limit must be between 1 and 100"),

//   query("search")
//     .optional()
//     .trim()
//     .isLength({ max: 100 })
//     .withMessage("Search query must not exceed 100 characters"),

//   query("region")
//     .optional()
//     .isIn(["Kaghan", "Naran", "Shogran"])
//     .withMessage("Region must be one of: Kaghan, Naran, Shogran"),

//   query("isAllSeason")
//     .optional()
//     .isBoolean()
//     .withMessage("isAllSeason must be a boolean"),

//   query("sortBy")
//     .optional()
//     .isIn(["created_at", "name", "view_count", "average_rating", "region"])
//     .withMessage("Invalid sort field"),

//   query("order")
//     .optional()
//     .isIn(["asc", "desc"])
//     .withMessage("Order must be asc or desc"),

//   handleValidationErrors,
// ];

// /* ============================================
//    GET NEARBY HOTELS VALIDATION (for place)
// ============================================ */
// export const validateGetNearbyHotels = [
//   param("placeId")
//     .notEmpty()
//     .isInt({ min: 1 })
//     .withMessage("Valid place ID is required"),

//   query("radius")
//     .optional()
//     .isInt({ min: 1, max: 50 })
//     .withMessage("Radius must be between 1 and 50 km"),

//   handleValidationErrors,
// ];

// /* ============================================
//    AUDIT HISTORY VALIDATION
// ============================================ */
// export const validateAuditHistory = [
//   param("hotelId")
//     .notEmpty()
//     .isInt({ min: 1 })
//     .withMessage("Valid hotel ID is required"),

//   query("limit")
//     .optional()
//     .isInt({ min: 1, max: 200 })
//     .withMessage("Limit must be between 1 and 200"),

//   handleValidationErrors,
// ];

// src/modules/hotels/hotels.validation.js

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

// ── Shared amenities sanitizer ────────────────────────────────────────────────
// Parses JSON string → real array before isArray() runs.
// Handles: '[{"name":"WiFi"}]', '[]', already-array (no-op), undefined (skip).
const amenitiesSanitizer = body("amenities")
  .optional()
  .customSanitizer((value) => {
    if (Array.isArray(value)) return value; // already parsed (shouldn't happen with FormData)
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })
  .isArray()
  .withMessage("Amenities must be an array");

/* ============================================
   CREATE HOTEL VALIDATION
============================================ */
export const validateCreateHotel = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Hotel name is required")
    .isLength({ min: 3, max: 255 })
    .withMessage("Hotel name must be between 3 and 255 characters"),

  body("address")
    .trim()
    .notEmpty()
    .withMessage("Address is required")
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters"),

  body("region")
    .notEmpty()
    .withMessage("Region is required")
    .isIn(["Kaghan", "Naran", "Shogran"])
    .withMessage("Region must be one of: Kaghan, Naran, Shogran"),

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

  body("phone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone must not exceed 20 characters"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email format")
    .isLength({ max: 100 })
    .withMessage("Email must not exceed 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description must not exceed 5000 characters"),

  // ── FIXED: sanitize JSON string → real array before isArray() check ──
  amenitiesSanitizer,

  body("isAllSeason")
    .optional()
    .isBoolean()
    .withMessage("isAllSeason must be a boolean"),

  body("seasonOpenFrom")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("Season open from must be between 1 and 12"),

  body("seasonOpenTo")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("Season open to must be between 1 and 12"),

  handleValidationErrors,
];

/* ============================================
   UPDATE HOTEL VALIDATION
============================================ */
export const validateUpdateHotel = [
  param("hotelId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid hotel ID is required"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage("Hotel name must be between 3 and 255 characters"),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters"),

  body("region")
    .optional()
    .isIn(["Kaghan", "Naran", "Shogran"])
    .withMessage("Region must be one of: Kaghan, Naran, Shogran"),

  body("latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),

  body("longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),

  body("phone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone must not exceed 20 characters"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email format")
    .isLength({ max: 100 })
    .withMessage("Email must not exceed 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description must not exceed 5000 characters"),

  // ── FIXED: same sanitizer for update ──
  amenitiesSanitizer,

  body("isAllSeason")
    .optional()
    .isBoolean()
    .withMessage("isAllSeason must be a boolean"),

  body("seasonOpenFrom")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("Season open from must be between 1 and 12"),

  body("seasonOpenTo")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("Season open to must be between 1 and 12"),

  handleValidationErrors,
];

/* ============================================
   UPDATE ACTIVE STATUS VALIDATION
============================================ */
export const validateUpdateActiveStatus = [
  param("hotelId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid hotel ID is required"),

  body("isActive")
    .notEmpty()
    .withMessage("isActive is required")
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  handleValidationErrors,
];

/* ============================================
   HOTEL ID VALIDATION
============================================ */
export const validateHotelId = [
  param("hotelId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid hotel ID is required"),

  handleValidationErrors,
];

/* ============================================
   IMAGE ID VALIDATION
============================================ */
export const validateImageId = [
  param("hotelId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid hotel ID is required"),

  param("imageId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid image ID is required"),

  handleValidationErrors,
];

/* ============================================
   ADD IMAGE VALIDATION
============================================ */
export const validateAddImage = [
  param("hotelId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid hotel ID is required"),

  body("caption")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Caption must not exceed 255 characters"),

  body("displayOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Display order must be a positive integer"),

  handleValidationErrors,
];

/* ============================================
   GET ALL HOTELS VALIDATION
============================================ */
export const validateGetAllHotels = [
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

  query("isAllSeason")
    .optional()
    .isBoolean()
    .withMessage("isAllSeason must be a boolean"),

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
   GET NEARBY HOTELS VALIDATION
============================================ */
export const validateGetNearbyHotels = [
  param("placeId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid place ID is required"),

  query("radius")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Radius must be between 1 and 50 km"),

  handleValidationErrors,
];

/* ============================================
   AUDIT HISTORY VALIDATION
============================================ */
export const validateAuditHistory = [
  param("hotelId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid hotel ID is required"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage("Limit must be between 1 and 200"),

  handleValidationErrors,
];