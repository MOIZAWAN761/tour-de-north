// src/modules/places/places.helpers.js

import cloudinary from "../../config/cloudinary.js";
import multer from "multer";

/* ============================================
   MULTER CONFIGURATION
============================================ */
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for place images
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

/* ============================================
   UPLOAD PLACE IMAGE TO CLOUDINARY
============================================ */
export async function uploadPlaceImage(file, folder = "main") {
  try {
    let uploadData;
    const folderPath = `Main/Police-project/places/${folder}`;

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
    throw new Error("Failed to upload place image to Cloudinary");
  }
}

/* ============================================
   DELETE IMAGE FROM CLOUDINARY
============================================ */
export async function deletePlaceImage(publicId) {
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
    throw new Error("Failed to delete place image from Cloudinary");
  }
}

/* ============================================
   EXTRACT PUBLIC ID FROM URL
============================================ */
export function getPublicIdFromUrl(url) {
  try {
    if (!url) return null;

    // Example URL: https://res.cloudinary.com/xxx/image/upload/v123/Main/Police-project/places/main/abc123.jpg
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
    const publicId = fullPath.replace(/\.[^/.]+$/, ""); // Remove extension

    return publicId;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
}

/* ============================================
   FORMAT PLACE DATA (for response)
============================================ */
export function formatPlaceData(place, includeImages = false) {
  if (!place) return null;

  const formatted = {
    id: place.id,
    name: place.name,
    description: place.description,
    region: place.region,
    type: place.type,

    location: {
      latitude: parseFloat(place.latitude),
      longitude: parseFloat(place.longitude),
    },

    mainImage: place.main_image_url,

    safety: {
      status: place.safety_status,
      message: place.safety_message,
      flags: place.safety_flags || {},
    },

    stats: {
      viewCount: place.view_count || 0,
      averageRating: parseFloat(place.average_rating) || 0,
      reviewCount: place.review_count || 0,
    },

    isActive: place.is_active,

    createdBy: place.created_by,
    updatedBy: place.updated_by,
    createdAt: place.created_at,
    updatedAt: place.updated_at,
  };

  // Add additional images if requested
  if (includeImages && place.images) {
    formatted.additionalImages = place.images.map((img) => ({
      id: img.id,
      url: img.image_url,
      caption: img.caption,
      displayOrder: img.display_order,
    }));
  }

  return formatted;
}

/* ============================================
   FORMAT PLACE LIST ITEM (for list views)
============================================ */
export function formatPlaceListItem(place) {
  return {
    id: place.id,
    name: place.name,
    region: place.region,
    type: place.type,
    mainImage: place.main_image_url,

    location: {
      latitude: parseFloat(place.latitude),
      longitude: parseFloat(place.longitude),
    },

    safety: {
      status: place.safety_status,
      message: place.safety_message,
    },

    stats: {
      viewCount: place.view_count || 0,
      averageRating: parseFloat(place.average_rating) || 0,
      reviewCount: place.review_count || 0,
    },

    isActive: place.is_active,
    isSaved: place.is_saved || false, // For user list
  };
}

/* ============================================
   CALCULATE DISTANCE (Haversine formula)
============================================ */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // in kilometers
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/* ============================================
   VALIDATE COORDINATES
============================================ */
export function validateCoordinates(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  // Check if valid numbers
  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, message: "Invalid coordinates format" };
  }

  // Check latitude range (-90 to 90)
  if (lat < -90 || lat > 90) {
    return { valid: false, message: "Latitude must be between -90 and 90" };
  }

  // Check longitude range (-180 to 180)
  if (lon < -180 || lon > 180) {
    return { valid: false, message: "Longitude must be between -180 and 180" };
  }

  // Check if in Pakistan region (rough bounds)
  // Pakistan: lat 23-37, lon 60-77
  if (lat < 23 || lat > 37 || lon < 60 || lon > 77) {
    return {
      valid: true,
      warning: "Coordinates are outside Pakistan region. Please verify.",
    };
  }

  return { valid: true };
}

/* ============================================
   SANITIZE PLACE NAME
============================================ */
export function sanitizePlaceName(name) {
  if (!name) return "";

  // Trim whitespace
  let sanitized = name.trim();

  // Remove multiple spaces
  sanitized = sanitized.replace(/\s+/g, " ");

  // Capitalize first letter of each word
  sanitized = sanitized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return sanitized;
}
