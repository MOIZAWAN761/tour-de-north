// src/workers/notificationWorker.js
// PRODUCTION-READY VERSION - Proper error handling & connection management

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
    // Handle pool errors (prevents crashes)
    pool.on('error', (err) => {
      console.error('❌ PostgreSQL pool error:', err);
      // Don't exit - just log the error
      // The pool will automatically try to reconnect
    });

    // Handle connection errors
    pool.on('connect', () => {
      console.log('✅ PostgreSQL pool connected');
    });

    // Handle removal of idle clients
    pool.on('remove', () => {
      console.log('🔄 PostgreSQL client removed from pool');
    });
  }

  /* ============================================
     START REDIS SUBSCRIBER (Real-time)
  ============================================ */
  async startRedisSubscriber() {
    try {
      const subscriber = redisClient.duplicate();
      
      // ✅ FIX: Add error handling BEFORE connecting
      subscriber.on('error', (err) => {
        console.error('❌ Redis subscriber error:', err.message);
        // Don't crash - worker will continue with outbox polling
      });

      subscriber.on('reconnecting', () => {
        console.log('🔄 Redis subscriber reconnecting...');
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
          console.error('❌ Max Redis reconnect attempts reached. Falling back to outbox only.');
          subscriber.disconnect();
        }
      });

      subscriber.on('connect', () => {
        console.log('✅ Redis subscriber connected');
        this.reconnectAttempts = 0; // Reset counter on successful connect
      });

      subscriber.on('ready', () => {
        console.log('✅ Redis subscriber ready');
      });

      await subscriber.connect();
      this.redisSubscriber = subscriber;

      // Subscribe to SOS events
      await subscriber.subscribe("sos:created", async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleSOSCreated(data, "redis");
        } catch (error) {
          console.error('Error handling sos:created:', error);
        }
      });

      await subscriber.subscribe("sos:acknowledged", async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleSOSAcknowledged(data, "redis");
        } catch (error) {
          console.error('Error handling sos:acknowledged:', error);
        }
      });

      await subscriber.subscribe("sos:status_updated", async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleSOSStatusUpdated(data, "redis");
        } catch (error) {
          console.error('Error handling sos:status_updated:', error);
        }
      });

      await subscriber.subscribe("sos:resolved", async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleSOSResolved(data, "redis");
        } catch (error) {
          console.error('Error handling sos:resolved:', error);
        }
      });

      await subscriber.subscribe("sos:context_updated", async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleSOSContextUpdated(data);
        } catch (error) {
          console.error('Error handling sos:context_updated:', error);
        }
      });

      await subscriber.subscribe("sos:address_updated", async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleSOSAddressUpdated(data);
        } catch (error) {
          console.error('Error handling sos:address_updated:', error);
        }
      });

      console.log("✅ Redis subscriber connected and listening");
    } catch (error) {
      console.error("❌ Redis subscriber startup error:", error.message);
      console.log("⚠️  Falling back to outbox polling only");
      // Don't throw - worker can still function with outbox polling
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
        // Don't crash - just log and continue
        
        // If it's a connection error, log additional info
        if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
          console.log('⚠️  PostgreSQL connection issue detected. Pool will attempt to reconnect.');
        }
      }
    };

    // Initial call
    pollFunction();

    // Set interval
    setInterval(pollFunction, this.pollInterval);

    console.log("✅ Outbox poller started (polling every 5 seconds)");
  }

  /* ============================================
     PROCESS OUTBOX (Guaranteed delivery)
  ============================================ */
  async processOutbox() {
    try {
      // Get pending events that haven't been processed
      const pendingEvents = await PanicAlarmModel.getPendingOutbox(10);

      if (pendingEvents.length === 0) {
        return;
      }

      console.log(
        `📦 Processing ${pendingEvents.length} pending outbox events`,
      );

      for (const event of pendingEvents) {
        try {
          // Mark as processing
          await PanicAlarmModel.updateOutboxStatus(
            event.id,
            "processing",
            null,
          );

          const payload =
            typeof event.payload === "string"
              ? JSON.parse(event.payload)
              : event.payload;

          // Process based on event type
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

          // ✅ Mark as processed
          await PanicAlarmModel.updateOutboxStatus(event.id, "processed", null);
        } catch (error) {
          console.error(`❌ Error processing event ${event.id}:`, error.message);

          // Mark as failed and increment retry count
          await PanicAlarmModel.updateOutboxStatus(
            event.id,
            "failed",
            error.message,
          );
        }
      }
    } catch (error) {
      // Re-throw to be caught by the polling function
      throw error;
    }
  }

  /* ============================================
     HANDLE SOS CREATED
  ============================================ */
  async handleSOSCreated(data, source = "redis") {
    try {
      console.log(
        `🚨 Processing SOS created: #${data.sos_id} (source: ${source})`,
      );

      // User Notification
      const userNotification = await NotificationsService.createNotification({
        userId: data.user_id,
        type: "sos_status",
        category: "sos",
        title: "SOS Sent",
        body: "Your SOS has been sent to police. Help is on the way.",
        sosId: data.sos_id,
        priority: "urgent",
        data: {
          sos_id: data.sos_id,
          action: "open_sos",
        },
      });

      await NotificationsService.sendFCMToUser(data.user_id, userNotification);

      emitToUser(data.user_id, "sos_created", {
        sosId: data.sos_id,
        notificationId: userNotification.id,
        status: "created",
        message: "Your SOS has been sent to police",
      });

      // Admin Notification (Broadcast)
      const adminNotification = await NotificationsModel.createNotification({
        userId: null,
        type: "sos_status",
        category: "sos",
        title: `🚨 NEW SOS ALARM — #${data.sos_id}`,
        body: `${data.user.name} needs help${data.emergency_type ? ` - ${data.emergency_type}` : ""}`,
        sosId: data.sos_id,
        priority: "urgent",
        data: {
          sos_id: data.sos_id,
          user_id: data.user_id,
          user_name: data.user.name,
          user_phone: data.user.phone,
          latitude: data.latitude,
          longitude: data.longitude,
          sos_for: data.sos_for,
          action: "open_sos",
        },
      });

      await NotificationsService.sendFCMToAdmins(adminNotification);

      emitToAdmins("new_sos", {
        sosId: data.sos_id,
        notificationId: adminNotification.id,
        user: {
          id: data.user_id,
          name: data.user.name,
          phone: data.user.phone,
        },
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
        },
        sosFor: data.sos_for,
        emergencyType: data.emergency_type,
        status: "created",
        createdAt: data.created_at,
      });

      if (source === "redis") {
        await this.markOutboxAsProcessed("sos_created", data.sos_id);
      }

      console.log(`✅ SOS created notifications sent for #${data.sos_id}`);
    } catch (error) {
      console.error("Handle SOS created error:", error);
      throw error;
    }
  }

  /* ============================================
     HANDLE SOS ACKNOWLEDGED
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

      const result = await pool.query(query, [
        eventType,
        sosId.toString(),
      ]);

      if (result.rowCount > 0) {
        console.log(
          `✅ Marked outbox as processed: ${eventType} for SOS #${sosId}`,
        );
      }
    } catch (error) {
      console.error("Error marking outbox as processed:", error.message);
      // Don't throw - this is not critical
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
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Don't exit - log and continue
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - log and continue
  });
}



// // src/workers/notificationWorker.js
// // CORRECTED VERSION - All fixes applied

// import { PanicAlarmModel } from "../modules/panic-alarm/panicAlarm.model.js";
// import { NotificationsModel } from "../modules/notification/notification.model.js";
// import { NotificationsService } from "../modules/notification/notification.service.js";
// import redisClient from "../config/redis.js";
// import pool from "../config/postgres.js"; // ← ADDED: Import pool for markOutboxAsProcessed
// import {
//   emitToUser,
//   emitToAdmins,
//   emitToConversation,
// } from "../config/socket.js";

// class NotificationWorker {
//   constructor() {
//     this.isRunning = false;
//     this.pollInterval = 5000; // 5 seconds
//     this.redisSubscriber = null;
//   }

//   /* ============================================
//      START WORKER
//   ============================================ */
//   async start() {
//     console.log("🔔 Notification Worker starting...");

