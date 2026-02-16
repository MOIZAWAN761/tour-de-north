// src/modules/jeeps/jeeps.helpers.js

import cloudinary from "../../../config/cloudinary.js";
import multer from "multer";

/* ============================================
   MULTER CONFIGURATION
============================================ */
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for jeep images
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

/* ============================================
   UPLOAD JEEP IMAGE TO CLOUDINARY
============================================ */
export async function uploadJeepImage(file) {
  try {
    let uploadData;
    const folderPath = "Main/Police-project/jeeps";

    // Determine if file is buffer or base64
    if (Buffer.isBuffer(file)) {
      // File from multer (buffer)
      uploadData = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folderPath,
            resource_type: "image",
            transformation: [
              { width: 1200, height: 800, crop: "limit" },
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
                { width: 1200, height: 800, crop: "limit" },
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
    throw new Error("Failed to upload jeep image to Cloudinary");
  }
}

/* ============================================
   DELETE IMAGE FROM CLOUDINARY
============================================ */
export async function deleteJeepImage(publicId) {
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
    throw new Error("Failed to delete jeep image from Cloudinary");
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
   FORMAT JEEP DATA (for response)
============================================ */
export function formatJeepData(jeep, includeDriver = false) {
  if (!jeep) return null;

  const formatted = {
    id: jeep.id,
    name: jeep.name,
    description: jeep.description,
    region: jeep.region,

    vehicle: {
      jeepNumber: jeep.jeep_number,
      vehicleType: jeep.vehicle_type,
      capacity: jeep.capacity,
    },

    driver: {
      id: jeep.driver_id,
      name: jeep.driver_name,
      phone: jeep.driver_phone,
    },

    mainImage: jeep.main_image_url,

    availability: {
      isAvailable: jeep.is_available,
      isActive: jeep.is_active,
    },

    stats: {
      viewCount: jeep.view_count || 0,
      averageRating: parseFloat(jeep.average_rating) || 0,
      reviewCount: jeep.review_count || 0,
    },

    createdBy: jeep.created_by,
    updatedBy: jeep.updated_by,
    createdAt: jeep.created_at,
    updatedAt: jeep.updated_at,
  };

  // Add full driver details if requested
  if (includeDriver && jeep.driver_full_name) {
    formatted.driverDetails = {
      id: jeep.driver_id,
      fullName: jeep.driver_full_name,
      cnic: jeep.driver_cnic,
      phone: jeep.driver_phone,
      address: jeep.driver_address,
      isActive: jeep.driver_is_active,
    };
  }

  // Add saved status if available
  if (jeep.is_saved !== undefined) {
    formatted.isSaved = jeep.is_saved;
  }

  return formatted;
}

/* ============================================
   FORMAT JEEP LIST ITEM (for list views)
============================================ */
export function formatJeepListItem(jeep) {
  return {
    id: jeep.id,
    name: jeep.name,
    region: jeep.region,
    mainImage: jeep.main_image_url,

    vehicle: {
      jeepNumber: jeep.jeep_number,
      vehicleType: jeep.vehicle_type,
      capacity: jeep.capacity,
    },

    driver: {
      name: jeep.driver_name,
      phone: jeep.driver_phone,
    },

    availability: {
      isAvailable: jeep.is_available,
      isActive: jeep.is_active,
    },

    stats: {
      viewCount: jeep.view_count || 0,
      averageRating: parseFloat(jeep.average_rating) || 0,
      reviewCount: jeep.review_count || 0,
    },

    isSaved: jeep.is_saved || false,
  };
}

/* ============================================
   FORMAT DRIVER DATA (for response)
============================================ */
export function formatDriverData(driver, includeJeeps = false) {
  if (!driver) return null;

  const formatted = {
    id: driver.id,
    fullName: driver.full_name,
    cnic: driver.cnic,
    phone: driver.phone,
    address: driver.address,
    isActive: driver.is_active,

    createdBy: driver.created_by,
    updatedBy: driver.updated_by,
    createdAt: driver.created_at,
    updatedAt: driver.updated_at,
  };

  // Add jeep count if available
  if (driver.jeep_count !== undefined) {
    formatted.jeepCount = parseInt(driver.jeep_count) || 0;
  }

  // Add associated jeeps if requested
  if (includeJeeps && driver.jeeps) {
    formatted.jeeps = driver.jeeps.map((jeep) => ({
      id: jeep.id,
      name: jeep.name,
      jeepNumber: jeep.jeep_number,
      region: jeep.region,
      isActive: jeep.is_active,
      isAvailable: jeep.is_available,
    }));
  }

  return formatted;
}

/* ============================================
   FORMAT DRIVER LIST ITEM (for list views)
============================================ */
export function formatDriverListItem(driver) {
  return {
    id: driver.id,
    fullName: driver.full_name,
    cnic: driver.cnic,
    phone: driver.phone,
    address: driver.address,
    isActive: driver.is_active,
    jeepCount: parseInt(driver.jeep_count) || 0,
  };
}

/* ============================================
   VALIDATE CNIC FORMAT
============================================ */
export function validateCNIC(cnic) {
  if (!cnic) {
    return { valid: false, message: "CNIC is required" };
  }

  // Remove any spaces or dashes
  const cleanCNIC = cnic.replace(/[\s-]/g, "");

  // Check if it's 13 digits
  if (!/^\d{13}$/.test(cleanCNIC)) {
    return {
      valid: false,
      message: "CNIC must be 13 digits (format: XXXXX-XXXXXXX-X)",
    };
  }

  return { valid: true, formatted: cleanCNIC };
}

/* ============================================
   VALIDATE PHONE FORMAT
============================================ */
export function validatePhone(phone) {
  if (!phone) {
    return { valid: false, message: "Phone number is required" };
  }

  // Remove any spaces, dashes, or parentheses
  const cleanPhone = phone.replace(/[\s\-()]/g, "");

  // Check if it's valid Pakistani phone number (10-11 digits, optionally with country code)
  if (!/^(\+92|92|0)?3\d{9}$/.test(cleanPhone)) {
    return {
      valid: false,
      message: "Invalid phone format. Use format: 03XXXXXXXXX or +923XXXXXXXXX",
    };
  }

  return { valid: true, formatted: cleanPhone };
}

/* ============================================
   VALIDATE JEEP NUMBER FORMAT
============================================ */
export function validateJeepNumber(jeepNumber) {
  if (!jeepNumber) {
    return { valid: false, message: "Jeep number is required" };
  }

  const cleaned = jeepNumber.trim().toUpperCase();

  // Basic validation - can be customized based on your requirements
  if (cleaned.length < 3 || cleaned.length > 50) {
    return {
      valid: false,
      message: "Jeep number must be between 3 and 50 characters",
    };
  }

  return { valid: true, formatted: cleaned };
}

/* ============================================
   VALIDATE CAPACITY
============================================ */
export function validateCapacity(capacity) {
  const cap = parseInt(capacity);

  if (isNaN(cap) || cap < 1) {
    return { valid: false, message: "Capacity must be at least 1" };
  }

  if (cap > 50) {
    return { valid: false, message: "Capacity cannot exceed 50" };
  }

  return { valid: true, value: cap };
}

/* ============================================
   SANITIZE DRIVER DATA
============================================ */
export function sanitizeDriverData(data) {
  const sanitized = {};

  if (data.fullName) sanitized.fullName = data.fullName.trim();
  if (data.cnic) sanitized.cnic = data.cnic.replace(/[\s-]/g, "");
  if (data.phone) sanitized.phone = data.phone.replace(/[\s\-()]/g, "");
  if (data.address) sanitized.address = data.address.trim();
  if (data.isActive !== undefined) sanitized.isActive = Boolean(data.isActive);

  return sanitized;
}

/* ============================================
   SANITIZE JEEP DATA
============================================ */
export function sanitizeJeepData(data) {
  const sanitized = {};

  if (data.name) sanitized.name = data.name.trim();
  if (data.description) sanitized.description = data.description.trim();
  if (data.region) sanitized.region = data.region.trim();
  if (data.jeepNumber)
    sanitized.jeepNumber = data.jeepNumber.trim().toUpperCase();
  if (data.vehicleType) sanitized.vehicleType = data.vehicleType.trim();
  if (data.capacity) sanitized.capacity = parseInt(data.capacity);
  if (data.driverId) sanitized.driverId = parseInt(data.driverId);
  if (data.isAvailable !== undefined)
    sanitized.isAvailable = Boolean(data.isAvailable);
  if (data.isActive !== undefined) sanitized.isActive = Boolean(data.isActive);

  return sanitized;
}
