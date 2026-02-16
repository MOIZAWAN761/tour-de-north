// src/models/security.model.js

import pool from "../../config/postgres.js";

export const SecurityModel = {
  /* ============================================
     TRUSTED DEVICES
  ============================================ */

  async addTrustedDevice({ userId, deviceId, platform, browserOrModel }) {
    const query = `
      INSERT INTO trusted_devices (user_id, device_id, platform, browser_or_model)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, device_id) 
      DO UPDATE SET 
        last_used = NOW(),
        platform = EXCLUDED.platform,
        browser_or_model = EXCLUDED.browser_or_model
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [
      userId,
      deviceId,
      platform,
      browserOrModel,
    ]);
    return rows[0];
  },

  async isDeviceTrusted(userId, deviceId) {
    const query = `
      SELECT id FROM trusted_devices
      WHERE user_id = $1 AND device_id = $2
      LIMIT 1;
    `;

    const { rows } = await pool.query(query, [userId, deviceId]);
    return rows.length > 0;
  },

  async updateDeviceLastUsed(userId, deviceId) {
    const query = `
      UPDATE trusted_devices
      SET last_used = NOW()
      WHERE user_id = $1 AND device_id = $2;
    `;

    await pool.query(query, [userId, deviceId]);
  },

  async getTrustedDevices(userId) {
    const query = `
      SELECT 
        id,
        device_id,
        platform,
        browser_or_model,
        last_used,
        created_at
      FROM trusted_devices
      WHERE user_id = $1
      ORDER BY last_used DESC;
    `;

    const { rows } = await pool.query(query, [userId]);
    return rows;
  },

  async removeTrustedDevice(userId, deviceId) {
    const query = `
      DELETE FROM trusted_devices
      WHERE user_id = $1 AND device_id = $2;
    `;

    await pool.query(query, [userId, deviceId]);
  },

  /* ============================================
     LOGIN ATTEMPTS
  ============================================ */

  async logLoginAttempt({
    userId,
    identifier,
    deviceId,
    ipAddress,
    success,
    reason,
  }) {
    const query = `
      INSERT INTO login_attempts (user_id, identifier, device_id, ip_address, success, reason)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [
      userId,
      identifier,
      deviceId,
      ipAddress,
      success,
      reason,
    ]);
    return rows[0];
  },

  async getRecentFailedAttempts(userId, minutesWindow = 15) {
    const query = `
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE user_id = $1 
        AND success = FALSE
        AND created_at > NOW() - INTERVAL '${minutesWindow} minutes';
    `;

    const { rows } = await pool.query(query, [userId]);
    return parseInt(rows[0].count);
  },

  async clearFailedAttempts(userId) {
    const query = `
      DELETE FROM login_attempts
      WHERE user_id = $1 AND success = FALSE;
    `;

    await pool.query(query, [userId]);
  },

  async getLoginHistory(userId, limit = 20) {
    const query = `
      SELECT 
        id,
        identifier,
        device_id,
        ip_address,
        success,
        reason,
        created_at
      FROM login_attempts
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;

    const { rows } = await pool.query(query, [userId, limit]);
    return rows;
  },

  /* ============================================
     TOKEN BLACKLIST (for logout)
  ============================================ */

  async blacklistToken(token) {
    const query = `
      INSERT INTO token_blacklist (token, blacklisted_at)
      VALUES ($1, NOW())
      ON CONFLICT (token) DO NOTHING;
    `;

    await pool.query(query, [token]);
  },

  async isTokenBlacklisted(token) {
    const query = `
      SELECT id FROM token_blacklist
      WHERE token = $1
      LIMIT 1;
    `;

    const { rows } = await pool.query(query, [token]);
    return rows.length > 0;
  },
};
