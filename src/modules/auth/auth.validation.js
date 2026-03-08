// src/validations/auth.validation.js
import { body, param, validationResult } from "express-validator";

/* ======================================================
   VALIDATION RESULT HANDLER
====================================================== */
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

/* ======================================================
   SIGNUP VALIDATION
====================================================== */
export const validateSignup = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Name must be between 3 and 50 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  // body("phone")
  //   .trim()
  //   .notEmpty()
  //   .withMessage("Phone is required")
  //   .matches(/^\d{10,15}$/)
  //   .withMessage("Phone must contain only digits (10-15 digits)"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone is required")
    .matches(/^\+[1-9]\d{7,14}$/)
    .withMessage("Phone must be in format +923123456789"),

  body("cnic")
    .trim()
    .notEmpty()
    .withMessage("CNIC is required")
    .matches(/^\d{5}-\d{7}-\d{1}$/)
    .withMessage("CNIC must be in format 13503-1214450-7"),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8, max: 16 })
    .withMessage("Password must be 8-16 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[@$!%*?&]/)
    .withMessage("Password must contain at least one special character"),

  body("firebaseIdToken")
    .notEmpty()
    .withMessage("Firebase ID Token is required"),

  handleValidationErrors,
];

/* ======================================================
   LOGIN VALIDATION
====================================================== */
// Update login validation to include optional firebaseIdToken
export const validateLogin = [
  body("identifier")
    .trim()
    .notEmpty()
    .withMessage("Email or phone is required"),

  body("password").notEmpty().withMessage("Password is required"),

  body("deviceId").trim().notEmpty().withMessage("Device ID is required"),

  body("firebaseIdToken")
    .optional()
    .isString()
    .withMessage("Firebase token must be a string"),

  handleValidationErrors,
];

/* ======================================================
   RESET PASSWORD VALIDATION
====================================================== */
// Update reset password validation to require firebaseIdToken
export const validateResetPassword = [
  body("identifier")
    .trim()
    .notEmpty()
    .withMessage("Email or phone is required"),

  body("newPassword")
    .trim()
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8, max: 16 })
    .withMessage("Password must be 8-16 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[@$!%*?&]/)
    .withMessage("Password must contain at least one special character"),

  body("firebaseIdToken")
    .notEmpty()
    .withMessage("Phone verification (Firebase token) is required for password reset"),

  handleValidationErrors,
];

/* ======================================================
   UPDATE PROFILE VALIDATION (User)
====================================================== */
export const validateUpdateProfile = [
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
    .matches(/^\d{10,15}$/)
    .withMessage("Phone must contain only digits (10-15 digits)"),

  handleValidationErrors,
];

/* ======================================================
   UPDATE USER VALIDATION (Admin)
====================================================== */
export const validateUpdateUser = [
  param("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isInt()
    .withMessage("User ID must be an integer"),

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
    .matches(/^\d{10,15}$/)
    .withMessage("Phone must contain only digits (10-15 digits)"),

  body("role")
    .optional()
    .isIn(["user", "admin", "superadmin"])
    .withMessage("Role must be one of: user, admin, superadmin"),

  handleValidationErrors,
];

export const validateLogout = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
  handleValidationErrors,
];
export const validateRefreshToken = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
  handleValidationErrors,
];
