// src/modules/profile/profile.service.js

import { ProfileModel } from "./profile.model.js";
import { ProfileAuditLog } from "./profile.auditog.model.js";
import {
  uploadProfileImage,
  deleteProfileImage,
  formatProfileData,
  formatProfileListItem,
} from "./profile.helper.js";

export class ProfileService {
  /* ============================================
     GET OWN PROFILE (USER)
  ============================================ */
  static async getOwnProfile(userId) {
    const profile = await ProfileModel.getProfileByUserId(userId);

    if (!profile) {
      throw { status: 404, message: "Profile not found" };
    }

    return formatProfileData(profile);
  }

  /* ============================================
     UPDATE OWN PROFILE (USER) - UPSERT
  ============================================ */
  static async updateOwnProfile(userId, updates, ipAddress, userAgent) {
    try {
      // Separate user table updates (name) from profile table updates
      const userUpdates = {};
      const profileUpdates = {};

      if (updates.name !== undefined) {
        userUpdates.name = updates.name;
      }

      // All other fields go to profile table
      const profileFields = [
        "dob",
        "gender",
        "nationality",
        "addressLine",
        "city",
        "province",
        "country",
        "postalCode",
        "emergencyContact",
      ];

      profileFields.forEach((field) => {
        if (updates[field] !== undefined) {
          profileUpdates[field] = updates[field];
        }
      });

      // Update user name if provided
      if (userUpdates.name) {
        await ProfileModel.updateUserName(userId, userUpdates.name);
      }

      // Upsert profile data
      let updatedProfile;
      if (Object.keys(profileUpdates).length > 0) {
        updatedProfile = await ProfileModel.upsertProfile(
          userId,
          profileUpdates,
        );
      }

      // Log the action
      await ProfileAuditLog.logAction({
        userId,
        targetUserId: userId,
        action: "PROFILE_UPDATED",
        changes: updates,
        ipAddress,
        userAgent,
      });

      // Return complete profile
      return await this.getOwnProfile(userId);
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    }
  }

  /* ============================================
     UPLOAD PROFILE IMAGE (USER)
  ============================================ */
  static async uploadProfileImage(userId, file, ipAddress, userAgent) {
    try {
      // Get existing profile
      const existingProfile = await ProfileModel.findByUserId(userId);

      // Delete old image if exists
      if (existingProfile?.profile_image_url) {
        try {
          await deleteProfileImage(existingProfile.profile_image_url);
        } catch (error) {
          console.error("Failed to delete old image:", error);
          // Continue anyway
        }
      }

      // Upload new image
      const { url } = await uploadProfileImage(file);

      // Update profile with new image URL
      await ProfileModel.upsertProfile(userId, {
        profileImageUrl: url,
      });

      // Log action
      await ProfileAuditLog.logAction({
        userId,
        targetUserId: userId,
        action: "PROFILE_IMAGE_UPLOADED",
        changes: { profileImageUrl: url },
        ipAddress,
        userAgent,
      });

      return { profileImageUrl: url };
    } catch (error) {
      console.error("Upload profile image error:", error);
      throw { status: 500, message: "Failed to upload profile image" };
    }
  }

  /* ============================================
     DELETE PROFILE IMAGE (USER)
  ============================================ */
  static async deleteProfileImage(userId, ipAddress, userAgent) {
    try {
      const existingProfile = await ProfileModel.findByUserId(userId);

      if (!existingProfile?.profile_image_url) {
        throw { status: 404, message: "No profile image to delete" };
      }

      // Delete from Cloudinary
      await deleteProfileImage(existingProfile.profile_image_url);

      // Update profile
      await ProfileModel.updateProfile(userId, {
        profileImageUrl: null,
      });

      // Log action
      await ProfileAuditLog.logAction({
        userId,
        targetUserId: userId,
        action: "PROFILE_IMAGE_DELETED",
        changes: {},
        ipAddress,
        userAgent,
      });

      return { message: "Profile image deleted successfully" };
    } catch (error) {
      console.error("Delete profile image error:", error);
      throw error;
    }
  }

