// // src/modules/hotels/police/police.hotels.controller.js

// import { HotelsService } from "../hotel.service.js";

// export const PoliceHotelsController = {
//   /* ============================================
//      CREATE HOTEL (Admin only)
//   ============================================ */
//   async createHotel(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const ipAddress =
//         req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
//       const userAgent = req.headers["user-agent"];

//       // Check if image file is provided
//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           message: "Hotel main image is required",
//         });
//       }

//       // Parse amenities if it's a string
//       let amenities = [];
//       if (req.body.amenities) {
//         try {
//           amenities =
//             typeof req.body.amenities === "string"
//               ? JSON.parse(req.body.amenities)
//               : req.body.amenities;
//         } catch (error) {
//           return res.status(400).json({
//             success: false,
//             message: "Invalid amenities format. Must be valid JSON array.",
//           });
//         }
//       }

//       const hotelData = {
//         name: req.body.name,
//         address: req.body.address,
//         region: req.body.region,
//         latitude: parseFloat(req.body.latitude),
//         longitude: parseFloat(req.body.longitude),
//         phone: req.body.phone,
//         email: req.body.email,
//         description: req.body.description,
//         amenities: amenities,
//         isAllSeason:
//           req.body.isAllSeason === "true" || req.body.isAllSeason === true,
//         seasonOpenFrom: req.body.seasonOpenFrom
//           ? parseInt(req.body.seasonOpenFrom)
//           : null,
//         seasonOpenTo: req.body.seasonOpenTo
//           ? parseInt(req.body.seasonOpenTo)
//           : null,
//       };

//       const mainImageFile = req.file ? req.file.buffer : null;

//       const hotel = await HotelsService.createHotel(
//         hotelData,
//         mainImageFile,
//         userId,
//         ipAddress,
//         userAgent,
//       );

//       return res.status(201).json({
//         success: true,
//         message: "Hotel created successfully",
//         data: hotel,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      GET ALL HOTELS (Admin/Police - includes inactive)
//   ============================================ */
//   async getAllHotels(req, res, next) {
//     try {
//       const {
//         search,
//         region,
//         isAllSeason,
//         sortBy = "created_at",
//         order = "desc",
//         page = 1,
//         limit = 20,
//       } = req.query;
//       console.log(req);

//       // Admin/Police can see all hotels (active and inactive)
//       const result = await HotelsService.getAllHotels({
//         search,
//         region,
//         isAllSeason:
//           isAllSeason === "true"
//             ? true
//             : isAllSeason === "false"
//               ? false
//               : undefined,
//         isActive: undefined, // Show all
//         sortBy,
//         order,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         userId: req.user.id,
//       });

//       return res.status(200).json({
//         success: true,
//         data: result.hotels,
//         pagination: result.pagination,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      GET HOTEL BY ID (Admin/Police)
//   ============================================ */
//   async getHotelById(req, res, next) {
//     try {
//       const { hotelId } = req.params;

//       // Don't increment view count for admin/police
//       const hotel = await HotelsService.getHotelById(
//         parseInt(hotelId),
//         req.user.id,
//         false,
//       );

//       return res.status(200).json({
//         success: true,
//         data: hotel,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      UPDATE HOTEL (Admin only)
//   ============================================ */
//   async updateHotel(req, res, next) {
//     try {
//       const { hotelId } = req.params;
//       const userId = req.user.id;
//       const ipAddress =
//         req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
//       const userAgent = req.headers["user-agent"];

//       // Parse amenities if provided
//       let updateData = { ...req.body };
//       if (req.body.amenities) {
//         try {
//           updateData.amenities =
//             typeof req.body.amenities === "string"
//               ? JSON.parse(req.body.amenities)
//               : req.body.amenities;
//         } catch (error) {
//           return res.status(400).json({
//             success: false,
//             message: "Invalid amenities format. Must be valid JSON array.",
//           });
//         }
//       }

//       // Convert string booleans
//       if (req.body.isAllSeason !== undefined) {
//         updateData.isAllSeason =
//           req.body.isAllSeason === "true" || req.body.isAllSeason === true;
//       }

//       // Convert season months to integers
//       if (req.body.seasonOpenFrom) {
//         updateData.seasonOpenFrom = parseInt(req.body.seasonOpenFrom);
//       }
//       if (req.body.seasonOpenTo) {
//         updateData.seasonOpenTo = parseInt(req.body.seasonOpenTo);
//       }

//       const mainImageFile = req.file ? req.file.buffer : null;

//       const hotel = await HotelsService.updateHotel(
//         parseInt(hotelId),
//         updateData,
//         mainImageFile,
//         userId,
//         ipAddress,
//         userAgent,
//       );

