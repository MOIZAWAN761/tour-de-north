// src/modules/notifications/notifications.validation.js

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
   CREATE NOTIFICATION (ADMIN)
============================================ */
export const validateCreateNotification = [
  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn(["traffic", "weather", "guideline", "system"])
    .withMessage("Invalid category"),

  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage("Title must be between 3 and 255 characters"),

  body("body")
    .notEmpty()
    .withMessage("Body is required")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Body must be between 10 and 1000 characters"),

  body("priority")
    .optional()
    .isIn(["low", "normal", "high", "urgent"])
    .withMessage("Invalid priority"),

  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Expires at must be a valid ISO 8601 date"),

  body("data").optional().isObject().withMessage("Data must be an object"),

  handleValidationErrors,
];

/* ============================================
   UPDATE NOTIFICATION (ADMIN)
============================================ */
export const validateUpdateNotification = [
  param("notificationId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid notification ID is required"),

  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage("Title must be between 3 and 255 characters"),

  body("body")
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Body must be between 10 and 1000 characters"),

  body("priority")
    .optional()
    .isIn(["low", "normal", "high", "urgent"])
    .withMessage("Invalid priority"),

  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Expires at must be a valid ISO 8601 date"),

  body("data").optional().isObject().withMessage("Data must be an object"),

  handleValidationErrors,
];

/* ============================================
   GET USER NOTIFICATIONS
============================================ */
export const validateGetUserNotifications = [
  query("category")
    .optional()
    .isIn(["all", "sos", "traffic", "weather", "guideline", "system"])
    .withMessage("Invalid category"),

  query("isRead")
    .optional()
    .isBoolean()
    .withMessage("Is read must be a boolean"),

  query("type")
    .optional()
    .isIn(["sos_status", "admin_alert", "system", "general"])
    .withMessage("Invalid type"),

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
   GET ALL NOTIFICATIONS (ADMIN)
============================================ */
export const validateGetAllNotifications = [
  query("category")
    .optional()
    .isIn(["all", "sos", "traffic", "weather", "guideline", "system"])
    .withMessage("Invalid category"),

  query("type")
    .optional()
    .isIn(["sos_status", "admin_alert", "system", "general"])
    .withMessage("Invalid type"),

  query("createdBy")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Created by must be a valid user ID"),

  query("sortBy")
    .optional()
    .isIn(["created_at", "priority", "category"])
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
   NOTIFICATION ID VALIDATION
============================================ */
export const validateNotificationId = [
  param("notificationId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid notification ID is required"),

  handleValidationErrors,
];

/* ============================================
   MARK AS READ
============================================ */
export const validateMarkAsRead = [
  param("notificationId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid notification ID is required"),

  handleValidationErrors,
];

/* ============================================
   MARK ALL AS READ
============================================ */
export const validateMarkAllAsRead = [
  body("category")
    .optional()
    .isIn(["all", "sos", "traffic", "weather", "guideline", "system"])
    .withMessage("Invalid category"),

  handleValidationErrors,
];

/* ============================================
   SAVE DEVICE TOKEN
============================================ */
export const validateSaveDeviceToken = [
  body("token")
    .notEmpty()
    .withMessage("Device token is required")
    .isString()
    .withMessage("Token must be a string"),

  body("deviceType")
    .notEmpty()
    .withMessage("Device type is required")
    .isIn(["android", "ios", "web"])
    .withMessage("Invalid device type"),

  body("deviceInfo")
    .optional()
    .isObject()
    .withMessage("Device info must be an object"),

  handleValidationErrors,
];

/* ============================================
   DELETE DEVICE TOKEN
============================================ */
export const validateDeleteDeviceToken = [
  body("token")
    .notEmpty()
    .withMessage("Device token is required")
    .isString()
    .withMessage("Token must be a string"),

  handleValidationErrors,
];
