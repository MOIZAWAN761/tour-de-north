// src/modules/lost-and-found/lostfound.helper.js

import cloudinary from "../../config/cloudinary.js";
import multer from "multer";

/* ============================================
   MULTER CONFIGURATION
============================================ */
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

/* ============================================
   UPLOAD ITEM IMAGE TO CLOUDINARY
============================================ */
export async function uploadItemImage(file, folder = "lost") {
  try {
    let uploadData;
    const folderPath = `Main/Police-project/lost-and-found/${folder}`;

    // Determine if file is buffer or base64
    if (Buffer.isBuffer(file)) {
      // File from multer (buffer)
      uploadData = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folderPath,
            resource_type: "image",
            transformation: [
              { width: 800, height: 800, crop: "limit" },
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
        const base64Data = file.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        uploadData = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: folderPath,
              resource_type: "image",
              transformation: [
                { width: 800, height: 800, crop: "limit" },
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
        throw new Error("Invalid image format. Expected base64 string.");
      }
    } else {
      throw new Error("Invalid file type");
    }

    return {
      url: uploadData.secure_url,
      publicId: uploadData.public_id,
      width: uploadData.width,
      height: uploadData.height,
      format: uploadData.format,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload item image to Cloudinary");
  }
}

/* ============================================
   DELETE IMAGE FROM CLOUDINARY
============================================ */
export async function deleteItemImage(publicId) {
  try {
    if (!publicId) {
      throw new Error("Public ID is required");
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Failed to delete image: ${result.result}`);
    }

    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error("Failed to delete item image from Cloudinary");
  }
}

/* ============================================
   EXTRACT PUBLIC ID FROM URL
============================================ */
export function getPublicIdFromUrl(url) {
  try {
    if (!url) return null;

    const urlParts = url.split("/");
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
    const publicId = fullPath.replace(/\.[^/.]+$/, "");

    return publicId;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
}

/* ============================================
   FORMAT LOST REPORT DATA (for detail view with full info)
============================================ */
export function formatLostReport(report, includeClaims = false) {
  if (!report) return null;

  const formatted = {
    id: report.id,
    userId: report.user_id,

    item: {
      category: report.item_category,
      name: report.item_name,
      description: report.description,
      imageUrl: report.image_url,
    },

    location: {
      name: report.lost_location,
      latitude: report.latitude ? parseFloat(report.latitude) : null,
      longitude: report.longitude ? parseFloat(report.longitude) : null,
    },

    dates: {
      lost: report.lost_date,
      reported: report.created_at,
      resolved: report.resolved_date,
    },

    contact: {
      phone: report.contact_phone,
      email: report.contact_email,
    },

    status: report.status,
    claimCount: parseInt(report.claim_count) || 0,
    additionalDetails: report.additional_details,
    isOwner: report.is_owner || false,

    createdAt: report.created_at,
    updatedAt: report.updated_at,
  };

  // Only show reporter info if user is owner or admin
  if (report.is_owner || includeClaims) {
    formatted.reporter = {
      name: report.user_name,
      phone: report.user_phone,
      email: report.user_email,
    };
  }

  return formatted;
}

/* ============================================
   FORMAT LOST REPORT LIST ITEM (minimal info for list view)
============================================ */
export function formatLostReportListItem(report) {
  if (!report) return null;

  return {
    id: report.id,
    item: {
      category: report.item_category,
      name: report.item_name,
      imageUrl: report.image_url,
    },
    location: report.lost_location,
    lostDate: report.lost_date,
    status: report.status,
    claimCount: parseInt(report.claim_count) || 0,
    createdAt: report.created_at,
  };
}

/* ============================================
   FORMAT FOUND REPORT DATA (for detail view with full info)
============================================ */
export function formatFoundReport(report, includeClaims = false) {
  if (!report) return null;

  const formatted = {
    id: report.id,
    userId: report.user_id,

    item: {
      category: report.item_category,
      name: report.item_name,
      description: report.description,
      imageUrl: report.image_url,
    },

    location: {
      found: report.found_location,
      current: report.current_location,
      latitude: report.latitude ? parseFloat(report.latitude) : null,
      longitude: report.longitude ? parseFloat(report.longitude) : null,
    },

    dates: {
      found: report.found_date,
      reported: report.created_at,
      resolved: report.resolved_date,
    },

    contact: {
      phone: report.contact_phone,
      email: report.contact_email,
    },

    status: report.status,
    claimCount: parseInt(report.claim_count) || 0,
    additionalDetails: report.additional_details,
    isOwner: report.is_owner || false,

    createdAt: report.created_at,
    updatedAt: report.updated_at,
  };

  // Only show finder info if user is owner or admin
  if (report.is_owner || includeClaims) {
    formatted.finder = {
      name: report.user_name,
      phone: report.user_phone,
      email: report.user_email,
    };
  }

  return formatted;
}

/* ============================================
   FORMAT FOUND REPORT LIST ITEM (minimal info for list view)
============================================ */
export function formatFoundReportListItem(report) {
  if (!report) return null;

  return {
    id: report.id,
    item: {
      category: report.item_category,
      name: report.item_name,
      imageUrl: report.image_url,
    },
    location: {
      found: report.found_location,
      current: report.current_location,
    },
    foundDate: report.found_date,
    status: report.status,
    claimCount: parseInt(report.claim_count) || 0,
    createdAt: report.created_at,
  };
}

/* ============================================
   FORMAT RESOLVED CASE DATA
============================================ */
export function formatResolvedCase(resolvedCase) {
  if (!resolvedCase) return null;

  return {
    id: resolvedCase.id,

    lostReport: resolvedCase.lost_report_id
      ? {
          id: resolvedCase.lost_report_id,
          itemName: resolvedCase.lost_item_name,
          itemCategory: resolvedCase.item_category,
          description: resolvedCase.lost_description,
          location: resolvedCase.lost_location,
          date: resolvedCase.lost_date,
          imageUrl: resolvedCase.lost_image_url,
          reporterName: resolvedCase.lost_reporter_name,
          reporterPhone: resolvedCase.lost_reporter_phone,
        }
      : null,

    foundReport: resolvedCase.found_report_id
      ? {
          id: resolvedCase.found_report_id,
          itemName: resolvedCase.found_item_name,
          description: resolvedCase.found_description,
          location: resolvedCase.found_location,
          date: resolvedCase.found_date,
          imageUrl: resolvedCase.found_image_url,
          reporterName: resolvedCase.found_reporter_name,
          reporterPhone: resolvedCase.found_reporter_phone,
        }
      : null,

    resolution: {
      type: resolvedCase.resolution_type,
      notes: resolvedCase.resolution_notes,
      verificationMethod: resolvedCase.verification_method,
      resolvedBy: {
        id: resolvedCase.resolved_by,
        name: resolvedCase.resolved_by_name,
        role: resolvedCase.resolved_by_role,
      },
      date: resolvedCase.resolved_date,
    },

    createdAt: resolvedCase.created_at,
  };
}

/* ============================================
   SANITIZE ITEM NAME
============================================ */
export function sanitizeItemName(name) {
  if (!name) return "";

  // Trim whitespace
  let sanitized = name.trim();

  // Remove multiple spaces
  sanitized = sanitized.replace(/\s+/g, " ");

  // Capitalize first letter
  sanitized = sanitized.charAt(0).toUpperCase() + sanitized.slice(1);

  return sanitized;
}

/* ============================================
   VALIDATE DATES
============================================ */
export function validateDate(date) {
  const inputDate = new Date(date);
  const today = new Date();

  if (isNaN(inputDate.getTime())) {
    return { valid: false, message: "Invalid date format" };
  }

  if (inputDate > today) {
    return { valid: false, message: "Date cannot be in the future" };
  }

  // Check if date is not too old (e.g., more than 1 year)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  if (inputDate < oneYearAgo) {
    return {
      valid: true,
      warning: "Date is more than 1 year old. Please verify.",
    };
  }

  return { valid: true };
}

/* ============================================
   VALIDATE PHONE NUMBER
============================================ */
export function validatePhoneNumber(phone) {
  if (!phone) return { valid: false, message: "Phone number is required" };

  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, "");

  // Check if it's a valid Pakistani phone number
  // Pakistani numbers: 11 digits (03xxxxxxxxx) or with country code (92xxxxxxxxxx)
  if (cleanPhone.length === 11 && cleanPhone.startsWith("03")) {
    return { valid: true };
  }

  if (cleanPhone.length === 12 && cleanPhone.startsWith("92")) {
    return { valid: true };
  }

  return {
    valid: false,
    message: "Invalid phone number format. Use 03xxxxxxxxx or 92xxxxxxxxxx",
  };
}

/* ============================================
   ITEM CATEGORIES
============================================ */
export const ITEM_CATEGORIES = [
  "Wallet",
  "Phone",
  "Documents",
  "Keys",
  "Bag",
  "Jewelry",
  "Electronics",
  "Clothing",
  "Accessories",
  "Vehicle",
  "Pet",
  "Other",
];

/* ============================================
   RESOLUTION TYPES
============================================ */
export const RESOLUTION_TYPES = [
  "returned_to_owner", // Item was returned to the rightful owner
  "claimed_at_station", // Owner claimed item at police station
  "false_claim", // Claim was verified as false
  "donated", // Unclaimed item was donated
  "disposed", // Item was disposed of
  "transferred", // Item transferred to another station/authority
];

/* ============================================
   STATUS VALUES
============================================ */
export const STATUS_VALUES = {
  LOST: ["active", "resolved", "expired"],
  FOUND: ["active", "resolved", "transferred"],
};
