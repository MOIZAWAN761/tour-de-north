
// src/services/auth.service.js

import bcrypt from "bcrypt";
import { AuthModel } from "./auth.model.js";
import { SecurityModel } from "./auth.security.model.js";
import { TokenUtil } from "./auth.utils.js";
import admin from "../../config/firebase.js";


const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export class AuthService {
  /* ============================================
     SIGNUP WITH PHONE VERIFICATION
  ============================================ */
  static async signup({
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
  }) {
    // 1️⃣ Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (err) {
      throw { status: 401, message: "Invalid or expired Firebase token" };
    }

    // 2️⃣ Verify phone number matches
    if (decodedToken.phone_number !== phone) {
      throw {
        status: 400,
        message: "Phone number does not match Firebase verification",
      };
    }

    // 3️⃣ Check if user already exists
    const existingUser =
      (await AuthModel.findUserByPhone(phone)) ||
      (await AuthModel.findUserByEmail(email));

    if (existingUser) {
      throw {
        status: 409,
        message: "User already exists with this email or phone",
      };
    }

    // 4️⃣ Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 5️⃣ Create user
    const user = await AuthModel.createUser({
      name,
      email,
      phone,
      cnic,
      passwordHash,
      phoneVerified: true, // Verified via Firebase
      role: "user", // Default role
    });

    // 6️⃣ Register first trusted device
    await SecurityModel.addTrustedDevice({
      userId: user.id,
      deviceId,
      platform,
      browserOrModel,
    });

    // 7️⃣ Log successful signup
    await SecurityModel.logLoginAttempt({
      userId: user.id,
      identifier: email,
      deviceId,
      ipAddress,
      success: true,
      reason: "signup_success",
    });

    // 8️⃣ Generate tokens
    const payload = {
      userId: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = TokenUtil.generateAccessToken(payload);
    const refreshToken = TokenUtil.generateRefreshToken(payload);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /* ============================================
     LOGIN WITH SECURITY CHECKS
  ============================================ */
  static async login({
    identifier,
    password,
    deviceId,
    platform,
    browserOrModel,
    ipAddress,
    firebaseIdToken, // Optional: only needed if OTP verification required
  }) {
    // 1️⃣ Find user
    const user = identifier.includes("@")
      ? await AuthModel.findUserByEmail(identifier)
      : await AuthModel.findUserByPhone(identifier);
    console.log(user);

    if (!user) {
      // Log failed attempt
      await SecurityModel.logLoginAttempt({
        userId: null,
        identifier,
        deviceId,
        ipAddress,
        success: false,
        reason: "user_not_found",
      });

      throw { status: 401, message: "Invalid credentials" };
    }

    // 2️⃣ Check if account is locked due to too many attempts
    const recentAttempts = await SecurityModel.getRecentFailedAttempts(
      user.id,
      LOCKOUT_DURATION_MINUTES,
    );

    if (recentAttempts >= MAX_LOGIN_ATTEMPTS) {
      await SecurityModel.logLoginAttempt({
        userId: user.id,
        identifier,
        deviceId,
        ipAddress,
        success: false,
        reason: "account_locked",
      });

      throw {
        status: 429,
        message: `Account locked due to too many failed attempts. Try again after ${LOCKOUT_DURATION_MINUTES} minutes.`,
        code: "auth/account-locked",
      };
    }

    // 3️⃣ Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // Log failed attempt
      await SecurityModel.logLoginAttempt({
        userId: user.id,
        identifier,
        deviceId,
        ipAddress,
        success: false,
        reason: "wrong_password",
      });

      // Check if this triggers lockout
      const attemptsAfterFail = recentAttempts + 1;
      if (attemptsAfterFail >= MAX_LOGIN_ATTEMPTS) {
        throw {
          status: 429,
          message: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
          code: "auth/account-locked",
        };
      }

      throw {
        status: 401,
        message: "Invalid credentials",
        remainingAttempts: MAX_LOGIN_ATTEMPTS - attemptsAfterFail,
      };
    }

    // 4️⃣ Check if device is trusted
    const isTrustedDevice = await SecurityModel.isDeviceTrusted(
      user.id,
      deviceId,
    );

    // 5️⃣ Require OTP verification for:
    // - New device
    // - After 5+ failed attempts (even if password is correct)
    const requiresOTP =
      !isTrustedDevice || recentAttempts >= MAX_LOGIN_ATTEMPTS;

    if (requiresOTP) {
      // Check if Firebase token was provided
      if (!firebaseIdToken) {
        // Log that OTP is required
        await SecurityModel.logLoginAttempt({
          userId: user.id,
          identifier,
          deviceId,
          ipAddress,
          success: false,
          reason: "otp_required",
        });

        throw {
          status: 403,
          message: "Phone verification required",
          code: "auth/otp-required",
          requiresOTP: true,
          reason: !isTrustedDevice ? "new_device" : "security_check",
          
        };
      }

      // Verify Firebase OTP token
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
      } catch (err) {
        throw {
          status: 401,
          message: "Invalid or expired OTP verification",
          code: "auth/invalid-otp",
        };
      }

      // Verify phone matches
      if (decodedToken.phone_number !== user.phone) {
        throw {
          status: 400,
          message: "Phone number verification mismatch",
        };
      }

      // Add device to trusted devices if new
      if (!isTrustedDevice) {
        await SecurityModel.addTrustedDevice({
          userId: user.id,
          deviceId,
          platform,
          browserOrModel,
        });
      }
    } else {
      // Update last used for trusted device
      await SecurityModel.updateDeviceLastUsed(user.id, deviceId);
    }

    // 6️⃣ Successful login - clear failed attempts
    await SecurityModel.logLoginAttempt({
      userId: user.id,
      identifier,
      deviceId,
      ipAddress,
      success: true,
      reason: requiresOTP ? "login_with_otp" : "login_trusted_device",
    });

    // 7️⃣ Generate tokens
    const payload = {
      userId: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = TokenUtil.generateAccessToken(payload);
    const refreshToken = TokenUtil.generateRefreshToken(payload);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
      deviceTrusted: isTrustedDevice || requiresOTP,
    };
  }

  /* ============================================
     LOGOUT
  ============================================ */
  static async logout({ userId, refreshToken }) {
    // Invalidate refresh token
    await SecurityModel.blacklistToken(refreshToken);

    // Optional: Log logout event
    await SecurityModel.logLoginAttempt({
      userId,
      identifier: "",
      deviceId: null,
      ipAddress: null,
      success: true,
      reason: "logout",
    });

    return { message: "Logged out successfully" };
  }

  /* ============================================
     RESET PASSWORD (Requires Phone Verification)
  ============================================ */
  static async resetPassword({
    identifier,
    newPassword,
    firebaseIdToken,
    ipAddress,
  }) {
    // 1️⃣ Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (err) {
      throw {
        status: 401,
        message: "Invalid or expired phone verification",
      };
    }

    // 2️⃣ Find user by phone from verified token
    const user = await AuthModel.findUserByPhone(decodedToken.phone_number);

    if (!user) {
      throw { status: 404, message: "User not found" };
    }

    // 3️⃣ Optional: Also match identifier (email/phone)
    const matchesIdentifier =
      user.email === identifier || user.phone === identifier;

    if (!matchesIdentifier) {
      throw {
        status: 400,
        message: "Identifier does not match verified phone",
      };
    }

    // 4️⃣ Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // 5️⃣ Update password
    await AuthModel.updatePassword(user.id, newPasswordHash);

    // 6️⃣ Clear all failed login attempts
    await SecurityModel.clearFailedAttempts(user.id);

    // 7️⃣ Log password reset
    await SecurityModel.logLoginAttempt({
      userId: user.id,
      identifier: user.email,
      deviceId: null,
      ipAddress,
      success: true,
      reason: "password_reset",
    });

    return { message: "Password reset successful" };
  }

  /* ============================================
     REFRESH TOKEN
  ============================================ */
  static async refreshToken(refreshToken) {
    // Check if token is blacklisted
    const isBlacklisted = await SecurityModel.isTokenBlacklisted(refreshToken);

    if (isBlacklisted) {
      throw {
        status: 401,
        message: "Refresh token has been revoked",
      };
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = TokenUtil.verifyRefreshToken(refreshToken);
    } catch (err) {
      throw {
        status: 401,
        message: "Invalid or expired refresh token",
      };
    }

    // Get user
    const user = await AuthModel.findUserById(decoded.userId);

    if (!user) {
      throw { status: 401, message: "User not found" };
    }

    // Generate new access token
    const payload = {
      userId: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    };

    const newAccessToken = TokenUtil.generateAccessToken(payload);

    return {
      accessToken: newAccessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  /* ============================================
     GET USER'S TRUSTED DEVICES
  ============================================ */
  static async getTrustedDevices(userId) {
    return await SecurityModel.getTrustedDevices(userId);
  }

  /* ============================================
     REMOVE TRUSTED DEVICE
  ============================================ */
  static async removeTrustedDevice(userId, deviceId) {
    await SecurityModel.removeTrustedDevice(userId, deviceId);
    return { message: "Device removed successfully" };
  }

  /* ============================================
     GET LOGIN HISTORY
  ============================================ */
  static async getLoginHistory(userId, limit = 20) {
    return await SecurityModel.getLoginHistory(userId, limit);
  }

  // // ... existing updateProfile, updateUser, getAllUsers methods ...

  //   // update user by itsself

  //   static async updateProfile(userId, updates) {
  //     // Users cannot change role
  //     const filteredUpdates = {
  //       name: updates.name,
  //       email: updates.email,
  //       phone: updates.phone,
  //     };

  //     const updatedUser = await AuthModel.updateSelf(userId, filteredUpdates);

  //     if (!updatedUser) {
  //       throw { status: 404, message: "User not found" };
  //     }

  //     return updatedUser;
  //   }

  //   // update user by admin

  //   static async updateUser(userId, updates) {
  //     // Admin can update role and other fields
  //     const allowedUpdates = {
  //       name: updates.name,
  //       email: updates.email,
  //       phone: updates.phone,
  //       role: updates.role,
  //     };

  //     const updatedUser = await AuthModel.updateByAdmin(userId, allowedUpdates);

  //     if (!updatedUser) {
  //       throw { status: 404, message: "User not found" };
  //     }

  //     return updatedUser;
  //   }

  //   /* ------------------------------
  //    GET ALL USERS (Admin)
  //    ------------------------------ */

  //   static async getAllUsers({ limit = 50, offset = 0 }) {
  //     // Call model function to fetch users
  //     const users = await AuthModel.listUsers(limit, offset);

  //     return users.map((user) => ({
  //       id: user.id,
  //       name: user.name,
  //       email: user.email,
  //       phone: user.phone,
  //       cnic: user.cnic,
  //       role: user.role,
  //       phoneVerified: user.phone_verified,
  //       emailVerified: user.email_verified,
  //       createdAt: user.created_at,
  //     }));
  //   }
}


// // src/services/auth.service.js

// import bcrypt from "bcrypt";
// import { AuthModel } from "./auth.model.js";
// import { TokenUtil } from "./auth.utils.js";
// import admin from "../../config/firebase.js"

// /* ======================================================
//    AUTH SERVICE
//    - Business logic layer
//    - Calls AuthModel (DB)
//    - Issues JWT tokens
//    - Clean and testable
// ====================================================== */

// const SALT_ROUNDS = 12;

// export class AuthService {
//   /* ------------------------------
//      SIGNUP
//      ------------------------------ */
//   static async signup({
//     name,
//     email,
//     phone,
//     cnic,
//     password,
//     phoneVerified = false,
//     firebaseIdToken,
//   }) {
//     let decodedToken;
//     try {
//       decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
//     } catch (err) {
//       throw { status: 401, message: "Invalid or expired Firebase token" };
//     }

//     // 2️⃣ Check that phone matches
//     if (decodedToken.phone_number !== phone) {
//       throw {
//         status: 400,
//         message: "Phone number does not match Firebase verification",
//       };
//     }

//     // 1️⃣ Check if user already exists
//     const existingUser =
//       (await AuthModel.findUserByPhone(phone)) ||
//       (await AuthModel.findUserByEmail(email));

//     if (existingUser) {
//       throw {
//         status: 409,
//         message: "User already exists",
//       };
//     }

//     // 2️⃣ Hash password
//     const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

//     // 3️⃣ Create user
//     const user = await AuthModel.createUser({
//       name,
//       email,
//       phone,
//       cnic,
//       passwordHash,
//       phoneVerified: true,
//     });

//     return {
//       id: user.id,
//       name: user.name,
//       email: user.email,
//       phone: user.phone,
//     };
//   }

//   /* ------------------------------
//      LOGIN
//      ------------------------------ */
//   static async login({ identifier, password, deviceId }) {
//     // identifier = email or phone
//     const user = identifier.includes("@")
//       ? await AuthModel.findUserByEmail(identifier)
//       : await AuthModel.findUserByPhone(identifier);

//     if (!user) {
//       throw { status: 401, message: "Invalid credentials" };
//     }

//     // 1️⃣ Compare password
//     const isPasswordValid = await bcrypt.compare(password, user.password_hash);

//     if (!isPasswordValid) {
//       throw { status: 401, message: "Invalid credentials" };
//     }

//     // 2️⃣ OTP / Device check placeholder
//     // TODO: implement login_attempts check, new device detection, OTP rules
//     // if OTP required → throw or call OTP service

//     // 3️⃣ JWT payload
//     const payload = {
//       userId: user.id,
//       name: user.name,
//       phone: user.phone,
//     };

//     const accessToken = TokenUtil.generateAccessToken(payload);
//     const refreshToken = TokenUtil.generateRefreshToken(payload);

//     return {
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         phone: user.phone,
//       },
//       tokens: {
//         accessToken,
//         refreshToken,
//       },
//     };
//   }

//   /* ------------------------------
//      RESET PASSWORD
//      ------------------------------ */
//   static async resetPassword({ userId, newPassword }) {
//     // 1️⃣ Hash new password
//     const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

//     // 2️⃣ Update password in DB
//     await AuthModel.updatePassword(userId, newPasswordHash);

//     return true;
//   }


//   // update user by itsself

//   static async updateProfile(userId, updates) {
//     // Users cannot change role
//     const filteredUpdates = {
//       name: updates.name,
//       email: updates.email,
//       phone: updates.phone,
//     };

//     const updatedUser = await AuthModel.updateSelf(userId, filteredUpdates);

//     if (!updatedUser) {
//       throw { status: 404, message: "User not found" };
//     }

//     return updatedUser;
//   }
 
//   // update user by admin

//   static async updateUser(userId, updates) {
//     // Admin can update role and other fields
//     const allowedUpdates = {
//       name: updates.name,
//       email: updates.email,
//       phone: updates.phone,
//       role: updates.role,
//     };

//     const updatedUser = await AuthModel.updateByAdmin(userId, allowedUpdates);

//     if (!updatedUser) {
//       throw { status: 404, message: "User not found" };
//     }

//     return updatedUser;
//   }

//   /* ------------------------------
//    GET ALL USERS (Admin)
//    ------------------------------ */

//   static async getAllUsers({ limit = 50, offset = 0 }) {
//     // Call model function to fetch users
//     const users = await AuthModel.listUsers(limit, offset);

//     return users.map((user) => ({
//       id: user.id,
//       name: user.name,
//       email: user.email,
//       phone: user.phone,
//       cnic: user.cnic,
//       role: user.role,
//       phoneVerified: user.phone_verified,
//       emailVerified: user.email_verified,
//       createdAt: user.created_at,
//     }));
//   }
// }