//       return res.status(200).json({
//         success: true,
//         message: "Hotel updated successfully",
//         data: hotel,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      UPDATE ACTIVE STATUS (Admin only)
//   ============================================ */
//   async updateActiveStatus(req, res, next) {
//     try {
//       const { hotelId } = req.params;
//       const { isActive } = req.body;
//       const userId = req.user.id;
//       const ipAddress =
//         req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
//       const userAgent = req.headers["user-agent"];

//       const hotel = await HotelsService.updateActiveStatus(
//         parseInt(hotelId),
//         isActive,
//         userId,
//         ipAddress,
//         userAgent,
//       );

//       const message = isActive
//         ? "Hotel activated successfully"
//         : "Hotel deactivated successfully";

//       return res.status(200).json({
//         success: true,
//         message,
//         data: hotel,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      DELETE HOTEL (Admin only)
//   ============================================ */
//   async deleteHotel(req, res, next) {
//     try {
//       const { hotelId } = req.params;
//       const userId = req.user.id;
//       const ipAddress =
//         req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
//       const userAgent = req.headers["user-agent"];

//       await HotelsService.deleteHotel(
//         parseInt(hotelId),
//         userId,
//         ipAddress,
//         userAgent,
//       );

//       return res.status(200).json({
//         success: true,
//         message: "Hotel deleted successfully",
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      ADD HOTEL IMAGE (Admin only)
//   ============================================ */
//   async addHotelImage(req, res, next) {
//     try {
//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           message: "Image file is required",
//         });
//       }

//       const { hotelId } = req.params;
//       const { caption, displayOrder } = req.body;
//       const userId = req.user.id;
//       const ipAddress =
//         req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
//       const userAgent = req.headers["user-agent"];

//       const imageFile = req.file.buffer;

//       const image = await HotelsService.addHotelImage(
//         parseInt(hotelId),
//         imageFile,
//         caption,
//         displayOrder ? parseInt(displayOrder) : 0,
//         userId,
//         ipAddress,
//         userAgent,
//       );

//       return res.status(201).json({
//         success: true,
//         message: "Image added successfully",
//         data: image,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      DELETE HOTEL IMAGE (Admin only)
//   ============================================ */
//   async deleteHotelImage(req, res, next) {
//     try {
//       const { hotelId, imageId } = req.params;
//       const userId = req.user.id;
//       const ipAddress =
//         req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
//       const userAgent = req.headers["user-agent"];

//       await HotelsService.deleteHotelImage(
//         parseInt(hotelId),
//         parseInt(imageId),
//         userId,
//         ipAddress,
//         userAgent,
//       );

//       return res.status(200).json({
//         success: true,
//         message: "Image deleted successfully",
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      GET AUDIT HISTORY (Admin only)
//   ============================================ */
//   async getAuditHistory(req, res, next) {
//     try {
//       const { hotelId } = req.params;
//       const { limit = 50 } = req.query;

//       const history = await HotelsService.getAuditHistory(
//         parseInt(hotelId),
//         parseInt(limit),
//       );

//       return res.status(200).json({
//         success: true,
//         data: history,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },
// };









// src/modules/hotels/police/police.hotels.controller.js

import { HotelsService } from "../hotel.service.js";

// Safe amenities parser — handles both cases after the validation sanitizer runs
function parseAmenities(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;           // already parsed by sanitizer
  if (typeof value === "string") {
    try { return JSON.parse(value); }
    catch { return []; }
  }
  return [];
}

