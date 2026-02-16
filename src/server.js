import app from "./app.js";
import { notificationWorker } from "./worker/notification.worker.js";
import http from 'http'
import { initializeSocket } from "./config/socket.js";

/* ---------------- CONFIG ---------------- */
const PORT = process.env.PORT || 5000;
const server = http.createServer(app)
initializeSocket(server)
/* ---------------- START SERVER ---------------- */
server.listen(PORT,async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await notificationWorker.start();
});

/* ---------------- GRACEFUL SHUTDOWN ---------------- */
/*
  Ensures proper shutdown on:
  - Ctrl + C
  - Server termination
*/
process.on("SIGINT", () => {
  console.log("🛑 Server shutting down...");
  server.close(() => {
    console.log("✅ Server closed cleanly");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received. Shutting down...");
  server.close(() => {
    console.log("✅ Server closed cleanly");
    process.exit(0);
  });
});

/* ---------------- ERROR HANDLING ---------------- */
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
  process.exit(1);
});
