// src/modules/profile/profile.audit.js

import pool from "../../config/postgres.js";

export const ProfileAuditLog = {
  /* ============================================
     LOG PROFILE ACTION
  ============================================ */
  async logAction({
    userId,
    targetUserId,
    action,
    changes,
    ipAddress,
    userAgent,
  }) {
    const query = `
      INSERT INTO profile_audit_logs (
        user_id,
        target_user_id,
        action,
        changes,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      userId,
      targetUserId || userId,
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
     GET AUDIT HISTORY
  ============================================ */
  async getHistory(userId, limit = 50) {
    const query = `
      SELECT 
        pal.*,
        u.name as user_name,
        u.role as user_role
      FROM profile_audit_logs pal
      LEFT JOIN users u ON pal.user_id = u.id
      WHERE pal.target_user_id = $1
      ORDER BY pal.created_at DESC
      LIMIT $2;
    `;

    const { rows } = await pool.query(query, [userId, limit]);
    return rows;
  },
};
