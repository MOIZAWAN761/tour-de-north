
// // src/controllers/auth.controller.js

// import { AuthService } from "./auth.service.js";

// export const AuthController = {
//   /* ============================================
//      SIGNUP
//   ============================================ */
//   async signup(req, res, next) {
//     try {
//       const { name, email, phone, cnic, password, firebaseIdToken } = req.body;

//       // Extract device info
//       const deviceId = req.headers["x-device-id"] || "unknown";
//       const platform = req.headers["x-platform"] || "unknown";
//       const browserOrModel = req.headers["user-agent"] || "unknown";
//       const ipAddress =
//         req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

//       const result = await AuthService.signup({
//         name,
//         email,
//         phone,
//         cnic,
//         password,
//         firebaseIdToken,
//         deviceId,
//         platform,
//         browserOrModel,
//         ipAddress,
//       });

//       return res.status(201).json({
//         success: true,
//         message: "User registered successfully",
//         data: result,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      LOGIN
//   ============================================ */
//   async login(req, res, next) {
//     try {
//       const { identifier, password, deviceId, firebaseIdToken } = req.body;

//       const platform = req.headers["x-platform"] || "unknown";
//       const browserOrModel = req.headers["user-agent"] || "unknown";
//       const ipAddress =
//         req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

//       const result = await AuthService.login({
//         identifier,
//         password,
//         deviceId,
//         platform,
//         browserOrModel,
//         ipAddress,
//         firebaseIdToken,
//       });

//       return res.status(200).json({
//         success: true,
//         message: "Login successful",
//         data: result,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      LOGOUT
//   ============================================ */
//   async logout(req, res, next) {
//     try {
//       const userId = req.user.id; // from authenticate middleware
//       const refreshToken = req.body.refreshToken;

//       if (!refreshToken) {
//         return res.status(400).json({
//           success: false,
//           message: "Refresh token is required",
//         });
//       }

//       await AuthService.logout({ userId, refreshToken });

//       return res.status(200).json({
//         success: true,
//         message: "Logged out successfully",
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      RESET PASSWORD
//   ============================================ */
//   async resetPassword(req, res, next) {
//     try {
//       const { identifier, newPassword, firebaseIdToken } = req.body;
//       const ipAddress =
//         req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

//       await AuthService.resetPassword({
//         identifier,
//         newPassword,
//         firebaseIdToken,
//         ipAddress,
//       });

//       return res.status(200).json({
//         success: true,
//         message:
//           "Password reset successful. You can now login with your new password.",
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      REFRESH TOKEN
//   ============================================ */
//   async refreshToken(req, res, next) {
//     try {
//       const { refreshToken } = req.body;

//       if (!refreshToken) {
//         return res.status(400).json({
//           success: false,
//           message: "Refresh token is required",
//         });
//       }

//       const result = await AuthService.refreshToken(refreshToken);

//       return res.status(200).json({
//         success: true,
//         message: "Token refreshed successfully",
//         data: result,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      GET TRUSTED DEVICES
//   ============================================ */
//   async getTrustedDevices(req, res, next) {
//     try {
//       const userId = req.user.id;

//       const devices = await AuthService.getTrustedDevices(userId);

//       return res.status(200).json({
//         success: true,
//         data: devices,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      REMOVE TRUSTED DEVICE
//   ============================================ */
//   async removeTrustedDevice(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const { deviceId } = req.params;

//       await AuthService.removeTrustedDevice(userId, deviceId);

//       return res.status(200).json({
//         success: true,
//         message: "Device removed successfully",
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      GET LOGIN HISTORY
//   ============================================ */
//   async getLoginHistory(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const limit = parseInt(req.query.limit) || 20;

//       const history = await AuthService.getLoginHistory(userId, limit);

//       return res.status(200).json({
//         success: true,
//         data: history,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   // ... existing updateProfile, updateUser, getAllUsers methods ...
//   /* ------------------------------
// //      UPDATE PROFILE (SELF)
// //   ------------------------------ */
//     async updateProfile(req, res, next) {
//       try {
//         const userId = req.user.id; // from authenticate middleware
//         const updates = req.body;

//         const updatedUser = await AuthService.updateProfile(userId, updates);

