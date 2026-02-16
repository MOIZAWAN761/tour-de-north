// src/modules/hotels/hotels.audit.js

import pool from "../../../config/postgres.js";

export const HotelAuditLog = {
  /* ============================================
     LOG ACTION
  ============================================ */
  async logAction({
    hotelId,
    userId,
    action,
    changes = {},
    ipAddress,
    userAgent,
  }) {
    try {
      const query = `
        INSERT INTO hotel_audit_logs (
          hotel_id,
          user_id,
          action,
          changes,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;

      const values = [
        hotelId,
        userId,
        action,
        JSON.stringify(changes),
        ipAddress || null,
        userAgent || null,
      ];

      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (error) {
      console.error("Error logging hotel audit:", error);
      // Don't throw - audit logging should not break main flow
      return null;
    }
  },

  /* ============================================
     GET AUDIT HISTORY
  ============================================ */
  async getHistory(hotelId, limit = 50) {
    try {
      const query = `
        SELECT 
          hal.*,
          u.name as user_name,
          u.email as user_email,
          u.role as user_role
        FROM hotel_audit_logs hal
        LEFT JOIN users u ON hal.user_id = u.id
        WHERE hal.hotel_id = $1
        ORDER BY hal.created_at DESC
        LIMIT $2;
      `;

      const { rows } = await pool.query(query, [hotelId, limit]);
      return rows;
    } catch (error) {
      console.error("Error fetching hotel audit history:", error);
      throw error;
    }
  },
};

/* ============================================
   AUDIT ACTION TYPES
============================================ */
export const HOTEL_AUDIT_ACTIONS = {
  HOTEL_CREATED: "HOTEL_CREATED",
  HOTEL_UPDATED: "HOTEL_UPDATED",
  HOTEL_DELETED: "HOTEL_DELETED",
  ACTIVE_STATUS_UPDATED: "ACTIVE_STATUS_UPDATED",
  IMAGE_ADDED: "IMAGE_ADDED",
  IMAGE_DELETED: "IMAGE_DELETED",
};
