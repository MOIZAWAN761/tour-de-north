// src/modules/panicAlarm/panicAlarm.service.updated.js
// Updated version - messaging removed (now in separate module)

import { PanicAlarmModel } from "./panicAlarm.model.js";
import { SOSAuditLog } from "./panicAlarm.audit.js";
import {
  reverseGeocode,
  validateMansehraCoordinates,
  formatSOSData,
  formatSOSListItem,
  sanitizePhoneNumber,
  determinePriority,
  validateOtherPersonData,
} from "./panicAlarm.helper.js";
import redisClient from "../../config/redis.js";

export class PanicAlarmService {
  /* ============================================
     CREATE SOS FOR SELF
  ============================================ */
  static async createSOSForSelf(data, userId, ipAddress, userAgent) {
    try {
      const coordValidation = validateMansehraCoordinates(
        data.latitude,
        data.longitude,
      );

      if (!coordValidation.valid) {
        throw { status: 400, message: coordValidation.message };
      }

      const recentSOSCount = await PanicAlarmModel.checkRateLimit(userId, 10);

      if (recentSOSCount >= 3) {
        throw {
          status: 429,
          code: "sos/rate-limit",
          message:
            "Too many SOS alarms. Please wait before creating another SOS.",
        };
      }

      const fakeAlarmData =
        await PanicAlarmModel.calculateFakeAlarmScore(userId);

      const sosData = {
        latitude: data.latitude,
        longitude: data.longitude,
        locationAccuracy: data.locationAccuracy,
        sosFor: "self",
        priority: "high",
        fakeAlarmScore: fakeAlarmData.score,
        autoFlagged: fakeAlarmData.autoFlag,
      };

      const sos = await PanicAlarmModel.createSOS(sosData, userId);

      const userQuery = await PanicAlarmModel.getSOSById(sos.id);

      await PanicAlarmModel.insertOutbox("sos_created", {
        sos_id: sos.id,
        user_id: userId,
        user_name: userQuery.user_name,
        user_phone: userQuery.user_phone,
        latitude: sos.latitude,
        longitude: sos.longitude,
        sos_for: "self",
        emergency_type: null,
        status: sos.status,
        created_at: sos.created_at,
      });

      try {
        await redisClient.publish(
          "sos:created",
          JSON.stringify({
            sos_id: sos.id,
            user: {
              id: userId,
              name: userQuery.user_name,
              phone: userQuery.user_phone,
            },
            latitude: sos.latitude,
            longitude: sos.longitude,
            sos_for: "self",
            emergency_type: null,
            status: sos.status,
            created_at: sos.created_at,
          }),
        );
      } catch (redisError) {
        console.error("Redis publish failed (outbox will handle):", redisError);
      }

      this.performReverseGeocoding(sos.id, sos.latitude, sos.longitude);

      await SOSAuditLog.logAction({
        sosId: sos.id,
        userId,
        action: "SOS_CREATED",
        changes: sosData,
        ipAddress,
        userAgent,
      });

      return {
        sosId: sos.id,
        status: sos.status,
        message: "SOS sent successfully. Help is on the way.",
      };
    } catch (error) {
      console.error("Create SOS error:", error);
      throw error;
    }
  }

  /* ============================================
     CREATE SOS FOR OTHER
  ============================================ */
  static async createSOSForOther(data, userId, ipAddress, userAgent) {
    try {
      const validation = validateOtherPersonData(data);
      if (!validation.valid) {
        throw {
          status: 400,
          message: validation.errors.join(", "),
        };
      }

      const coordValidation = validateMansehraCoordinates(
        data.latitude,
        data.longitude,
      );

      if (!coordValidation.valid) {
        throw { status: 400, message: coordValidation.message };
      }

      const recentSOSCount = await PanicAlarmModel.checkRateLimit(userId, 10);

      if (recentSOSCount >= 3) {
        throw {
          status: 429,
          code: "sos/rate-limit",
          message:
            "Too many SOS alarms. Please wait before creating another SOS.",
        };
      }

      const fakeAlarmData =
        await PanicAlarmModel.calculateFakeAlarmScore(userId);

      const sanitizedPhone = sanitizePhoneNumber(data.otherPersonPhone);

      const sosData = {
        latitude: data.latitude,
        longitude: data.longitude,
        locationAccuracy: data.locationAccuracy,
        sosFor: "other",
        otherPersonName: data.otherPersonName,
        otherPersonPhone: sanitizedPhone,
        otherPersonRelation: data.otherPersonRelation,
        priority: determinePriority(data.emergencyType, null),
        fakeAlarmScore: fakeAlarmData.score,
        autoFlagged: fakeAlarmData.autoFlag,
      };

      const sos = await PanicAlarmModel.createSOS(sosData, userId);

      if (data.emergencyType || data.quickNote) {
        await PanicAlarmModel.updateSOSContext(sos.id, {
          emergencyType: data.emergencyType,
          quickNote: data.quickNote,
          estimatedCasualties: data.estimatedCasualties || 1,
          userInjuredLevel: "none",
          canReceiveCall: true,
        });
      }

      const userQuery = await PanicAlarmModel.getSOSById(sos.id);

      await PanicAlarmModel.insertOutbox("sos_created", {
        sos_id: sos.id,
        user_id: userId,
        user_name: userQuery.user_name,
        user_phone: userQuery.user_phone,
        latitude: sos.latitude,
        longitude: sos.longitude,
        sos_for: "other",
        other_person: {
          name: sosData.otherPersonName,
          phone: sosData.otherPersonPhone,
          relation: sosData.otherPersonRelation,
        },
        emergency_type: data.emergencyType,
        status: sos.status,
        created_at: sos.created_at,
      });

      try {
        await redisClient.publish(
          "sos:created",
          JSON.stringify({
            sos_id: sos.id,
            user: {
              id: userId,
              name: userQuery.user_name,
              phone: userQuery.user_phone,
            },
            latitude: sos.latitude,
            longitude: sos.longitude,
            sos_for: "other",
            other_person: {
              name: sosData.otherPersonName,
              phone: sosData.otherPersonPhone,
            },
            emergency_type: data.emergencyType,
            status: sos.status,
            created_at: sos.created_at,
          }),
        );
      } catch (redisError) {
        console.error("Redis publish failed:", redisError);
      }

      this.performReverseGeocoding(sos.id, sos.latitude, sos.longitude);

      await SOSAuditLog.logAction({
        sosId: sos.id,
        userId,
        action: "SOS_CREATED",
        changes: sosData,
        ipAddress,
        userAgent,
      });

      return {
        sosId: sos.id,
        status: sos.status,
        message: "SOS sent successfully. Help is on the way.",
      };
    } catch (error) {
      console.error("Create SOS for other error:", error);
      throw error;
    }
  }

