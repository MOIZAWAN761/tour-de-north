// src/modules/hotels/hotels.helpers.js

import cloudinary from "../../../config/cloudinary.js";
import multer from "multer";

/* ============================================
   MULTER CONFIGURATION
============================================ */
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for hotel images
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

/* ============================================
   UPLOAD HOTEL IMAGE TO CLOUDINARY
============================================ */
export async function uploadHotelImage(file, folder = "main") {
  try {
    let uploadData;
    const folderPath = `Main/Police-project/hotels/${folder}`;

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
    throw new Error("Failed to upload hotel image to Cloudinary");
  }
}

/* ============================================
   DELETE IMAGE FROM CLOUDINARY
============================================ */
export async function deleteHotelImage(publicId) {
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
    throw new Error("Failed to delete hotel image from Cloudinary");
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
   FORMAT HOTEL DATA (for response)
============================================ */
export function formatHotelData(hotel, includeImages = false) {
  if (!hotel) return null;

  const formatted = {
    id: hotel.id,
    name: hotel.name,
    address: hotel.address,
    region: hotel.region,

    location: {
      latitude: parseFloat(hotel.latitude),
      longitude: parseFloat(hotel.longitude),
    },

    contact: {
      phone: hotel.phone,
      email: hotel.email,
    },

    description: hotel.description,
    mainImage: hotel.main_image_url,

    amenities: hotel.amenities || [],

    seasonal: {
      isAllSeason: hotel.is_all_season,
      openFrom: hotel.season_open_from,
      openTo: hotel.season_open_to,
    },

    stats: {
      viewCount: hotel.view_count || 0,
      averageRating: parseFloat(hotel.average_rating) || 0,
      reviewCount: hotel.review_count || 0,
    },

    isActive: hotel.is_active,

    createdBy: hotel.created_by,
    updatedBy: hotel.updated_by,
    createdAt: hotel.created_at,
    updatedAt: hotel.updated_at,
  };

  // Add additional images if requested
  if (includeImages && hotel.images) {
    formatted.additionalImages = hotel.images.map((img) => ({
      id: img.id,
      url: img.image_url,
      caption: img.caption,
      displayOrder: img.display_order,
    }));
  }

  // Add saved status if available
  if (hotel.is_saved !== undefined) {
    formatted.isSaved = hotel.is_saved;
  }

  return formatted;
}

/* ============================================
   FORMAT HOTEL LIST ITEM (for list views)
============================================ */
export function formatHotelListItem(hotel) {
  return {
    id: hotel.id,
    name: hotel.name,
    address: hotel.address,
    region: hotel.region,
    mainImage: hotel.main_image_url,

    location: {
      latitude: parseFloat(hotel.latitude),
      longitude: parseFloat(hotel.longitude),
    },

    contact: {
      phone: hotel.phone,
    },

    amenities: hotel.amenities || [],

    stats: {
      viewCount: hotel.view_count || 0,
      averageRating: parseFloat(hotel.average_rating) || 0,
      reviewCount: hotel.review_count || 0,
    },

    seasonal: {
      isAllSeason: hotel.is_all_season,
      openFrom: hotel.season_open_from,
      openTo: hotel.season_open_to,
    },

    isActive: hotel.is_active,
    isSaved: hotel.is_saved || false,
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

  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, message: "Invalid coordinates format" };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, message: "Latitude must be between -90 and 90" };
  }

  if (lon < -180 || lon > 180) {
    return { valid: false, message: "Longitude must be between -180 and 180" };
  }

  // Check if in Pakistan region (rough bounds)
  if (lat < 23 || lat > 37 || lon < 60 || lon > 77) {
    return {
      valid: true,
      warning: "Coordinates are outside Pakistan region. Please verify.",
    };
  }

  return { valid: true };
}

/* ============================================
   VALIDATE AMENITIES
============================================ */
export function validateAmenities(amenities) {
  if (!Array.isArray(amenities)) {
    return { valid: false, message: "Amenities must be an array" };
  }

  for (const amenity of amenities) {
    if (!amenity.name || typeof amenity.name !== "string") {
      return { valid: false, message: "Each amenity must have a name" };
    }
  }

  return { valid: true };
}

/* ============================================
   VALIDATE SEASON MONTHS
============================================ */
export function validateSeasonMonths(openFrom, openTo) {
  if (openFrom && (openFrom < 1 || openFrom > 12)) {
    return { valid: false, message: "Season open from must be between 1-12" };
  }

  if (openTo && (openTo < 1 || openTo > 12)) {
    return { valid: false, message: "Season open to must be between 1-12" };
  }

  return { valid: true };
}
