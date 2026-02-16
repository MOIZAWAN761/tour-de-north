// src/modules/panicAlarm/public/panicAlarm.public.routes.js

import { Router } from "express";
import { PanicAlarmPublicController } from "./panicAlarm.public.controller.js";
import {
  validateCreateSOSSelf,
  validateCreateSOSOther,
  validateUpdateContext,
  validateSOSId,
  validateGetUserSOSList,
  validateSendMessage,
  validateGetMessages,
} from "../panicAlarm.validation.js";
import { authenticate } from "../../../middlewares/auth.middleware.js";

const router = Router();

/* ============================================
   USER ROUTES (Authenticated)
============================================ */

// Create SOS for self
router.post(
  "/self",
  authenticate,
  validateCreateSOSSelf,
  PanicAlarmPublicController.createSOSForSelf,
);

// Create SOS for other person
router.post(
  "/other",
  authenticate,
  validateCreateSOSOther,
  PanicAlarmPublicController.createSOSForOther,
);

// Update SOS context (emergency details)
router.patch(
  "/:sosId/context",
  authenticate,
  validateUpdateContext,
  PanicAlarmPublicController.updateSOSContext,
);

// Get my SOS list
router.get(
  "/my-sos",
  authenticate,
  validateGetUserSOSList,
  PanicAlarmPublicController.getMySOSList,
);

// Get SOS by ID
router.get(
  "/:sosId",
  authenticate,
  validateSOSId,
  PanicAlarmPublicController.getSOSById,
);

// Send message to admin
// router.post(
//   "/:sosId/messages",
//   authenticate,
//   validateSendMessage,
//   PanicAlarmPublicController.sendMessage,
// );

// // Get messages
// router.get(
//   "/:sosId/messages",
//   authenticate,
//   validateGetMessages,
//   PanicAlarmPublicController.getMessages,
// );

export default router;



















// // src/modules/panicAlarm/public/panicAlarm.public.routes.js

// import { Router } from "express";
// import { PublicPanicAlarmController } from "./public.controller.js";
// import { validate } from "../panicAlarm.validation.js";
// import { authenticate } from "../../../middlewares/auth.middleware.js";

// const router = Router();

// /* ============================================
//    CREATE SOS
// ============================================ */
// router.post(
//   "/self",
//   authenticate,
//   validate("createSOSSelf"),
//   PublicPanicAlarmController.createSOSSelf,
// );

// router.post(
//   "/third-party",
//   authenticate,
//   validate("createSOSThirdParty"),
//   PublicPanicAlarmController.createSOSThirdParty,
// );

// /* ============================================
//    UPDATE SOS CONTEXT
// ============================================ */
// router.patch(
//   "/:sosId/context",
//   authenticate,
//   validate("updateContext"),
//   PublicPanicAlarmController.updateContext,
// );

// /* ============================================
//    GET USER'S SOS LIST
// ============================================ */
// router.get("/my", authenticate, PublicPanicAlarmController.getMySOSList);

// /* ============================================
//    GET SOS DETAIL
// ============================================ */
// router.get(
//   "/:sosId/detail",
//   authenticate,
//   PublicPanicAlarmController.getSOSDetail,
// );

// /* ============================================
//    SOS MESSAGES
// ============================================ */
// router.get(
//   "/:sosId/messages",
//   authenticate,
//   PublicPanicAlarmController.getSOSMessages,
// );

// router.post(
//   "/:sosId/messages",
//   authenticate,
//   PublicPanicAlarmController.sendMessage,
// );

// export default router;
