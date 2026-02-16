// src/modules/messaging/messaging.helper.js

/* ============================================
   FORMAT MESSAGE
============================================ */
export function formatMessage(message) {
  if (!message) return null;

  return {
    id: message.id,
    sosId: message.sos_id,
    sender: {
      id: message.sender_id,
      type: message.sender_type,
      name: message.sender_name,
      avatar: message.sender_avatar,
    },
    message: message.message,
    isRead: message.is_read,
    readAt: message.read_at,
    createdAt: message.created_at,
  };
}

/* ============================================
   FORMAT CONVERSATION (for list view)
============================================ */
export function formatConversation(conversation) {
  if (!conversation) return null;

  // Determine if this is user's view or admin's view
  const isUserView = !!conversation.admin_id;

  return {
    sosId: conversation.sos_id,
    status: conversation.status,

    // Other party info (admin for user, user for admin)
    participant: isUserView
      ? {
          id: conversation.admin_id,
          name: conversation.admin_name,
          avatar: conversation.admin_avatar,
          type: "admin",
        }
      : {
          id: conversation.user_id,
          name: conversation.user_name,
          avatar: conversation.user_avatar,
          type: "user",
        },

    lastMessage: conversation.last_message,
    lastMessageAt: conversation.last_message_at,
    unreadCount: parseInt(conversation.unread_count) || 0,

    sosCreatedAt: conversation.sos_created_at,

    // Messaging status
    messagingEnabled: ["acknowledged", "responding"].includes(
      conversation.status,
    ),
  };
}

/* ============================================
   GET MESSAGING STATUS TEXT
============================================ */
export function getMessagingStatusText(sosStatus) {
  if (sosStatus === "created") {
    return "Waiting for admin to acknowledge";
  }

  if (sosStatus === "resolved" || sosStatus === "cancelled") {
    return "Messaging disabled (SOS resolved)";
  }

  return "Active";
}

/* ============================================
   SANITIZE MESSAGE
============================================ */
export function sanitizeMessage(message) {
  if (!message) return "";

  // Trim whitespace
  let sanitized = message.trim();

  // Limit length
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 1000);
  }

  return sanitized;
}

/* ============================================
   FORMAT TIME AGO
============================================ */
export function formatTimeAgo(date) {
  if (!date) return "";

  const now = new Date();
  const messageDate = new Date(date);
  const diffMs = now - messageDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return messageDate.toLocaleDateString();
}
