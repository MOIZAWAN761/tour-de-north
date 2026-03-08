// src/modules/panicAlarm/public/panicAlarm.public.routes.js

import { Router } from "express";
import { PanicAlarmPublicController } from "./panicAlarm.public.controller.js";
import {
  validateCreateSOSSelf,
  validateCreateSOSOther,
  validateUpdateContext,
  validateSOSId,
  validateGetUserSOSList,
} from "../panicAlarm.validation.js";
import { authenticate } from "../../../middlewares/auth.middleware.js";

const router = Router();

/* ============================================
   USER ROUTES (Authenticated)
   
   ⚠️ ORDER MATTERS! 
   - Specific routes (POST /self, POST /other) FIRST
   - Generic routes (GET /, GET /:sosId) LAST
============================================ */

// ✅ POST routes first (specific paths)
router.post(
  "/self",
  authenticate,
  validateCreateSOSSelf,
  PanicAlarmPublicController.createSOSForSelf,
);

router.post(
  "/other",
  authenticate,
  validateCreateSOSOther,
  PanicAlarmPublicController.createSOSForOther,
);

// ✅ PATCH routes (specific paths)
router.patch(
  "/:sosId/context",
  authenticate,
  validateUpdateContext,
  PanicAlarmPublicController.updateSOSContext,
);

// ✅ GET / route (list) - BEFORE /:sosId
router.get(
  "/",
  authenticate,
  validateGetUserSOSList,
  PanicAlarmPublicController.getMySOSList,
);

// ✅ GET /:sosId route LAST (catches all other GET requests)
router.get(
  "/:sosId",
  authenticate,
  validateSOSId,
  PanicAlarmPublicController.getSOSById,
);

export default router;
