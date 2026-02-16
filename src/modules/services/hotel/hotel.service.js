// src/modules/hotels/hotels.service.js

import { HotelsModel } from "./hotel.model.js";
import { PlacesModel } from "../../places/place.model.js";
import { HotelAuditLog, HOTEL_AUDIT_ACTIONS } from "./hotel.audit.model.js";
import {
  uploadHotelImage,
  deleteHotelImage,
  getPublicIdFromUrl,
  formatHotelData,
  formatHotelListItem,
  validateCoordinates,
  validateAmenities,
  validateSeasonMonths,
} from "./hotel.helper.js";

export const HotelsService = {
  /* ============================================
     CREATE HOTEL
  ============================================ */
  async createHotel(data, imageFile, userId, ipAddress, userAgent) {
    // Validate coordinates
    const coordValidation = validateCoordinates(data.latitude, data.longitude);
    if (!coordValidation.valid) {
      throw { status: 400, message: coordValidation.message };
    }

    // Validate amenities if provided
    if (data.amenities) {
      const amenitiesValidation = validateAmenities(data.amenities);
      if (!amenitiesValidation.valid) {
        throw { status: 400, message: amenitiesValidation.message };
      }
    }

    // Validate season months if provided
    if (data.seasonOpenFrom || data.seasonOpenTo) {
      const seasonValidation = validateSeasonMonths(
        data.seasonOpenFrom,
        data.seasonOpenTo,
      );
      if (!seasonValidation.valid) {
        throw { status: 400, message: seasonValidation.message };
      }
    }

    // Check if hotel already exists (by name or coordinates)
    const existingHotel = await HotelsModel.checkHotelExists(
      data.name,
      data.latitude,
      data.longitude,
    );

    if (existingHotel) {
      throw {
        status: 409,
        message: "A hotel with this name or coordinates already exists",
        existingHotel: {
          id: existingHotel.id,
          name: existingHotel.name,
        },
      };
    }

    // Upload main image
    if (!imageFile) {
      throw { status: 400, message: "Hotel main image is required" };
    }

    const uploadedImage = await uploadHotelImage(imageFile, "main");

    // Create hotel
    const hotelData = {
      name: data.name,
      address: data.address,
      region: data.region,
      latitude: data.latitude,
      longitude: data.longitude,
      phone: data.phone,
      email: data.email,
      description: data.description,
      mainImageUrl: uploadedImage.url,
      mainImagePublicId: uploadedImage.publicId,
      amenities: data.amenities || [],
      isAllSeason: data.isAllSeason || false,
      seasonOpenFrom: data.seasonOpenFrom,
      seasonOpenTo: data.seasonOpenTo,
    };

    const hotel = await HotelsModel.createHotel(hotelData, userId);

    // Log audit
    await HotelAuditLog.logAction({
      hotelId: hotel.id,
      userId,
      action: HOTEL_AUDIT_ACTIONS.HOTEL_CREATED,
      changes: {
        hotelName: hotel.name,
        region: hotel.region,
      },
      ipAddress,
      userAgent,
    });

    return formatHotelData(hotel);
  },

  /* ============================================
     GET HOTEL BY ID
  ============================================ */
  async getHotelById(hotelId, userId, incrementView = false) {
    const hotel = await HotelsModel.getHotelById(hotelId, userId);

    if (!hotel) {
      throw { status: 404, message: "Hotel not found" };
    }

    // Increment view count if requested
    if (incrementView) {
      await HotelsModel.incrementViewCount(hotelId);
      hotel.view_count++;
    }

    return formatHotelData(hotel, true);
  },

  /* ============================================
     GET ALL HOTELS
  ============================================ */
  async getAllHotels({
    search = "",
    region,
    isAllSeason,
    isActive,
    sortBy = "created_at",
    order = "desc",
    page = 1,
    limit = 20,
    userId,
  }) {
    const offset = (page - 1) * limit;

    const hotels = await HotelsModel.getAllHotels({
      search,
      region,
      isAllSeason,
      isActive,
      sortBy,
      order,
      limit,
      offset,
      userId,
    });

    const total = await HotelsModel.countHotels({
      search,
      region,
      isAllSeason,
      isActive,
    });

    return {
      hotels: hotels.map(formatHotelListItem),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /* ============================================
     GET TRENDING HOTELS
  ============================================ */
  async getTrendingHotels(limit = 10, userId) {
    const hotels = await HotelsModel.getTrendingHotels(limit, userId);
    return hotels.map(formatHotelListItem);
  },

  /* ============================================
     GET NEARBY HOTELS (for a place)
  ============================================ */
  async getNearbyHotels(placeId, userId, radiusKm = 10) {
    // Get place coordinates
    const place=await PlacesModel.getPlaceById(placeId)

    if (!place) {
      throw { status: 404, message: "Place not found" };
    }

    const { latitude, longitude } = place;

    const hotels = await HotelsModel.getNearbyHotels(
      latitude,
      longitude,
      radiusKm,
      userId,
    );

    return hotels.map((hotel) => ({
      ...formatHotelListItem(hotel),
      distance: parseFloat(hotel.distance).toFixed(2), // km
    }));
  },

  /* ============================================
     UPDATE HOTEL
  ============================================ */
  async updateHotel(hotelId, data, imageFile, userId, ipAddress, userAgent) {
    // Check if hotel exists
    const existingHotel = await HotelsModel.getHotelById(hotelId);
    if (!existingHotel) {
      throw { status: 404, message: "Hotel not found" };
    }

    // Validate coordinates if changed
    if (data.latitude || data.longitude) {
      const lat = data.latitude || existingHotel.latitude;
      const lon = data.longitude || existingHotel.longitude;

      const coordValidation = validateCoordinates(lat, lon);
      if (!coordValidation.valid) {
        throw { status: 400, message: coordValidation.message };
      }
    }

    // Validate amenities if provided
    if (data.amenities) {
      const amenitiesValidation = validateAmenities(data.amenities);
      if (!amenitiesValidation.valid) {
        throw { status: 400, message: amenitiesValidation.message };
      }
    }

    // Validate season months if provided
    if (data.seasonOpenFrom || data.seasonOpenTo) {
      const seasonValidation = validateSeasonMonths(
        data.seasonOpenFrom,
        data.seasonOpenTo,
      );
      if (!seasonValidation.valid) {
        throw { status: 400, message: seasonValidation.message };
      }
    }

    const updateData = { ...data };

    // Handle image update
    if (imageFile) {
      // Delete old image from Cloudinary
      if (existingHotel.main_image_public_id) {
        await deleteHotelImage(existingHotel.main_image_public_id);
      }

      // Upload new image
      const uploadedImage = await uploadHotelImage(imageFile, "main");
      updateData.mainImageUrl = uploadedImage.url;
      updateData.mainImagePublicId = uploadedImage.publicId;
    }

    // Track changes for audit
    const changes = {};
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && data[key] !== existingHotel[key]) {
        changes[key] = { from: existingHotel[key], to: data[key] };
      }
    });

    // Update hotel
    const updatedHotel = await HotelsModel.updateHotel(
      hotelId,
      updateData,
      userId,
    );

    // Log audit
    await HotelAuditLog.logAction({
      hotelId,
      userId,
      action: HOTEL_AUDIT_ACTIONS.HOTEL_UPDATED,
      changes,
      ipAddress,
      userAgent,
    });

    return formatHotelData(updatedHotel);
  },

  /* ============================================
     UPDATE ACTIVE STATUS
  ============================================ */
  async updateActiveStatus(hotelId, isActive, userId, ipAddress, userAgent) {
    const existingHotel = await HotelsModel.getHotelById(hotelId);
    if (!existingHotel) {
      throw { status: 404, message: "Hotel not found" };
    }

    const updatedHotel = await HotelsModel.updateActiveStatus(
      hotelId,
      isActive,
      userId,
    );

    // Log audit
    await HotelAuditLog.logAction({
      hotelId,
      userId,
      action: HOTEL_AUDIT_ACTIONS.ACTIVE_STATUS_UPDATED,
      changes: {
        from: existingHotel.is_active,
        to: isActive,
      },
      ipAddress,
      userAgent,
    });

    return formatHotelData(updatedHotel);
  },

  /* ============================================
     DELETE HOTEL
  ============================================ */
  async deleteHotel(hotelId, userId, ipAddress, userAgent) {
    const hotel = await HotelsModel.getHotelById(hotelId);
    if (!hotel) {
      throw { status: 404, message: "Hotel not found" };
    }

    // Log audit before deletion
    await HotelAuditLog.logAction({
      hotelId,
      userId,
      action: HOTEL_AUDIT_ACTIONS.HOTEL_DELETED,
      changes: {
        hotelName: hotel.name,
        region: hotel.region,
      },
      ipAddress,
      userAgent,
    });

    // Delete main image from Cloudinary
    if (hotel.main_image_public_id) {
      await deleteHotelImage(hotel.main_image_public_id);
    }

    // Delete additional images from Cloudinary
    const additionalImages = await HotelsModel.getHotelImages(hotelId);
    for (const img of additionalImages) {
      if (img.cloudinary_public_id) {
        await deleteHotelImage(img.cloudinary_public_id);
      }
    }

    // Delete hotel (CASCADE will delete images and saved records)
    await HotelsModel.deleteHotel(hotelId);

    return { message: "Hotel deleted successfully" };
  },

  /* ============================================
     ADD HOTEL IMAGE
  ============================================ */
  async addHotelImage(
    hotelId,
    imageFile,
    caption,
    displayOrder,
    userId,
    ipAddress,
    userAgent,
  ) {
    // Check if hotel exists
    const hotel = await HotelsModel.getHotelById(hotelId);
    if (!hotel) {
      throw { status: 404, message: "Hotel not found" };
    }

    if (!imageFile) {
      throw { status: 400, message: "Image file is required" };
    }

    // Upload image
    const uploadedImage = await uploadHotelImage(imageFile, "additional");

    // Save to database
    const image = await HotelsModel.addHotelImage(
      hotelId,
      uploadedImage.url,
      uploadedImage.publicId,
      caption,
      displayOrder,
      userId,
    );

    // Log audit
    await HotelAuditLog.logAction({
      hotelId,
      userId,
      action: HOTEL_AUDIT_ACTIONS.IMAGE_ADDED,
      changes: {
        imageId: image.id,
        caption: caption,
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
  },

  /* ============================================
     DELETE HOTEL IMAGE
  ============================================ */
  async deleteHotelImage(hotelId, imageId, userId, ipAddress, userAgent) {
    // Verify hotel exists
    const hotel = await HotelsModel.getHotelById(hotelId);
    if (!hotel) {
      throw { status: 404, message: "Hotel not found" };
    }

    // Delete from database (returns public_id)
    const deletedImage = await HotelsModel.deleteHotelImage(imageId);

    if (!deletedImage) {
      throw { status: 404, message: "Image not found" };
    }

    // Delete from Cloudinary
    if (deletedImage.cloudinary_public_id) {
      await deleteHotelImage(deletedImage.cloudinary_public_id);
    }

    // Log audit
    await HotelAuditLog.logAction({
      hotelId,
      userId,
      action: HOTEL_AUDIT_ACTIONS.IMAGE_DELETED,
      changes: {
        imageId: imageId,
      },
      ipAddress,
      userAgent,
    });

    return { message: "Image deleted successfully" };
  },

  /* ============================================
     SAVE HOTEL
  ============================================ */
  async saveHotel(userId, hotelId) {
    // Check if hotel exists
    const hotel = await HotelsModel.getHotelById(hotelId);
    if (!hotel) {
      throw { status: 404, message: "Hotel not found" };
    }

    const saved = await HotelsModel.saveHotel(userId, hotelId);

    if (!saved) {
      return {
        message: "Hotel already saved",
        alreadySaved: true,
      };
    }

    return {
      message: "Hotel saved successfully",
      alreadySaved: false,
    };
  },

  /* ============================================
     UNSAVE HOTEL
  ============================================ */
  async unsaveHotel(userId, hotelId) {
    const unsaved = await HotelsModel.unsaveHotel(userId, hotelId);

    if (!unsaved) {
      throw { status: 404, message: "Hotel was not in your saved list" };
    }

    return {
      message: "Hotel removed from saved list",
    };
  },

  /* ============================================
     GET SAVED HOTELS
  ============================================ */
  async getSavedHotels(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const hotels = await HotelsModel.getSavedHotels(userId, limit, offset);
    const total = await HotelsModel.countSavedHotels(userId);

    return {
      hotels: hotels.map(formatHotelListItem),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /* ============================================
     GET AUDIT HISTORY
  ============================================ */
  async getAuditHistory(hotelId, limit = 50) {
    const history = await HotelAuditLog.getHistory(hotelId, limit);
    return history;
  },
};
