// src/modules/panicAlarm/panicAlarm.validation.js

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
   CREATE SOS FOR SELF
============================================ */
export const validateCreateSOSSelf = [
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

  body("locationAccuracy")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Location accuracy must be a positive number"),

  handleValidationErrors,
];

/* ============================================
   CREATE SOS FOR OTHER
============================================ */
export const validateCreateSOSOther = [
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

  body("locationAccuracy")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Location accuracy must be a positive number"),

  body("otherPersonName")
    .notEmpty()
    .withMessage("Other person's name is required")
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("Name must be between 2 and 255 characters"),

  body("otherPersonPhone")
    .notEmpty()
    .withMessage("Other person's phone number is required")
    .matches(/^(\+92|0)?[0-9]{10}$/)
    .withMessage("Invalid phone number format"),

  body("otherPersonRelation")
    .notEmpty()
    .withMessage("Relation to the person is required")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Relation must be between 2 and 100 characters"),

  body("emergencyType")
    .optional()
    .isIn(["medical", "crime", "accident", "fire", "other"])
    .withMessage("Invalid emergency type"),

  body("quickNote")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Quick note must be max 500 characters"),

  handleValidationErrors,
];

/* ============================================
   UPDATE SOS CONTEXT
============================================ */
export const validateUpdateContext = [
  param("sosId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid SOS ID is required"),

  body("emergencyType")
    .optional()
    .isIn(["medical", "crime", "accident", "fire", "other"])
    .withMessage("Invalid emergency type"),

  body("quickNote")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Quick note must be max 500 characters"),

  body("estimatedCasualties")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Estimated casualties must be between 1 and 100"),

  body("userInjuredLevel")
    .optional()
    .isIn(["none", "minor", "serious"])
    .withMessage("Invalid injury level"),

  body("canReceiveCall")
    .optional()
    .isBoolean()
    .withMessage("Can receive call must be a boolean"),

  handleValidationErrors,
];

