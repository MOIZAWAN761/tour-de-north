// src/modules/panicAlarm/public/panicAlarm.public.controller.js

import { PanicAlarmService } from "../panicAlarm.service.js";

export const PanicAlarmPublicController = {
  /* ============================================
     CREATE SOS FOR SELF
  ============================================ */
  async createSOSForSelf(req, res, next) {
    try {
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const result = await PanicAlarmService.createSOSForSelf(
        req.body,
        userId,
        ipAddress,
        userAgent,
      );

      return res.status(201).json({
        success: true,
        message: result.message,
        data: {
          sosId: result.sosId,
          status: result.status,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     CREATE SOS FOR OTHER
  ============================================ */
  async createSOSForOther(req, res, next) {
    try {
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const result = await PanicAlarmService.createSOSForOther(
        req.body,
        userId,
        ipAddress,
        userAgent,
      );

      return res.status(201).json({
        success: true,
        message: result.message,
        data: {
          sosId: result.sosId,
          status: result.status,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     UPDATE SOS CONTEXT
  ============================================ */
  async updateSOSContext(req, res, next) {
    try {
      const { sosId } = req.params;
      const userId = req.user.id;
      const ipAddress =
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const sos = await PanicAlarmService.updateSOSContext(
        parseInt(sosId),
        req.body,
        userId,
        ipAddress,
        userAgent,
      );

      return res.status(200).json({
        success: true,
        message: "SOS context updated successfully",
        data: sos,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ============================================
     GET SOS BY ID
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
     GET MY SOS LIST
  ============================================ */
  async getMySOSList(req, res, next) {
    try {
      const userId = req.user.id;
      const { status, page = 1, limit = 20 } = req.query;

      const result = await PanicAlarmService.getUserSOSList({
        userId,
        status,
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
     SEND MESSAGE
  ============================================ */
  async sendMessage(req, res, next) {
    try {
      const { sosId } = req.params;
      const userId = req.user.id;
      const { message } = req.body;

      const messageData = await PanicAlarmService.sendMessage(
        parseInt(sosId),
        userId,
        "user",
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
     GET MESSAGES
  ============================================ */
  async getMessages(req, res, next) {
    try {
      const { sosId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const { page = 1, limit = 50 } = req.query;

      const messages = await PanicAlarmService.getMessages(
        parseInt(sosId),
        userId,
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
};











// import { PanicAlarmService } from "../panicAlarm.service.js";
// import { MessageService } from "../../message/message.service.js";

// export const PublicPanicAlarmController = {
//   /* ============================================
//      CREATE SOS FOR SELF
//   ============================================ */
//   async createSOSSelf(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const sosData = req.validatedData;

//       const result = await PanicAlarmService.createSOSSelf(userId, sosData);

//       return res.status(200).json({
//         success: true,
//         message: "SOS sent successfully",
//         data: result,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      CREATE SOS FOR THIRD PARTY
//   ============================================ */
//   async createSOSThirdParty(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const sosData = req.validatedData;

//       const result = await PanicAlarmService.createSOSThirdParty(
//         userId,
//         sosData,
//       );

//       return res.status(200).json({
//         success: true,
//         message: "SOS report sent successfully",
//         data: result,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      UPDATE SOS CONTEXT
//   ============================================ */
//   async updateContext(req, res, next) {
//     try {
//       const { id } = req.params;
//       const userId = req.user.id;
//       const contextData = req.validatedData;

//       const result = await PanicAlarmService.updateContext(
//         parseInt(id),
//         userId,
//         contextData,
//       );

//       return res.status(200).json({
//         success: true,
//         message: "Context updated successfully",
//         data: result,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      GET USER'S SOS LIST
//   ============================================ */
//   async getMySOSList(req, res, next) {
//     try {
//       const userId = req.user.id;
//       const { filter = "all" } = req.query;

//       const sosList = await PanicAlarmService.getUserSOSList(userId, filter);

//       return res.status(200).json({
//         success: true,
//         data: {
//           sos_list: sosList,
//           filter,
//         },
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
//       const { id } = req.params;
//       const userId = req.user.id;

//       const sosDetail = await PanicAlarmService.getSOSDetail(
//         parseInt(id),
//         userId,
//       );

//       return res.status(200).json({
//         success: true,
//         data: sosDetail,
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
//       const { id } = req.params;
//       const userId = req.user.id;

//       const messages = await MessageService.getMessagesBySOS(
//         parseInt(id),
//         userId,
//       );

//       return res.status(200).json({
//         success: true,
//         data: { messages },
//       });
//     } catch (error) {
//       next(error);
//     }
//   },

//   /* ============================================
//      SEND MESSAGE
//   ============================================ */
//   async sendMessage(req, res, next) {
//     try {
//       const { id } = req.params;
//       const userId = req.user.id;
//       const { message } = req.body;

//       const result = await MessageService.sendMessage({
//         sosId: parseInt(id),
//         senderId: userId,
//         senderType: "user",
//         message,
//       });

//       return res.status(201).json({
//         success: true,
//         message: "Message sent successfully",
//         data: result,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },
// };
