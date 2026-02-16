// src/modules/notifications/notifications.model.js

import pool from "../../config/postgres.js";

export const NotificationsModel = {
  /* ============================================
     CREATE NOTIFICATION
  ============================================ */
  async createNotification(data) {
    const query = `
      INSERT INTO notifications (
        user_id,
        type,
        category,
        title,
        body,
        sos_id,
        data,
        priority,
        expires_at,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const values = [
      data.userId || null, // NULL for broadcast
      data.type,
      data.category,
      data.title,
      data.body,
      data.sosId || null,
      data.data ? JSON.stringify(data.data) : null,
      data.priority || "normal",
      data.expiresAt || null,
      data.createdBy || null,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* ============================================
     CREATE BROADCAST NOTIFICATION (to all users)
  ============================================ */
  async createBroadcastNotification(data, createdBy) {
    const query = `
      INSERT INTO notifications (
        user_id,
        type,
        category,
        title,
        body,
        data,
        priority,
        expires_at,
        created_by
      )
      VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const values = [
      data.type || "admin_alert",
      data.category,
      data.title,
      data.body,
      data.data ? JSON.stringify(data.data) : null,
      data.priority || "normal",
      data.expiresAt || null,
      createdBy,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* ============================================
     GET USER NOTIFICATIONS (with pagination)
  ============================================ */
  async getUserNotifications({
    userId,
    category,
    isRead,
    type,
    limit = 20,
    offset = 0,
  }) {
    let query = `
      SELECT 
        n.*,
        u.name as created_by_name
      FROM notifications n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE (n.user_id = $1 OR n.user_id IS NULL)
      AND (n.expires_at IS NULL OR n.expires_at > NOW())
    `;

    const values = [userId];
    let idx = 2;

    if (category && category !== "all") {
      query += ` AND n.category = $${idx}`;
      values.push(category);
      idx++;
    }

    if (isRead !== undefined) {
      // For broadcast notifications (user_id IS NULL), we can't track read status per user
      // So we only filter by is_read for user-specific notifications
      query += ` AND (
        (n.user_id IS NOT NULL AND n.is_read = $${idx})
        OR n.user_id IS NULL
      )`;
      values.push(isRead);
      idx++;
    }

    if (type) {
      query += ` AND n.type = $${idx}`;
      values.push(type);
      idx++;
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  /* ============================================
     COUNT USER NOTIFICATIONS
  ============================================ */
  async countUserNotifications({ userId, category, isRead, type }) {
    let query = `
      SELECT COUNT(*) as total
      FROM notifications n
      WHERE (n.user_id = $1 OR n.user_id IS NULL)
      AND (n.expires_at IS NULL OR n.expires_at > NOW())
    `;

    const values = [userId];
    let idx = 2;

    if (category && category !== "all") {
      query += ` AND n.category = $${idx}`;
      values.push(category);
      idx++;
    }

    if (isRead !== undefined) {
      query += ` AND (
        (n.user_id IS NOT NULL AND n.is_read = $${idx})
        OR n.user_id IS NULL
      )`;
      values.push(isRead);
      idx++;
    }

    if (type) {
      query += ` AND n.type = $${idx}`;
      values.push(type);
      idx++;
    }

    const { rows } = await pool.query(query, values);
    return parseInt(rows[0].total);
  },

  /* ============================================
     GET UNREAD COUNT
  ============================================ */
  async getUnreadCount(userId) {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE category = 'sos') as sos_count,
        COUNT(*) FILTER (WHERE category = 'traffic') as traffic_count,
        COUNT(*) FILTER (WHERE category = 'weather') as weather_count,
        COUNT(*) FILTER (WHERE category = 'guideline') as guideline_count,
        COUNT(*) FILTER (WHERE category = 'system') as system_count,
        COUNT(*) as total_count
      FROM notifications
      WHERE user_id = $1
      AND is_read = FALSE
      AND (expires_at IS NULL OR expires_at > NOW());
    `;

    const { rows } = await pool.query(query, [userId]);
    return {
      sos: parseInt(rows[0].sos_count) || 0,
      traffic: parseInt(rows[0].traffic_count) || 0,
      weather: parseInt(rows[0].weather_count) || 0,
      guideline: parseInt(rows[0].guideline_count) || 0,
      system: parseInt(rows[0].system_count) || 0,
      total: parseInt(rows[0].total_count) || 0,
    };
  },

  /* ============================================
     GET NOTIFICATION BY ID
  ============================================ */
  async getNotificationById(notificationId) {
    const query = `
      SELECT 
        n.*,
        u.name as created_by_name
      FROM notifications n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.id = $1;
    `;

    const { rows } = await pool.query(query, [notificationId]);
    return rows[0] || null;
  },

  /* ============================================
     MARK NOTIFICATION AS READ
  ============================================ */
  async markAsRead(notificationId, userId) {
    const query = `
      UPDATE notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE id = $1
      AND user_id = $2
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [notificationId, userId]);
    return rows[0];
  },

  /* ============================================
     MARK ALL AS READ
  ============================================ */
  async markAllAsRead(userId, category) {
    let query = `
      UPDATE notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE user_id = $1
      AND is_read = FALSE
    `;

    const values = [userId];

    if (category && category !== "all") {
      query += ` AND category = $2`;
      values.push(category);
    }

    await pool.query(query, values);
  },

  /* ============================================
     UPDATE NOTIFICATION (ADMIN)
  ============================================ */
  async updateNotification(notificationId, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(data.title);
    }

    if (data.body !== undefined) {
      fields.push(`body = $${idx++}`);
      values.push(data.body);
    }

    if (data.priority !== undefined) {
      fields.push(`priority = $${idx++}`);
      values.push(data.priority);
    }

    if (data.expiresAt !== undefined) {
      fields.push(`expires_at = $${idx++}`);
      values.push(data.expiresAt);
    }

    if (data.data !== undefined) {
      fields.push(`data = $${idx++}`);
      values.push(JSON.stringify(data.data));
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    fields.push(`updated_at = NOW()`);
    values.push(notificationId);

    const query = `
      UPDATE notifications
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *;
    `;

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* ============================================
     DELETE NOTIFICATION (ADMIN)
  ============================================ */
  async deleteNotification(notificationId) {
    const query = `
      DELETE FROM notifications
      WHERE id = $1
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [notificationId]);
    return rows[0];
  },

  /* ============================================
     GET ALL NOTIFICATIONS (ADMIN - for management)
  ============================================ */
  async getAllNotifications({
    category,
    type,
    createdBy,
    sortBy = "created_at",
    order = "desc",
    limit = 20,
    offset = 0,
  }) {
    let query = `
      SELECT 
        n.*,
        u.name as created_by_name,
        COUNT(DISTINCT CASE WHEN n.user_id IS NOT NULL THEN n.user_id END) as recipient_count
      FROM notifications n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    if (category && category !== "all") {
      query += ` AND n.category = $${idx}`;
      values.push(category);
      idx++;
    }

    if (type) {
      query += ` AND n.type = $${idx}`;
      values.push(type);
      idx++;
    }

    if (createdBy) {
      query += ` AND n.created_by = $${idx}`;
      values.push(createdBy);
      idx++;
    }

    query += ` GROUP BY n.id, u.name`;

    const validSortColumns = {
      created_at: "n.created_at",
      priority: "n.priority",
      category: "n.category",
    };

    const sortColumn = validSortColumns[sortBy] || "n.created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  /* ============================================
     COUNT ALL NOTIFICATIONS (ADMIN)
  ============================================ */
  async countAllNotifications({ category, type, createdBy }) {
    let query = `
      SELECT COUNT(*) as total
      FROM notifications
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    if (category && category !== "all") {
      query += ` AND category = $${idx}`;
      values.push(category);
      idx++;
    }

    if (type) {
      query += ` AND type = $${idx}`;
      values.push(type);
      idx++;
    }

    if (createdBy) {
      query += ` AND created_by = $${idx}`;
      values.push(createdBy);
      idx++;
    }

    const { rows } = await pool.query(query, values);
    return parseInt(rows[0].total);
  },

  /* ============================================
     DEVICE TOKENS - SAVE
  ============================================ */
  async saveDeviceToken(userId, token, deviceType, deviceInfo) {
    const query = `
      INSERT INTO device_tokens (
        user_id,
        token,
        device_type,
        device_info
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (token) 
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        device_type = EXCLUDED.device_type,
        device_info = EXCLUDED.device_info,
        is_active = TRUE,
        last_used_at = NOW()
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [
      userId,
      token,
      deviceType,
      deviceInfo ? JSON.stringify(deviceInfo) : null,
    ]);
    return rows[0];
  },

  /* ============================================
     DEVICE TOKENS - GET USER TOKENS
  ============================================ */
  async getUserDeviceTokens(userId) {
    const query = `
      SELECT token, device_type
      FROM device_tokens
      WHERE user_id = $1
      AND is_active = TRUE;
    `;

    const { rows } = await pool.query(query, [userId]);
    return rows;
  },

  /* ============================================
     DEVICE TOKENS - GET ALL ACTIVE ADMIN TOKENS
  ============================================ */
  async getAdminDeviceTokens() {
    const query = `
      SELECT dt.token, dt.device_type, u.id as user_id, u.name, u.role
      FROM device_tokens dt
      JOIN users u ON dt.user_id = u.id
      WHERE u.role IN ('admin', 'superadmin', 'police')
      AND u.is_active = TRUE
      AND dt.is_active = TRUE;
    `;

    const { rows } = await pool.query(query);
    return rows;
  },

  /* ============================================
     DEVICE TOKENS - DELETE
  ============================================ */
  async deleteDeviceToken(token) {
    const query = `
      UPDATE device_tokens
      SET is_active = FALSE
      WHERE token = $1;
    `;

    await pool.query(query, [token]);
  },
};