/* ============================================
   GET USER SOS LIST
============================================ */
export const validateGetUserSOSList = [
  query("status")
    .optional()
    .isIn(["active", "resolved", "created", "acknowledged", "responding"])
    .withMessage("Invalid status filter"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  handleValidationErrors,
];

/* ============================================
   GET ALL SOS (ADMIN)
============================================ */
export const validateGetAllSOS = [
  query("status")
    .optional()
    .isIn([
      "active",
      "created",
      "acknowledged",
      "responding",
      "resolved",
      "cancelled",
    ])
    .withMessage("Invalid status filter"),

  query("acknowledgedBy")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Acknowledged by must be a valid user ID"),

  query("sosFor")
    .optional()
    .isIn(["self", "other"])
    .withMessage("Invalid SOS for filter"),

  query("emergencyType")
    .optional()
    .isIn(["medical", "crime", "accident", "fire", "other"])
    .withMessage("Invalid emergency type"),

  query("resolutionType")
    .optional()
    .isIn(["genuine_emergency", "accidental", "false_alarm", "duplicate"])
    .withMessage("Invalid resolution type"),

  query("sortBy")
    .optional()
    .isIn(["created_at", "priority", "status"])
    .withMessage("Invalid sort field"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Order must be asc or desc"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  handleValidationErrors,
];

/* ============================================
   SOS ID VALIDATION
============================================ */
export const validateSOSId = [
  param("sosId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid SOS ID is required"),

  handleValidationErrors,
];

/* ============================================
   UPDATE SOS STATUS
============================================ */
export const validateUpdateStatus = [
  param("sosId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid SOS ID is required"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["responding", "resolved", "cancelled"])
    .withMessage("Invalid status"),

  handleValidationErrors,
];

/* ============================================
   RESOLVE SOS
============================================ */
export const validateResolveSOS = [
  param("sosId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid SOS ID is required"),

  body("resolutionType")
    .notEmpty()
    .withMessage("Resolution type is required")
    .isIn(["genuine_emergency", "accidental", "false_alarm", "duplicate"])
    .withMessage("Invalid resolution type"),

  body("resolutionNotes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Resolution notes must be max 1000 characters"),

  handleValidationErrors,
];

/* ============================================
   SEND MESSAGE
============================================ */
export const validateSendMessage = [
  param("sosId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid SOS ID is required"),

  body("message")
    .notEmpty()
    .withMessage("Message is required")
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Message must be between 1 and 1000 characters"),

  handleValidationErrors,
];

/* ============================================
   GET MESSAGES
============================================ */
export const validateGetMessages = [
  param("sosId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid SOS ID is required"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  handleValidationErrors,
];

/* ============================================
   GET STATISTICS (SUPER ADMIN)
============================================ */
export const validateGetStatistics = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),

  query("adminId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Admin ID must be a valid user ID"),

  handleValidationErrors,
];

// // src/modules/panic-alarm/panic-alarm.validation.js

// import { body, query, param, validationResult } from "express-validator";

// /* ============================================
//    HANDLE VALIDATION ERRORS (SAME AS HOTELS)
// ============================================ */
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
//    COMMON VALIDATORS (REUSE)
// ============================================ */
// const validateLatitude = body("latitude")
//   .notEmpty()
//   .withMessage("Latitude is required")
//   .isFloat({ min: -90, max: 90 })
//   .withMessage("Latitude must be between -90 and 90");

// const validateLongitude = body("longitude")
//   .notEmpty()
//   .withMessage("Longitude is required")
//   .isFloat({ min: -180, max: 180 })
//   .withMessage("Longitude must be between -180 and 180");

// const validateLocationAccuracy = body("locationAccuracy")
//   .optional()
//   .isFloat({ min: 0 })
//   .withMessage("locationAccuracy must be a positive number");

// const validateSOSFor = body("sosFor")
//   .notEmpty()
//   .withMessage("sosFor is required")
//   .isIn(["self", "other"])
//   .withMessage("sosFor must be either self or other");

// const validateEmergencyType = body("emergencyType")
//   .optional()
//   .isIn(["medical", "crime", "accident", "fire", "other"])
//   .withMessage(
//     "emergencyType must be one of: medical, crime, accident, fire, other",
//   );

// const validateQuickNote = body("quickNote")
//   .optional()
//   .trim()
//   .isLength({ max: 500 })
//   .withMessage("quickNote must not exceed 500 characters");

// const validateEstimatedCasualties = body("estimatedCasualties")
//   .optional()
//   .isInt({ min: 1, max: 500 })
//   .withMessage("estimatedCasualties must be between 1 and 500");

// const validateUserInjuredLevel = body("userInjuredLevel")
//   .optional()
//   .isIn(["serious", "minor", "none"])
//   .withMessage("userInjuredLevel must be one of: serious, minor, none");

// const validateVisibleInjuries = body("visibleInjuries")
//   .optional()
//   .isIn(["serious", "minor", "none", "unknown"])
//   .withMessage("visibleInjuries must be one of: serious, minor, none, unknown");

// const validateCanReceiveCall = body("canReceiveCall")
//   .optional()
//   .isBoolean()
//   .withMessage("canReceiveCall must be a boolean");

// /* ============================================
//    CREATE SOS (SINGLE API)
//    - Works for both: self and other
//    - We enforce extra fields when sosFor = other
// ============================================ */
// export const validateCreateSOS = [
//   validateLatitude,
//   validateLongitude,
//   validateLocationAccuracy,
//   validateSOSFor,

//   validateEmergencyType,
//   validateQuickNote,
//   validateEstimatedCasualties,
//   validateUserInjuredLevel,
//   validateVisibleInjuries,
//   validateCanReceiveCall,

//   // Conditional checks (IMPORTANT)
//   body("emergencyType").custom((value, { req }) => {
//     if (req.body.sosFor === "other" && !value) {
//       throw new Error("emergencyType is required when sosFor is other");
//     }
//     return true;
//   }),

//   body("quickNote").custom((value, { req }) => {
//     if (req.body.sosFor === "other" && (!value || value.trim().length < 5)) {
//       throw new Error(
//         "quickNote is required (min 5 chars) when sosFor is other",
//       );
//     }
//     return true;
//   }),

//   body("estimatedCasualties").custom((value, { req }) => {
//     if (
//       req.body.sosFor === "other" &&
//       (value === undefined || value === null)
//     ) {
//       throw new Error("estimatedCasualties is required when sosFor is other");
//     }
//     return true;
//   }),

//   handleValidationErrors,
// ];

// /* ============================================
//    SOS ID VALIDATION
// ============================================ */
// export const validateSOSId = [
//   param("sosId")
//     .notEmpty()
//     .withMessage("sosId is required")
//     .isInt({ min: 1 })
//     .withMessage("Valid sosId is required"),

//   handleValidationErrors,
// ];

// /* ============================================
//    UPDATE SOS CONTEXT
// ============================================ */
// export const validateUpdateSOSContext = [
//   param("sosId")
//     .notEmpty()
//     .withMessage("sosId is required")
//     .isInt({ min: 1 })
//     .withMessage("Valid sosId is required"),

//   body("emergencyType")
//     .notEmpty()
//     .withMessage("emergencyType is required")
//     .isIn(["medical", "crime", "accident", "fire", "other"])
//     .withMessage(
//       "emergencyType must be one of: medical, crime, accident, fire, other",
//     ),

//   validateQuickNote,
//   validateEstimatedCasualties,
//   validateUserInjuredLevel,
//   validateCanReceiveCall,

//   handleValidationErrors,
// ];

// /* ============================================
//    ACKNOWLEDGE SOS
// ============================================ */
// export const validateAcknowledgeSOS = [
//   param("sosId")
//     .notEmpty()
//     .withMessage("sosId is required")
//     .isInt({ min: 1 })
//     .withMessage("Valid sosId is required"),

//   handleValidationErrors,
// ];

// /* ============================================
//    UPDATE SOS STATUS
// ============================================ */
// export const validateUpdateSOSStatus = [
//   param("sosId")
//     .notEmpty()
//     .withMessage("sosId is required")
//     .isInt({ min: 1 })
//     .withMessage("Valid sosId is required"),

//   body("status")
//     .notEmpty()
//     .withMessage("status is required")
//     .isIn(["created", "acknowledged", "responding", "resolved"])
//     .withMessage(
//       "status must be one of: created, acknowledged, responding, resolved",
//     ),

//   handleValidationErrors,
// ];

// /* ============================================
//    RESOLVE SOS
// ============================================ */
// export const validateResolveSOS = [
//   param("sosId")
//     .notEmpty()
//     .withMessage("sosId is required")
//     .isInt({ min: 1 })
//     .withMessage("Valid sosId is required"),

//   body("resolutionType")
//     .notEmpty()
//     .withMessage("resolutionType is required")
//     .isIn(["genuine_emergency", "accidental", "false_alarm"])
//     .withMessage(
//       "resolutionType must be one of: genuine_emergency, accidental, false_alarm",
//     ),

//   body("resolutionNotes")
//     .notEmpty()
//     .withMessage("resolutionNotes is required")
//     .trim()
//     .isLength({ min: 5, max: 1000 })
//     .withMessage("resolutionNotes must be between 5 and 1000 characters"),

//   handleValidationErrors,
// ];

// /* ============================================
//    GET ADMIN SOS LIST (FILTER)
// ============================================ */
// export const validateGetSOSForAdmin = [
//   query("filter")
//     .optional()
//     .isIn(["all", "active", "previous", "my", "fake"])
//     .withMessage("filter must be one of: all, active, previous, my, fake"),

//   handleValidationErrors,
// ];

// /* ============================================
//    GET STATISTICS
// ============================================ */
// export const validateGetSOSStatistics = [
//   query("year")
//     .optional()
//     .isInt({ min: 2020, max: 2100 })
//     .withMessage("year must be between 2020 and 2100"),

//   query("month")
//     .optional()
//     .isInt({ min: 1, max: 12 })
//     .withMessage("month must be between 1 and 12"),

//   handleValidationErrors,
// ];
