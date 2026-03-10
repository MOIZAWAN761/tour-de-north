import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
import publicProfileRoutes from "./modules/profile/public/profile.public.route.js";
import policeProfileRoutes from "./modules/profile/police/profile.police.route.js";
import publicPlaceRoutes from "./modules/places/public/place.public.route.js";
import policePlaceRoutes from "./modules/places/police/place.police.route.js";
import publicHotelRoutes from "./modules/services/hotel/public/public.hotel.route.js";
import policeHotelRoutes from "./modules/services/hotel/police/police.hotel.route.js";
import publicJeepRoutes from "./modules/services/jeep/public/public.jeep.route.js";
import policeJeepRoutes from "./modules/services/jeep/police/police.jeep.route.js";
import publicPanicAlarmRoutes from "./modules/panic-alarm/public/panicAlarm.public.route.js";
import policePanicAlarmRoutes from "./modules/panic-alarm/police/panicAlarm.police.route.js";
import publicNotificationRoutes from "./modules/notification/public/notification.public.route.js";
import policeNotificationRoutes from "./modules/notification/police/notification.police.route.js";
import publicLostFoundRoutes from "./modules/lost-found/public/lostFound.public.route.js";
import policeLostFoundRoutes from "./modules/lost-found/police/lostFound.police.route.js";
import messagingRoutes from "./modules/messaging/messaging.routes.js"
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error.middlewares.js";

/* ---------------- CREATE APP ---------------- */
const app = express();
const allowedOrigins = [
  "https://tour-de-north-frontend.vercel.app",
  "http://localhost:5173", // for local Vite dev
  "http://localhost:3000", // alternative local port
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // if you need to send cookies/auth headers
  }),
);

/* ---------------- GLOBAL MIDDLEWARES ---------------- */

// Enable CORS (mobile app + admin panel)
// 
// app.use(
//   cors({
//     origin: "http://localhost:5173", // frontend URL
//     credentials: true, // if using cookies or auth headers
//   }),
// );

// Parse incoming JSON
app.use(express.json());

// Parse URL-encoded data (forms)
app.use(express.urlencoded({ extended: true }));

/* ---------------- HEALTH CHECK ---------------- */
/*
  Used to:
  - Check server is alive
  - Used by load balancers / monitoring
*/
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend is running",
    timestamp: new Date().toISOString(),
  });
});

/* ---------------- API ROOT ---------------- */

app.use("/api/auth", authRoutes);

// Profile routes (public/user)
app.use("/api/profile", publicProfileRoutes);
// Profile routes (police/admin)
app.use("/api/police/profiles", policeProfileRoutes);

app.use("/api/place", publicPlaceRoutes);
app.use("/api/police/place", policePlaceRoutes);

app.use("/api/police/hotel", policeHotelRoutes);
app.use("/api/hotel", publicHotelRoutes);

app.use("/api/police/jeep", policeJeepRoutes);
app.use("/api/jeep", publicJeepRoutes);

// app.use("/api/sos", publicPanicAlarmRoutes);
// app.use("/api/notifications", publicNotificationRoutes);
// app.use("/api/police/sos", policePanicAlarmRoutes);
// app.use("/api/police/notifications", policeNotificationRoutes);
// app.use("/api/messaging", policeNotificationRoutes);


// ✅ SOS Routes
app.use("/api/sos", publicPanicAlarmRoutes);
app.use("/api/police/sos", policePanicAlarmRoutes);

// ✅ MESSAGING ROUTES - FIXED!
app.use("/api/messages", messagingRoutes);

// ✅ Notification Routes
app.use("/api/notifications", publicNotificationRoutes);
app.use("/api/police/notifications", policeNotificationRoutes);


app.use("/api/public/lost-and-found", publicLostFoundRoutes);
app.use("/api/police/lost-and-found", policeLostFoundRoutes);

/*
  Helps verify API versioning later
*/
app.get("/", (req, res) => {
  res.json({
    name: "Tourism Safety API",
    version: "1.0.0",
    status: "running",
  });
});

// /* ---------------- 404 HANDLER ---------------- */
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: "Route not found",
//   });
// });

/* ---------------- GLOBAL ERROR HANDLER ---------------- */
/*
  Central error handling
*/
// 404 Handler (must be after all routes)
app.use(notFoundHandler);

// Global Error Handler (must be last)
app.use(errorHandler);

export default app;



