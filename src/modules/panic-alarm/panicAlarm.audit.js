// src/modules/panicAlarm/panicAlarm.audit.js

import pool from "../../config/postgres.js";

export const SOSAuditLog = {
  /* ============================================
     LOG SOS ACTION
  ============================================ */
  async logAction({ sosId, userId, action, changes, ipAddress, userAgent }) {
    const query = `
      INSERT INTO sos_audit_logs (
        sos_id,
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
      sosId,
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
     GET AUDIT HISTORY FOR SOS
  ============================================ */
  async getSOSHistory(sosId, limit = 50) {
    const query = `
      SELECT 
        sal.*,
        u.name as user_name,
        u.role as user_role
      FROM sos_audit_logs sal
      LEFT JOIN users u ON sal.user_id = u.id
      WHERE sal.sos_id = $1
      ORDER BY sal.created_at DESC
      LIMIT $2;
    `;

    const { rows } = await pool.query(query, [sosId, limit]);
    return rows;
  },

  /* ============================================
     GET AUDIT HISTORY BY USER
  ============================================ */
  async getUserActivity(userId, limit = 50) {
    const query = `
      SELECT 
        sal.*,
        s.status as sos_status
      FROM sos_audit_logs sal
      LEFT JOIN sos_alarms s ON sal.sos_id = s.id
      WHERE sal.user_id = $1
      ORDER BY sal.created_at DESC
      LIMIT $2;
    `;

    const { rows } = await pool.query(query, [userId, limit]);
    return rows;
  },
};
