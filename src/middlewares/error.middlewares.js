// src/middlewares/error.middleware.js

export function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error("Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Default error
  let status = err.status || err.statusCode || 500;
  let message = err.message || "Internal server error";
  let code = err.code || "server/error";

  // Handle specific error types

  // 1. Validation errors (from express-validator)
  if (err.name === "ValidationError") {
    status = 400;
    code = "validation/error";
    message = "Validation failed";
  }

  // 2. Database errors
  if (err.code === "23505") {
    // PostgreSQL unique constraint violation
    status = 409;
    code = "database/duplicate";

    if (err.constraint) {
      if (err.constraint.includes("email")) {
        message = "Email already exists";
      } else if (err.constraint.includes("phone")) {
        message = "Phone number already exists";
      } else if (err.constraint.includes("cnic")) {
        message = "CNIC already exists";
      } else if (err.constraint.includes("saved_places")) {
        message = "Place already saved";
        code = "place/already-saved";
      } else if (err.constraint.includes("device_tokens_token")) {
        message = "Device token already registered";
        code = "notification/token-exists";
      } else {
        message = "Duplicate entry";
      }
    } else {
      message = "Duplicate entry";
    }
  }

  if (err.code === "23503") {
    // PostgreSQL foreign key violation
    status = 400;
    code = "database/foreign-key";

    if (err.constraint && err.constraint.includes("place")) {
      message = "Place does not exist";
    } else if (err.constraint && err.constraint.includes("user")) {
      message = "User does not exist";
    } else if (err.constraint && err.constraint.includes("sos")) {
      message = "SOS does not exist";
    } else {
      message = "Referenced record does not exist";
    }
  }

  if (err.code === "23502") {
    // PostgreSQL not null violation
    status = 400;
    code = "database/not-null";

    if (err.column) {
      message = `${err.column} is required`;
    } else {
      message = "Required field is missing";
    }
  }

  // PostgreSQL check constraint violation
  if (err.code === "23514") {
    status = 400;
    code = "validation/constraint";

    if (err.constraint && err.constraint.includes("region")) {
      message = "Region must be one of: Kaghan, Naran, Shogran";
    } else if (err.constraint && err.constraint.includes("safety_status")) {
      message = "Safety status must be one of: safe, caution, danger";
    } else if (err.constraint && err.constraint.includes("sos_for")) {
      message = "SOS for must be either 'self' or 'other'";
    } else if (err.constraint && err.constraint.includes("emergency_type")) {
      message =
        "Emergency type must be one of: medical, crime, accident, fire, other";
    } else if (err.constraint && err.constraint.includes("status")) {
      message = "Invalid status value";
    } else {
      message = "Invalid value for field";
    }
  }

  // 3. JWT errors
  if (err.name === "JsonWebTokenError") {
    status = 401;
    code = "auth/invalid-token";
    message = "Invalid authentication token";
  }

  if (err.name === "TokenExpiredError") {
    status = 401;
    code = "auth/token-expired";
    message = "Authentication token has expired";
  }

  // 4. Multer errors (file upload)
  if (err.name === "MulterError") {
    status = 400;
    code = "upload/error";

    if (err.code === "LIMIT_FILE_SIZE") {
      const maxSize = req.path.includes("place") ? "10MB" : "5MB";
      message = `File size too large. Maximum size is ${maxSize}`;
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Unexpected file field";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "Too many files uploaded";
    } else {
      message = err.message;
    }
  }

  // Handle Multer filter errors
  if (err.message && err.message.includes("Only image files are allowed")) {
    status = 400;
    code = "upload/invalid-type";
    message = "Only image files (JPG, PNG, GIF, WEBP) are allowed";
  }

  // 5. Cloudinary errors
  if (err.message && err.message.includes("Cloudinary")) {
    status = 500;
    code = "upload/cloudinary-error";
    message = "Failed to upload image. Please try again.";
  }

  if (err.message && err.message.includes("Failed to upload place image")) {
    status = 500;
    code = "place/image-upload-failed";
    message = "Failed to upload place image. Please try again.";
  }

  if (err.message && err.message.includes("Failed to delete place image")) {
    status = 500;
    code = "place/image-delete-failed";
    message = "Failed to delete place image from storage.";
  }

  // 6. Firebase errors
  if (err.code && err.code.startsWith("auth/")) {
    status = 401;
    message = err.message;
  }

  // 7. Places module specific errors
  if (err.message && err.message.includes("Place not found")) {
    status = 404;
    code = "place/not-found";
    message = "Place not found";
  }

  if (err.message && err.message.includes("Image not found")) {
    status = 404;
    code = "place/image-not-found";
    message = "Image not found";
  }

  if (err.message && err.message.includes("Place was not saved")) {
    status = 404;
    code = "place/not-saved";
    message = "Place was not in your saved list";
  }

  if (err.message && err.message.includes("Invalid coordinates")) {
    status = 400;
    code = "place/invalid-coordinates";
    message = err.message;
  }

  if (err.existingPlace) {
    status = 409;
    code = "place/duplicate";
    message =
      err.message || "A place with this name or coordinates already exists";
  }

  // 8. SOS/Panic Alarm specific errors
  if (err.message && err.message.includes("SOS not found")) {
    status = 404;
    code = "sos/not-found";
    message = "SOS not found";
  }

  if (err.code === "sos/rate-limit") {
    status = 429;
    code = "sos/rate-limit";
    message = err.message || "Too many SOS alarms. Please wait.";
  }

  if (err.message && err.message.includes("outside Mansehra region")) {
    status = 400;
    code = "sos/outside-region";
    message =
      "Location is outside Mansehra region. Service unavailable in this area.";
  }

  if (err.message && err.message.includes("already been acknowledged")) {
    status = 409;
    code = "sos/already-acknowledged";
    message = "SOS has already been acknowledged by another admin";
  }

  if (err.message && err.message.includes("Only the assigned admin")) {
    status = 403;
    code = "sos/not-assigned";
    message = "Only the assigned admin can perform this action";
  }

  if (err.message && err.message.includes("Messaging is not allowed")) {
    status = 400;
    code = "sos/messaging-disabled";
    message =
      "Messaging is disabled for this SOS (only available after acknowledgment and before resolution)";
  }

  if (err.message && err.message.includes("only update your own SOS")) {
    status = 403;
    code = "sos/not-owner";
    message = "You can only update your own SOS";
  }

  // 9. Notifications specific errors
  if (err.message && err.message.includes("Notification not found")) {
    status = 404;
    code = "notification/not-found";
    message = "Notification not found";
  }

  if (err.message && err.message.includes("mark your own notifications")) {
    status = 403;
    code = "notification/not-owner";
    message = "You can only mark your own notifications as read";
  }

  if (err.message && err.message.includes("notifications you created")) {
    status = 403;
    code = "notification/not-creator";
    message = "You can only modify notifications you created";
  }

  // 10. FCM errors
  if (err.message && err.message.includes("FCM")) {
    status = 500;
    code = "notification/fcm-error";
    message =
      "Failed to send push notification. Notification saved but not delivered.";
  }

  // 11. Not found errors
  if (status === 404) {
    code = code || "not-found";
  }

  // Handle numeric conversion errors
  if (err.message && err.message.includes("invalid input syntax for type")) {
    status = 400;
    code = "validation/invalid-type";
    message = "Invalid data type provided";
  }

  // Send error response
  const response = {
    success: false,
    code,
    message,
  };

  // Add existing place data for duplicate errors
  if (err.existingPlace) {
    response.existingPlace = err.existingPlace;
  }

  // Add error details in development mode
  if (process.env.NODE_ENV === "development") {
    response.error = {
      stack: err.stack,
      details: err,
    };
  }

  // Add validation errors if present
  if (err.errors && Array.isArray(err.errors)) {
    response.errors = err.errors;
  }

  res.status(status).json(response);
}