//     // Start Redis subscriber (fast path)
//     this.startRedisSubscriber();

//     // Start outbox poller (fallback/guaranteed delivery)
//     this.startOutboxPoller();

//     this.isRunning = true;
//     console.log("✅ Notification Worker started successfully");
//   }

//   /* ============================================
//      START REDIS SUBSCRIBER (Real-time)
//   ============================================ */
//   async startRedisSubscriber() {
//     try {
//       const subscriber = redisClient.duplicate();
//       await subscriber.connect();

//       this.redisSubscriber = subscriber;

//       // Subscribe to SOS events
//       await subscriber.subscribe("sos:created", async (message) => {
//         const data = JSON.parse(message);
//         await this.handleSOSCreated(data, "redis");
//       });

//       await subscriber.subscribe("sos:acknowledged", async (message) => {
//         const data = JSON.parse(message);
//         await this.handleSOSAcknowledged(data, "redis");
//       });

//       await subscriber.subscribe("sos:status_updated", async (message) => {
//         const data = JSON.parse(message);
//         await this.handleSOSStatusUpdated(data, "redis");
//       });

//       await subscriber.subscribe("sos:resolved", async (message) => {
//         const data = JSON.parse(message);
//         await this.handleSOSResolved(data, "redis");
//       });

//       await subscriber.subscribe("sos:context_updated", async (message) => {
//         const data = JSON.parse(message);
//         await this.handleSOSContextUpdated(data);
//       });

//       await subscriber.subscribe("sos:address_updated", async (message) => {
//         const data = JSON.parse(message);
//         await this.handleSOSAddressUpdated(data);
//       });

//       console.log("✅ Redis subscriber connected and listening");
//     } catch (error) {
//       console.error("❌ Redis subscriber error:", error);
//       console.log("⚠️  Falling back to outbox polling only");
//     }
//   }

//   /* ============================================
//      START OUTBOX POLLER (Fallback)
//   ============================================ */
//   async startOutboxPoller() {
//     setInterval(async () => {
//       try {
//         await this.processOutbox();
//       } catch (error) {
//         console.error("Outbox polling error:", error);
//       }
//     }, this.pollInterval);

//     console.log("✅ Outbox poller started");
//   }

//   /* ============================================
//      PROCESS OUTBOX (Guaranteed delivery)
//   ============================================ */
//   async processOutbox() {
//     try {
//       // Get pending events that haven't been processed
//       const pendingEvents = await PanicAlarmModel.getPendingOutbox(10);

//       if (pendingEvents.length === 0) {
//         return;
//       }

//       console.log(
//         `📦 Processing ${pendingEvents.length} pending outbox events`,
//       );

//       for (const event of pendingEvents) {
//         try {
//           // Mark as processing
//           await PanicAlarmModel.updateOutboxStatus(
//             event.id,
//             "processing",
//             null,
//           );

//           const payload =
//             typeof event.payload === "string"
//               ? JSON.parse(event.payload)
//               : event.payload;

//           // Process based on event type
//           switch (event.event_type) {
//             case "sos_created":
//               await this.handleSOSCreated(payload, "outbox");
//               break;
//             case "sos_acknowledged":
//               await this.handleSOSAcknowledged(payload, "outbox");
//               break;
//             case "sos_status_updated":
//               await this.handleSOSStatusUpdated(payload, "outbox");
//               break;
//             case "sos_resolved":
//               await this.handleSOSResolved(payload, "outbox");
//               break;
//             default:
//               console.log(`Unknown event type: ${event.event_type}`);
//           }

//           // ✅ Mark as processed
//           await PanicAlarmModel.updateOutboxStatus(event.id, "processed", null);
//         } catch (error) {
//           console.error(`Error processing event ${event.id}:`, error);

//           // Mark as failed and increment retry count
//           await PanicAlarmModel.updateOutboxStatus(
//             event.id,
//             "failed",
//             error.message,
//           );
//         }
//       }
//     } catch (error) {
//       console.error("Process outbox error:", error);
//     }
//   }

//   /* ============================================
//      HANDLE SOS CREATED
     
//      ✅ FIXED: 
//      - Single notification creation (not duplicate)
//      - Added notificationId to WebSocket
//      - Added FCM sending
//   ============================================ */
//   async handleSOSCreated(data, source = "redis") {
//     try {
//       console.log(
//         `🚨 Processing SOS created: #${data.sos_id} (source: ${source})`,
//       );

//       // ============================================
//       // CHANNEL 1: Store in Database (User Notification)
//       // ============================================
//       const userNotification = await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "SOS Sent",
//         body: "Your SOS has been sent to police. Help is on the way.",
//         sosId: data.sos_id,
//         priority: "urgent",
//         data: {
//           sos_id: data.sos_id,
//           action: "open_sos",
//         },
//       });

//       // ============================================
//       // CHANNEL 2: Send FCM to User
//       // ============================================
//       await NotificationsService.sendFCMToUser(data.user_id, userNotification);

//       // ============================================
//       // CHANNEL 3: WebSocket to User
//       // ============================================
//       emitToUser(data.user_id, "sos_created", {
//         sosId: data.sos_id,
//         notificationId: userNotification.id, // ← FIXED: Added notification ID
//         status: "created",
//         message: "Your SOS has been sent to police",
//       });

//       // ============================================
//       // Admin Notification (Broadcast)
//       // ============================================
//       const adminNotification = await NotificationsModel.createNotification({
//         userId: null, // Broadcast
//         type: "sos_status",
//         category: "sos",
//         title: `🚨 NEW SOS ALARM — #${data.sos_id}`,
//         body: `${data.user.name} needs help${data.emergency_type ? ` - ${data.emergency_type}` : ""}`,
//         sosId: data.sos_id,
//         priority: "urgent",
//         data: {
//           sos_id: data.sos_id,
//           user_id: data.user_id,
//           user_name: data.user.name,
//           user_phone: data.user.phone,
//           latitude: data.latitude,
//           longitude: data.longitude,
//           sos_for: data.sos_for,
//           action: "open_sos",
//         },
//       });

//       // Send FCM to all admins
//       await NotificationsService.sendFCMToAdmins(adminNotification);

//       // WebSocket to all admins
//       emitToAdmins("new_sos", {
//         sosId: data.sos_id,
//         notificationId: adminNotification.id, // ← FIXED: Added notification ID
//         user: {
//           id: data.user_id,
//           name: data.user.name,
//           phone: data.user.phone,
//         },
//         location: {
//           latitude: data.latitude,
//           longitude: data.longitude,
//         },
//         sosFor: data.sos_for,
//         emergencyType: data.emergency_type,
//         status: "created",
//         createdAt: data.created_at,
//       });

//       // ✅ KEY FIX: If processed via Redis, mark outbox as processed
//       if (source === "redis") {
//         await this.markOutboxAsProcessed("sos_created", data.sos_id);
//       }

//       console.log(`✅ SOS created notifications sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS created error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS ACKNOWLEDGED
     
//      ✅ FIXED: 
//      - Single notification creation
//      - Added FCM sending
//      - Added notificationId to WebSocket
//   ============================================ */
//   async handleSOSAcknowledged(data, source = "redis") {
//     try {
//       console.log(
//         `✅ Processing SOS acknowledged: #${data.sos_id} (source: ${source})`,
//       );

