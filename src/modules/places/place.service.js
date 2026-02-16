// src/modules/places/places.service.js

import { PlacesModel } from "./place.model.js";
import { PlacesAuditLog } from "./place.audit.model.js";
import {
  uploadPlaceImage,
  deletePlaceImage,
  getPublicIdFromUrl,
  formatPlaceData,
  formatPlaceListItem,
  validateCoordinates,
  sanitizePlaceName,
} from "./place.helper.js";

export class PlacesService {
  /* ============================================
     CREATE PLACE (ADMIN ONLY)
  ============================================ */
  static async createPlace(data, mainImageFile, userId, ipAddress, userAgent) {
    try {
      // Sanitize name
      const sanitizedName = sanitizePlaceName(data.name);

      // Validate coordinates
      const coordValidation = validateCoordinates(
        data.latitude,
        data.longitude,
      );
      if (!coordValidation.valid) {
        throw { status: 400, message: coordValidation.message };
      }

      // Check if place already exists
      const existingPlace = await PlacesModel.checkPlaceExists(
        sanitizedName,
        data.latitude,
        data.longitude,
      );

      if (existingPlace) {
        throw {
          status: 409,
          message: "A place with this name or coordinates already exists",
          existingPlace: {
            id: existingPlace.id,
            name: existingPlace.name,
          },
        };
      }

      // Upload main image if provided
      let mainImageUrl = data.mainImageUrl;
      if (mainImageFile) {
        const uploaded = await uploadPlaceImage(mainImageFile, "main");
        mainImageUrl = uploaded.url;
      }

      if (!mainImageUrl) {
        throw { status: 400, message: "Main image is required" };
      }

      // Create place
      const placeData = {
        name: sanitizedName,
        description: data.description,
        region: data.region,
        type: data.type,
        latitude: data.latitude,
        longitude: data.longitude,
        mainImageUrl,
        safetyStatus: data.safetyStatus || "safe",
        safetyMessage: data.safetyMessage,
      };

      const place = await PlacesModel.createPlace(placeData, userId);

      // Log action
      await PlacesAuditLog.logAction({
        placeId: place.id,
        userId,
        action: "PLACE_CREATED",
        changes: placeData,
        ipAddress,
        userAgent,
      });

      return formatPlaceData(place);
    } catch (error) {
      console.error("Create place error:", error);
      throw error;
    }
  }

  /* ============================================
     GET PLACE BY ID
  ============================================ */
  static async getPlaceById(placeId, userId, incrementView = false) {
    const place = await PlacesModel.getPlaceById(placeId, userId);

    if (!place) {
      throw { status: 404, message: "Place not found" };
    }

    // Increment view count if requested (for public views)
    if (incrementView) {
      await PlacesModel.incrementViewCount(placeId);
      place.view_count++;
    }

    return formatPlaceData(place, true); // Include images
  }