  /* ============================================
     PERFORM REVERSE GEOCODING (Async)
  ============================================ */
  static async performReverseGeocoding(sosId, latitude, longitude) {
    try {
      const address = await reverseGeocode(latitude, longitude);

      if (address) {
        await PanicAlarmModel.updateSOSAddress(sosId, address);

        try {
          await redisClient.publish(
            "sos:address_updated",
            JSON.stringify({
              sos_id: sosId,
              address,
            }),
          );
        } catch (error) {
          console.error("Redis publish address update failed:", error);
        }
      }
    } catch (error) {
      console.error("Reverse geocoding failed for SOS:", sosId, error);
    }
  }

  /* ============================================
     UPDATE SOS CONTEXT
  ============================================ */
  static async updateSOSContext(sosId, context, userId, ipAddress, userAgent) {
    try {
      const sos = await PanicAlarmModel.getSOSById(sosId);

      if (!sos) {
        throw { status: 404, message: "SOS not found" };
      }

      if (sos.user_id !== userId) {
        throw { status: 403, message: "You can only update your own SOS" };
      }

      if (sos.status === "resolved" || sos.status === "cancelled") {
        throw {
          status: 400,
          message: "Cannot update context of resolved/cancelled SOS",
        };
      }

      const updatedSOS = await PanicAlarmModel.updateSOSContext(sosId, context);

      try {
        await redisClient.publish(
          "sos:context_updated",
          JSON.stringify({
            sos_id: sosId,
            emergency_type: context.emergencyType,
            quick_note: context.quickNote,
            estimated_casualties: context.estimatedCasualties,
            user_injured_level: context.userInjuredLevel,
            can_receive_call: context.canReceiveCall,
          }),
        );
      } catch (error) {
        console.error("Redis publish failed:", error);
      }

      await SOSAuditLog.logAction({
        sosId,
        userId,
        action: "CONTEXT_UPDATED",
        changes: context,
        ipAddress,
        userAgent,
      });

      return formatSOSData(updatedSOS, false);
    } catch (error) {
      console.error("Update context error:", error);
      throw error;
    }
  }

  /* ============================================
     GET SOS BY ID
  ============================================ */
  static async getSOSById(sosId, userId, userRole) {
    const sos = await PanicAlarmModel.getSOSById(sosId);

    if (!sos) {
      throw { status: 404, message: "SOS not found" };
    }

    if (userRole === "tourist") {
      if (sos.user_id !== userId) {
        throw { status: 403, message: "Access denied" };
      }
      return formatSOSData(sos, false);
    }

    return formatSOSData(sos, true);
  }