//       const sos = await PanicAlarmModel.getSOSById(data.sos_id);

//       // ============================================
//       // CHANNEL 1: Store in Database
//       // ============================================
//       const notification = await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "Police Acknowledged",
//         body: `${sos.acknowledged_by_name} acknowledged your SOS. Help is on the way.`,
//         sosId: data.sos_id,
//         priority: "high",
//         data: {
//           admin_id: data.admin_id,
//           admin_name: sos.acknowledged_by_name,
//           action: "open_sos",
//         },
//       });

//       // ============================================
//       // CHANNEL 2: Send FCM Push Notification
//       // ============================================
//       await NotificationsService.sendFCMToUser(data.user_id, notification);

//       // ============================================
//       // CHANNEL 3: Send WebSocket (if app open)
//       // ============================================
//       emitToUser(data.user_id, "sos_acknowledged", {
//         sosId: data.sos_id,
//         notificationId: notification.id, // ← FIXED: Added notification ID
//         admin: {
//           id: data.admin_id,
//           name: sos.acknowledged_by_name,
//         },
//         status: "acknowledged",
//       });

//       // Emit to admins (SOS is now claimed)
//       emitToAdmins("sos_claimed", {
//         sosId: data.sos_id,
//         claimedBy: {
//           id: data.admin_id,
//           name: sos.acknowledged_by_name,
//         },
//       });

//       // ✅ Mark outbox as processed if from Redis
//       if (source === "redis") {
//         await this.markOutboxAsProcessed("sos_acknowledged", data.sos_id);
//       }

//       console.log(`✅ SOS acknowledged notification sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS acknowledged error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS STATUS UPDATED
     
//      ✅ FIXED: 
//      - Single notification creation
//      - Added FCM sending
//      - Added notificationId to WebSocket
//   ============================================ */
//   async handleSOSStatusUpdated(data, source = "redis") {
//     try {
//       console.log(
//         `📝 Processing SOS status update: #${data.sos_id} (source: ${source})`,
//       );

//       const statusMessages = {
//         responding: "Help is on the way",
//         cancelled: "SOS has been cancelled",
//       };

//       const message = statusMessages[data.status] || "SOS status updated";

//       // ============================================
//       // CHANNEL 1: Store in Database
//       // ============================================
//       const notification = await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "SOS Update",
//         body: message,
//         sosId: data.sos_id,
//         priority: "high",
//         data: {
//           status: data.status,
//           action: "open_sos",
//         },
//       });

//       // ============================================
//       // CHANNEL 2: Send FCM
//       // ============================================
//       await NotificationsService.sendFCMToUser(data.user_id, notification);

//       // ============================================
//       // CHANNEL 3: WebSocket
//       // ============================================
//       emitToUser(data.user_id, "sos_status_updated", {
//         sosId: data.sos_id,
//         notificationId: notification.id, // ← FIXED: Added notification ID
//         status: data.status,
//         message: message,
//       });

//       // ✅ Mark outbox as processed if from Redis
//       if (source === "redis") {
//         await this.markOutboxAsProcessed("sos_status_updated", data.sos_id);
//       }

//       console.log(`✅ Status update notification sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS status updated error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS RESOLVED
     
//      ✅ FIXED: 
//      - Single notification creation
//      - Added FCM sending
//      - Added notificationId to WebSocket
//   ============================================ */
//   async handleSOSResolved(data, source = "redis") {
//     try {
//       console.log(
//         `🎉 Processing SOS resolved: #${data.sos_id} (source: ${source})`,
//       );

//       const resolutionMessages = {
//         genuine_emergency:
//           "Your SOS has been resolved. Emergency assistance was provided.",
//         accidental: "Your SOS has been resolved. It was marked as accidental.",
//         false_alarm:
//           "Your SOS has been resolved. It was marked as a false alarm.",
//       };

//       const message =
//         resolutionMessages[data.resolution_type] ||
//         "Your SOS has been resolved.";

//       // ============================================
//       // CHANNEL 1: Store in Database
//       // ============================================
//       const notification = await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "SOS Resolved",
//         body: message,
//         sosId: data.sos_id,
//         priority: "normal",
//         data: {
//           resolution_type: data.resolution_type,
//           action: "open_sos",
//         },
//       });

//       // ============================================
//       // CHANNEL 2: Send FCM
//       // ============================================
//       await NotificationsService.sendFCMToUser(data.user_id, notification);

//       // ============================================
//       // CHANNEL 3: WebSocket
//       // ============================================
//       emitToUser(data.user_id, "sos_resolved", {
//         sosId: data.sos_id,
//         notificationId: notification.id, // ← FIXED: Added notification ID
//         resolutionType: data.resolution_type,
//         status: "resolved",
//         message: message,
//       });

//       // ✅ Mark outbox as processed if from Redis
//       if (source === "redis") {
//         await this.markOutboxAsProcessed("sos_resolved", data.sos_id);
//       }

//       console.log(`✅ SOS resolved notification sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS resolved error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS CONTEXT UPDATED (Real-time only)
//   ============================================ */
//   async handleSOSContextUpdated(data) {
//     console.log(`📝 SOS context updated for #${data.sos_id}`);

//     // Real-time update to admins (no notification needed)
//     emitToAdmins("sos_context_updated", {
//       sosId: data.sos_id,
//       emergencyType: data.emergency_type,
//       quickNote: data.quick_note,
//       estimatedCasualties: data.estimated_casualties,
//       userInjuredLevel: data.user_injured_level,
//       canReceiveCall: data.can_receive_call,
//     });
//   }

//   /* ============================================
//      HANDLE SOS ADDRESS UPDATED (Real-time)
//   ============================================ */
//   async handleSOSAddressUpdated(data) {
//     console.log(`📍 Address updated for SOS #${data.sos_id}: ${data.address}`);

//     // Real-time update to admins and user
//     emitToAdmins("sos_address_updated", {
//       sosId: data.sos_id,
//       address: data.address,
//     });

//     // Also emit to the user who created the SOS
//     const sos = await PanicAlarmModel.getSOSById(data.sos_id);
//     if (sos) {
//       emitToUser(sos.user_id, "sos_address_updated", {
//         sosId: data.sos_id,
//         address: data.address,
//       });
//     }
//   }

//   /* ============================================
//      ✅ FIXED FUNCTION: Mark Outbox as Processed
     
//      Changed from: PanicAlarmModel.pool.query
//      To: pool.query (direct import)
//   ============================================ */
//   async markOutboxAsProcessed(eventType, sosId) {
//     try {
//       // Find the outbox entry for this SOS and event type
//       const query = `
//         UPDATE outbox
//         SET 
//           status = 'processed',
//           processed_at = NOW()
//         WHERE event_type = $1
//         AND payload::jsonb->>'sos_id' = $2
//         AND status IN ('pending', 'processing')
//         RETURNING *;
//       `;

//       const result = await pool.query(query, [
//         // ← FIXED: Use pool directly
//         eventType,
//         sosId.toString(),
//       ]);

//       if (result.rowCount > 0) {
//         console.log(
//           `✅ Marked outbox as processed: ${eventType} for SOS #${sosId}`,
//         );
//       }
//     } catch (error) {
//       console.error("Error marking outbox as processed:", error);
//       // Don't throw - this is not critical
//     }
//   }

//   /* ============================================
//      STOP WORKER
//   ============================================ */
//   async stop() {
//     console.log("🛑 Stopping Notification Worker...");

//     if (this.redisSubscriber) {
//       await this.redisSubscriber.quit();
//     }

//     this.isRunning = false;
//     console.log("✅ Notification Worker stopped");
//   }
// }

// // Export singleton instance
// export const notificationWorker = new NotificationWorker();