  /* ============================================
     GET ALL PROFILES (ADMIN)
  ============================================ */
  static async getAllProfiles({
    search = "",
    sortBy = "created_at",
    order = "desc",
    page = 1,
    limit = 20,
  }) {
    const offset = (page - 1) * limit;

    const profiles = await ProfileModel.getAllProfiles({
      search,
      sortBy,
      order,
      limit,
      offset,
    });

    const total = await ProfileModel.countAllProfiles(search);

    return {
      profiles: profiles.map(formatProfileListItem),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /* ============================================
     GET PROFILE BY ID (ADMIN)
  ============================================ */
  static async getProfileById(targetUserId, adminId, ipAddress, userAgent) {
    const profile = await ProfileModel.getProfileByUserId(targetUserId);

    if (!profile) {
      throw { status: 404, message: "Profile not found" };
    }

    // Log admin access
    await ProfileAuditLog.logAction({
      userId: adminId,
      targetUserId,
      action: "PROFILE_VIEWED_BY_ADMIN",
      changes: {},
      ipAddress,
      userAgent,
    });

    // Return COMPLETE profile data
    const formattedProfile = formatProfileData(profile);

    // Add additional metadata for admin view
    return {
      ...formattedProfile,

      // Admin-specific metadata
      accountStatus: {
        phoneVerified: profile.phone_verified,
        emailVerified: profile.email_verified,
        accountAge: this._calculateAccountAge(profile.user_created_at),
        lastUpdated: profile.updated_at || profile.user_updated_at,
      },

      // Full address breakdown (easier to display)
      fullAddress: this._formatFullAddress({
        line: profile.address_line,
        city: profile.city,
        province: profile.province,
        country: profile.country,
        postalCode: profile.postal_code,
      }),
    };
  }

  /* ============================================
     UPDATE USER BY ADMIN (including sensitive data)
  ============================================ */
  static async updateUserByAdmin(
    targetUserId,
    updates,
    adminId,
    ipAddress,
    userAgent,
  ) {
    try {
      // Separate user table updates from profile table updates
      const userUpdates = {};
      const profileUpdates = {};

      // User table fields (sensitive)
      const userFields = ["name", "email", "phone", "cnic", "role"];
      userFields.forEach((field) => {
        if (updates[field] !== undefined) {
          userUpdates[field] = updates[field];
        }
      });

      // Profile table fields
      const profileFields = [
        "dob",
        "gender",
        "nationality",
        "addressLine",
        "city",
        "province",
        "country",
        "postalCode",
        "emergencyContact",
      ];
      profileFields.forEach((field) => {
        if (updates[field] !== undefined) {
          profileUpdates[field] = updates[field];
        }
      });

      // Update user table if needed
      if (Object.keys(userUpdates).length > 0) {
        await ProfileModel.updateUserByAdmin(targetUserId, userUpdates);
      }
      // Update profile table if needed
      if (Object.keys(profileUpdates).length > 0) {
        await ProfileModel.upsertProfile(targetUserId, profileUpdates);
      }

      // Log the action
      await ProfileAuditLog.logAction({
        userId: adminId,
        targetUserId,
        action: "USER_UPDATED_BY_ADMIN",
        changes: updates,
        ipAddress,
        userAgent,
      });

      // Return updated profile
      return await ProfileModel.getProfileByUserId(targetUserId);
    } catch (error) {
      console.error("Admin update user error:", error);
      throw error;
    }
  }
  /* ============================================
DELETE USER (ADMIN)
============================================ */
  static async deleteUser(targetUserId, adminId, ipAddress, userAgent) {
    // Get profile before deletion for logging
    const profile = await ProfileModel.getProfileByUserId(targetUserId);
    if (!profile) {
      throw { status: 404, message: "User not found" };
    }

    // Delete profile image from Cloudinary if exists
    if (profile.profile_image_url) {
      try {
        await deleteProfileImage(profile.profile_image_url);
      } catch (error) {
        console.error("Failed to delete profile image:", error);
        // Continue with user deletion
      }
    }

    // Log action before deletion
    await ProfileAuditLog.logAction({
      userId: adminId,
      targetUserId,
      action: "USER_DELETED_BY_ADMIN",
      changes: {
        deletedUser: {
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
        },
      },
      ipAddress,
      userAgent,
    });

    // Delete user (profile will be cascade deleted)
    await ProfileModel.deleteUser(targetUserId);

    return { message: "User deleted successfully" };
  }
  /* ============================================
GET AUDIT HISTORY (ADMIN)
============================================ */
  static async getAuditHistory(targetUserId, limit = 50) {
    return await ProfileAuditLog.getHistory(targetUserId, limit);
  }

  /* ============================================
     HELPER: Calculate Account Age
  ============================================ */
  static _calculateAccountAge(createdAt) {
    if (!createdAt) return null;

    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? "s" : ""}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? "s" : ""}`;
    }
  }

  /* ============================================
     HELPER: Format Full Address
  ============================================ */
  static _formatFullAddress(address) {
    if (!address) return null;

    const parts = [
      address.line,
      address.city,
      address.province,
      address.postalCode,
      address.country,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : null;
  }
}