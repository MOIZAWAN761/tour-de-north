// src/modules/notifications/notifications.helper.js

import admin from "../../config/firebase.js";

/* ============================================
   SEND FCM NOTIFICATION (Single device)
============================================ */
export async function sendFCMNotification(token, notification, data = {}) {
  try {
    const message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: data.type || "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("FCM send error:", error);
    return { success: false, error: error.message };
  }
}

/* ============================================
   SEND FCM BATCH (Multiple devices)
============================================ */
export async function sendFCMBatch(tokens, notification, data = {}) {
  try {
    // Firebase supports max 500 tokens per batch
    const BATCH_SIZE = 500;
    const batches = [];

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      batches.push(tokens.slice(i, i + BATCH_SIZE));
    }

    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    for (const batch of batches) {
      const message = {
        tokens: batch,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          ...data,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: data.type || "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      results.successCount += response.successCount;
      results.failureCount += response.failureCount;

      // Collect failed tokens
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          results.errors.push({
            token: batch[idx],
            error: resp.error?.message,
          });
        }
      });
    }

    return results;
  } catch (error) {
    console.error("FCM batch send error:", error);
    return {
      successCount: 0,
      failureCount: tokens.length,
      errors: [{ error: error.message }],
    };
  }
}

/* ============================================
   FORMAT NOTIFICATION DATA
============================================ */
export function formatNotificationData(notification) {
  if (!notification) return null;

  return {
    id: notification.id,
    type: notification.type,
    category: notification.category,
    title: notification.title,
    body: notification.body,

    sosId: notification.sos_id || null,

    data: notification.data || null,

    priority: notification.priority,
    isRead: notification.is_read,
    readAt: notification.read_at,

    expiresAt: notification.expires_at,

    createdBy: notification.created_by
      ? {
          id: notification.created_by,
          name: notification.created_by_name,
        }
      : null,

    createdAt: notification.created_at,
    updatedAt: notification.updated_at,
  };
}

/* ============================================
   FORMAT NOTIFICATION LIST ITEM
============================================ */
export function formatNotificationListItem(notification) {
  return {
    id: notification.id,
    type: notification.type,
    category: notification.category,
    title: notification.title,
    body: notification.body,
    sosId: notification.sos_id || null,
    priority: notification.priority,
    isRead: notification.is_read,
    createdAt: notification.created_at,
  };
}

/* ============================================
   GET NOTIFICATION TITLE BY TYPE
============================================ */
export function getNotificationTitle(type, category) {
  const titles = {
    sos_status: "SOS Update",
    admin_alert: getCategoryTitle(category),
    system: "System Notification",
    general: "Notification",
  };

  return titles[type] || "Notification";
}

function getCategoryTitle(category) {
  const categoryTitles = {
    traffic: "Traffic Alert",
    weather: "Weather Alert",
    guideline: "Important Guidelines",
    sos: "SOS Alert",
    system: "System Update",
  };

  return categoryTitles[category] || "Alert";
}

/* ============================================
   BUILD FCM PAYLOAD
============================================ */
export function buildFCMPayload(notification) {
  return {
    title: notification.title,
    body: notification.body,
    data: {
      type: notification.type,
      category: notification.category,
      notification_id: notification.id.toString(),
      sos_id: notification.sos_id ? notification.sos_id.toString() : "",
      priority: notification.priority,
      ...(notification.data || {}),
    },
  };
}

/* ============================================
   VALIDATE NOTIFICATION DATA
============================================ */
export function validateNotificationData(data) {
  const errors = [];

  if (!data.category) {
    errors.push("Category is required");
  }

  if (!data.title || data.title.trim().length === 0) {
    errors.push("Title is required");
  }

  if (!data.body || data.body.trim().length === 0) {
    errors.push("Body is required");
  }

  if (data.title && data.title.length > 255) {
    errors.push("Title must be max 255 characters");
  }

  if (data.body && data.body.length > 1000) {
    errors.push("Body must be max 1000 characters");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/* ============================================
   GET PRIORITY LEVEL
============================================ */
export function getPriorityLevel(type, category) {
  if (type === "sos_status") return "urgent";
  if (category === "weather" || category === "traffic") return "high";
  if (category === "guideline") return "normal";
  return "normal";
}

/* ============================================
   CHECK IF NOTIFICATION EXPIRED
============================================ */
export function isNotificationExpired(notification) {
  if (!notification.expires_at) return false;

  const expiryDate = new Date(notification.expires_at);
  const now = new Date();

  return now > expiryDate;
}

/* ============================================
   SANITIZE NOTIFICATION BODY
============================================ */
export function sanitizeNotificationBody(body) {
  if (!body) return "";

  // Remove HTML tags
  let sanitized = body.replace(/<[^>]*>/g, "");

  // Remove extra whitespace
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  // Limit length
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 997) + "...";
  }

  return sanitized;
}

/* ============================================
   GROUP NOTIFICATIONS BY DATE
============================================ */
export function groupNotificationsByDate(notifications) {
  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  notifications.forEach((notification) => {
    const notifDate = new Date(notification.created_at);

    if (notifDate >= today) {
      groups.today.push(notification);
    } else if (notifDate >= yesterday) {
      groups.yesterday.push(notification);
    } else if (notifDate >= weekAgo) {
      groups.thisWeek.push(notification);
    } else {
      groups.older.push(notification);
    }
  });

  return groups;
}
