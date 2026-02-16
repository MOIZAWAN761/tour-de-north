// src/modules/jeeps/jeeps.audit.js

import pool from "../../../config/postgres.js";

export const JeepAuditLog = {
  /* ============================================
     LOG ACTION
  ============================================ */
  async logAction({
    jeepId = null,
    driverId = null,
    userId,
    action,
    changes = {},
    ipAddress,
    userAgent,
  }) {
    try {
      const query = `
        INSERT INTO jeep_audit_logs (
          jeep_id,
          driver_id,
          user_id,
          action,
          changes,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;

      const values = [
        jeepId,
        driverId,
        userId,
        action,
        JSON.stringify(changes),
        ipAddress || null,
        userAgent || null,
      ];

      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (error) {
      console.error("Error logging jeep audit:", error);
      // Don't throw - audit logging should not break main flow
      return null;
    }
  },

  /* ============================================
     GET JEEP AUDIT HISTORY
  ============================================ */
  async getJeepHistory(jeepId, limit = 50) {
    try {
      const query = `
        SELECT 
          jal.*,
          u.name as user_name,
          u.email as user_email,
          u.role as user_role
        FROM jeep_audit_logs jal
        LEFT JOIN users u ON jal.user_id = u.id
        WHERE jal.jeep_id = $1
        ORDER BY jal.created_at DESC
        LIMIT $2;
      `;

      const { rows } = await pool.query(query, [jeepId, limit]);
      return rows;
    } catch (error) {
      console.error("Error fetching jeep audit history:", error);
      throw error;
    }
  },

  /* ============================================
     GET DRIVER AUDIT HISTORY
  ============================================ */
  async getDriverHistory(driverId, limit = 50) {
    try {
      const query = `
        SELECT 
          jal.*,
          u.name as user_name,
          u.email as user_email,
          u.role as user_role
        FROM jeep_audit_logs jal
        LEFT JOIN users u ON jal.user_id = u.id
        WHERE jal.driver_id = $1
        ORDER BY jal.created_at DESC
        LIMIT $2;
      `;

      const { rows } = await pool.query(query, [driverId, limit]);
      return rows;
    } catch (error) {
      console.error("Error fetching driver audit history:", error);
      throw error;
    }
  },
};

/* ============================================
   AUDIT ACTION TYPES
============================================ */
export const JEEP_AUDIT_ACTIONS = {
  // Jeep actions
  JEEP_CREATED: "JEEP_CREATED",
  JEEP_UPDATED: "JEEP_UPDATED",
  JEEP_DELETED: "JEEP_DELETED",
  JEEP_AVAILABILITY_UPDATED: "JEEP_AVAILABILITY_UPDATED",
  JEEP_ACTIVE_STATUS_UPDATED: "JEEP_ACTIVE_STATUS_UPDATED",
  JEEP_IMAGE_UPDATED: "JEEP_IMAGE_UPDATED",

  // Driver actions
  DRIVER_CREATED: "DRIVER_CREATED",
  DRIVER_UPDATED: "DRIVER_UPDATED",
  DRIVER_DELETED: "DRIVER_DELETED",
  DRIVER_ACTIVE_STATUS_UPDATED: "DRIVER_ACTIVE_STATUS_UPDATED",
  DRIVER_ASSIGNED_TO_JEEP: "DRIVER_ASSIGNED_TO_JEEP",
  DRIVER_UNASSIGNED_FROM_JEEP: "DRIVER_UNASSIGNED_FROM_JEEP",
};