// // Auto-start if running directly
// if (import.meta.url === `file://${process.argv[1]}`) {
//   notificationWorker.start().catch(console.error);

//   // Graceful shutdown
//   process.on("SIGTERM", async () => {
//     await notificationWorker.stop();
//     process.exit(0);
//   });

//   process.on("SIGINT", async () => {
//     await notificationWorker.stop();
//     process.exit(0);
//   });
// }

// // src/workers/notificationWorker.js
// // FIXED VERSION - Prevents duplicate notifications

// import { PanicAlarmModel } from "../modules/panic-alarm/panicAlarm.model.js";
// import { NotificationsModel } from "../modules/notification/notification.model.js";
// import { NotificationsService } from "../modules/notification/notification.service.js";
// import redisClient from "../config/redis.js";
// import {
//   emitToUser,
//   emitToAdmins,
//   emitToConversation,
// } from "../config/socket.js";

// class NotificationWorker {
//   constructor() {
//     this.isRunning = false;
//     this.pollInterval = 5000; // 5 seconds
//     this.redisSubscriber = null;
//   }

//   /* ============================================
//      START WORKER
//   ============================================ */
//   async start() {
//     console.log("🔔 Notification Worker starting...");

//     // Start Redis subscriber (fast path)
//     this.startRedisSubscriber();

//     // Start outbox poller (fallback/guaranteed delivery)
//     this.startOutboxPoller();

//     this.isRunning = true;
//     console.log("✅ Notification Worker started successfully");
//   }

//   /* ============================================
//      START REDIS SUBSCRIBER (Real-time)
//   ============================================ */
//   async startRedisSubscriber() {
//     try {
//       const subscriber = redisClient.duplicate();
//       await subscriber.connect();

//       this.redisSubscriber = subscriber;

//       // Subscribe to SOS events
//       await subscriber.subscribe("sos:created", async (message) => {
//         const data = JSON.parse(message);
//         await this.handleSOSCreated(data, "redis"); // ← Pass source
//       });

//       await subscriber.subscribe("sos:acknowledged", async (message) => {
//         const data = JSON.parse(message);
//         await this.handleSOSAcknowledged(data, "redis");
//       });

//       await subscriber.subscribe("sos:status_updated", async (message) => {
//         const data = JSON.parse(message);
//         await this.handleSOSStatusUpdated(data, "redis");
//       });

//       await subscriber.subscribe("sos:resolved", async (message) => {
//         const data = JSON.parse(message);
//         await this.handleSOSResolved(data, "redis");
//       });

//       await subscriber.subscribe("sos:context_updated", async (message) => {
//         const data = JSON.parse(message);
//         await this.handleSOSContextUpdated(data);
//       });

//       await subscriber.subscribe("sos:address_updated", async (message) => {
//         const data = JSON.parse(message);
//         await this.handleSOSAddressUpdated(data);
//       });

//       console.log("✅ Redis subscriber connected and listening");
//     } catch (error) {
//       console.error("❌ Redis subscriber error:", error);
//       console.log("⚠️  Falling back to outbox polling only");
//     }
//   }

//   /* ============================================
//      START OUTBOX POLLER (Fallback)
//   ============================================ */
//   async startOutboxPoller() {
//     setInterval(async () => {
//       try {
//         await this.processOutbox();
//       } catch (error) {
//         console.error("Outbox polling error:", error);
//       }
//     }, this.pollInterval);

//     console.log("✅ Outbox poller started");
//   }

//   /* ============================================
//      PROCESS OUTBOX (Guaranteed delivery)
//   ============================================ */
//   async processOutbox() {
//     try {
//       // Get pending events that haven't been processed
//       const pendingEvents = await PanicAlarmModel.getPendingOutbox(10);

//       if (pendingEvents.length === 0) {
//         return;
//       }

//       console.log(
//         `📦 Processing ${pendingEvents.length} pending outbox events`,
//       );

//       for (const event of pendingEvents) {
//         try {
//           // Mark as processing
//           await PanicAlarmModel.updateOutboxStatus(
//             event.id,
//             "processing",
//             null,
//           );

//           const payload =
//             typeof event.payload === "string"
//               ? JSON.parse(event.payload)
//               : event.payload;

//           // Process based on event type
//           switch (event.event_type) {
//             case "sos_created":
//               await this.handleSOSCreated(payload, "outbox"); // ← Pass source
//               break;
//             case "sos_acknowledged":
//               await this.handleSOSAcknowledged(payload, "outbox");
//               break;
//             case "sos_status_updated":
//               await this.handleSOSStatusUpdated(payload, "outbox");
//               break;
//             case "sos_resolved":
//               await this.handleSOSResolved(payload, "outbox");
//               break;
//             default:
//               console.log(`Unknown event type: ${event.event_type}`);
//           }

//           // ✅ Mark as processed
//           await PanicAlarmModel.updateOutboxStatus(event.id, "processed", null);
//         } catch (error) {
//           console.error(`Error processing event ${event.id}:`, error);

//           // Mark as failed and increment retry count
//           await PanicAlarmModel.updateOutboxStatus(
//             event.id,
//             "failed",
//             error.message,
//           );
//         }
//       }
//     } catch (error) {
//       console.error("Process outbox error:", error);
//     }
//   }

//   /* ============================================
//      HANDLE SOS CREATED

//      KEY FIX: When called from Redis, mark outbox as processed
//   ============================================ */
//   async handleSOSCreated(data, source = "redis") {
//     try {
//       console.log(
//         `🚨 Processing SOS created: #${data.sos_id} (source: ${source})`,
//       );

//       // // 1. Create notification for user
//       // await NotificationsService.createNotification({
//       //   userId: data.user_id,
//       //   type: "sos_status",
//       //   category: "sos",
//       //   title: "SOS Sent",
//       //   body: "Your SOS has been sent to police. Help is on the way.",
//       //   sosId: data.sos_id,
//       //   priority: "urgent",
//       // });

//       // ============================================
//       // CHANNEL 1: Store in Database (User Notification)
//       // ============================================
//       const userNotification = await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "SOS Sent",
//         body: "Your SOS has been sent to police. Help is on the way.",
//         sosId: data.sos_id,
//         priority: "urgent",
//         data: {
//           sos_id: data.sos_id,
//           action: "open_sos",
//         },
//       });
//       // ============================================
//       // CHANNEL 2: Send FCM to User
//       // ============================================
//       await NotificationsService.sendFCMToUser(data.user_id, userNotification);
//       // ============================================
//       // CHANNEL 3: WebSocket to User
//       // ============================================
//       emitToUser(data.user_id, "sos_created", {
//         sosId: data.sos_id,
//         notificationId: userNotification.id,
//         status: "created",
//         message: "Your SOS has been sent to police",
//       });

//       // 2. Create notification for admins and send FCM
//       const adminNotification = await NotificationsModel.createNotification({
//         userId: null,
//         type: "sos_status",
//         category: "sos",
//         title: `🚨 NEW SOS ALARM — #${data.sos_id}`,
//         body: `${data.user.name} needs help${data.emergency_type ? ` - ${data.emergency_type}` : ""}`,
//         sosId: data.sos_id,
//         priority: "urgent",
//         data: {
//           sos_id: data.sos_id,
//           user_id: data.user_id,
//           user_name: data.user.name,
//           user_phone: data.user.phone,
//           latitude: data.latitude,
//           longitude: data.longitude,
//           sos_for: data.sos_for,
//           action: "open_sos",
//         },
//       });

//       // 3. Send FCM to all admins
//       await NotificationsService.sendFCMToAdmins(adminNotification);

