// src/config/socket.js

import { Server } from "socket.io";
import { TokenUtil } from "../modules/auth/auth.utils.js";
import { AuthModel } from "../modules/auth/auth.model.js";

let io;

/* ============================================
   INITIALIZE SOCKET.IO
============================================ */
export function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      // Verify JWT
      const decoded = TokenUtil.verifyAccessToken(token);

      // Get user from DB
      const user = await AuthModel.findUserById(decoded.userId);

      if (!user) {
        return next(new Error("User not found"));
      }

      // Attach user to socket
      socket.user = {
        id: user.id,
        role: user.role,
        name: user.name,
      };

      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication failed"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    console.log(
      `✅ User connected: ${socket.user.name} (ID: ${socket.user.id})`,
    );

    // Join user's personal room
    socket.join(`user:${socket.user.id}`);

    // Join admin room if admin
    if (["admin", "superadmin", "police"].includes(socket.user.role)) {
      socket.join("admin-room");
    }

    /* ============================================
       MESSAGING EVENTS
    ============================================ */

    // Join specific SOS conversation room
    socket.on("join_conversation", (sosId) => {
      socket.join(`sos:${sosId}`);
      console.log(`User ${socket.user.id} joined SOS conversation ${sosId}`);
    });

    // Leave SOS conversation room
    socket.on("leave_conversation", (sosId) => {
      socket.leave(`sos:${sosId}`);
      console.log(`User ${socket.user.id} left SOS conversation ${sosId}`);
    });

    // Typing indicator
    socket.on("typing_start", (sosId) => {
      socket.to(`sos:${sosId}`).emit("user_typing", {
        sosId,
        userId: socket.user.id,
        userName: socket.user.name,
      });
    });

    socket.on("typing_stop", (sosId) => {
      socket.to(`sos:${sosId}`).emit("user_stopped_typing", {
        sosId,
        userId: socket.user.id,
      });
    });

    /* ============================================
       SOS REAL-TIME EVENTS
    ============================================ */

    // Admin opens SOS detail
    socket.on("admin_viewing_sos", (sosId) => {
      // Notify user that admin is viewing their SOS
      socket.to(`sos:${sosId}`).emit("admin_viewing", {
        adminId: socket.user.id,
        adminName: socket.user.name,
      });
    });

    /* ============================================
       DISCONNECT
    ============================================ */

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.user.name}`);
    });

    // Error handling
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  console.log("✅ Socket.IO initialized");
  return io;
}

/* ============================================
   GET IO INSTANCE
============================================ */
export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

/* ============================================
   EMIT TO USER
============================================ */
export function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/* ============================================
   EMIT TO ADMIN ROOM
============================================ */
export function emitToAdmins(event, data) {
  if (io) {
    io.to("admin-room").emit(event, data);
  }
}

/* ============================================
   EMIT TO SOS CONVERSATION
============================================ */
export function emitToConversation(sosId, event, data) {
  if (io) {
    io.to(`sos:${sosId}`).emit(event, data);
  }
}
