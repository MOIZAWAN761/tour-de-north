// // src/modules/notifications/deviceToken.model.js

// const db = require("../../config/database");

// class DeviceTokenModel {
//   /* ============================================
//      UPSERT DEVICE TOKEN
//   ============================================ */
//   static async upsert(tokenData) {
//     const {
//       userId,
//       token,
//       deviceId,
//       deviceName,
//       deviceType,
//       platform,
//       appVersion,
//       osVersion,
//     } = tokenData;

//     // Check if device exists
//     const existingResult = await db.query(
//       `SELECT id FROM device_tokens WHERE device_id = $1`,
//       [deviceId],
//     );

//     if (existingResult.rows.length) {
//       // Update existing device token
//       const query = `
//         UPDATE device_tokens
//         SET token = $1,
//             user_id = $2,
//             device_name = $3,
//             device_type = $4,
//             platform = $5,
//             app_version = $6,
//             os_version = $7,
//             is_active = TRUE,
//             last_used_at = NOW(),
//             updated_at = NOW()
//         WHERE device_id = $8
//         RETURNING *
//       `;
//       const result = await db.query(query, [
//         token,
//         userId,
//         deviceName,
//         deviceType,
//         platform,
//         appVersion,
//         osVersion,
//         deviceId,
//       ]);
//       return result.rows[0];
//     }

//     // Insert new device token
//     const query = `
//       INSERT INTO device_tokens (
//         user_id, token, device_id, device_name, device_type,
//         platform, app_version, os_version
//       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
//       RETURNING *
//     `;
//     const result = await db.query(query, [
//       userId,
//       token,
//       deviceId,
//       deviceName,
//       deviceType,
//       platform,
//       appVersion,
//       osVersion,
//     ]);

//     return result.rows[0];
//   }

//   /* ============================================
//      GET ACTIVE TOKENS FOR A USER
//   ============================================ */
//   static async getActiveTokensByUser(userId) {
//     const result = await db.query(
//       `SELECT token FROM device_tokens WHERE user_id = $1 AND is_active = TRUE`,
//       [userId],
//     );
//     return result.rows.map((row) => row.token);
//   }

//   /* ============================================
//      GET TOKENS FOR MULTIPLE USERS
//   ============================================ */
//   static async getTokensByUsers(userIds) {
//     if (!userIds.length) return [];
//     const result = await db.query(
//       `SELECT token FROM device_tokens WHERE user_id = ANY($1) AND is_active = TRUE`,
//       [userIds],
//     );
//     return result.rows.map((row) => row.token);
//   }

//   /* ============================================
//      GET ADMIN TOKENS
//   ============================================ */
//   static async getAdminTokens() {
//     const result = await db.query(`
//       SELECT dt.token
//       FROM device_tokens dt
//       JOIN users u ON u.id = dt.user_id
//       WHERE u.role IN ('admin', 'superadmin')
//         AND u.is_active = TRUE
//         AND dt.is_active = TRUE
//     `);
//     return result.rows.map((row) => row.token);
//   }

//   /* ============================================
//      DEACTIVATE A TOKEN
//   ============================================ */
//   static async deactivate(token) {
//     await db.query(
//       `UPDATE device_tokens SET is_active = FALSE, updated_at = NOW() WHERE token = $1`,
//       [token],
//     );
//   }

//   /* ============================================
//      UPDATE LAST USED TIMESTAMP
//   ============================================ */
//   static async updateLastUsed(userId) {
//     await db.query(
//       `UPDATE device_tokens SET last_used_at = NOW() WHERE user_id = $1 AND is_active = TRUE`,
//       [userId],
//     );
//   }

//   /* ============================================
//      GET USER DEVICES
//   ============================================ */
//   static async getUserDevices(userId) {
//     const result = await db.query(
//       `SELECT device_id, device_name, platform, last_used_at, created_at
//        FROM device_tokens
//        WHERE user_id = $1 AND is_active = TRUE
//        ORDER BY last_used_at DESC`,
//       [userId],
//     );
//     return result.rows;
//   }

//   /* ============================================
//      REMOVE A DEVICE
//   ============================================ */
//   static async removeDevice(userId, deviceId) {
//     await db.query(
//       `UPDATE device_tokens SET is_active = FALSE WHERE user_id = $1 AND device_id = $2`,
//       [userId, deviceId],
//     );
//   }

//   /* ============================================
//      DEACTIVATE INVALID TOKENS
//   ============================================ */
//   static async deactivateInvalidTokens(tokens) {
//     if (!tokens.length) return;
//     await db.query(
//       `UPDATE device_tokens SET is_active = FALSE WHERE token = ANY($1)`,
//       [tokens],
//     );
//   }
// }

// module.exports = DeviceTokenModel;
