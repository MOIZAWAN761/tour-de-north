// src/modules/panicAlarm/police/panicAlarm.police.controller.js

import { PanicAlarmService } from "../panicAlarm.service.js";

export const PanicAlarmPoliceController = {
  /* ============================================
     GET ALL SOS (ADMIN/POLICE)
  ============================================ */
  async getAllSOS(req, res, next) {
    try {
      const {
        status,
        acknowledgedBy,
        sosFor,
        emergencyType,
        resolutionType,
        sortBy = "created_at",
        order = "desc",
        page = 1,
        limit = 20,
      } = req.query;

      const result = await PanicAlarmService.getAllSOS({
        status,
        acknowledgedBy: acknowledgedBy ? parseInt(acknowledgedBy) : null,
        sosFor,
        emergencyType,
        resolutionType,
        sortBy,
        order,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      return res.status(200).json({
        success: true,
        data: result.sos,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET SOS BY ID (ADMIN/POLICE)
  ============================================ */
  async getSOSById(req, res, next) {
    try {
      const { sosId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const sos = await PanicAlarmService.getSOSById(
        parseInt(sosId),
        userId,
        userRole,
      );

      return res.status(200).json({
        success: true,
        data: sos,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     ACKNOWLEDGE SOS (ADMIN/POLICE)
  ============================================ */
  async acknowledgeSOS(req, res, next) {
    try {
      const { sosId } = req.params;
      const adminId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const sos = await PanicAlarmService.acknowledgeSOS(
        parseInt(sosId),
        adminId,
        ipAddress,
        userAgent,
      );

      return res.status(200).json({
        success: true,
        message: "SOS acknowledged successfully",
        data: sos,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     UPDATE SOS STATUS (ADMIN/POLICE)
  ============================================ */
  async updateSOSStatus(req, res, next) {
    try {
      const { sosId } = req.params;
      const { status } = req.body;
      const adminId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const sos = await PanicAlarmService.updateSOSStatus(
        parseInt(sosId),
        status,
        adminId,
        ipAddress,
        userAgent,
      );

      return res.status(200).json({
        success: true,
        message: `SOS status updated to ${status}`,
        data: sos,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     RESOLVE SOS (ADMIN/POLICE)
  ============================================ */
  async resolveSOS(req, res, next) {
    try {
      const { sosId } = req.params;
      const { resolutionType, resolutionNotes } = req.body;
      const adminId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const sos = await PanicAlarmService.resolveSOS(
        parseInt(sosId),
        resolutionType,
        resolutionNotes,
        adminId,
        ipAddress,
        userAgent,
      );

      return res.status(200).json({
        success: true,
        message: "SOS resolved successfully",
        data: sos,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     SEND MESSAGE (ADMIN/POLICE)
  ============================================ */
  async sendMessage(req, res, next) {
    try {
      const { sosId } = req.params;
      const adminId = req.user.id;
      const { message } = req.body;

      const messageData = await PanicAlarmService.sendMessage(
        parseInt(sosId),
        adminId,
        "admin",
        message,
      );

      return res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: messageData,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET MESSAGES (ADMIN/POLICE)
  ============================================ */
  async getMessages(req, res, next) {
    try {
      const { sosId } = req.params;
      const adminId = req.user.id;
      const userRole = req.user.role;
      const { page = 1, limit = 50 } = req.query;

      const messages = await PanicAlarmService.getMessages(
        parseInt(sosId),
        adminId,
        userRole,
        parseInt(page),
        parseInt(limit),
      );

      return res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET STATISTICS (SUPER ADMIN)
  ============================================ */
  async getStatistics(req, res, next) {
    try {
      const { startDate, endDate, adminId } = req.query;

      const stats = await PanicAlarmService.getStatistics({
        startDate: startDate || null,
        endDate: endDate || null,
        adminId: adminId ? parseInt(adminId) : null,
      });

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET TOP ADMINS (SUPER ADMIN)
  ============================================ */
  async getTopAdmins(req, res, next) {
    try {
      const { startDate, endDate, limit = 10 } = req.query;

      const admins = await PanicAlarmService.getTopAdmins({
        startDate: startDate || null,
        endDate: endDate || null,
        limit: parseInt(limit),
      });

      return res.status(200).json({
        success: true,
        data: admins,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET AUDIT HISTORY (ADMIN)
  ============================================ */
  async getAuditHistory(req, res, next) {
    try {
      const { sosId } = req.params;
      const { limit = 50 } = req.query;

      const history = await PanicAlarmService.getSOSAuditHistory(
        parseInt(sosId),
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

// // src/modules/panicAlarm/police/panicAlarm.police.controller.js

// import PanicAlarmModel from "../panicAlarm.model.js";
// import PanicAlarmHelper from "../panicAlarm.helper.js";
// import NotificationService from "../../notification/notification.service.js";
// import MessageService from "../../message/message.service.js";
// import RedisService from "../../shared/redis.service.js";
// import UserService from "../../user/user.service.js";

// export const PolicePanicAlarmController = {
//   /* ============================================
//      GET ALL SOS (ADMIN/POLICE)
//   ============================================ */
//   async getSOSList(req, res, next) {
//     try {
//       const { filter = "all" } = req.query;
//       const adminId = req.user.id;

//       const sosList = await PanicAlarmModel.findForAdmin(filter, adminId);

//       return res.status(200).json({
//         success: true,
//         data: { sos_list: sosList, filter },
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      GET SOS DETAIL
//   ============================================ */
//   async getSOSDetail(req, res, next) {
//     try {
//       const { sosId } = req.params;

//       const sos = await PanicAlarmModel.findById(parseInt(sosId));
//       if (!sos)
//         return res
//           .status(404)
//           .json({ success: false, message: "SOS not found" });

//       const timeline = PanicAlarmHelper.buildTimeline(sos);
//       const messageCount = await MessageService.getMessageCount(
//         parseInt(sosId),
//       );

//       return res.status(200).json({
//         success: true,
//         data: { sos, timeline, message_count: messageCount },
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      GET FULL USER DETAILS FOR SOS
//   ============================================ */
//   async getFullUserDetails(req, res, next) {
//     try {
//       const { sosId } = req.params;

//       const sos = await PanicAlarmModel.findById(parseInt(sosId));
//       if (!sos)
//         return res
//           .status(404)
//           .json({ success: false, message: "SOS not found" });

//       const userProfile = await UserService.getFullProfile(sos.user_id);

//       return res.status(200).json({
//         success: true,
//         data: { user: userProfile },
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      ACKNOWLEDGE SOS
//   ============================================ */
//   async acknowledgeSOS(req, res, next) {
//     try {
//       const { sosId } = req.params;
//       const adminId = req.user.id;

//       const sos = await PanicAlarmModel.acknowledge(parseInt(sosId), adminId);
//       if (!sos) {
//         return res.status(409).json({
//           success: false,
//           message: "This SOS has already been acknowledged by another admin",
//         });
//       }

//       const admin = await UserService.getBasicProfile(adminId);

//       await NotificationService.createNotification({
//         userId: sos.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: `SOS Update — #${sosId}`,
//         body: `Officer ${admin.name} acknowledged your SOS`,
//         sosId: parseInt(sosId),
//       });

//       await NotificationService.sendPushNotification(sos.user_id, {
//         title: "Police Acknowledged",
//         body: `Officer ${admin.name} acknowledged your SOS`,
//         data: { type: "sos_status", sos_id: sosId.toString() },
//       });

//       await RedisService.publish("sos:claimed", {
//         sos_id: parseInt(sosId),
//         claimed_by: admin.name,
//       });

//       return res.status(200).json({
//         success: true,
//         message: "SOS acknowledged successfully",
//         data: { sos_id: sos.id, status: "acknowledged" },
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      UPDATE SOS STATUS
//   ============================================ */
//   async updateStatus(req, res, next) {
//     try {
//       const { sosId } = req.params;
//       const { status } = req.body;
//       const adminId = req.user.id;

//       const sos = await PanicAlarmModel.findById(parseInt(sosId));
//       if (!sos)
//         return res
//           .status(404)
//           .json({ success: false, message: "SOS not found" });
//       if (sos.acknowledged_by !== adminId)
//         return res
//           .status(403)
//           .json({
//             success: false,
//             message: "Not authorized to update this SOS",
//           });

//       const updated = await PanicAlarmModel.updateStatus(
//         parseInt(sosId),
//         status,
//       );

//       const statusMessages = {
//         responding: "Officer is responding to your emergency",
//       };
//       if (statusMessages[status]) {
//         await NotificationService.createNotification({
//           userId: sos.user_id,
//           type: "sos_status",
//           category: "sos",
//           title: `SOS Update — #${sosId}`,
//           body: statusMessages[status],
//           sosId: parseInt(sosId),
//         });

//         await NotificationService.sendPushNotification(sos.user_id, {
//           title: "SOS Status Updated",
//           body: statusMessages[status],
//           data: { type: "sos_status", sos_id: sosId.toString() },
//         });
//       }

//       return res.status(200).json({
//         success: true,
//         message: "Status updated successfully",
//         data: { status: updated.status },
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      RESOLVE SOS
//   ============================================ */
//   async resolveSOS(req, res, next) {
//     try {
//       const { sosId } = req.params;
//       const { resolution_type, resolution_notes } = req.validatedData;
//       const adminId = req.user.id;

//       const sos = await PanicAlarmModel.findById(parseInt(sosId));
//       if (!sos)
//         return res
//           .status(404)
//           .json({ success: false, message: "SOS not found" });
//       if (sos.acknowledged_by !== adminId)
//         return res
//           .status(403)
//           .json({
//             success: false,
//             message: "Not authorized to resolve this SOS",
//           });

//       const resolved = await PanicAlarmModel.resolve(parseInt(sosId), {
//         resolutionType: resolution_type,
//         resolutionNotes: resolution_notes,
//       });

//       const resolutionMessages = {
//         genuine_emergency:
//           "Your SOS has been resolved. Emergency assistance was provided.",
//         accidental: "Your SOS was marked as accidental.",
//         false_alarm: "Your SOS was marked as a false alarm.",
//       };

//       await NotificationService.createNotification({
//         userId: sos.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: `SOS Resolved — #${sosId}`,
//         body: resolutionMessages[resolution_type],
//         sosId: parseInt(sosId),
//         data: { resolution_type, resolution_notes },
//       });

//       await NotificationService.sendPushNotification(sos.user_id, {
//         title: "SOS Resolved",
//         body: resolutionMessages[resolution_type],
//         data: { type: "sos_status", sos_id: sosId.toString() },
//       });

//       if (resolution_type === "false_alarm") {
//         await UserService.incrementFakeAlarmCount(sos.user_id);
//       }

//       return res.status(200).json({
//         success: true,
//         message: "SOS resolved successfully",
//         data: { status: "resolved", resolution_type },
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      GET SOS MESSAGES
//   ============================================ */
//   async getSOSMessages(req, res, next) {
//     try {
//       const { sosId } = req.params;
//       const adminId = req.user.id;

//       const messages = await MessageService.getMessagesBySOS(
//         parseInt(sosId),
//         adminId,
//         "admin",
//       );

//       return res.status(200).json({ success: true, data: { messages } });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      SEND MESSAGE
//   ============================================ */
//   async sendMessage(req, res, next) {
//     try {
//       const { sosId } = req.params;
//       const adminId = req.user.id;
//       const { message } = req.body;

//       const sos = await PanicAlarmModel.findById(parseInt(sosId));
//       if (!sos || sos.acknowledged_by !== adminId)
//         return res
//           .status(403)
//           .json({
//             success: false,
//             message: "Not authorized to message this SOS",
//           });

//       const result = await MessageService.sendMessage({
//         sosId: parseInt(sosId),
//         senderId: adminId,
//         senderType: "admin",
//         message,
//       });

//       return res
//         .status(201)
//         .json({
//           success: true,
//           message: "Message sent successfully",
//           data: result,
//         });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      GET SOS STATISTICS
//   ============================================ */
//   async getStatistics(req, res, next) {
//     try {
//       const { year, month } = req.validatedData;

//       const stats = await PanicAlarmModel.getStatistics({ year, month });
//       const adminPerformance = await PanicAlarmModel.getAdminPerformance(year);

//       return res
//         .status(200)
//         .json({
//           success: true,
//           data: { statistics: stats, admin_performance: adminPerformance },
//         });
//     } catch (error) {
//       next(error);
//     }
//   },
// };