//         return res.status(200).json({
//           success: true,
//           message: "Profile updated successfully",
//           data: updatedUser,
//         });
//       } catch (error) {
//         next(error);
//       }
//     },

//     /* ------------------------------
//        ADMIN UPDATE USER
//     ------------------------------ */
//     async updateUser(req, res, next) {
//       try {
//         const userId = req.params.id; // target user id
//         const updates = req.body;

//         const updatedUser = await AuthService.updateUser(userId, updates);

//         return res.status(200).json({
//           success: true,
//           message: "User updated successfully",
//           data: updatedUser,
//         });
//       } catch (error) {
//         next(error);
//       }
//     },

//     /* ------------------------------
//        ADMIN GET ALL USERS
//     ------------------------------ */
//     async getAllUsers(req, res, next) {
//       try {
//         const { limit = 50, offset = 0 } = req.query;

//         const users = await AuthService.getAllUsers({
//           limit: Number(limit),
//           offset: Number(offset),
//         });

//         return res.status(200).json({
//           success: true,
//           message: "Users fetched successfully",
//           data: users,
//         });
//       } catch (error) {
//         next(error);
//       }
//     },
// };


// // import { AuthService } from "./auth.service.js";

// // /* ======================================================
// //    AUTH CONTROLLER
// //    - Thin layer for HTTP request/response
// //    - Delegates business logic to AuthService
// // ====================================================== */

// // export const AuthController = {
// //   /* ------------------------------
// //      SIGNUP
// //   ------------------------------ */
// //   async signup(req, res, next) {
// //     try {
// //       const { name, email, phone, cnic, password, firebaseIdToken } = req.body;

// //       const user = await AuthService.signup({
// //         name,
// //         email,
// //         phone,
// //         cnic,
// //         password,
// //         firebaseIdToken,
// //       });

// //       return res.status(201).json({
// //         success: true,
// //         message: "User registered successfully",
// //         data: user,
// //       });
// //     } catch (error) {
// //       next(error);
// //     }
// //   },

// //   /* ------------------------------
// //      LOGIN
// //   ------------------------------ */
// //   async login(req, res, next) {
// //     try {
// //       const { identifier, password, deviceId } = req.body;

// //       const result = await AuthService.login({
// //         identifier,
// //         password,
// //         deviceId,
// //       });

// //       return res.status(200).json({
// //         success: true,
// //         message: "Login successful",
// //         data: result,
// //       });
// //     } catch (error) {
// //       next(error);
// //     }
// //   },

// //   /* ------------------------------
// //      RESET PASSWORD
// //   ------------------------------ */
// //   async resetPassword(req, res, next) {
// //     try {
// //       const { userId, newPassword } = req.body;

// //       await AuthService.resetPassword({ userId, newPassword });

// //       return res.status(200).json({
// //         success: true,
// //         message: "Password reset successful",
// //       });
// //     } catch (error) {
// //       next(error);
// //     }
// //   },

// //   /* ------------------------------
// //      UPDATE PROFILE (SELF)
// //   ------------------------------ */
// //   async updateProfile(req, res, next) {
// //     try {
// //       const userId = req.user.id; // from authenticate middleware
// //       const updates = req.body;

// //       const updatedUser = await AuthService.updateProfile(userId, updates);

// //       return res.status(200).json({
// //         success: true,
// //         message: "Profile updated successfully",
// //         data: updatedUser,
// //       });
// //     } catch (error) {
// //       next(error);
// //     }
// //   },

// //   /* ------------------------------
// //      ADMIN UPDATE USER
// //   ------------------------------ */
// //   async updateUser(req, res, next) {
// //     try {
// //       const userId = req.params.id; // target user id
// //       const updates = req.body;

// //       const updatedUser = await AuthService.updateUser(userId, updates);

// //       return res.status(200).json({
// //         success: true,
// //         message: "User updated successfully",
// //         data: updatedUser,
// //       });
// //     } catch (error) {
// //       next(error);
// //     }
// //   },

// //   /* ------------------------------
// //      ADMIN GET ALL USERS
// //   ------------------------------ */
// //   async getAllUsers(req, res, next) {
// //     try {
// //       const { limit = 50, offset = 0 } = req.query;

// //       const users = await AuthService.getAllUsers({
// //         limit: Number(limit),
// //         offset: Number(offset),
// //       });