/* ============================================
   NOT FOUND HANDLER (404)
============================================ */
export function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  error.status = 404;
  error.code = "route/not-found";
  next(error);
}

/* ============================================
   ASYNC ERROR WRAPPER
============================================ */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// // src/middlewares/error.middleware.js

// export function errorHandler(err, req, res, next) {
//   // Log error for debugging
//   console.error("Error:", {
//     message: err.message,
//     stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
//     path: req.path,
//     method: req.method,
//     timestamp: new Date().toISOString(),
//   });

//   // Default error
//   let status = err.status || err.statusCode || 500;
//   let message = err.message || "Internal server error";
//   let code = err.code || "server/error";

//   // Handle specific error types

//   // 1. Validation errors (from express-validator)
//   if (err.name === "ValidationError") {
//     status = 400;
//     code = "validation/error";
//     message = "Validation failed";
//   }

//   // 2. Database errors
//   if (err.code === "23505") {
//     // PostgreSQL unique constraint violation
//     status = 409;
//     code = "database/duplicate";

//     if (err.constraint) {
//       if (err.constraint.includes("email")) {
//         message = "Email already exists";
//       } else if (err.constraint.includes("phone")) {
//         message = "Phone number already exists";
//       } else if (err.constraint.includes("cnic")) {
//         message = "CNIC already exists";
//       } else if (err.constraint.includes("saved_places")) {
//         // ✅ NEW: Handle duplicate saved place
//         message = "Place already saved";
//         code = "place/already-saved";
//       } else {
//         message = "Duplicate entry";
//       }
//     } else {
//       message = "Duplicate entry";
//     }
//   }

//   if (err.code === "23503") {
//     // PostgreSQL foreign key violation
//     status = 400;
//     code = "database/foreign-key";

//     // ✅ NEW: More specific foreign key error messages
//     if (err.constraint && err.constraint.includes("place")) {
//       message = "Place does not exist";
//     } else if (err.constraint && err.constraint.includes("user")) {
//       message = "User does not exist";
//     } else {
//       message = "Referenced record does not exist";
//     }
//   }

//   if (err.code === "23502") {
//     // PostgreSQL not null violation
//     status = 400;
//     code = "database/not-null";

//     // ✅ NEW: Better not-null messages
//     if (err.column) {
//       message = `${err.column} is required`;
//     } else {
//       message = "Required field is missing";
//     }
//   }

