// src/workers/notificationWorker.js
// ✅ UPDATED: Uses enhanced NotificationsService with multi-device FCM support

import { PanicAlarmModel } from "../modules/panic-alarm/panicAlarm.model.js";
import { NotificationsModel } from "../modules/notification/notification.model.js";
import { NotificationsService } from "../modules/notification/notification.service.js";
import redisClient from "../config/redis.js";
import pool from "../config/postgres.js";
import {
  emitToUser,
  emitToAdmins,
  emitToConversation,
} from "../config/socket.js";

class NotificationWorker {
  constructor() {
    this.isRunning = false;
    this.pollInterval = 5000; // 5 seconds
    this.redisSubscriber = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  /* ============================================
     START WORKER
  ============================================ */
  async start() {
    console.log("🔔 Notification Worker starting...");

    // Set up PostgreSQL pool error handling
    this.setupPostgresErrorHandling();

    // Start Redis subscriber (fast path)
    await this.startRedisSubscriber();

    // Start outbox poller (fallback/guaranteed delivery)
    this.startOutboxPoller();

    this.isRunning = true;
    console.log("✅ Notification Worker started successfully");
  }

  /* ============================================
     SETUP POSTGRESQL ERROR HANDLING
  ============================================ */
  setupPostgresErrorHandling() {
    pool.on("error", (err) => {
      console.error("❌ PostgreSQL pool error:", err);
    });

    pool.on("connect", () => {
      console.log("✅ PostgreSQL pool connected");
    });

    pool.on("remove", () => {
      console.log("🔄 PostgreSQL client removed from pool");
    });
  }

  /* ============================================
     START REDIS SUBSCRIBER (Real-time)
  ============================================ */
  async startRedisSubscriber() {
    try {
      const subscriber = redisClient.duplicate();

      subscriber.on("error", (err) => {
        console.error("❌ Redis subscriber error:", err.message);
      });

      subscriber.on("reconnecting", () => {
        console.log("🔄 Redis subscriber reconnecting...");
        this.reconnectAttempts++;

        if (this.reconnectAttempts > this.maxReconnectAttempts) {
          console.error(
            "❌ Max Redis reconnect attempts reached. Falling back to outbox only.",
          );
          subscriber.disconnect();
        }
      });

      subscriber.on("connect", () => {
        console.log("✅ Redis subscriber connected");
        this.reconnectAttempts = 0;
      });

      subscriber.on("ready", () => {
        console.log("✅ Redis subscriber ready");
      });

      await subscriber.connect();
      this.redisSubscriber = subscriber;

      // Subscribe to SOS events
      await subscriber.subscribe("sos:created", async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleSOSCreated(data, "redis");
        } catch (error) {
          console.error("Error handling sos:created:", error);
        }
      });

      await subscriber.subscribe("sos:acknowledged", async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleSOSAcknowledged(data, "redis");
        } catch (error) {
          console.error("Error handling sos:acknowledged:", error);
        }
      });

      await subscriber.subscribe("sos:status_updated", async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleSOSStatusUpdated(data, "redis");
        } catch (error) {
          console.error("Error handling sos:status_updated:", error);
        }
      });

      await subscriber.subscribe("sos:resolved", async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleSOSResolved(data, "redis");
        } catch (error) {
          console.error("Error handling sos:resolved:", error);
        }
      });

      await subscriber.subscribe("sos:context_updated", async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleSOSContextUpdated(data);
        } catch (error) {
          console.error("Error handling sos:context_updated:", error);
        }
      });

      await subscriber.subscribe("sos:address_updated", async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleSOSAddressUpdated(data);
        } catch (error) {
          console.error("Error handling sos:address_updated:", error);
        }
      });

      console.log("✅ Redis subscriber connected and listening");
    } catch (error) {
      console.error("❌ Redis subscriber startup error:", error.message);
      console.log("⚠️  Falling back to outbox polling only");
    }
  }

  /* ============================================
     START OUTBOX POLLER (Fallback)
  ============================================ */
  async startOutboxPoller() {
    const pollFunction = async () => {
      try {
        await this.processOutbox();
      } catch (error) {
        console.error("❌ Outbox polling error:", error.message);

        if (error.code === "ECONNRESET" || error.code === "ECONNREFUSED") {
          console.log(
            "⚠️  PostgreSQL connection issue detected. Pool will attempt to reconnect.",
          );
        }
      }
    };

    pollFunction();
    setInterval(pollFunction, this.pollInterval);

    console.log("✅ Outbox poller started (polling every 5 seconds)");
  }

  /* ============================================
     PROCESS OUTBOX (Guaranteed delivery)
  ============================================ */
  async processOutbox() {
    try {
      const pendingEvents = await PanicAlarmModel.getPendingOutbox(10);

      if (pendingEvents.length === 0) {
        return;
      }

      console.log(
        `📦 Processing ${pendingEvents.length} pending outbox events`,
      );

      for (const event of pendingEvents) {
        try {
          await PanicAlarmModel.updateOutboxStatus(
            event.id,
            "processing",
            null,
          );

          const payload =
            typeof event.payload === "string"
              ? JSON.parse(event.payload)
              : event.payload;

          switch (event.event_type) {
            case "sos_created":
              await this.handleSOSCreated(payload, "outbox");
              break;
            case "sos_acknowledged":
              await this.handleSOSAcknowledged(payload, "outbox");
              break;
            case "sos_status_updated":
              await this.handleSOSStatusUpdated(payload, "outbox");
              break;
            case "sos_resolved":
              await this.handleSOSResolved(payload, "outbox");
              break;
            default:
              console.log(`Unknown event type: ${event.event_type}`);
          }

          await PanicAlarmModel.updateOutboxStatus(event.id, "processed", null);
        } catch (error) {
          console.error(
            `❌ Error processing event ${event.id}:`,
            error.message,
          );
          await PanicAlarmModel.updateOutboxStatus(
            event.id,
            "failed",
            error.message,
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /* ============================================
     HANDLE SOS CREATED
     ✅ Now uses enhanced NotificationsService
  ============================================ */
  async handleSOSCreated(data, source = "redis") {
    try {
      console.log(
        `🚨 Processing SOS created: #${data.sos_id} (source: ${source})`,
      );

      // Normalize data
      const sosId = data.sos_id;
      const userId = data.user?.id || data.user_id;
      const userName = data.user?.name || data.user_name;
      const userPhone = data.user?.phone || data.user_phone;
      const latitude = data.latitude;
      const longitude = data.longitude;
      const sosFor = data.sos_for;
      const emergencyType = data.emergency_type;

      // ✅ User Notification
      const userNotification = await NotificationsService.createNotification({
        userId,
        type: "sos_status",
        category: "sos",
        title: "SOS Sent",
        body: "Your SOS has been sent to police. Help is on the way.",
        sosId,
        priority: "urgent",
        data: {
          sos_id: String(sosId),
          action: "open_sos",
        },
      });

      // ✅ Send FCM to user
      await NotificationsService.sendFCMToUser(userId, userNotification);

      // ✅ Send WebSocket to user
      emitToUser(userId, "sos_created", {
        sosId,
        notificationId: userNotification.id,
        status: "created",
        message: "Your SOS has been sent to police",
      });

      // ✅ Admin Notification (Broadcast) – now using type 'sos_alert'
      const adminNotification = await NotificationsModel.createNotification({
        userId: null,
        type: "sos_alert", // Changed from 'admin_alert' to 'sos_alert'
        category: "sos",
        title: `🚨 NEW SOS ALARM — #${sosId}`,
        body: `${userName} needs help${emergencyType ? ` - ${emergencyType}` : ""}`,
        sosId,
        priority: "urgent",
        data: {
          sos_id: String(sosId),
          user_id: String(userId),
          user_name: userName,
          user_phone: userPhone,
          latitude: String(latitude),
          longitude: String(longitude),
          sos_for: sosFor,
          action: "open_sos",
        },
      });

      // ✅ Send FCM to admins
      await NotificationsService.sendFCMToAdmins(adminNotification);

      // ✅ Send WebSocket to admins
      emitToAdmins("new_sos", {
        sosId,
        notificationId: adminNotification.id,
        user: { id: userId, name: userName, phone: userPhone },
        location: { latitude, longitude },
        sosFor,
        emergencyType,
        status: "created",
        createdAt: data.created_at,
      });

      if (source === "redis") {
        await this.markOutboxAsProcessed("sos_created", sosId);
      }

      console.log(`✅ SOS created notifications sent for #${sosId}`);
    } catch (error) {
      console.error("Handle SOS created error:", error);
      throw error; // will mark outbox as failed and retry
    }
  }

  /* ============================================
     HANDLE SOS ACKNOWLEDGED
     ✅ Now uses enhanced NotificationsService
  ============================================ */
  async handleSOSAcknowledged(data, source = "redis") {
    try {
      console.log(
        `✅ Processing SOS acknowledged: #${data.sos_id} (source: ${source})`,
      );

      const sos = await PanicAlarmModel.getSOSById(data.sos_id);

      const notification = await NotificationsService.createNotification({
        userId: data.user_id,
        type: "sos_status",
        category: "sos",
        title: "Police Acknowledged",
        body: `${sos.acknowledged_by_name} acknowledged your SOS. Help is on the way.`,
        sosId: data.sos_id,
        priority: "high",
        data: {
          admin_id: data.admin_id,
          admin_name: sos.acknowledged_by_name,
          action: "open_sos",
        },
      });

      // ✅ Send to ALL user's devices
      await NotificationsService.sendFCMToUser(data.user_id, notification);

      emitToUser(data.user_id, "sos_acknowledged", {
        sosId: data.sos_id,
        notificationId: notification.id,
        admin: {
          id: data.admin_id,
          name: sos.acknowledged_by_name,
        },
        status: "acknowledged",
      });

      // ✅ Admin Notification – now using type 'sos_alert'
      const adminNotification = await NotificationsModel.createNotification({
        userId: null,
        type: "sos_alert", // Changed from 'admin_alert' to 'sos_alert'
        category: "sos",
        title: `SOS Acknowledged — #${data.sos_id}`,
        body: `${sos.acknowledged_by_name} acknowledged SOS from ${sos.user_name}`,
        sosId: data.sos_id,
        priority: "high",
        data: {
          sos_id: String(data.sos_id),
          admin_id: String(data.admin_id),
          admin_name: sos.acknowledged_by_name,
          user_name: sos.user_name,
          action: "open_sos",
        },
      });

      // ✅ Send FCM to admins
      await NotificationsService.sendFCMToAdmins(adminNotification);

      emitToAdmins("sos_claimed", {
        sosId: data.sos_id,
        claimedBy: {
          id: data.admin_id,
          name: sos.acknowledged_by_name,
        },
      });

      if (source === "redis") {
        await this.markOutboxAsProcessed("sos_acknowledged", data.sos_id);
      }

      console.log(`✅ SOS acknowledged notification sent for #${data.sos_id}`);
    } catch (error) {
      console.error("Handle SOS acknowledged error:", error);
      throw error;
    }
  }

  /* ============================================
     HANDLE SOS STATUS UPDATED
  ============================================ */
  async handleSOSStatusUpdated(data, source = "redis") {
    try {
      console.log(
        `📝 Processing SOS status update: #${data.sos_id} (source: ${source})`,
      );

      const statusMessages = {
        responding: "Help is on the way",
        cancelled: "SOS has been cancelled",
      };

      const message = statusMessages[data.status] || "SOS status updated";

      const notification = await NotificationsService.createNotification({
        userId: data.user_id,
        type: "sos_status",
        category: "sos",
        title: "SOS Update",
        body: message,
        sosId: data.sos_id,
        priority: "high",
        data: {
          status: data.status,
          action: "open_sos",
        },
      });

      await NotificationsService.sendFCMToUser(data.user_id, notification);

      emitToUser(data.user_id, "sos_status_updated", {
        sosId: data.sos_id,
        notificationId: notification.id,
        status: data.status,
        message: message,
      });

      // ✅ Admin Notification – now using type 'sos_alert'
      const adminNotification = await NotificationsModel.createNotification({
        userId: null,
        type: "sos_alert", // Changed from 'admin_alert' to 'sos_alert'
        category: "sos",
        title: `SOS Status Updated — #${data.sos_id}`,
        body: `Status changed to ${data.status}`,
        sosId: data.sos_id,
        priority: "high",
        data: {
          sos_id: String(data.sos_id),
          status: data.status,
        },
      });

      await NotificationsService.sendFCMToAdmins(adminNotification);

      if (source === "redis") {
        await this.markOutboxAsProcessed("sos_status_updated", data.sos_id);
      }

      console.log(`✅ Status update notification sent for #${data.sos_id}`);
    } catch (error) {
      console.error("Handle SOS status updated error:", error);
      throw error;
    }
  }

  /* ============================================
     HANDLE SOS RESOLVED
  ============================================ */
  async handleSOSResolved(data, source = "redis") {
    try {
      console.log(
        `🎉 Processing SOS resolved: #${data.sos_id} (source: ${source})`,
      );

      const resolutionMessages = {
        genuine_emergency:
          "Your SOS has been resolved. Emergency assistance was provided.",
        accidental: "Your SOS has been resolved. It was marked as accidental.",
        false_alarm:
          "Your SOS has been resolved. It was marked as a false alarm.",
      };

      const message =
        resolutionMessages[data.resolution_type] ||
        "Your SOS has been resolved.";

      const notification = await NotificationsService.createNotification({
        userId: data.user_id,
        type: "sos_status",
        category: "sos",
        title: "SOS Resolved",
        body: message,
        sosId: data.sos_id,
        priority: "normal",
        data: {
          resolution_type: data.resolution_type,
          action: "open_sos",
        },
      });

      await NotificationsService.sendFCMToUser(data.user_id, notification);

      emitToUser(data.user_id, "sos_resolved", {
        sosId: data.sos_id,
        notificationId: notification.id,
        resolutionType: data.resolution_type,
        status: "resolved",
        message: message,
      });

      // ✅ Admin Notification – now using type 'sos_alert'
      const adminNotification = await NotificationsModel.createNotification({
        userId: null,
        type: "sos_alert", // Changed from 'admin_alert' to 'sos_alert'
        category: "sos",
        title: `SOS Resolved — #${data.sos_id}`,
        body: `Resolved as ${data.resolution_type}`,
        sosId: data.sos_id,
        priority: "normal",
        data: {
          sos_id: String(data.sos_id),
          resolution_type: data.resolution_type,
        },
      });

      await NotificationsService.sendFCMToAdmins(adminNotification);

      if (source === "redis") {
        await this.markOutboxAsProcessed("sos_resolved", data.sos_id);
      }

      console.log(`✅ SOS resolved notification sent for #${data.sos_id}`);
    } catch (error) {
      console.error("Handle SOS resolved error:", error);
      throw error;
    }
  }

  /* ============================================
     HANDLE SOS CONTEXT UPDATED (Real-time only)
  ============================================ */
  async handleSOSContextUpdated(data) {
    console.log(`📝 SOS context updated for #${data.sos_id}`);

    emitToAdmins("sos_context_updated", {
      sosId: data.sos_id,
      emergencyType: data.emergency_type,
      quickNote: data.quick_note,
      estimatedCasualties: data.estimated_casualties,
      userInjuredLevel: data.user_injured_level,
      canReceiveCall: data.can_receive_call,
    });
  }

  /* ============================================
     HANDLE SOS ADDRESS UPDATED (Real-time)
  ============================================ */
  async handleSOSAddressUpdated(data) {
    console.log(`📍 Address updated for SOS #${data.sos_id}: ${data.address}`);

    emitToAdmins("sos_address_updated", {
      sosId: data.sos_id,
      address: data.address,
    });

    const sos = await PanicAlarmModel.getSOSById(data.sos_id);
    if (sos) {
      emitToUser(sos.user_id, "sos_address_updated", {
        sosId: data.sos_id,
        address: data.address,
      });
    }
  }

  /* ============================================
     MARK OUTBOX AS PROCESSED
  ============================================ */
  async markOutboxAsProcessed(eventType, sosId) {
    try {
      const query = `
        UPDATE outbox
        SET 
          status = 'processed',
          processed_at = NOW()
        WHERE event_type = $1
        AND payload::jsonb->>'sos_id' = $2
        AND status IN ('pending', 'processing')
        RETURNING *;
      `;

      const result = await pool.query(query, [eventType, sosId.toString()]);

      if (result.rowCount > 0) {
        console.log(
          `✅ Marked outbox as processed: ${eventType} for SOS #${sosId}`,
        );
      }
    } catch (error) {
      console.error("Error marking outbox as processed:", error.message);
    }
  }

  /* ============================================
     STOP WORKER
  ============================================ */
  async stop() {
    console.log("🛑 Stopping Notification Worker...");

    this.isRunning = false;

    if (this.redisSubscriber) {
      try {
        await this.redisSubscriber.quit();
        console.log("✅ Redis subscriber disconnected");
      } catch (error) {
        console.error("Error disconnecting Redis:", error.message);
      }
    }

    console.log("✅ Notification Worker stopped");
  }
}

// Export singleton instance
export const notificationWorker = new NotificationWorker();

// Auto-start if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  notificationWorker.start().catch((error) => {
    console.error("❌ Failed to start notification worker:", error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("📥 Received SIGTERM signal");
    await notificationWorker.stop();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("📥 Received SIGINT signal");
    await notificationWorker.stop();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  });
}
