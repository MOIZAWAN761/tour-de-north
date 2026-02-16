// src/modules/messaging/messaging.validation.js

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
   GET CONVERSATION MESSAGES
============================================ */
export const validateGetConversation = [
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
    .isInt({ min: 1, max: 200 })
    .withMessage("Limit must be between 1 and 200"),

  handleValidationErrors,
];

/* ============================================
   GET CONVERSATIONS LIST
============================================ */
export const validateGetConversations = [
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
   MARK AS READ
============================================ */
export const validateMarkAsRead = [
  param("sosId")
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Valid SOS ID is required"),

  handleValidationErrors,
];
