// src/modules/messaging/messaging.model.js

import pool from "../../config/postgres.js";

export const MessagingModel = {
  /* ============================================
     CREATE MESSAGE
  ============================================ */
  async createMessage(sosId, senderId, senderType, message) {
    const query = `
      INSERT INTO sos_messages (
        sos_id,
        sender_id,
        sender_type,
        message,
        created_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [
      sosId,
      senderId,
      senderType,
      message,
    ]);
    return rows[0];
  },

  /* ============================================
     GET CONVERSATION MESSAGES
  ============================================ */
  async getConversationMessages(sosId, limit = 100, offset = 0) {
    const query = `
    SELECT 
      m.*,
      u.name as sender_name,
      p.profile_image_url as sender_avatar
    FROM sos_messages m
    JOIN users u ON m.sender_id = u.id
    LEFT JOIN profile p ON u.id = p.user_id
    WHERE m.sos_id = $1
    ORDER BY m.created_at ASC
    LIMIT $2 OFFSET $3;
  `;

    const { rows } = await pool.query(query, [sosId, limit, offset]);
    return rows;
  },

  // async getConversationMessages(sosId, limit = 100, offset = 0) {
  //   const query = `
  //     SELECT 
  //       m.*,
  //       u.name as sender_name,
  //       u.profile_image_url as sender_avatar
  //     FROM sos_messages m
  //     JOIN users u ON m.sender_id = u.id
  //     WHERE m.sos_id = $1
  //     ORDER BY m.created_at ASC
  //     LIMIT $2 OFFSET $3;
  //   `;

  //   const { rows } = await pool.query(query, [sosId, limit, offset]);
  //   return rows;
  // },

  /* ============================================
     GET USER CONVERSATIONS (List)
  ============================================ */
  async getUserConversations(userId, limit = 50, offset = 0) {
    const query = `
    SELECT DISTINCT ON (s.id)
      s.id as sos_id,
      s.status,
      s.created_at as sos_created_at,
      
      -- Assigned admin info
      a.id as admin_id,
      a.name as admin_name,
      ap.profile_image_url as admin_avatar,
      
      -- Last message
      (
        SELECT m.message 
        FROM sos_messages m 
        WHERE m.sos_id = s.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
      ) as last_message,
      (
        SELECT m.created_at 
        FROM sos_messages m 
        WHERE m.sos_id = s.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
      ) as last_message_at,
      
      -- Unread count
      (
        SELECT COUNT(*) 
        FROM sos_messages m 
        WHERE m.sos_id = s.id 
        AND m.sender_type = 'admin'
        AND m.is_read = FALSE
      ) as unread_count

    FROM sos_alarms s
    LEFT JOIN users a ON s.acknowledged_by = a.id
    LEFT JOIN profile ap ON ap.user_id = a.id
    WHERE s.user_id = $1
    AND s.acknowledged_by IS NOT NULL
    ORDER BY s.id, last_message_at DESC NULLS LAST
    LIMIT $2 OFFSET $3;
  `;

    const { rows } = await pool.query(query, [userId, limit, offset]);
    return rows;
  },
  // async getUserConversations(userId, limit = 50, offset = 0) {
  //   const query = `
  //     SELECT DISTINCT ON (s.id)
  //       s.id as sos_id,
  //       s.status,
  //       s.created_at as sos_created_at,
        
  //       -- Assigned admin info
  //       a.id as admin_id,
  //       a.name as admin_name,
  //       a.profile_image_url as admin_avatar,
        
  //       -- Last message
  //       (
  //         SELECT m.message 
  //         FROM sos_messages m 
  //         WHERE m.sos_id = s.id 
  //         ORDER BY m.created_at DESC 
  //         LIMIT 1
  //       ) as last_message,
  //       (
  //         SELECT m.created_at 
  //         FROM sos_messages m 
  //         WHERE m.sos_id = s.id 
  //         ORDER BY m.created_at DESC 
  //         LIMIT 1
  //       ) as last_message_at,
        
  //       -- Unread count (messages from admin not read by user)
  //       (
  //         SELECT COUNT(*) 
  //         FROM sos_messages m 
  //         WHERE m.sos_id = s.id 
  //         AND m.sender_type = 'admin'
  //         AND m.is_read = FALSE
  //       ) as unread_count

  //     FROM sos_alarms s
  //     LEFT JOIN users a ON s.acknowledged_by = a.id
  //     WHERE s.user_id = $1
  //     AND s.acknowledged_by IS NOT NULL
  //     ORDER BY s.id, last_message_at DESC NULLS LAST
  //     LIMIT $2 OFFSET $3;
  //   `;

  //   const { rows } = await pool.query(query, [userId, limit, offset]);
  //   return rows;
  // },

  // /* ============================================
  //    GET ADMIN CONVERSATIONS (List)
  // ============================================ */
  // async getAdminConversations(adminId, limit = 50, offset = 0) {
  //   const query = `
  //     SELECT DISTINCT ON (s.id)
  //       s.id as sos_id,
  //       s.status,
  //       s.created_at as sos_created_at,
        
  //       -- User info
  //       u.id as user_id,
  //       u.name as user_name,
  //       u.profile_image_url as user_avatar,
        
  //       -- Last message
  //       (
  //         SELECT m.message 
  //         FROM sos_messages m 
  //         WHERE m.sos_id = s.id 
  //         ORDER BY m.created_at DESC 
  //         LIMIT 1
  //       ) as last_message,
  //       (
  //         SELECT m.created_at 
  //         FROM sos_messages m 
  //         WHERE m.sos_id = s.id 
  //         ORDER BY m.created_at DESC 
  //         LIMIT 1
  //       ) as last_message_at,
        
  //       -- Unread count (messages from user not read by admin)
  //       (
  //         SELECT COUNT(*) 
  //         FROM sos_messages m 
  //         WHERE m.sos_id = s.id 
  //         AND m.sender_type = 'user'
  //         AND m.is_read = FALSE
  //       ) as unread_count

  //     FROM sos_alarms s
  //     JOIN users u ON s.user_id = u.id
  //     WHERE s.acknowledged_by = $1
  //     ORDER BY s.id, last_message_at DESC NULLS LAST
  //     LIMIT $2 OFFSET $3;
  //   `;

  //   const { rows } = await pool.query(query, [adminId, limit, offset]);
  //   return rows;
  // },
  async getAdminConversations(adminId, limit = 50, offset = 0) {
    const query = `
    SELECT DISTINCT ON (s.id)
      s.id as sos_id,
      s.status,
      s.created_at as sos_created_at,
      
      -- User info
      u.id as user_id,
      u.name as user_name,
      up.profile_image_url as user_avatar,
      
      -- Last message
      (
        SELECT m.message 
        FROM sos_messages m 
        WHERE m.sos_id = s.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
      ) as last_message,
      (
        SELECT m.created_at 
        FROM sos_messages m 
        WHERE m.sos_id = s.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
      ) as last_message_at,
      
      -- Unread count
      (
        SELECT COUNT(*) 
        FROM sos_messages m 
        WHERE m.sos_id = s.id 
        AND m.sender_type = 'user'
        AND m.is_read = FALSE
      ) as unread_count

    FROM sos_alarms s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN profile up ON up.user_id = u.id
    WHERE s.acknowledged_by = $1
    ORDER BY s.id, last_message_at DESC NULLS LAST
    LIMIT $2 OFFSET $3;
  `;

    const { rows } = await pool.query(query, [adminId, limit, offset]);
    return rows;
  },

  /* ============================================
     MARK MESSAGES AS READ
  ============================================ */
  async markMessagesAsRead(sosId, userId, senderType) {
    // Mark messages from the OTHER party as read
    const oppositeType = senderType === "user" ? "admin" : "user";

    const query = `
      UPDATE sos_messages
      SET is_read = TRUE, read_at = NOW()
      WHERE sos_id = $1
      AND sender_type = $2
      AND is_read = FALSE;
    `;

    await pool.query(query, [sosId, oppositeType]);
  },

  /* ============================================
     GET UNREAD MESSAGE COUNT
  ============================================ */
  async getUnreadCount(userId, userType) {
    let query;

    if (userType === "user" || userType === "tourist") {
      // Count messages from admins not read by user
      query = `
        SELECT COUNT(*) as count
        FROM sos_messages m
        JOIN sos_alarms s ON m.sos_id = s.id
        WHERE s.user_id = $1
        AND m.sender_type = 'admin'
        AND m.is_read = FALSE;
      `;
    } else {
      // Count messages from users not read by admin
      query = `
        SELECT COUNT(*) as count
        FROM sos_messages m
        JOIN sos_alarms s ON m.sos_id = s.id
        WHERE s.acknowledged_by = $1
        AND m.sender_type = 'user'
        AND m.is_read = FALSE;
      `;
    }

    const { rows } = await pool.query(query, [userId]);
    return parseInt(rows[0].count) || 0;
  },

  /* ============================================
     CHECK IF MESSAGING ALLOWED
  ============================================ */
  async isMessagingAllowed(sosId, userId, userType) {
  const query = `
    SELECT 
      s.id,
      s.status,
      s.user_id,
      s.acknowledged_by
    FROM sos_alarms s
    WHERE s.id = $1;
  `;

  const { rows } = await pool.query(query, [sosId]);

  if (rows.length === 0) {
    return { allowed: false, reason: "SOS not found", code: "NOT_FOUND" };
  }

  const sos = rows[0];

  // Check user authorization (ownership)
  if (userType === "user" || userType === "tourist") {
    if (sos.user_id !== userId) {
      return { allowed: false, reason: "Access denied", code: "UNAUTHORIZED" };
    }
  } else {
    // Admin/police
    if (sos.acknowledged_by !== userId) {
      return { allowed: false, reason: "Only the assigned admin can message this user", code: "UNAUTHORIZED" };
    }
  }

  // Determine if sending is allowed
  if (!sos.acknowledged_by) {
    return { allowed: false, reason: "Messaging will be enabled once an admin acknowledges your SOS", code: "DISABLED_NOT_ACKNOWLEDGED" };
  }

  if (sos.status === "resolved" || sos.status === "cancelled") {
    return { allowed: false, reason: "Messaging is disabled for resolved SOS", code: "DISABLED_RESOLVED" };
  }

  return { allowed: true, code: "ALLOWED" };
},
  // async isMessagingAllowed(sosId, userId, userType) {
  //   const query = `
  //     SELECT 
  //       s.id,
  //       s.status,
  //       s.user_id,
  //       s.acknowledged_by
  //     FROM sos_alarms s
  //     WHERE s.id = $1;
  //   `;

  //   const { rows } = await pool.query(query, [sosId]);

  //   if (rows.length === 0) {
  //     return { allowed: false, reason: "SOS not found" };
  //   }

  //   const sos = rows[0];

  //   // Messaging disabled if not acknowledged yet
  //   if (!sos.acknowledged_by) {
  //     return {
  //       allowed: false,
  //       reason: "Messaging will be enabled once an admin acknowledges your SOS",
  //     };
  //   }

  //   // Messaging disabled after resolution
  //   if (sos.status === "resolved" || sos.status === "cancelled") {
  //     return {
  //       allowed: false,
  //       reason: "Messaging is disabled for resolved SOS",
  //     };
  //   }

  //   // Check user permissions
  //   if (userType === "user" || userType === "tourist") {
  //     if (sos.user_id !== userId) {
  //       return { allowed: false, reason: "Access denied" };
  //     }
  //   } else {
  //     // Admin/police
  //     if (sos.acknowledged_by !== userId) {
  //       return {
  //         allowed: false,
  //         reason: "Only the assigned admin can message this user",
  //       };
  //     }
  //   }

  //   return { allowed: true };
  // },

  
  /* ============================================
     GET CONVERSATION INFO
  ============================================ */
  /* ============================================
    GET CONVERSATION INFO
 ============================================ */
  async getConversationInfo(sosId) {
    const query = `
    SELECT 
      s.id as sos_id,
      s.status,
      s.user_id,
      s.acknowledged_by,
      u.name as user_name,
      up.profile_image_url as user_avatar,
      a.name as admin_name,
      ap.profile_image_url as admin_avatar
    FROM sos_alarms s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN profile up ON u.id = up.user_id
    LEFT JOIN users a ON s.acknowledged_by = a.id
    LEFT JOIN profile ap ON a.id = ap.user_id
    WHERE s.id = $1;
  `;

    const { rows } = await pool.query(query, [sosId]);
    return rows[0] || null;
  },
}