  /* ============================================
     GET USER'S SOS LIST
  ============================================ */
  static async getUserSOSList({ userId, status, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const sosList = await PanicAlarmModel.getUserSOSList({
      userId,
      status,
      limit,
      offset,
    });

    const total = await PanicAlarmModel.countUserSOS({ userId, status });

    return {
      sos: sosList.map(formatSOSListItem),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /* ============================================
     GET ALL SOS (ADMIN)
  ============================================ */
  static async getAllSOS({
    status,
    acknowledgedBy,
    sosFor,
    emergencyType,
    resolutionType,
    sortBy = "created_at",
    order = "desc",
    page = 1,
    limit = 20,
  }) {
    const offset = (page - 1) * limit;

    const sosList = await PanicAlarmModel.getAllSOS({
      status,
      acknowledgedBy,
      sosFor,
      emergencyType,
      resolutionType,
      sortBy,
      order,
      limit,
      offset,
    });

    const total = await PanicAlarmModel.countAllSOS({
      status,
      acknowledgedBy,
      sosFor,
      emergencyType,
      resolutionType,
    });

    return {
      sos: sosList.map(formatSOSListItem),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /* ============================================
     ACKNOWLEDGE SOS (ADMIN)
  ============================================ */
  static async acknowledgeSOS(sosId, adminId, ipAddress, userAgent) {
    try {
      const sos = await PanicAlarmModel.getSOSById(sosId);

      if (!sos) {
        throw { status: 404, message: "SOS not found" };
      }

      if (sos.status !== "created") {
        throw {
          status: 400,
          message: "SOS has already been acknowledged",
        };
      }

      const updatedSOS = await PanicAlarmModel.acknowledgeSOS(sosId, adminId);

      if (!updatedSOS) {
        throw {
          status: 409,
          message: "SOS has been acknowledged by another admin",
        };
      }

      try {
        await redisClient.publish(
          "sos:acknowledged",
          JSON.stringify({
            sos_id: sosId,
            admin_id: adminId,
            user_id: sos.user_id,
            status: "acknowledged",
          }),
        );
      } catch (error) {
        console.error("Redis publish failed:", error);
      }

      await SOSAuditLog.logAction({
        sosId,
        userId: adminId,
        action: "SOS_ACKNOWLEDGED",
        changes: { admin_id: adminId },
        ipAddress,
        userAgent,
      });

      return formatSOSData(updatedSOS, true);
    } catch (error) {
      console.error("Acknowledge SOS error:", error);
      throw error;
    }
  }

  /* ============================================
     UPDATE SOS STATUS (ADMIN)
  ============================================ */
  static async updateSOSStatus(sosId, status, adminId, ipAddress, userAgent) {
    try {
      const sos = await PanicAlarmModel.getSOSById(sosId);

      if (!sos) {
        throw { status: 404, message: "SOS not found" };
      }

      if (sos.acknowledged_by !== adminId) {
        throw {
          status: 403,
          message: "Only the assigned admin can update this SOS",
        };
      }

      const updatedSOS = await PanicAlarmModel.updateSOSStatus(sosId, status);

      try {
        await redisClient.publish(
          "sos:status_updated",
          JSON.stringify({
            sos_id: sosId,
            user_id: sos.user_id,
            status,
          }),
        );
      } catch (error) {
        console.error("Redis publish failed:", error);
      }

      await SOSAuditLog.logAction({
        sosId,
        userId: adminId,
        action: "STATUS_UPDATED",
        changes: { old_status: sos.status, new_status: status },
        ipAddress,
        userAgent,
      });

      return formatSOSData(updatedSOS, true);
    } catch (error) {
      console.error("Update status error:", error);
      throw error;
    }
  }

  /* ============================================
     RESOLVE SOS (ADMIN)
  ============================================ */
  static async resolveSOS(
    sosId,
    resolutionType,
    resolutionNotes,
    adminId,
    ipAddress,
    userAgent,
  ) {
    try {
      const sos = await PanicAlarmModel.getSOSById(sosId);

      if (!sos) {
        throw { status: 404, message: "SOS not found" };
      }

      if (sos.acknowledged_by !== adminId) {
        throw {
          status: 403,
          message: "Only the assigned admin can resolve this SOS",
        };
      }

      const updatedSOS = await PanicAlarmModel.resolveSOS(
        sosId,
        resolutionType,
        resolutionNotes,
      );

      try {
        await redisClient.publish(
          "sos:resolved",
          JSON.stringify({
            sos_id: sosId,
            user_id: sos.user_id,
            resolution_type: resolutionType,
          }),
        );
      } catch (error) {
        console.error("Redis publish failed:", error);
      }

      await SOSAuditLog.logAction({
        sosId,
        userId: adminId,
        action: "SOS_RESOLVED",
        changes: { resolution_type: resolutionType, notes: resolutionNotes },
        ipAddress,
        userAgent,
      });

      return formatSOSData(updatedSOS, true);
    } catch (error) {
      console.error("Resolve SOS error:", error);
      throw error;
    }
  }

  /* ============================================
     GET STATISTICS (SUPER ADMIN)
  ============================================ */
  static async getStatistics({ startDate, endDate, adminId }) {
    const stats = await PanicAlarmModel.getStatistics({
      startDate,
      endDate,
      adminId,
    });

    return {
      total: parseInt(stats.total) || 0,
      resolved: parseInt(stats.resolved) || 0,
      genuine: parseInt(stats.genuine) || 0,
      fake: parseInt(stats.fake) || 0,
      accidental: parseInt(stats.accidental) || 0,
      averageResponseTime: stats.avg_response_time_minutes
        ? parseFloat(stats.avg_response_time_minutes).toFixed(2)
        : null,
    };
  }

  /* ============================================
     GET TOP ADMINS (SUPER ADMIN)
  ============================================ */
  static async getTopAdmins({ startDate, endDate, limit = 10 }) {
    return await PanicAlarmModel.getTopAdmins({ startDate, endDate, limit });
  }

  /* ============================================
     GET AUDIT HISTORY (ADMIN)
  ============================================ */
  static async getSOSAuditHistory(sosId, limit = 50) {
    return await SOSAuditLog.getSOSHistory(sosId, limit);
  }
}
// // src/modules/panicAlarm/panicAlarm.service.js

// import { PanicAlarmModel } from "./panicAlarm.model.js";
// import { SOSAuditLog } from "./panicAlarm.audit.js";
// import {
//   reverseGeocode,
//   validateMansehraCoordinates,
//   formatSOSData,
//   formatSOSListItem,
//   formatMessage,
//   sanitizePhoneNumber,
//   determinePriority,
//   isMessagingAllowed,
//   validateOtherPersonData,
// } from "./panicAlarm.helper.js";
// import redisClient from "../../config/redis.js";

// export class PanicAlarmService {
//   /* ============================================
//      CREATE SOS FOR SELF
//   ============================================ */
//   static async createSOSForSelf(data, userId, ipAddress, userAgent) {
//     try {
//       // 1. Validate coordinates (Mansehra region check)
//       const coordValidation = validateMansehraCoordinates(
//         data.latitude,
//         data.longitude,
//       );

//       if (!coordValidation.valid) {
//         throw { status: 400, message: coordValidation.message };
//       }

//       // 2. Check rate limit (max 3 SOS in 10 minutes)
//       const recentSOSCount = await PanicAlarmModel.checkRateLimit(userId, 10);

//       if (recentSOSCount >= 3) {
//         throw {
//           status: 429,
//           code: "sos/rate-limit",
//           message:
//             "Too many SOS alarms. Please wait before creating another SOS.",
//         };
//       }

//       // 3. Calculate fake alarm score
//       const fakeAlarmData =
//         await PanicAlarmModel.calculateFakeAlarmScore(userId);

//       // 4. Create SOS record
//       const sosData = {
//         latitude: data.latitude,
//         longitude: data.longitude,
//         locationAccuracy: data.locationAccuracy,
//         sosFor: "self",
//         priority: "high",
//         fakeAlarmScore: fakeAlarmData.score,
//         autoFlagged: fakeAlarmData.autoFlag,
//       };

//       const sos = await PanicAlarmModel.createSOS(sosData, userId);

//       // 5. Get user details for notification
//       const userQuery = await PanicAlarmModel.getSOSById(sos.id);

//       // 6. Insert into outbox (guaranteed delivery)
//       await PanicAlarmModel.insertOutbox("sos_created", {
//         sos_id: sos.id,
//         user_id: userId,
//         user_name: userQuery.user_name,
//         user_phone: userQuery.user_phone,
//         latitude: sos.latitude,
//         longitude: sos.longitude,
//         sos_for: "self",
//         emergency_type: null,
//         status: sos.status,
//         created_at: sos.created_at,
//       });

//       // 7. Try Redis publish (fast path - don't wait)
//       try {
//         await redisClient.publish(
//           "sos:created",
//           JSON.stringify({
//             sos_id: sos.id,
//             user: {
//               id: userId,
//               name: userQuery.user_name,
//               phone: userQuery.user_phone,
//             },
//             latitude: sos.latitude,
//             longitude: sos.longitude,
//             sos_for: "self",
//             emergency_type: null,
//             status: sos.status,
//             created_at: sos.created_at,
//           }),
//         );
//       } catch (redisError) {
//         console.error("Redis publish failed (outbox will handle):", redisError);
//       }

//       // 8. Start reverse geocoding async (don't wait)
//       this.performReverseGeocoding(sos.id, sos.latitude, sos.longitude);

//       // 9. Log action
//       await SOSAuditLog.logAction({
//         sosId: sos.id,
//         userId,
//         action: "SOS_CREATED",
//         changes: sosData,
//         ipAddress,
//         userAgent,
//       });

//       // 10. Return response immediately
//       return {
//         sosId: sos.id,
//         status: sos.status,
//         message: "SOS sent successfully. Help is on the way.",
//       };
//     } catch (error) {
//       console.error("Create SOS error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      CREATE SOS FOR OTHER
//   ============================================ */
//   static async createSOSForOther(data, userId, ipAddress, userAgent) {
//     try {
//       // 1. Validate other person data
//       const validation = validateOtherPersonData(data);
//       if (!validation.valid) {
//         throw {
//           status: 400,
//           message: validation.errors.join(", "),
//         };
//       }

//       // 2. Validate coordinates
//       const coordValidation = validateMansehraCoordinates(
//         data.latitude,
//         data.longitude,
//       );

//       if (!coordValidation.valid) {
//         throw { status: 400, message: coordValidation.message };
//       }

//       // 3. Check rate limit
//       const recentSOSCount = await PanicAlarmModel.checkRateLimit(userId, 10);

//       if (recentSOSCount >= 3) {
//         throw {
//           status: 429,
//           code: "sos/rate-limit",
//           message:
//             "Too many SOS alarms. Please wait before creating another SOS.",
//         };
//       }

//       // 4. Calculate fake alarm score
//       const fakeAlarmData =
//         await PanicAlarmModel.calculateFakeAlarmScore(userId);

//       // 5. Sanitize phone
//       const sanitizedPhone = sanitizePhoneNumber(data.otherPersonPhone);

//       // 6. Create SOS record
//       const sosData = {
//         latitude: data.latitude,
//         longitude: data.longitude,
//         locationAccuracy: data.locationAccuracy,
//         sosFor: "other",
//         otherPersonName: data.otherPersonName,
//         otherPersonPhone: sanitizedPhone,
//         otherPersonRelation: data.otherPersonRelation,
//         priority: determinePriority(data.emergencyType, null),
//         fakeAlarmScore: fakeAlarmData.score,
//         autoFlagged: fakeAlarmData.autoFlag,
//       };

//       const sos = await PanicAlarmModel.createSOS(sosData, userId);

//       // 7. If emergency details provided, update immediately
//       if (data.emergencyType || data.quickNote) {
//         await PanicAlarmModel.updateSOSContext(sos.id, {
//           emergencyType: data.emergencyType,
//           quickNote: data.quickNote,
//           estimatedCasualties: data.estimatedCasualties || 1,
//           userInjuredLevel: "none", // Reporter is not injured
//           canReceiveCall: true,
//         });
//       }

//       // 8. Get user details
//       const userQuery = await PanicAlarmModel.getSOSById(sos.id);

//       // 9. Insert into outbox
//       await PanicAlarmModel.insertOutbox("sos_created", {
//         sos_id: sos.id,
//         user_id: userId,
//         user_name: userQuery.user_name,
//         user_phone: userQuery.user_phone,
//         latitude: sos.latitude,
//         longitude: sos.longitude,
//         sos_for: "other",
//         other_person: {
//           name: sosData.otherPersonName,
//           phone: sosData.otherPersonPhone,
//           relation: sosData.otherPersonRelation,
//         },
//         emergency_type: data.emergencyType,
//         status: sos.status,
//         created_at: sos.created_at,
//       });

//       // 10. Try Redis publish
//       try {
//         await redisClient.publish(
//           "sos:created",
//           JSON.stringify({
//             sos_id: sos.id,
//             user: {
//               id: userId,
//               name: userQuery.user_name,
//               phone: userQuery.user_phone,
//             },
//             latitude: sos.latitude,
//             longitude: sos.longitude,
//             sos_for: "other",
//             other_person: {
//               name: sosData.otherPersonName,
//               phone: sosData.otherPersonPhone,
//             },
//             emergency_type: data.emergencyType,
//             status: sos.status,
//             created_at: sos.created_at,
//           }),
//         );
//       } catch (redisError) {
//         console.error("Redis publish failed:", redisError);
//       }

//       // 11. Reverse geocoding async
//       this.performReverseGeocoding(sos.id, sos.latitude, sos.longitude);

//       // 12. Log action
//       await SOSAuditLog.logAction({
//         sosId: sos.id,
//         userId,
//         action: "SOS_CREATED",
//         changes: sosData,
//         ipAddress,
//         userAgent,
//       });

//       return {
//         sosId: sos.id,
//         status: sos.status,
//         message: "SOS sent successfully. Help is on the way.",
//       };
//     } catch (error) {
//       console.error("Create SOS for other error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      PERFORM REVERSE GEOCODING (Async)
//   ============================================ */
//   static async performReverseGeocoding(sosId, latitude, longitude) {
//     try {
//       const address = await reverseGeocode(latitude, longitude);

//       if (address) {
//         await PanicAlarmModel.updateSOSAddress(sosId, address);

//         // Publish update via Redis
//         try {
//           await redisClient.publish(
//             "sos:address_updated",
//             JSON.stringify({
//               sos_id: sosId,
//               address,
//             }),
//           );
//         } catch (error) {
//           console.error("Redis publish address update failed:", error);
//         }
//       }
//     } catch (error) {
//       console.error("Reverse geocoding failed for SOS:", sosId, error);
//       // Don't throw - geocoding failure shouldn't break SOS
//     }
//   }

//   /* ============================================
//      UPDATE SOS CONTEXT (User fills form)
//   ============================================ */
//   static async updateSOSContext(sosId, context, userId, ipAddress, userAgent) {
//     try {
//       const sos = await PanicAlarmModel.getSOSById(sosId);

//       if (!sos) {
//         throw { status: 404, message: "SOS not found" };
//       }

//       // Only the SOS creator can update context
//       if (sos.user_id !== userId) {
//         throw { status: 403, message: "You can only update your own SOS" };
//       }

//       // Can only update if not resolved
//       if (sos.status === "resolved" || sos.status === "cancelled") {
//         throw {
//           status: 400,
//           message: "Cannot update context of resolved/cancelled SOS",
//         };
//       }

//       const updatedSOS = await PanicAlarmModel.updateSOSContext(sosId, context);

//       // Publish update
//       try {
//         await redisClient.publish(
//           "sos:context_updated",
//           JSON.stringify({
//             sos_id: sosId,
//             emergency_type: context.emergencyType,
//             quick_note: context.quickNote,
//             estimated_casualties: context.estimatedCasualties,
//             user_injured_level: context.userInjuredLevel,
//             can_receive_call: context.canReceiveCall,
//           }),
//         );
//       } catch (error) {
//         console.error("Redis publish failed:", error);
//       }

//       // Log action
//       await SOSAuditLog.logAction({
//         sosId,
//         userId,
//         action: "CONTEXT_UPDATED",
//         changes: context,
//         ipAddress,
//         userAgent,
//       });

//       return formatSOSData(updatedSOS, false);
//     } catch (error) {
//       console.error("Update context error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      GET SOS BY ID
//   ============================================ */
//   static async getSOSById(sosId, userId, userRole) {
//     const sos = await PanicAlarmModel.getSOSById(sosId);

//     if (!sos) {
//       throw { status: 404, message: "SOS not found" };
//     }

//     // Check permissions
//     if (userRole === "tourist") {
//       // Users can only see their own SOS
//       if (sos.user_id !== userId) {
//         throw { status: 403, message: "Access denied" };
//       }
//       return formatSOSData(sos, false);
//     }

//     // Admin/Police can see all details
//     return formatSOSData(sos, true);
//   }

//   /* ============================================
//      GET USER'S SOS LIST
//   ============================================ */
//   static async getUserSOSList({ userId, status, page = 1, limit = 20 }) {
//     const offset = (page - 1) * limit;

//     const sosList = await PanicAlarmModel.getUserSOSList({
//       userId,
//       status,
//       limit,
//       offset,
//     });

//     const total = await PanicAlarmModel.countUserSOS({ userId, status });

//     return {
//       sos: sosList.map(formatSOSListItem),
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//     };
//   }

//   /* ============================================
//      GET ALL SOS (ADMIN)
//   ============================================ */
//   static async getAllSOS({
//     status,
//     acknowledgedBy,
//     sosFor,
//     emergencyType,
//     resolutionType,
//     sortBy = "created_at",
//     order = "desc",
//     page = 1,
//     limit = 20,
//   }) {
//     const offset = (page - 1) * limit;

//     const sosList = await PanicAlarmModel.getAllSOS({
//       status,
//       acknowledgedBy,
//       sosFor,
//       emergencyType,
//       resolutionType,
//       sortBy,
//       order,
//       limit,
//       offset,
//     });

//     const total = await PanicAlarmModel.countAllSOS({
//       status,
//       acknowledgedBy,
//       sosFor,
//       emergencyType,
//       resolutionType,
//     });

//     return {
//       sos: sosList.map(formatSOSListItem),
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//     };
//   }

//   /* ============================================
//      ACKNOWLEDGE SOS (ADMIN)
//   ============================================ */
//   static async acknowledgeSOS(sosId, adminId, ipAddress, userAgent) {
//     try {
//       const sos = await PanicAlarmModel.getSOSById(sosId);

//       if (!sos) {
//         throw { status: 404, message: "SOS not found" };
//       }

//       if (sos.status !== "created") {
//         throw {
//           status: 400,
//           message: "SOS has already been acknowledged",
//         };
//       }

//       // Atomic claim
//       const updatedSOS = await PanicAlarmModel.acknowledgeSOS(sosId, adminId);

//       if (!updatedSOS) {
//         throw {
//           status: 409,
//           message: "SOS has been acknowledged by another admin",
//         };
//       }

//       // Publish update
//       try {
//         await redisClient.publish(
//           "sos:acknowledged",
//           JSON.stringify({
//             sos_id: sosId,
//             admin_id: adminId,
//             user_id: sos.user_id,
//             status: "acknowledged",
//           }),
//         );
//       } catch (error) {
//         console.error("Redis publish failed:", error);
//       }

//       // Log action
//       await SOSAuditLog.logAction({
//         sosId,
//         userId: adminId,
//         action: "SOS_ACKNOWLEDGED",
//         changes: { admin_id: adminId },
//         ipAddress,
//         userAgent,
//       });

//       return formatSOSData(updatedSOS, true);
//     } catch (error) {
//       console.error("Acknowledge SOS error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      UPDATE SOS STATUS (ADMIN)
//   ============================================ */
//   static async updateSOSStatus(sosId, status, adminId, ipAddress, userAgent) {
//     try {
//       const sos = await PanicAlarmModel.getSOSById(sosId);

//       if (!sos) {
//         throw { status: 404, message: "SOS not found" };
//       }

//       // Only assigned admin can update status
//       if (sos.acknowledged_by !== adminId) {
//         throw {
//           status: 403,
//           message: "Only the assigned admin can update this SOS",
//         };
//       }

//       const updatedSOS = await PanicAlarmModel.updateSOSStatus(sosId, status);

//       // Publish update
//       try {
//         await redisClient.publish(
//           "sos:status_updated",
//           JSON.stringify({
//             sos_id: sosId,
//             user_id: sos.user_id,
//             status,
//           }),
//         );
//       } catch (error) {
//         console.error("Redis publish failed:", error);
//       }

//       // Log action
//       await SOSAuditLog.logAction({
//         sosId,
//         userId: adminId,
//         action: "STATUS_UPDATED",
//         changes: { old_status: sos.status, new_status: status },
//         ipAddress,
//         userAgent,
//       });

//       return formatSOSData(updatedSOS, true);
//     } catch (error) {
//       console.error("Update status error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      RESOLVE SOS (ADMIN)
//   ============================================ */
//   static async resolveSOS(
//     sosId,
//     resolutionType,
//     resolutionNotes,
//     adminId,
//     ipAddress,
//     userAgent,
//   ) {
//     try {
//       const sos = await PanicAlarmModel.getSOSById(sosId);

//       if (!sos) {
//         throw { status: 404, message: "SOS not found" };
//       }

//       // Only assigned admin can resolve
//       if (sos.acknowledged_by !== adminId) {
//         throw {
//           status: 403,
//           message: "Only the assigned admin can resolve this SOS",
//         };
//       }

//       const updatedSOS = await PanicAlarmModel.resolveSOS(
//         sosId,
//         resolutionType,
//         resolutionNotes,
//       );

//       // Publish update
//       try {
//         await redisClient.publish(
//           "sos:resolved",
//           JSON.stringify({
//             sos_id: sosId,
//             user_id: sos.user_id,
//             resolution_type: resolutionType,
//           }),
//         );
//       } catch (error) {
//         console.error("Redis publish failed:", error);
//       }

//       // Log action
//       await SOSAuditLog.logAction({
//         sosId,
//         userId: adminId,
//         action: "SOS_RESOLVED",
//         changes: { resolution_type: resolutionType, notes: resolutionNotes },
//         ipAddress,
//         userAgent,
//       });

//       return formatSOSData(updatedSOS, true);
//     } catch (error) {
//       console.error("Resolve SOS error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      SEND MESSAGE
//   ============================================ */
//   static async sendMessage(sosId, senderId, senderType, message) {
//     try {
//       const sos = await PanicAlarmModel.getSOSById(sosId);

//       if (!sos) {
//         throw { status: 404, message: "SOS not found" };
//       }

//       // Check if messaging is allowed
//       if (!isMessagingAllowed(sos.status)) {
//         throw {
//           status: 400,
//           message: "Messaging is not allowed for this SOS status",
//         };
//       }

//       // Verify sender permissions
//       if (senderType === "user" && sos.user_id !== senderId) {
//         throw { status: 403, message: "Access denied" };
//       }

//       if (senderType === "admin" && sos.acknowledged_by !== senderId) {
//         throw {
//           status: 403,
//           message: "Only the assigned admin can send messages",
//         };
//       }

//       const messageRecord = await PanicAlarmModel.createMessage(
//         sosId,
//         senderId,
//         senderType,
//         message,
//       );

//       // Get sender name
//       const fullMessage = await PanicAlarmModel.getMessages(sosId, 1, 0);

//       // Publish via Redis
//       try {
//         const recipientId =
//           senderType === "user" ? sos.acknowledged_by : sos.user_id;

//         await redisClient.publish(
//           "sos:new_message",
//           JSON.stringify({
//             sos_id: sosId,
//             message_id: messageRecord.id,
//             sender_id: senderId,
//             sender_type: senderType,
//             sender_name: fullMessage[0].sender_name,
//             message,
//             recipient_id: recipientId,
//             created_at: messageRecord.created_at,
//           }),
//         );
//       } catch (error) {
//         console.error("Redis publish failed:", error);
//       }

//       return formatMessage(fullMessage[0]);
//     } catch (error) {
//       console.error("Send message error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      GET MESSAGES
//   ============================================ */
//   static async getMessages(sosId, userId, userRole, page = 1, limit = 50) {
//     const sos = await PanicAlarmModel.getSOSById(sosId);

//     if (!sos) {
//       throw { status: 404, message: "SOS not found" };
//     }

//     // Check permissions
//     if (userRole === "tourist" && sos.user_id !== userId) {
//       throw { status: 403, message: "Access denied" };
//     }

//     if (
//       userRole !== "tourist" &&
//       userRole !== "superadmin" &&
//       sos.acknowledged_by !== userId
//     ) {
//       throw { status: 403, message: "Access denied" };
//     }

//     const offset = (page - 1) * limit;
//     const messages = await PanicAlarmModel.getMessages(sosId, limit, offset);

//     // Mark messages as read
//     await PanicAlarmModel.markMessagesAsRead(sosId, userId);

//     return messages.map(formatMessage);
//   }

//   /* ============================================
//      GET STATISTICS (SUPER ADMIN)
//   ============================================ */
//   static async getStatistics({ startDate, endDate, adminId }) {
//     const stats = await PanicAlarmModel.getStatistics({
//       startDate,
//       endDate,
//       adminId,
//     });

//     return {
//       total: parseInt(stats.total) || 0,
//       resolved: parseInt(stats.resolved) || 0,
//       genuine: parseInt(stats.genuine) || 0,
//       fake: parseInt(stats.fake) || 0,
//       accidental: parseInt(stats.accidental) || 0,
//       averageResponseTime: stats.avg_response_time_minutes
//         ? parseFloat(stats.avg_response_time_minutes).toFixed(2)
//         : null,
//     };
//   }

//   /* ============================================
//      GET TOP ADMINS (SUPER ADMIN)
//   ============================================ */
//   static async getTopAdmins({ startDate, endDate, limit = 10 }) {
//     return await PanicAlarmModel.getTopAdmins({ startDate, endDate, limit });
//   }

//   /* ============================================
//      GET AUDIT HISTORY (ADMIN)
//   ============================================ */
//   static async getSOSAuditHistory(sosId, limit = 50) {
//     return await SOSAuditLog.getSOSHistory(sosId, limit);
//   }
// }

// // import PanicAlarmModel from "./panicAlarm.model.js";
// // import PanicAlarmHelper from "./panicAlarm.helper.js";
// // import OutboxService from "../shared/outbox.service.js";
// // import RedisService from "../shared/redis.service.js";
// // import NotificationService from "../notification/notification.service.js";
// // import db from "../../config/database.js";

// // /* ============================================
// //    PANIC ALARM SERVICE
// // ============================================ */
// // export const PanicAlarmService = {
// //   /* ============================================
// //      CREATE SOS FOR SELF
// //   ============================================ */
// //   async createSOSSelf(userId, sosData) {
// //     const { latitude, longitude, location_accuracy } = sosData;

// //     // Validate location
// //     if (!PanicAlarmHelper.isLocationInMansehra(latitude, longitude)) {
// //       const detectedLocation = await PanicAlarmHelper.reverseGeocode(
// //         latitude,
// //         longitude,
// //       );
// //       throw {
// //         status: 403,
// //         message: "SOS service is only available in Mansehra district",
// //         data: {
// //           user_location: {
// //             latitude,
// //             longitude,
// //             detected_area: detectedLocation || "Unknown location",
// //           },
// //           service_area: "Mansehra District, Khyber Pakhtunkhwa",
// //           emergency_numbers: { police: "15", rescue: "1122" },
// //         },
// //       };
// //     }

// //     // Rate limiting
// //     const rateLimitKey = `sos:rate_limit:${userId}`;
// //     const recentCount = await RedisService.checkRateLimit(
// //       rateLimitKey,
// //       10 * 60,
// //       3,
// //     );
// //     if (recentCount > 3) {
// //       throw {
// //         status: 429,
// //         message: "You have sent too many SOS alarms recently",
// //         data: { retry_after: 600 },
// //       };
// //     }

// //     // Fake alarm score
// //     const recentSOSCount = await PanicAlarmModel.countRecentByUser(userId, 10);
// //     const historicalFakeCount = 0; // TODO: implement historical
// //     const fakeAlarmScore = PanicAlarmHelper.calculateFakeAlarmScore(
// //       recentSOSCount,
// //       historicalFakeCount,
// //     );
// //     const autoFlagged = fakeAlarmScore > 0.6;

// //     // Create SOS record
// //     const sos = await PanicAlarmModel.create({
// //       userId,
// //       latitude,
// //       longitude,
// //       locationAccuracy: location_accuracy,
// //       sosFor: "self",
// //       fakeAlarmScore,
// //       autoFlagged,
// //     });

// //     // Outbox & Redis
// //     await OutboxService.create({
// //       eventType: "sos_created",
// //       payload: {
// //         sos_id: sos.id,
// //         user_id: userId,
// //         latitude,
// //         longitude,
// //         sos_for: "self",
// //         fake_alarm_score: fakeAlarmScore,
// //         auto_flagged: autoFlagged,
// //       },
// //     });

// //     try {
// //       await RedisService.publish("sos:created", {
// //         sos_id: sos.id,
// //         user_id: userId,
// //         latitude,
// //         longitude,
// //         sos_for: "self",
// //         status: "created",
// //         fake_alarm_score: fakeAlarmScore,
// //         auto_flagged: autoFlagged,
// //       });
// //     } catch (err) {
// //       console.error("Redis publish failed, outbox will handle:", err.message);
// //     }

// //     // Notification
// //     await NotificationService.createNotification({
// //       userId,
// //       type: "sos_status",
// //       category: "sos",
// //       title: "SOS Sent",
// //       body: "Your SOS has been sent to police. Help is on the way.",
// //       sosId: sos.id,
// //     });

// //     // Async reverse geocoding
// //     performReverseGeocodingAsync(sos.id, latitude, longitude);

// //     return {
// //       sos_id: sos.id,
// //       status: "created",
// //       message: "SOS sent successfully",
// //     };
// //   },

// //   /* ============================================
// //      CREATE SOS FOR THIRD PARTY
// //   ============================================ */
// //   async createSOSThirdParty(userId, sosData) {
// //     const {
// //       latitude,
// //       longitude,
// //       location_accuracy,
// //       emergency_type,
// //       quick_note,
// //       estimated_casualties,
// //       visible_injuries,
// //     } = sosData;

// //     // Validate location
// //     if (!PanicAlarmHelper.isLocationInMansehra(latitude, longitude)) {
// //       throw {
// //         status: 403,
// //         message: "SOS service is only available in Mansehra district",
// //       };
// //     }

// //     // Rate limiting
// //     const rateLimitKey = `sos:rate_limit:${userId}`;
// //     const recentCount = await RedisService.checkRateLimit(
// //       rateLimitKey,
// //       10 * 60,
// //       3,
// //     );
// //     if (recentCount > 3) {
// //       throw {
// //         status: 429,
// //         message: "You have sent too many SOS reports recently",
// //       };
// //     }

// //     // Create SOS
// //     const sos = await PanicAlarmModel.create({
// //       userId,
// //       latitude,
// //       longitude,
// //       locationAccuracy: location_accuracy,
// //       sosFor: "third_party",
// //       emergencyType: emergency_type,
// //       quickNote: quick_note,
// //       estimatedCasualties: estimated_casualties,
// //       visibleInjuries: visible_injuries,
// //     });

// //     // Outbox & Redis
// //     await OutboxService.create({
// //       eventType: "sos_created",
// //       payload: {
// //         sos_id: sos.id,
// //         user_id: userId,
// //         latitude,
// //         longitude,
// //         sos_for: "third_party",
// //         emergency_type,
// //         quick_note,
// //         estimated_casualties,
// //       },
// //     });

// //     try {
// //       await RedisService.publish("sos:created", {
// //         sos_id: sos.id,
// //         user_id: userId,
// //         latitude,
// //         longitude,
// //         sos_for: "third_party",
// //         emergency_type,
// //         quick_note,
// //         estimated_casualties,
// //         status: "created",
// //       });
// //     } catch (err) {
// //       console.error("Redis publish failed:", err.message);
// //     }

// //     // Notification
// //     await NotificationService.createNotification({
// //       userId,
// //       type: "sos_status",
// //       category: "sos",
// //       title: "SOS Report Sent",
// //       body: "Your emergency report has been sent to police.",
// //       sosId: sos.id,
// //     });

// //     // Async reverse geocoding
// //     performReverseGeocodingAsync(sos.id, latitude, longitude);

// //     return {
// //       sos_id: sos.id,
// //       status: "created",
// //       message: "SOS report sent successfully",
// //     };
// //   },

// //   /* ============================================
// //      UPDATE SOS CONTEXT
// //   ============================================ */
// //   async updateContext(sosId, userId, contextData) {
// //     const sos = await PanicAlarmModel.findById(sosId);
// //     if (!sos) throw { status: 404, message: "SOS not found" };
// //     if (sos.user_id !== userId)
// //       throw { status: 403, message: "Not authorized to update this SOS" };

// //     await PanicAlarmModel.updateContext(sosId, contextData);

// //     try {
// //       await RedisService.publish("sos:updated", {
// //         sos_id: sosId,
// //         emergency_type: contextData.emergency_type,
// //         quick_note: contextData.quick_note,
// //         estimated_casualties: contextData.estimated_casualties,
// //         user_injured_level: contextData.user_injured_level,
// //         can_receive_call: contextData.can_receive_call,
// //       });
// //     } catch (err) {
// //       console.error("Redis publish failed:", err.message);
// //     }

// //     return { status: "updated", message: "Context updated successfully" };
// //   },

// //   /* ============================================
// //      GET USER'S SOS LIST
// //   ============================================ */
// //   async getUserSOSList(userId, filter = "all") {
// //     return await PanicAlarmModel.findByUser(userId, filter);
// //   },

// //   /* ============================================
// //      GET SOS DETAIL
// //   ============================================ */
// //   async getSOSDetail(sosId, userId) {
// //     const sos = await PanicAlarmModel.findById(sosId);
// //     if (!sos) throw { status: 404, message: "SOS not found" };
// //     if (sos.user_id !== userId)
// //       throw { status: 403, message: "Not authorized to view this SOS" };

// //     const timeline = PanicAlarmHelper.buildTimeline(sos);
// //     const messageStats = await db.query(
// //       `
// //       SELECT
// //         COUNT(*) as total,
// //         COUNT(*) FILTER (WHERE is_read = FALSE AND sender_type = 'admin') as unread
// //       FROM messages
// //       WHERE sos_id = $1
// //       `,
// //       [sosId],
// //     );

// //     return { sos, timeline, message_stats: messageStats.rows[0] };
// //   },
// // };

// // /* ============================================
// //    PRIVATE: ASYNC REVERSE GEOCODING
// // ============================================ */
// // async function performReverseGeocodingAsync(sosId, latitude, longitude) {
// //   try {
// //     const address = await PanicAlarmHelper.reverseGeocode(latitude, longitude);
// //     if (address) {
// //       await PanicAlarmModel.updateAddress(sosId, address);
// //       await RedisService.publish("sos:address_updated", {
// //         sos_id: sosId,
// //         address,
// //       });
// //     }
// //   } catch (err) {
// //     console.error("Reverse geocoding failed:", err.message);
// //   }
// // }