  /* ============================================
     GET ALL PLACES (with filters)
  ============================================ */
  static async getAllPlaces({
    search = "",
    region,
    type,
    safetyStatus,
    isActive,
    sortBy = "created_at",
    order = "desc",
    page = 1,
    limit = 20,
    userId,
  }) {
    const offset = (page - 1) * limit;

    const places = await PlacesModel.getAllPlaces({
      search,
      region,
      type,
      safetyStatus,
      isActive,
      sortBy,
      order,
      limit,
      offset,
      userId,
    });

    const total = await PlacesModel.countPlaces({
      search,
      region,
      type,
      safetyStatus,
      isActive,
    });

    return {
      places: places.map(formatPlaceListItem),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /* ============================================
     GET TRENDING PLACES
  ============================================ */
  static async getTrendingPlaces(limit = 10, userId) {
    const places = await PlacesModel.getTrendingPlaces(limit, userId);
    return places.map(formatPlaceListItem);
  }

  /* ============================================
     UPDATE PLACE (ADMIN ONLY)
  ============================================ */
  static async updatePlace(
    placeId,
    updates,
    newMainImage,
    userId,
    ipAddress,
    userAgent,
  ) {
    try {
      // Check if place exists
      const existingPlace = await PlacesModel.getPlaceById(placeId);
      if (!existingPlace) {
        throw { status: 404, message: "Place not found" };
      }

      // Prepare update data
      const updateData = {};

      if (updates.name) {
        updateData.name = sanitizePlaceName(updates.name);
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }
      if (updates.region) {
        updateData.region = updates.region;
      }
      if (updates.type !== undefined) {
        updateData.type = updates.type;
      }
      if (updates.latitude !== undefined || updates.longitude !== undefined) {
        const lat = updates.latitude || existingPlace.latitude;
        const lon = updates.longitude || existingPlace.longitude;

        const coordValidation = validateCoordinates(lat, lon);
        if (!coordValidation.valid) {
          throw { status: 400, message: coordValidation.message };
        }

        updateData.latitude = lat;
        updateData.longitude = lon;
      }

      // Handle main image update
      if (newMainImage) {
        // Delete old image
        const oldPublicId = getPublicIdFromUrl(existingPlace.main_image_url);
        if (oldPublicId) {
          try {
            await deletePlaceImage(oldPublicId);
          } catch (error) {
            console.error("Failed to delete old image:", error);
          }
        }

        // Upload new image
        const uploaded = await uploadPlaceImage(newMainImage, "main");
        updateData.mainImageUrl = uploaded.url;
      }

      // Update place
      const updatedPlace = await PlacesModel.updatePlace(
        placeId,
        updateData,
        userId,
      );

      // Log action
      await PlacesAuditLog.logAction({
        placeId,
        userId,
        action: "PLACE_UPDATED",
        changes: updateData,
        ipAddress,
        userAgent,
      });

      return formatPlaceData(updatedPlace, true);
    } catch (error) {
      console.error("Update place error:", error);
      throw error;
    }
  }

  /* ============================================
     UPDATE SAFETY STATUS (ADMIN & POLICE)
  ============================================ */
  static async updateSafetyStatus(
    placeId,
    safetyStatus,
    safetyMessage,
    safetyFlags,
    userId,
    ipAddress,
    userAgent,
  ) {
    const place = await PlacesModel.getPlaceById(placeId);
    if (!place) {
      throw { status: 404, message: "Place not found" };
    }

    const updatedPlace = await PlacesModel.updateSafetyStatus(
      placeId,
      safetyStatus,
      safetyMessage,
      safetyFlags,
      userId,
    );

    // Log action
    await PlacesAuditLog.logAction({
      placeId,
      userId,
      action: "SAFETY_STATUS_UPDATED",
      changes: {
        oldStatus: place.safety_status,
        newStatus: safetyStatus,
        message: safetyMessage,
        flags: safetyFlags,
      },
      ipAddress,
      userAgent,
    });

    return formatPlaceData(updatedPlace);
  }

  /* ============================================
     UPDATE ACTIVE STATUS (ADMIN ONLY)
  ============================================ */
  static async updateActiveStatus(
    placeId,
    isActive,
    userId,
    ipAddress,
    userAgent,
  ) {
    const place = await PlacesModel.getPlaceById(placeId);
    if (!place) {
      throw { status: 404, message: "Place not found" };
    }

    const updatedPlace = await PlacesModel.updateActiveStatus(
      placeId,
      isActive,
      userId,
    );

    // Log action
    await PlacesAuditLog.logAction({
      placeId,
      userId,
      action: "ACTIVE_STATUS_UPDATED",
      changes: {
        oldStatus: place.is_active,
        newStatus: isActive,
      },
      ipAddress,
      userAgent,
    });

    return formatPlaceData(updatedPlace);
  }

  /* ============================================
     DELETE PLACE (ADMIN ONLY)
  ============================================ */
  static async deletePlace(placeId, userId, ipAddress, userAgent) {
    const place = await PlacesModel.getPlaceById(placeId);
    if (!place) {
      throw { status: 404, message: "Place not found" };
    }

    // Delete main image from Cloudinary
    const mainImagePublicId = getPublicIdFromUrl(place.main_image_url);
    if (mainImagePublicId) {
      try {
        await deletePlaceImage(mainImagePublicId);
      } catch (error) {
        console.error("Failed to delete main image:", error);
      }
    }

    // Delete additional images
    const images = await PlacesModel.getPlaceImages(placeId);
    for (const image of images) {
      if (image.cloudinary_public_id) {
        try {
          await deletePlaceImage(image.cloudinary_public_id);
        } catch (error) {
          console.error("Failed to delete image:", error);
        }
      }
    }

    // Log action before deletion
    await PlacesAuditLog.logAction({
      placeId,
      userId,
      action: "PLACE_DELETED",
      changes: {
        deletedPlace: {
          name: place.name,
          region: place.region,
        },
      },
      ipAddress,
      userAgent,
    });

    // Delete place (cascade deletes images and saved places)
    await PlacesModel.deletePlace(placeId);

    return { message: "Place deleted successfully" };
  }

  /* ============================================
     ADD PLACE IMAGE (ADMIN ONLY)
  ============================================ */
  static async addPlaceImage(
    placeId,
    imageFile,
    caption,
    displayOrder,
    userId,
    ipAddress,
    userAgent,
  ) {
    const place = await PlacesModel.getPlaceById(placeId);
    if (!place) {
      throw { status: 404, message: "Place not found" };
    }

    // Upload image
    const uploaded = await uploadPlaceImage(imageFile, "additional");

    // Save to database
    const image = await PlacesModel.addPlaceImage(
      placeId,
      uploaded.url,
      uploaded.publicId,
      caption,
      displayOrder,
      userId,
    );

    // Log action
    await PlacesAuditLog.logAction({
      placeId,
      userId,
      action: "IMAGE_ADDED",
      changes: {
        imageId: image.id,
        caption,
      },
      ipAddress,
      userAgent,
    });

    return {
      id: image.id,
      url: image.image_url,
      caption: image.caption,
      displayOrder: image.display_order,
    };
  }

  /* ============================================
     DELETE PLACE IMAGE (ADMIN ONLY)
  ============================================ */
  static async deletePlaceImage(
    placeId,
    imageId,
    userId,
    ipAddress,
    userAgent,
  ) {
    const place = await PlacesModel.getPlaceById(placeId);
    if (!place) {
      throw { status: 404, message: "Place not found" };
    }

    // Delete from database (returns public_id)
    const deletedImage = await PlacesModel.deletePlaceImage(imageId);

    if (!deletedImage) {
      throw { status: 404, message: "Image not found" };
    }

    // Delete from Cloudinary
    if (deletedImage.cloudinary_public_id) {
      try {
        await deletePlaceImage(deletedImage.cloudinary_public_id);
      } catch (error) {
        console.error("Failed to delete from Cloudinary:", error);
      }
    }

    // Log action
    await PlacesAuditLog.logAction({
      placeId,
      userId,
      action: "IMAGE_DELETED",
      changes: {
        imageId,
      },
      ipAddress,
      userAgent,
    });

    return { message: "Image deleted successfully" };
  }

  /* ============================================
     SAVE PLACE (USER)
  ============================================ */
  static async savePlace(userId, placeId) {
    const place = await PlacesModel.getPlaceById(placeId);
    if (!place) {
      throw { status: 404, message: "Place not found" };
    }

    const saved = await PlacesModel.savePlace(userId, placeId);

    if (!saved) {
      // Already saved
      return { message: "Place already saved", alreadySaved: true };
    }

    return { message: "Place saved successfully", saved: true };
  }

  /* ============================================
     UNSAVE PLACE (USER)
  ============================================ */
  static async unsavePlace(userId, placeId) {
    const unsaved = await PlacesModel.unsavePlace(userId, placeId);

    if (!unsaved) {
      throw { status: 404, message: "Place was not saved" };
    }

    return { message: "Place removed from saved list" };
  }

  /* ============================================
     GET SAVED PLACES (USER)
  ============================================ */
  static async getSavedPlaces(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const places = await PlacesModel.getSavedPlaces(userId, limit, offset);
    const total = await PlacesModel.countSavedPlaces(userId);

    return {
      places: places.map(formatPlaceListItem),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /* ============================================
     GET AUDIT HISTORY (ADMIN)
  ============================================ */
  static async getPlaceAuditHistory(placeId, limit = 50) {
    return await PlacesAuditLog.getPlaceHistory(placeId, limit);
  }
}