//       // 4. Emit via WebSocket to all admins
//       emitToAdmins("new_sos", {
//         sosId: data.sos_id,
//         user: {
//           id: data.user_id,
//           name: data.user.name,
//           phone: data.user.phone,
//         },
//         location: {
//           latitude: data.latitude,
//           longitude: data.longitude,
//         },
//         sosFor: data.sos_for,
//         emergencyType: data.emergency_type,
//         status: "created",
//         createdAt: data.created_at,
//       });

//       // ✅ KEY FIX: If processed via Redis, mark outbox as processed
//       if (source === "redis") {
//         await this.markOutboxAsProcessed("sos_created", data.sos_id);
//       }

//       console.log(`✅ SOS created notifications sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS created error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS ACKNOWLEDGED
//   ============================================ */
//   async handleSOSAcknowledged(data, source = "redis") {
//     try {
//       console.log(
//         `✅ Processing SOS acknowledged: #${data.sos_id} (source: ${source})`,
//       );

//       const sos = await PanicAlarmModel.getSOSById(data.sos_id);

//       // // Create notification for user
//       // await NotificationsService.createNotification({
//       //   userId: data.user_id,
//       //   type: "sos_status",
//       //   category: "sos",
//       //   title: "Police Acknowledged",
//       //   body: `${sos.acknowledged_by_name} acknowledged your SOS. Help is on the way.`,
//       //   sosId: data.sos_id,
//       //   priority: "high",
//       // });//

//       const notification = await NotificationsService.createNotification({
//         userId: data.user_id, // 1523 (Ahmad)
//         type: "sos_status",
//         category: "sos",
//         title: "Police Acknowledged",
//         body: `${sos.acknowledged_by_name} acknowledged your SOS.`,
//         sosId: data.sos_id, // 4521
//         priority: "high",
//         data: {
//           // Extra data stored as JSON
//           admin_id: data.admin_id,
//           admin_name: sos.acknowledged_by_name,
//           action: "open_sos",
//         },
//       });
//       // ============================================
//       // CHANNEL 2: Send FCM Push Notification
//       // ============================================
//       await NotificationsService.sendFCMToUser(data.user_id, notification);

//       // // Emit to user via WebSocket
//       // emitToUser(data.user_id, "sos_acknowledged", {
//       //   sosId: data.sos_id,
//       //   admin: {
//       //     id: data.admin_id,
//       //     name: sos.acknowledged_by_name,
//       //   },
//       //   status: "acknowledged",
//       // });

//       // ============================================
//       // CHANNEL 3: Send WebSocket (if app open)
//       // ============================================
//       emitToUser(data.user_id, "sos_acknowledged", {
//         sosId: data.sos_id,
//         notificationId: notification.id,
//         admin: {
//           id: data.admin_id,
//           name: sos.acknowledged_by_name,
//         },
//         status: "acknowledged",
//       });

//       // Emit to admins (SOS is now claimed)
//       emitToAdmins("sos_claimed", {
//         sosId: data.sos_id,
//         claimedBy: {
//           id: data.admin_id,
//           name: sos.acknowledged_by_name,
//         },
//       });

//       // ✅ Mark outbox as processed if from Redis
//       if (source === "redis") {
//         await this.markOutboxAsProcessed("sos_acknowledged", data.sos_id);
//       }

//       console.log(`✅ SOS acknowledged notification sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS acknowledged error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS STATUS UPDATED
//   ============================================ */
//   async handleSOSStatusUpdated(data, source = "redis") {
//     try {
//       console.log(
//         `📝 Processing SOS status update: #${data.sos_id} (source: ${source})`,
//       );

//       const statusMessages = {
//         responding: "Help is on the way",
//         cancelled: "SOS has been cancelled",
//       };

//       const message = statusMessages[data.status] || "SOS status updated";

//       // // Create notification for user
//       // await NotificationsService.createNotification({
//       //   userId: data.user_id,
//       //   type: "sos_status",
//       //   category: "sos",
//       //   title: "SOS Update",
//       //   body: message,
//       //   sosId: data.sos_id,
//       //   priority: "high",
//       // });

//       // ============================================
//       // CHANNEL 1: Store in Database
//       // ============================================
//       const notification = await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "SOS Update",
//         body: message,
//         sosId: data.sos_id,
//         priority: "high",
//         data: {
//           status: data.status,
//           action: "open_sos",
//         },
//       });
//       // ============================================
//       // CHANNEL 2: Send FCM
//       // ============================================
//       await NotificationsService.sendFCMToUser(data.user_id, notification);

//       // // Emit to user via WebSocket
//       // emitToUser(data.user_id, "sos_status_updated", {
//       //   sosId: data.sos_id,
//       //   status: data.status,
//       // });

//       // ============================================
//       // CHANNEL 3: WebSocket
//       // ============================================
//       emitToUser(data.user_id, "sos_status_updated", {
//         sosId: data.sos_id,
//         notificationId: notification.id,
//         status: data.status,
//         message: message?message:null,
//       });

//       // ✅ Mark outbox as processed if from Redis
//       if (source === "redis") {
//         await this.markOutboxAsProcessed("sos_status_updated", data.sos_id);
//       }

//       console.log(`✅ Status update notification sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS status updated error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS RESOLVED
//   ============================================ */
//   async handleSOSResolved(data, source = "redis") {
//     try {
//       console.log(
//         `🎉 Processing SOS resolved: #${data.sos_id} (source: ${source})`,
//       );

//       const resolutionMessages = {
//         genuine_emergency:
//           "Your SOS has been resolved. Emergency assistance was provided.",
//         accidental: "Your SOS has been resolved. It was marked as accidental.",
//         false_alarm:
//           "Your SOS has been resolved. It was marked as a false alarm.",
//       };

//       const message =
//         resolutionMessages[data.resolution_type] ||
//         "Your SOS has been resolved.";

//       // Create notification for user
//       await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "SOS Resolved",
//         body: message,
//         sosId: data.sos_id,
//         priority: "normal",
//       });

//       // Emit to user via WebSocket
//       emitToUser(data.user_id, "sos_resolved", {
//         sosId: data.sos_id,
//         resolutionType: data.resolution_type,
//         status: "resolved",
//       });

//       // ✅ Mark outbox as processed if from Redis
//       if (source === "redis") {
//         await this.markOutboxAsProcessed("sos_resolved", data.sos_id);
//       }

//       console.log(`✅ SOS resolved notification sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS resolved error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS CONTEXT UPDATED (Real-time only)
//   ============================================ */
//   async handleSOSContextUpdated(data) {
//     console.log(`📝 SOS context updated for #${data.sos_id}`);

//     // Real-time update to admins (no notification needed)
//     emitToAdmins("sos_context_updated", {
//       sosId: data.sos_id,
//       emergencyType: data.emergency_type,
//       quickNote: data.quick_note,
//       estimatedCasualties: data.estimated_casualties,
//       userInjuredLevel: data.user_injured_level,
//       canReceiveCall: data.can_receive_call,
//     });
//   }

//   /* ============================================
//      HANDLE SOS ADDRESS UPDATED (Real-time)
//   ============================================ */
//   async handleSOSAddressUpdated(data) {
//     console.log(`📍 Address updated for SOS #${data.sos_id}: ${data.address}`);

//     // Real-time update to admins and user
//     emitToAdmins("sos_address_updated", {
//       sosId: data.sos_id,
//       address: data.address,
//     });

//     // Also emit to the user who created the SOS
//     const sos = await PanicAlarmModel.getSOSById(data.sos_id);
//     if (sos) {
//       emitToUser(sos.user_id, "sos_address_updated", {
//         sosId: data.sos_id,
//         address: data.address,
//       });
//     }
//   }

//   /* ============================================
//      ✅ NEW FUNCTION: Mark Outbox as Processed