// //       return res.status(200).json({
// //         success: true,
// //         message: "Users fetched successfully",
// //         data: users,
// //       });
// //     } catch (error) {
// //       next(error);
// //     }
// //   },
// // };



// src/controllers/auth.controller.js

import { AuthService } from "./auth.service.js";

export const AuthController = {
  /* ============================================
     SIGNUP
  ============================================ */
  async signup(req, res, next) {
    try {
      const { name, email, phone, cnic, password, firebaseIdToken } = req.body;

      // Extract device info
      const deviceId = req.headers["x-device-id"] || "unknown";
      const platform = req.headers["x-platform"] || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      
      // FIX: Truncate user-agent to 100 characters
      const browserOrModel = userAgent.substring(0, 100);
      
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      const result = await AuthService.signup({
        name,
        email,
        phone,
        cnic,
        password,
        firebaseIdToken,
        deviceId,
        platform,
        browserOrModel,
        ipAddress,
      });

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     LOGIN
  ============================================ */
  async login(req, res, next) {
    try {
      console.log(req.body);
      const { identifier, password, deviceId, firebaseIdToken } = req.body;

      const platform = req.headers["x-platform"] || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      
      // FIX: Truncate user-agent to 100 characters
      const browserOrModel = userAgent.substring(0, 100);
      
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      const result = await AuthService.login({
        identifier,
        password,
        deviceId,
        platform,
        browserOrModel,
        ipAddress,
        firebaseIdToken,
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     LOGOUT
  ============================================ */
  async logout(req, res, next) {
    try {
      const userId = req.user.id; // from authenticate middleware
      const refreshToken = req.body.refreshToken;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      await AuthService.logout({ userId, refreshToken });

      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     RESET PASSWORD
  ============================================ */
  async resetPassword(req, res, next) {
    try {
      const { identifier, newPassword, firebaseIdToken } = req.body;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      await AuthService.resetPassword({
        identifier,
        newPassword,
        firebaseIdToken,
        ipAddress,
      });

      return res.status(200).json({
        success: true,
        message:
          "Password reset successful. You can now login with your new password.",
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     REFRESH TOKEN
  ============================================ */
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      const result = await AuthService.refreshToken(refreshToken);

      return res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET TRUSTED DEVICES
  ============================================ */
  async getTrustedDevices(req, res, next) {
    try {
      const userId = req.user.id;

      const devices = await AuthService.getTrustedDevices(userId);

      return res.status(200).json({
        success: true,
        data: devices,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     REMOVE TRUSTED DEVICE
  ============================================ */
  async removeTrustedDevice(req, res, next) {
    try {
      const userId = req.user.id;
      const { deviceId } = req.params;

      await AuthService.removeTrustedDevice(userId, deviceId);

      return res.status(200).json({
        success: true,
        message: "Device removed successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET LOGIN HISTORY
  ============================================ */
  async getLoginHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;

      const history = await AuthService.getLoginHistory(userId, limit);

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  },

  // /* ------------------------------
  //    UPDATE PROFILE (SELF)
  // ------------------------------ */
  // async updateProfile(req, res, next) {
  //   try {
  //     const userId = req.user.id; // from authenticate middleware
  //     const updates = req.body;

  //     const updatedUser = await AuthService.updateProfile(userId, updates);

  //     return res.status(200).json({
  //       success: true,
  //       message: "Profile updated successfully",
  //       data: updatedUser,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // },

  // /* ------------------------------
  //    ADMIN UPDATE USER
  // ------------------------------ */
  // async updateUser(req, res, next) {
  //   try {
  //     const userId = req.params.id; // target user id
  //     const updates = req.body;

  //     const updatedUser = await AuthService.updateUser(userId, updates);

  //     return res.status(200).json({
  //       success: true,
  //       message: "User updated successfully",
  //       data: updatedUser,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // },

  // /* ------------------------------
  //    ADMIN GET ALL USERS
  // ------------------------------ */
  // async getAllUsers(req, res, next) {
  //   try {
  //     const { limit = 50, offset = 0 } = req.query;

  //     const users = await AuthService.getAllUsers({
  //       limit: Number(limit),
  //       offset: Number(offset),
  //     });

  //     return res.status(200).json({
  //       success: true,
  //       message: "Users fetched successfully",
  //       data: users,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // },
};