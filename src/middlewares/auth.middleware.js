// src/middleware/auth.middleware.js
import { TokenUtil } from "../modules/auth/auth.utils.js";
import { AuthModel } from "../modules/auth/auth.model.js";

/**
 * Authentication Middleware
 * Verifies JWT access token and attaches DB user
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        code: "auth/no-token",
        message: "Authorization token missing. Please login.",
      });
    }

    const token = authHeader.split(" ")[1];
    let decoded;

    try {
      decoded = TokenUtil.verifyAccessToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          code: "auth/token-expired",
          message: "Access token expired. Please refresh your token.",
        });
      }

      if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          code: "auth/invalid-token",
          message: "Invalid authentication token",
        });
      }

      return res.status(401).json({
        success: false,
        code: "auth/auth-failed",
        message: "Authentication failed",
      });
    }

    // Fetch user from database
    const user = await AuthModel.findUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        code: "auth/user-not-found",
        message: "User not found in system",
      });
    }

    // Attach user context
    req.user = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Authorization Middleware - Role-Based Access Control
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: "auth/unauthorized",
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: "auth/forbidden",
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
}

/**
 * Optional Authentication (public routes)
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = TokenUtil.verifyAccessToken(token);
    const user = await AuthModel.findUserById(decoded.userId);

    if (user) {
      req.user = {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
      };
    }
  } catch (err) {
    // ignore errors in optional auth
  }

  next();
}

/**
 * Refresh Token Verification
 * Used in /auth/refresh endpoint
 */