//      This prevents duplicate notifications when Redis succeeds
//   ============================================ */
//   async markOutboxAsProcessed(eventType, sosId) {
//     try {
//       // Find the outbox entry for this SOS and event type
//       const query = `
//         UPDATE outbox
//         SET
//           status = 'processed',
//           processed_at = NOW()
//         WHERE event_type = $1
//         AND payload::jsonb->>'sos_id' = $2
//         AND status IN ('pending', 'processing')
//         RETURNING *;
//       `;

//       const result = await PanicAlarmModel.pool.query(query, [
//         eventType,
//         sosId.toString(),
//       ]);

//       if (result.rowCount > 0) {
//         console.log(
//           `✅ Marked outbox as processed: ${eventType} for SOS #${sosId}`,
//         );
//       }
//     } catch (error) {
//       console.error("Error marking outbox as processed:", error);
//       // Don't throw - this is not critical
//     }
//   }

//   /* ============================================
//      STOP WORKER
//   ============================================ */
//   async stop() {
//     console.log("🛑 Stopping Notification Worker...");

//     if (this.redisSubscriber) {
//       await this.redisSubscriber.quit();
//     }

//     this.isRunning = false;
//     console.log("✅ Notification Worker stopped");
//   }
// }

// // Export singleton instance
// export const notificationWorker = new NotificationWorker();

// // Auto-start if running directly
// if (import.meta.url === `file://${process.argv[1]}`) {
//   notificationWorker.start().catch(console.error);

//   // Graceful shutdown
//   process.on("SIGTERM", async () => {
//     await notificationWorker.stop();
//     process.exit(0);
//   });

//   process.on("SIGINT", async () => {
//     await notificationWorker.stop();
//     process.exit(0);
//   });
// }

// src/workers/notificationWorker.js

// import { PanicAlarmModel } from "../modules/panicAlarm/panicAlarm.model.js";
// import { NotificationsModel } from "../modules/notifications/notifications.model.js";
// import { NotificationsService } from "../modules/notifications/notifications.service.js";
// import redisClient from "../config/redis.js";
// import {
//   emitToUser,
//   emitToAdmins,
//   emitToConversation,
// } from "../config/socket.js";

// class NotificationWorker {
//   constructor() {
//     this.isRunning = false;
//     this.pollInterval = 5000; // 5 seconds
//     this.redisSubscriber = null;
//   }

//   /* ============================================
//      START WORKER
//   ============================================ */
//   async start() {
//     console.log("🔔 Notification Worker starting...");

//     // Start Redis subscriber (fast path)
//     this.startRedisSubscriber();

//     // Start outbox poller (fallback/guaranteed delivery)
//     this.startOutboxPoller();

//     this.isRunning = true;
//     console.log("✅ Notification Worker started successfully");
//   }

//   /* ============================================
//      START REDIS SUBSCRIBER (Real-time)
//   ============================================ */
//   async startRedisSubscriber() {
//     try {
//       const subscriber = redisClient.duplicate();
//       await subscriber.connect();

//       this.redisSubscriber = subscriber;

//       // Subscribe to SOS events
//       await subscriber.subscribe("sos:created", (message) => {
//         this.handleSOSCreated(JSON.parse(message));
//       });

//       await subscriber.subscribe("sos:acknowledged", (message) => {
//         this.handleSOSAcknowledged(JSON.parse(message));
//       });

//       await subscriber.subscribe("sos:status_updated", (message) => {
//         this.handleSOSStatusUpdated(JSON.parse(message));
//       });

//       await subscriber.subscribe("sos:resolved", (message) => {
//         this.handleSOSResolved(JSON.parse(message));
//       });

//       await subscriber.subscribe("sos:context_updated", (message) => {
//         this.handleSOSContextUpdated(JSON.parse(message));
//       });

//       await subscriber.subscribe("sos:address_updated", (message) => {
//         this.handleSOSAddressUpdated(JSON.parse(message));
//       });

//       console.log("✅ Redis subscriber connected and listening");
//     } catch (error) {
//       console.error("❌ Redis subscriber error:", error);
//       console.log("⚠️  Falling back to outbox polling only");
//     }
//   }

//   /* ============================================
//      START OUTBOX POLLER (Fallback)
//   ============================================ */
//   async startOutboxPoller() {
//     setInterval(async () => {
//       try {
//         await this.processOutbox();
//       } catch (error) {
//         console.error("Outbox polling error:", error);
//       }
//     }, this.pollInterval);

//     console.log("✅ Outbox poller started");
//   }

//   /* ============================================
//      PROCESS OUTBOX (Guaranteed delivery)
//   ============================================ */
//   async processOutbox() {
//     try {
//       const pendingEvents = await PanicAlarmModel.getPendingOutbox(10);

//       if (pendingEvents.length === 0) {
//         return;
//       }

//       console.log(`📦 Processing ${pendingEvents.length} pending events`);

//       for (const event of pendingEvents) {
//         try {
//           await PanicAlarmModel.updateOutboxStatus(
//             event.id,
//             "processing",
//             null,
//           );

//           const payload =
//             typeof event.payload === "string"
//               ? JSON.parse(event.payload)
//               : event.payload;

//           switch (event.event_type) {
//             case "sos_created":
//               await this.handleSOSCreated(payload);
//               break;
//             case "sos_acknowledged":
//               await this.handleSOSAcknowledged(payload);
//               break;
//             case "sos_status_updated":
//               await this.handleSOSStatusUpdated(payload);
//               break;
//             case "sos_resolved":
//               await this.handleSOSResolved(payload);
//               break;
//             default:
//               console.log(`Unknown event type: ${event.event_type}`);
//           }

//           await PanicAlarmModel.updateOutboxStatus(event.id, "processed", null);
//         } catch (error) {
//           console.error(`Error processing event ${event.id}:`, error);
//           await PanicAlarmModel.updateOutboxStatus(
//             event.id,
//             "failed",
//             error.message,
//           );
//         }
//       }
//     } catch (error) {
//       console.error("Process outbox error:", error);
//     }
//   }

//   /* ============================================
//      HANDLE SOS CREATED
//   ============================================ */
//   async handleSOSCreated(data) {
//     try {
//       console.log(`🚨 Processing SOS created: #${data.sos_id}`);

//       // 1. Create notification for user
//       await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "SOS Sent",
//         body: "Your SOS has been sent to police. Help is on the way.",
//         sosId: data.sos_id,
//         priority: "urgent",
//       });

//       // 2. Create notification for admins and send FCM
//       const adminNotification = await NotificationsModel.createNotification({
//         userId: null,
//         type: "sos_status",
//         category: "sos",
//         title: `🚨 NEW SOS ALARM — #${data.sos_id}`,
//         body: `${data.user.name} needs help${data.emergency_type ? ` - ${data.emergency_type}` : ""}`,
//         sosId: data.sos_id,
//         priority: "urgent",
//         data: {
//           sos_id: data.sos_id,
//           user_id: data.user_id,
//           user_name: data.user.name,
//           user_phone: data.user.phone,
//           latitude: data.latitude,
//           longitude: data.longitude,
//           sos_for: data.sos_for,
//         },
//       });

//       // 3. Send FCM to all admins
//       await NotificationsService.sendFCMToAdmins(adminNotification);

//       // 4. ✅ REAL-TIME: Emit to all admins via WebSocket
//       emitToAdmins("new_sos", {
//         sosId: data.sos_id,
//         user: {
//           id: data.user_id,
//           name: data.user.name,
//           phone: data.user.phone,
//         },
//         location: {
//           latitude: data.latitude,
//           longitude: data.longitude,
//         },
//         sosFor: data.sos_for,
//         emergencyType: data.emergency_type,
//         status: "created",
//         createdAt: data.created_at,
//       });