export const PoliceHotelsController = {
  /* ============================================
     CREATE HOTEL (Admin only)
  ============================================ */
  async createHotel(req, res, next) {
    try {
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Hotel main image is required",
        });
      }

      // ── FIXED: use parseAmenities() instead of JSON.parse() ──
      const amenities = parseAmenities(req.body.amenities);

      const hotelData = {
        name:      req.body.name,
        address:   req.body.address,
        region:    req.body.region,
        latitude:  parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude),
        phone:     req.body.phone,
        email:     req.body.email,
        description: req.body.description,
        amenities,
        isAllSeason:
          req.body.isAllSeason === "true" || req.body.isAllSeason === true,
        seasonOpenFrom: req.body.seasonOpenFrom
          ? parseInt(req.body.seasonOpenFrom)
          : null,
        seasonOpenTo: req.body.seasonOpenTo
          ? parseInt(req.body.seasonOpenTo)
          : null,
      };

      const mainImageFile = req.file ? req.file.buffer : null;

      const hotel = await HotelsService.createHotel(
        hotelData,
        mainImageFile,
        userId,
        ipAddress,
        userAgent,
      );

      return res.status(201).json({
        success: true,
        message: "Hotel created successfully",
        data: hotel,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET ALL HOTELS (Admin/Police - includes inactive)
  ============================================ */
  async getAllHotels(req, res, next) {
    try {
      const {
        search,
        region,
        isAllSeason,
        sortBy = "created_at",
        order = "desc",
        page = 1,
        limit = 20,
      } = req.query;

      const result = await HotelsService.getAllHotels({
        search,
        region,
        isAllSeason:
          isAllSeason === "true"
            ? true
            : isAllSeason === "false"
              ? false
              : undefined,
        isActive: undefined, // Admin sees all
        sortBy,
        order,
        page: parseInt(page),
        limit: parseInt(limit),
        userId: req.user.id,
      });

      return res.status(200).json({
        success: true,
        data: result.hotels,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET HOTEL BY ID (Admin/Police)
  ============================================ */
  async getHotelById(req, res, next) {
    try {
      const { hotelId } = req.params;

      const hotel = await HotelsService.getHotelById(
        parseInt(hotelId),
        req.user.id,
        false, // don't increment view count for admin
      );

      return res.status(200).json({
        success: true,
        data: hotel,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     UPDATE HOTEL (Admin only)
  ============================================ */
  async updateHotel(req, res, next) {
    try {
      const { hotelId } = req.params;
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      let updateData = { ...req.body };

      // ── FIXED: use parseAmenities() instead of JSON.parse() ──
      if (req.body.amenities !== undefined) {
        updateData.amenities = parseAmenities(req.body.amenities);
      }

      // Convert string boolean
      if (req.body.isAllSeason !== undefined) {
        updateData.isAllSeason =
          req.body.isAllSeason === "true" || req.body.isAllSeason === true;
      }

      // Convert season months to integers
      if (req.body.seasonOpenFrom) {
        updateData.seasonOpenFrom = parseInt(req.body.seasonOpenFrom);
      }
      if (req.body.seasonOpenTo) {
        updateData.seasonOpenTo = parseInt(req.body.seasonOpenTo);
      }

      const mainImageFile = req.file ? req.file.buffer : null;

      const hotel = await HotelsService.updateHotel(
        parseInt(hotelId),
        updateData,
        mainImageFile,
        userId,
        ipAddress,
        userAgent,
      );

      return res.status(200).json({
        success: true,
        message: "Hotel updated successfully",
        data: hotel,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     UPDATE ACTIVE STATUS (Admin only)
  ============================================ */
  async updateActiveStatus(req, res, next) {
    try {
      const { hotelId } = req.params;
      const { isActive } = req.body;
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const hotel = await HotelsService.updateActiveStatus(
        parseInt(hotelId),
        isActive,
        userId,
        ipAddress,
        userAgent,
      );

      const message = isActive
        ? "Hotel activated successfully"
        : "Hotel deactivated successfully";

      return res.status(200).json({
        success: true,
        message,
        data: hotel,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     DELETE HOTEL (Admin only)
  ============================================ */
  async deleteHotel(req, res, next) {
    try {
      const { hotelId } = req.params;
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      await HotelsService.deleteHotel(
        parseInt(hotelId),
        userId,
        ipAddress,
        userAgent,
      );

      return res.status(200).json({
        success: true,
        message: "Hotel deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     ADD HOTEL IMAGE (Admin only)
  ============================================ */
  async addHotelImage(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Image file is required",
        });
      }

      const { hotelId } = req.params;
      const { caption, displayOrder } = req.body;
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const image = await HotelsService.addHotelImage(
        parseInt(hotelId),
        req.file.buffer,
        caption,
        displayOrder ? parseInt(displayOrder) : 0,
        userId,
        ipAddress,
        userAgent,
      );

      return res.status(201).json({
        success: true,
        message: "Image added successfully",
        data: image,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     DELETE HOTEL IMAGE (Admin only)
  ============================================ */
  async deleteHotelImage(req, res, next) {
    try {
      const { hotelId, imageId } = req.params;
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      await HotelsService.deleteHotelImage(
        parseInt(hotelId),
        parseInt(imageId),
        userId,
        ipAddress,
        userAgent,
      );

      return res.status(200).json({
        success: true,
        message: "Image deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET AUDIT HISTORY (Admin only)
  ============================================ */
  async getAuditHistory(req, res, next) {
    try {
      const { hotelId } = req.params;
      const { limit = 50 } = req.query;

      const history = await HotelsService.getAuditHistory(
        parseInt(hotelId),
        parseInt(limit),
      );

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  },
};