// src/modules/profile/profile.validation.js

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
   UPDATE PROFILE VALIDATION (USER)
============================================ */
export const validateUpdateProfile = [
  body("dob").optional().isDate().withMessage("Invalid date format"),

  body("gender")
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be: male, female, or other"),

  body("nationality")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Nationality must be max 50 characters"),

  body("addressLine")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must be max 500 characters"),

  body("city")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("City must be max 50 characters"),

  body("province")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Province must be max 50 characters"),

  body("country")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Country must be max 50 characters"),

  body("postalCode")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Postal code must be max 20 characters"),

  body("emergencyContact")
    .optional()
    .isObject()
    .withMessage("Emergency contact must be an object"),

  body("emergencyContact.name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Emergency contact name must be 2-100 characters"),

  body("emergencyContact.relationship")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Relationship must be max 50 characters"),

  body("emergencyContact.phone")
    .optional()
    .trim()
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage("Invalid emergency contact phone number"),

  body("emergencyContact.email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid emergency contact email"),

  body("emergencyContact.address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Emergency contact address must be max 500 characters"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Name must be 3-50 characters"),

  handleValidationErrors,
];

/* ============================================
   GET ALL PROFILES VALIDATION (ADMIN)
============================================ */
export const validateGetAllProfiles = [
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

  query("sortBy")
    .optional()
    .isIn(["name", "email", "created_at", "role"])
    .withMessage("Invalid sort field"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Order must be asc or desc"),

  handleValidationErrors,
];

/* ============================================
   UPDATE USER BY ADMIN VALIDATION
============================================ */


export const validateAdminUpdateUser = [
  param("userId")
    .notEmpty()
    .isInt()
    .withMessage("User ID must be an integer"),

  // User table fields (sensitive)
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Name must be 3-50 characters"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("phone")
    .optional()
    .trim()
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage("Invalid phone number"),

  body("cnic")
    .optional()
    .trim()
    .matches(/^\d{5}-\d{7}-\d{1}$/)
    .withMessage("CNIC must be in format 12345-1234567-1"),

  body("role")
    .optional()
    .isIn(["user", "admin", "superadmin","police"])
    .withMessage("Invalid role"),

  // Profile table fields
  body("dob")
    .optional()
    .isDate()
    .withMessage("Invalid date format"),

  body("gender")
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be: male, female, or other"),

  body("nationality")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Nationality must be max 50 characters"),

  body("addressLine")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must be max 500 characters"),

  body("city")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("City must be max 50 characters"),

  body("province")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Province must be max 50 characters"),

  body("country")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Country must be max 50 characters"),

  body("postalCode")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Postal code must be max 20 characters"),

  // Emergency contact (admin can update this too)
  body("emergencyContact")
    .optional()
    .isObject()
    .withMessage("Emergency contact must be an object"),

  body("emergencyContact.name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Emergency contact name must be 2-100 characters"),

  body("emergencyContact.relationship")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Relationship must be max 50 characters"),

  body("emergencyContact.phone")
    .optional()
    .trim()
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage("Invalid emergency contact phone number"),

  body("emergencyContact.email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid emergency contact email"),

  body("emergencyContact.address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Emergency contact address must be max 500 characters"),

  handleValidationErrors,
];