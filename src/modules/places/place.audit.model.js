// src/modules/places/places.audit.js

import pool from "../../config/postgres.js";

export const PlacesAuditLog = {
  /* ============================================
     LOG PLACE ACTION
  ============================================ */
  async logAction({ placeId, userId, action, changes, ipAddress, userAgent }) {
    const query = `
      INSERT INTO place_audit_logs (
        place_id,
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
      placeId,
      userId,
      action,
      JSON.stringify(changes),
      ipAddress,
      userAgent,
    ];

    try {
      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (error) {
      console.error("Audit log error:", error);
      // Don't throw - audit log failure shouldn't break main flow
    }
  },

  /* ============================================
     GET AUDIT HISTORY FOR PLACE
  ============================================ */
  async getPlaceHistory(placeId, limit = 50) {
    const query = `
      SELECT 
        pal.*,
        u.name as user_name,
        u.role as user_role
      FROM place_audit_logs pal
      LEFT JOIN users u ON pal.user_id = u.id
      WHERE pal.place_id = $1
      ORDER BY pal.created_at DESC
      LIMIT $2;
    `;

    const { rows } = await pool.query(query, [placeId, limit]);
    return rows;
  },

  /* ============================================
     GET AUDIT HISTORY BY USER
  ============================================ */
  async getUserActivity(userId, limit = 50) {
    const query = `
      SELECT 
        pal.*,
        p.name as place_name
      FROM place_audit_logs pal
      LEFT JOIN places p ON pal.place_id = p.id
      WHERE pal.user_id = $1
      ORDER BY pal.created_at DESC
      LIMIT $2;
    `;

    const { rows } = await pool.query(query, [userId, limit]);
    return rows;
  },
};
