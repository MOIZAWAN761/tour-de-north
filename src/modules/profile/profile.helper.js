// src/modules/profile/profile.helpers.js

import cloudinary from "../../config/cloudinary.js";
import multer from "multer";

/* ============================================
   MULTER CONFIGURATION
============================================ */
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

/* ============================================
   UPLOAD IMAGE TO CLOUDINARY
============================================ */
export async function uploadProfileImage(file) {
  try {
    let uploadData;

    // Check if file is buffer (from multer) or base64 string
    if (Buffer.isBuffer(file)) {
      // File from multer (buffer)
      uploadData = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "Main/Police-project/user-profile",
            resource_type: "image",
            transformation: [
              { width: 500, height: 500, crop: "fill", gravity: "face" },
              { quality: "auto:good" },
              { fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        uploadStream.end(file);
      });
    } else if (typeof file === "string") {
      // Base64 string
      if (file.startsWith("data:")) {
        // Remove data URL prefix
        const base64Data = file.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        uploadData = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "Main/Police-project/user-profile",
              resource_type: "image",
              transformation: [
                { width: 500, height: 500, crop: "fill", gravity: "face" },
                { quality: "auto:good" },
                { fetch_format: "auto" },
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );
          uploadStream.end(buffer);
        });
      } else {
        throw new Error("Invalid image format");
      }
    } else {
      throw new Error("Invalid file type");
    }

    return {
      url: uploadData.secure_url,
      publicId: uploadData.public_id,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image");
  }
}

/* ============================================
   DELETE IMAGE FROM CLOUDINARY
============================================ */
export async function deleteProfileImage(url) {
  try {
    const publicId = getPublicIdFromUrl(url);

    if (!publicId) {
      throw new Error("Invalid image URL");
    }

    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error("Failed to delete image");
  }
}

/* ============================================
   EXTRACT PUBLIC ID FROM URL
============================================ */
export function getPublicIdFromUrl(url) {
  try {
    // Example URL: https://res.cloudinary.com/xxx/image/upload/v123/Main/Police-project/user-profile/abc123.jpg
    const urlParts = url.split("/");

    // Find the index of "upload"
    const uploadIndex = urlParts.indexOf("upload");

    if (uploadIndex === -1) {
      return null;
    }

    // Get everything after "upload" (skip version if exists)
    let pathParts = urlParts.slice(uploadIndex + 1);

    // Remove version (vXXXXXXXXXX)
    if (pathParts[0].startsWith("v")) {
      pathParts = pathParts.slice(1);
    }

    // Join path and remove extension
    const fullPath = pathParts.join("/");
    const publicId = fullPath.replace(/\.[^/.]+$/, ""); // Remove extension

    return publicId;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
}

/* ============================================
   FORMAT PROFILE DATA
============================================ */
export function formatProfileData(profile) {
  if (!profile) return null;

  return {
    id: profile.id,
    userId: profile.user_id,

    // User data (from users table)
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    cnic: profile.cnic,
    role: profile.role,
    phoneVerified: profile.phone_verified,
    emailVerified: profile.email_verified,
    userCreatedAt: profile.user_created_at,

    // Profile data (from profile table)
    profileImage: profile.profile_image_url || null,
    dob: profile.dob || null,
    gender: profile.gender || null,
    nationality: profile.nationality || null,

    // Address (COMPLETE)
    address: {
      line: profile.address_line || null,
      city: profile.city || null,
      province: profile.province || null,
      country: profile.country || "Pakistan",
      postalCode: profile.postal_code || null,
    },

    // Emergency contact (COMPLETE)
    emergencyContact: profile.emergency_contact
      ? {
          name: profile.emergency_contact?.name || null,
          relationship: profile.emergency_contact?.relationship || null,
          phone: profile.emergency_contact?.phone || null,
          email: profile.emergency_contact?.email || null,
          address: profile.emergency_contact?.address || null,
        }
      : null,

    // Timestamps
    profileCreatedAt: profile.created_at,
    profileUpdatedAt: profile.updated_at,
  };
}

/* ============================================
   FORMAT PROFILE LIST ITEM (for admin list view)
============================================ */
export function formatProfileListItem(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    cnic: user.cnic, // Added CNIC to list view
    role: user.role,
    profileImage: user.profile_image_url || null,
    city: user.city || "N/A",
    province: user.province || "N/A",
    verified: {
      phone: user.phone_verified,
      email: user.email_verified,
    },
    createdAt: user.created_at,
  };
}