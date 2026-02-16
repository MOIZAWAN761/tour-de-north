// src/modules/panicAlarm/police/panicAlarm.police.routes.js

import { Router } from "express";
import { PanicAlarmPoliceController } from "./panicAlarm.police.controller.js";
import {
  validateGetAllSOS,
  validateSOSId,
  validateUpdateStatus,
  validateResolveSOS,
  validateSendMessage,
  validateGetMessages,
  validateGetStatistics,
} from "../panicAlarm.validation.js";
import {
  authenticate,
  authorize,
} from "../../../middlewares/auth.middleware.js";

const router = Router();

/* ============================================
   ADMIN & POLICE ROUTES
============================================ */

// Get all SOS (with filters)
router.get(
  "/",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateGetAllSOS,
  PanicAlarmPoliceController.getAllSOS,
);

// Get SOS by ID
router.get(
  "/:sosId",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateSOSId,
  PanicAlarmPoliceController.getSOSById,
);

// Acknowledge SOS (claim it)
router.post(
  "/:sosId/acknowledge",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateSOSId,
  PanicAlarmPoliceController.acknowledgeSOS,
);

// Update SOS status (responding)
router.patch(
  "/:sosId/status",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateUpdateStatus,
  PanicAlarmPoliceController.updateSOSStatus,
);

// Resolve SOS
router.patch(
  "/:sosId/resolve",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateResolveSOS,
  PanicAlarmPoliceController.resolveSOS,
);

// Send message to user
router.post(
  "/:sosId/messages",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateSendMessage,
  PanicAlarmPoliceController.sendMessage,
);

// Get messages
router.get(
  "/:sosId/messages",
  authenticate,
  authorize("admin", "superadmin", "police"),
  validateGetMessages,
  PanicAlarmPoliceController.getMessages,
);

// Get audit history
router.get(
  "/:sosId/audit-history",
  authenticate,
  authorize("admin", "superadmin"),
  validateSOSId,
  PanicAlarmPoliceController.getAuditHistory,
);

/* ============================================
   SUPER ADMIN ONLY ROUTES
============================================ */

// Get statistics
router.get(
  "/analytics/statistics",
  authenticate,
  authorize("superadmin"),
  validateGetStatistics,
  PanicAlarmPoliceController.getStatistics,
);

// Get top admins
router.get(
  "/analytics/top-admins",
  authenticate,
  authorize("superadmin"),
  validateGetStatistics,
  PanicAlarmPoliceController.getTopAdmins,
);

export default router;

// // src/modules/panicAlarm/police/panicAlarm.police.routes.js

// import { Router } from "express";
// import { PolicePanicAlarmController } from "./panicAlarm.police.controller.js";
// import { validate } from "../panicAlarm.validation.js";
// import {
//   authenticate,
//   authorize,
// } from "../../../middlewares/auth.middleware.js";

// const router = Router();

// /* ============================================
//    ADMIN-ONLY ROUTES
// ============================================ */

// // Get SOS list
// router.get(
//   "/",
//   authenticate,
//   authorize("admin", "superadmin"),
//   PolicePanicAlarmController.getSOSList,
// );

// // Get SOS detail
// router.get(
//   "/:sosId",
//   authenticate,
//   authorize("admin", "superadmin"),
//   PolicePanicAlarmController.getSOSDetail,
// );

// // Get full user details
// router.get(
//   "/:sosId/full-details",
//   authenticate,
//   authorize("admin", "superadmin"),
//   PolicePanicAlarmController.getFullUserDetails,
// );

// // Acknowledge SOS
// router.post(
//   "/:sosId/acknowledge",
//   authenticate,
//   authorize("admin", "superadmin"),
//   PolicePanicAlarmController.acknowledgeSOS,
// );

// // Update status
// router.patch(
//   "/:sosId/status",
//   authenticate,
//   authorize("admin", "superadmin"),
//   PolicePanicAlarmController.updateStatus,
// );

// // Resolve SOS
// router.patch(
//   "/:sosId/resolve",
//   authenticate,
//   authorize("admin", "superadmin"),
//   validate("resolve"),
//   PolicePanicAlarmController.resolveSOS,
// );

// // Messages
// router.get(
//   "/:sosId/messages",
//   authenticate,
//   authorize("admin", "superadmin"),
//   PolicePanicAlarmController.getSOSMessages,
// );

// router.post(
//   "/:sosId/messages",
//   authenticate,
//   authorize("admin", "superadmin"),
//   PolicePanicAlarmController.sendMessage,
// );

// /* ============================================
//    SUPERADMIN-ONLY ROUTES
// ============================================ */

// // Statistics
// router.get(
//   "/statistics",
//   authenticate,
//   authorize("superadmin"),
//   validate("statistics"),
//   PolicePanicAlarmController.getStatistics,
// );

// export default router;