//       console.log(`✅ SOS created notifications sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS created error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS ACKNOWLEDGED
//   ============================================ */
//   async handleSOSAcknowledged(data) {
//     try {
//       console.log(`✅ Processing SOS acknowledged: #${data.sos_id}`);

//       const sos = await PanicAlarmModel.getSOSById(data.sos_id);

//       // Create notification for user
//       await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "Police Acknowledged",
//         body: `${sos.acknowledged_by_name} acknowledged your SOS. Help is on the way.`,
//         sosId: data.sos_id,
//         priority: "high",
//       });

//       // ✅ REAL-TIME: Emit to user via WebSocket
//       emitToUser(data.user_id, "sos_acknowledged", {
//         sosId: data.sos_id,
//         admin: {
//           id: data.admin_id,
//           name: sos.acknowledged_by_name,
//         },
//         status: "acknowledged",
//       });

//       // ✅ REAL-TIME: Emit to admins (SOS is now claimed)
//       emitToAdmins("sos_claimed", {
//         sosId: data.sos_id,
//         claimedBy: {
//           id: data.admin_id,
//           name: sos.acknowledged_by_name,
//         },
//       });

//       console.log(`✅ SOS acknowledged notification sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS acknowledged error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS STATUS UPDATED
//   ============================================ */
//   async handleSOSStatusUpdated(data) {
//     try {
//       console.log(`📝 Processing SOS status update: #${data.sos_id}`);

//       const statusMessages = {
//         responding: "Help is on the way",
//         cancelled: "SOS has been cancelled",
//       };

//       const message = statusMessages[data.status] || "SOS status updated";

//       // Create notification for user
//       await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "SOS Update",
//         body: message,
//         sosId: data.sos_id,
//         priority: "high",
//       });

//       // ✅ REAL-TIME: Emit to user via WebSocket
//       emitToUser(data.user_id, "sos_status_updated", {
//         sosId: data.sos_id,
//         status: data.status,
//       });

//       console.log(`✅ Status update notification sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS status updated error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS RESOLVED
//   ============================================ */
//   async handleSOSResolved(data) {
//     try {
//       console.log(`🎉 Processing SOS resolved: #${data.sos_id}`);

//       const resolutionMessages = {
//         genuine_emergency:
//           "Your SOS has been resolved. Emergency assistance was provided.",
//         accidental: "Your SOS has been resolved. It was marked as accidental.",
//         false_alarm:
//           "Your SOS has been resolved. It was marked as a false alarm.",
//       };

//       const message =
//         resolutionMessages[data.resolution_type] ||
//         "Your SOS has been resolved.";

//       // Create notification for user
//       await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "SOS Resolved",
//         body: message,
//         sosId: data.sos_id,
//         priority: "normal",
//       });

//       // ✅ REAL-TIME: Emit to user via WebSocket
//       emitToUser(data.user_id, "sos_resolved", {
//         sosId: data.sos_id,
//         resolutionType: data.resolution_type,
//         status: "resolved",
//       });

//       console.log(`✅ SOS resolved notification sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS resolved error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS CONTEXT UPDATED (Real-time to admin)
//   ============================================ */
//   async handleSOSContextUpdated(data) {
//     console.log(`📝 SOS context updated for #${data.sos_id}`);

//     // ✅ REAL-TIME: Emit to admins viewing this SOS
//     emitToAdmins("sos_context_updated", {
//       sosId: data.sos_id,
//       emergencyType: data.emergency_type,
//       quickNote: data.quick_note,
//       estimatedCasualties: data.estimated_casualties,
//       userInjuredLevel: data.user_injured_level,
//       canReceiveCall: data.can_receive_call,
//     });
//   }

//   /* ============================================
//      HANDLE SOS ADDRESS UPDATED (Real-time)
//   ============================================ */
//   async handleSOSAddressUpdated(data) {
//     console.log(`📍 Address updated for SOS #${data.sos_id}: ${data.address}`);

//     // ✅ REAL-TIME: Emit to all admins and user
//     emitToAdmins("sos_address_updated", {
//       sosId: data.sos_id,
//       address: data.address,
//     });

//     // Also emit to the user who created the SOS
//     const sos = await PanicAlarmModel.getSOSById(data.sos_id);
//     if (sos) {
//       emitToUser(sos.user_id, "sos_address_updated", {
//         sosId: data.sos_id,
//         address: data.address,
//       });
//     }
//   }

//   /* ============================================
//      STOP WORKER
//   ============================================ */
//   async stop() {
//     console.log("🛑 Stopping Notification Worker...");

//     if (this.redisSubscriber) {
//       await this.redisSubscriber.quit();
//     }

//     this.isRunning = false;
//     console.log("✅ Notification Worker stopped");
//   }
// }

// // Export singleton instance
// export const notificationWorker = new NotificationWorker();

// // Auto-start if running directly
// if (import.meta.url === `file://${process.argv[1]}`) {
//   notificationWorker.start().catch(console.error);

//   // Graceful shutdown
//   process.on("SIGTERM", async () => {
//     await notificationWorker.stop();
//     process.exit(0);
//   });

//   process.on("SIGINT", async () => {
//     await notificationWorker.stop();
//     process.exit(0);
//   });
// }

// // src/workers/notificationWorker.js

// import { PanicAlarmModel } from "../modules/panic-alarm/panicAlarm.model.js";
// import { NotificationsModel } from "../modules/notification/notification.model.js";
// import { NotificationsService } from "../modules/notification/notification.service.js";
// import redisClient from "../config/redis.js";

// class NotificationWorker {
//   constructor() {
//     this.isRunning = false;
//     this.pollInterval = 5000; // 5 seconds
//     this.redisSubscriber = null;
//   }

//   /* ============================================
//      START WORKER
//   ============================================ */
//   async start() {
//     console.log("🔔 Notification Worker starting...");

//     // Start Redis subscriber (fast path)
//     this.startRedisSubscriber();

//     // Start outbox poller (fallback/guaranteed delivery)
//     this.startOutboxPoller();

//     this.isRunning = true;
//     console.log("✅ Notification Worker started successfully");
//   }

//   /* ============================================
//      START REDIS SUBSCRIBER (Real-time)
//   ============================================ */
//   async startRedisSubscriber() {
//     try {
//       // Create a separate Redis client for subscribing
//       const subscriber = redisClient.duplicate();
//       await subscriber.connect();

//       this.redisSubscriber = subscriber;

//       // Subscribe to SOS events
//       await subscriber.subscribe("sos:created", (message) => {
//         this.handleSOSCreated(JSON.parse(message));
//       });

//       await subscriber.subscribe("sos:acknowledged", (message) => {
//         this.handleSOSAcknowledged(JSON.parse(message));
//       });

//       await subscriber.subscribe("sos:status_updated", (message) => {
//         this.handleSOSStatusUpdated(JSON.parse(message));
//       });

//       await subscriber.subscribe("sos:resolved", (message) => {
//         this.handleSOSResolved(JSON.parse(message));
//       });

//       await subscriber.subscribe("sos:context_updated", (message) => {
//         this.handleSOSContextUpdated(JSON.parse(message));
//       });

//       await subscriber.subscribe("sos:address_updated", (message) => {
//         this.handleSOSAddressUpdated(JSON.parse(message));
//       });

//       await subscriber.subscribe("sos:new_message", (message) => {
//         this.handleNewMessage(JSON.parse(message));
//       });

//       console.log("✅ Redis subscriber connected and listening");
//     } catch (error) {
//       console.error("❌ Redis subscriber error:", error);
//       console.log("⚠️  Falling back to outbox polling only");
//     }
//   }