//   // ✅ NEW: PostgreSQL check constraint violation
//   if (err.code === "23514") {
//     status = 400;
//     code = "validation/constraint";

//     if (err.constraint && err.constraint.includes("region")) {
//       message = "Region must be one of: Kaghan, Naran, Shogran";
//     } else if (err.constraint && err.constraint.includes("safety_status")) {
//       message = "Safety status must be one of: safe, caution, danger";
//     } else {
//       message = "Invalid value for field";
//     }
//   }

//   // 3. JWT errors
//   if (err.name === "JsonWebTokenError") {
//     status = 401;
//     code = "auth/invalid-token";
//     message = "Invalid authentication token";
//   }

//   if (err.name === "TokenExpiredError") {
//     status = 401;
//     code = "auth/token-expired";
//     message = "Authentication token has expired";
//   }

//   // 4. Multer errors (file upload)
//   if (err.name === "MulterError") {
//     status = 400;
//     code = "upload/error";

//     if (err.code === "LIMIT_FILE_SIZE") {
//       // ✅ ENHANCED: Check which module
//       const maxSize = req.path.includes("place") ? "10MB" : "5MB";
//       message = `File size too large. Maximum size is ${maxSize}`;
//     } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
//       message = "Unexpected file field";
//     } else if (err.code === "LIMIT_FILE_COUNT") {
//       message = "Too many files uploaded";
//     } else {
//       message = err.message;
//     }
//   }

//   // ✅ NEW: Handle Multer filter errors (file type validation)
//   if (err.message && err.message.includes("Only image files are allowed")) {
//     status = 400;
//     code = "upload/invalid-type";
//     message = "Only image files (JPG, PNG, GIF, WEBP) are allowed";
//   }

//   // 5. Cloudinary errors
//   if (err.message && err.message.includes("Cloudinary")) {
//     status = 500;
//     code = "upload/cloudinary-error";
//     message = "Failed to upload image. Please try again.";
//   }

//   // ✅ NEW: More specific Cloudinary errors
//   if (err.message && err.message.includes("Failed to upload place image")) {
//     status = 500;
//     code = "place/image-upload-failed";
//     message = "Failed to upload place image. Please try again.";
//   }

//   if (err.message && err.message.includes("Failed to delete place image")) {
//     status = 500;
//     code = "place/image-delete-failed";
//     message = "Failed to delete place image from storage.";
//   }

//   // 6. Firebase errors
//   if (err.code && err.code.startsWith("auth/")) {
//     status = 401;
//     // Keep the Firebase error code
//     message = err.message;
//   }

//   // ✅ NEW: Places module specific errors
//   if (err.message && err.message.includes("Place not found")) {
//     status = 404;
//     code = "place/not-found";
//     message = "Place not found";
//   }

//   if (err.message && err.message.includes("Image not found")) {
//     status = 404;
//     code = "place/image-not-found";
//     message = "Image not found";
//   }

//   if (err.message && err.message.includes("Place was not saved")) {
//     status = 404;
//     code = "place/not-saved";
//     message = "Place was not in your saved list";
//   }

//   // ✅ NEW: Coordinate validation errors
//   if (err.message && err.message.includes("Invalid coordinates")) {
//     status = 400;
//     code = "place/invalid-coordinates";
//     message = err.message; // Keep the detailed message
//   }

//   // ✅ NEW: Duplicate place error (from service layer)
//   if (err.existingPlace) {
//     status = 409;
//     code = "place/duplicate";
//     message =
//       err.message || "A place with this name or coordinates already exists";
//   }

//   // 7. Not found errors
//   if (status === 404) {
//     code = code || "not-found";
//   }

//   // ✅ NEW: Handle numeric conversion errors
//   if (err.message && err.message.includes("invalid input syntax for type")) {
//     status = 400;
//     code = "validation/invalid-type";
//     message = "Invalid data type provided";
//   }

//   // Send error response
//   const response = {
//     success: false,
//     code,
//     message,
//   };

//   // ✅ NEW: Add existing place data for duplicate errors
//   if (err.existingPlace) {
//     response.existingPlace = err.existingPlace;
//   }

//   // Add error details in development mode
//   if (process.env.NODE_ENV === "development") {
//     response.error = {
//       stack: err.stack,
//       details: err,
//     };
//   }

//   // Add validation errors if present
//   if (err.errors && Array.isArray(err.errors)) {
//     response.errors = err.errors;
//   }

//   res.status(status).json(response);
// }

// /* ============================================
//    NOT FOUND HANDLER (404)
// ============================================ */
// export function notFoundHandler(req, res, next) {
//   const error = new Error(`Route not found - ${req.originalUrl}`);
//   error.status = 404;
//   error.code = "route/not-found";
//   next(error);
// }

// /* ============================================
//    ASYNC ERROR WRAPPER
//    Wraps async route handlers to catch errors
// ============================================ */
// export function asyncHandler(fn) {
//   return (req, res, next) => {
//     Promise.resolve(fn(req, res, next)).catch(next);
//   };
// }