//   /* ============================================
//      START OUTBOX POLLER (Fallback)
//   ============================================ */
//   async startOutboxPoller() {
//     setInterval(async () => {
//       try {
//         await this.processOutbox();
//       } catch (error) {
//         console.error("Outbox polling error:", error);
//       }
//     }, this.pollInterval);

//     console.log("✅ Outbox poller started");
//   }

//   /* ============================================
//      PROCESS OUTBOX (Guaranteed delivery)
//   ============================================ */
//   async processOutbox() {
//     try {
//       const pendingEvents = await PanicAlarmModel.getPendingOutbox(10);

//       if (pendingEvents.length === 0) {
//         return;
//       }

//       console.log(`📦 Processing ${pendingEvents.length} pending events`);

//       for (const event of pendingEvents) {
//         try {
//           // Mark as processing
//           await PanicAlarmModel.updateOutboxStatus(
//             event.id,
//             "processing",
//             null,
//           );

//           // Handle based on event type
//           const payload =
//             typeof event.payload === "string"
//               ? JSON.parse(event.payload)
//               : event.payload;

//           switch (event.event_type) {
//             case "sos_created":
//               await this.handleSOSCreated(payload);
//               break;
//             case "sos_acknowledged":
//               await this.handleSOSAcknowledged(payload);
//               break;
//             case "sos_status_updated":
//               await this.handleSOSStatusUpdated(payload);
//               break;
//             case "sos_resolved":
//               await this.handleSOSResolved(payload);
//               break;
//             default:
//               console.log(`Unknown event type: ${event.event_type}`);
//           }

//           // Mark as processed
//           await PanicAlarmModel.updateOutboxStatus(event.id, "processed", null);
//         } catch (error) {
//           console.error(`Error processing event ${event.id}:`, error);

//           // Mark as failed
//           await PanicAlarmModel.updateOutboxStatus(
//             event.id,
//             "failed",
//             error.message,
//           );
//         }
//       }
//     } catch (error) {
//       console.error("Process outbox error:", error);
//     }
//   }

//   /* ============================================
//      HANDLE SOS CREATED
//   ============================================ */
//   async handleSOSCreated(data) {
//     try {
//       console.log(`🚨 Processing SOS created: #${data.sos_id}`);

//       // 1. Create notification for user
//       await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "SOS Sent",
//         body: "Your SOS has been sent to police. Help is on the way.",
//         sosId: data.sos_id,
//         priority: "urgent",
//       });

//       // 2. Create notification for admins and send FCM
//       const adminNotification = await NotificationsModel.createNotification({
//         userId: null, // Broadcast to all admins
//         type: "sos_status",
//         category: "sos",
//         title: `🚨 NEW SOS ALARM — #${data.sos_id}`,
//         body: `${data.user.name} needs help${data.emergency_type ? ` - ${data.emergency_type}` : ""}`,
//         sosId: data.sos_id,
//         priority: "urgent",
//         data: {
//           sos_id: data.sos_id,
//           user_id: data.user_id,
//           user_name: data.user.name,
//           user_phone: data.user.phone,
//           latitude: data.latitude,
//           longitude: data.longitude,
//           sos_for: data.sos_for,
//         },
//       });

//       // 3. Send FCM to all admins
//       await NotificationsService.sendFCMToAdmins(adminNotification);

//       console.log(`✅ SOS created notifications sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS created error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS ACKNOWLEDGED
//   ============================================ */
//   async handleSOSAcknowledged(data) {
//     try {
//       console.log(`✅ Processing SOS acknowledged: #${data.sos_id}`);

//       // Get admin name
//       const sos = await PanicAlarmModel.getSOSById(data.sos_id);

//       // Create notification for user
//       await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "Police Acknowledged",
//         body: `${sos.acknowledged_by_name} acknowledged your SOS. Help is on the way.`,
//         sosId: data.sos_id,
//         priority: "high",
//       });

//       console.log(`✅ SOS acknowledged notification sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS acknowledged error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS STATUS UPDATED
//   ============================================ */
//   async handleSOSStatusUpdated(data) {
//     try {
//       console.log(`📝 Processing SOS status update: #${data.sos_id}`);

//       const statusMessages = {
//         responding: "Help is on the way",
//         cancelled: "SOS has been cancelled",
//       };

//       const message = statusMessages[data.status] || "SOS status updated";

//       // Create notification for user
//       await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "SOS Update",
//         body: message,
//         sosId: data.sos_id,
//         priority: "high",
//       });

//       console.log(`✅ Status update notification sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS status updated error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS RESOLVED
//   ============================================ */
//   async handleSOSResolved(data) {
//     try {
//       console.log(`🎉 Processing SOS resolved: #${data.sos_id}`);

//       const resolutionMessages = {
//         genuine_emergency: "Your SOS has been resolved. Emergency assistance was provided.",
//         accidental: "Your SOS has been resolved. It was marked as accidental.",
//         false_alarm: "Your SOS has been resolved. It was marked as a false alarm.",
//       };

//       const message =
//         resolutionMessages[data.resolution_type] ||
//         "Your SOS has been resolved.";

//       // Create notification for user
//       await NotificationsService.createNotification({
//         userId: data.user_id,
//         type: "sos_status",
//         category: "sos",
//         title: "SOS Resolved",
//         body: message,
//         sosId: data.sos_id,
//         priority: "normal",
//       });

//       console.log(`✅ SOS resolved notification sent for #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle SOS resolved error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      HANDLE SOS CONTEXT UPDATED (Real-time to admin)
//   ============================================ */
//   async handleSOSContextUpdated(data) {
//     // This is just for WebSocket real-time updates to admin
//     // No notification needed
//     console.log(`📝 SOS context updated for #${data.sos_id}`);
//   }

//   /* ============================================
//      HANDLE SOS ADDRESS UPDATED (Real-time)
//   ============================================ */
//   async handleSOSAddressUpdated(data) {
//     // This is just for WebSocket real-time updates
//     // No notification needed
//     console.log(`📍 Address updated for SOS #${data.sos_id}: ${data.address}`);
//   }

//   /* ============================================
//      HANDLE NEW MESSAGE
//   ============================================ */
//   async handleNewMessage(data) {
//     try {
//       console.log(`💬 Processing new message for SOS #${data.sos_id}`);

//       // Send FCM notification to recipient
//       const recipientId = data.recipient_id;

//       if (!recipientId) {
//         console.log("No recipient specified for message");
//         return;
//       }

//       const notification = {
//         userId: recipientId,
//         type: "sos_status",
//         category: "sos",
//         title: data.sender_name,
//         body: data.message,
//         sosId: data.sos_id,
//         priority: "high",
//         data: {
//           message_id: data.message_id,
//           sender_id: data.sender_id,
//           sender_type: data.sender_type,
//         },
//       };

//       await NotificationsService.createNotification(notification);

//       console.log(`✅ Message notification sent for SOS #${data.sos_id}`);
//     } catch (error) {
//       console.error("Handle new message error:", error);
//       throw error;
//     }
//   }

//   /* ============================================
//      STOP WORKER
//   ============================================ */
//   async stop() {
//     console.log("🛑 Stopping Notification Worker...");

//     if (this.redisSubscriber) {
//       await this.redisSubscriber.quit();
//     }

//     this.isRunning = false;
//     console.log("✅ Notification Worker stopped");
//   }
// }

// // Export singleton instance
// export const notificationWorker = new NotificationWorker();

// // Auto-start if running directly
// if (import.meta.url === `file://${process.argv[1]}`) {
//   notificationWorker.start().catch(console.error);

//   // Graceful shutdown
//   process.on("SIGTERM", async () => {
//     await notificationWorker.stop();
//     process.exit(0);
//   });

//   process.on("SIGINT", async () => {
//     await notificationWorker.stop();
//     process.exit(0);
//   });
// }
