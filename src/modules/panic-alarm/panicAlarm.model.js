// src/modules/panicAlarm/panicAlarm.model.js

import pool from "../../config/postgres.js";

export const PanicAlarmModel = {
  /* ============================================
     CREATE SOS ALARM
  ============================================ */
  async createSOS(data, userId) {
    const query = `
      INSERT INTO sos_alarms (
        user_id,
        latitude,
        longitude,
        location_accuracy,
        sos_for,
        other_person_name,
        other_person_phone,
        other_person_relation,
        priority,
        fake_alarm_score,
        auto_flagged,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *;
    `;

    const values = [
      userId,
      data.latitude,
      data.longitude,
      data.locationAccuracy || null,
      data.sosFor || "self",
      data.otherPersonName || null,
      data.otherPersonPhone || null,
      data.otherPersonRelation || null,
      data.priority || "high",
      data.fakeAlarmScore || 0,
      data.autoFlagged || false,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* ============================================
     UPDATE SOS CONTEXT (after user fills form)
  ============================================ */
  async updateSOSContext(sosId, context) {
    const query = `
      UPDATE sos_alarms
      SET 
        emergency_type = $1,
        quick_note = $2,
        estimated_casualties = $3,
        user_injured_level = $4,
        can_receive_call = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *;
    `;

    const values = [
      context.emergencyType || null,
      context.quickNote || null,
      context.estimatedCasualties || 1,
      context.userInjuredLevel || "none",
      context.canReceiveCall !== undefined ? context.canReceiveCall : true,
      sosId,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* ============================================
     UPDATE ADDRESS (from reverse geocoding)
  ============================================ */
  async updateSOSAddress(sosId, addressText) {
    const query = `
      UPDATE sos_alarms
      SET address_text = $1
      WHERE id = $2;
    `;

    await pool.query(query, [addressText, sosId]);
  },

  /* ============================================
     GET SOS BY ID
  ============================================ */
  async getSOSById(sosId) {
    const query = `
      SELECT 
        s.*,
        u.name as user_name,
        u.phone as user_phone,
        u.email as user_email,
        a.name as acknowledged_by_name,
        a.phone as acknowledged_by_phone
      FROM sos_alarms s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN users a ON s.acknowledged_by = a.id
      WHERE s.id = $1;
    `;

    const { rows } = await pool.query(query, [sosId]);
    return rows[0] || null;
  },

  /* ============================================
     GET USER'S SOS LIST (with pagination)
  ============================================ */
  async getUserSOSList({
    userId,
    status, // 'active', 'resolved', or null for all
    limit = 20,
    offset = 0,
  }) {
    let query = `
      SELECT 
        s.*,
        a.name as acknowledged_by_name
      FROM sos_alarms s
      LEFT JOIN users a ON s.acknowledged_by = a.id
      WHERE s.user_id = $1
    `;

    const values = [userId];
    let idx = 2;

    // Status filter
    if (status === "active") {
      query += ` AND s.status IN ('created', 'acknowledged', 'responding')`;
    } else if (status === "resolved") {
      query += ` AND s.status IN ('resolved', 'cancelled')`;
    } else if (status) {
      query += ` AND s.status = $${idx}`;
      values.push(status);
      idx++;
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  /* ============================================
     COUNT USER'S SOS
  ============================================ */
  async countUserSOS({ userId, status }) {
    let query = `
      SELECT COUNT(*) as total
      FROM sos_alarms
      WHERE user_id = $1
    `;

    const values = [userId];
    let idx = 2;

    if (status === "active") {
      query += ` AND status IN ('created', 'acknowledged', 'responding')`;
    } else if (status === "resolved") {
      query += ` AND status IN ('resolved', 'cancelled')`;
    } else if (status) {
      query += ` AND status = $${idx}`;
      values.push(status);
      idx++;
    }

    const { rows } = await pool.query(query, values);
    return parseInt(rows[0].total);
  },

  /* ============================================
     GET ALL SOS (ADMIN - with filters)
  ============================================ */
  async getAllSOS({
    status,
    acknowledgedBy, // Filter by specific admin
    sosFor,
    emergencyType,
    resolutionType,
    sortBy = "created_at",
    order = "desc",
    limit = 20,
    offset = 0,
  }) {
    let query = `
      SELECT 
        s.*,
        u.name as user_name,
        u.phone as user_phone,
        a.name as acknowledged_by_name
      FROM sos_alarms s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN users a ON s.acknowledged_by = a.id
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    if (status) {
      if (status === "active") {
        query += ` AND s.status IN ('created', 'acknowledged', 'responding')`;
      } else {
        query += ` AND s.status = $${idx}`;
        values.push(status);
        idx++;
      }
    }

    if (acknowledgedBy) {
      query += ` AND s.acknowledged_by = $${idx}`;
      values.push(acknowledgedBy);
      idx++;
    }

    if (sosFor) {
      query += ` AND s.sos_for = $${idx}`;
      values.push(sosFor);
      idx++;
    }

    if (emergencyType) {
      query += ` AND s.emergency_type = $${idx}`;
      values.push(emergencyType);
      idx++;
    }

    if (resolutionType) {
      query += ` AND s.resolution_type = $${idx}`;
      values.push(resolutionType);
      idx++;
    }

    // Sorting
    const validSortColumns = {
      created_at: "s.created_at",
      priority: "s.priority",
      status: "s.status",
    };

    const sortColumn = validSortColumns[sortBy] || "s.created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  /* ============================================
     COUNT ALL SOS (ADMIN)
  ============================================ */
  async countAllSOS({
    status,
    acknowledgedBy,
    sosFor,
    emergencyType,
    resolutionType,
  }) {
    let query = `
      SELECT COUNT(*) as total
      FROM sos_alarms s
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    if (status) {
      if (status === "active") {
        query += ` AND s.status IN ('created', 'acknowledged', 'responding')`;
      } else {
        query += ` AND s.status = $${idx}`;
        values.push(status);
        idx++;
      }
    }

    if (acknowledgedBy) {
      query += ` AND s.acknowledged_by = $${idx}`;
      values.push(acknowledgedBy);
      idx++;
    }

    if (sosFor) {
      query += ` AND s.sos_for = $${idx}`;
      values.push(sosFor);
      idx++;
    }

    if (emergencyType) {
      query += ` AND s.emergency_type = $${idx}`;
      values.push(emergencyType);
      idx++;
    }

    if (resolutionType) {
      query += ` AND s.resolution_type = $${idx}`;
      values.push(resolutionType);
      idx++;
    }

    const { rows } = await pool.query(query, values);
    return parseInt(rows[0].total);
  },

  /* ============================================
     ACKNOWLEDGE SOS (Atomic claim)
  ============================================ */
  async acknowledgeSOS(sosId, adminId) {
    const query = `
      UPDATE sos_alarms
      SET 
        status = 'acknowledged',
        acknowledged_by = $1,
        acknowledged_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
      AND acknowledged_by IS NULL
      RETURNING *;
    `;

    const { rows, rowCount } = await pool.query(query, [adminId, sosId]);

    if (rowCount === 0) {
      return null; // Already acknowledged by someone else
    }

    return rows[0];
  },

  /* ============================================
     UPDATE SOS STATUS
  ============================================ */
  /* ============================================
   UPDATE SOS STATUS
============================================ */
  async updateSOSStatus(sosId, status) {
    const query = `
    UPDATE sos_alarms
    SET 
      status = $1::text,
      responded_at = CASE WHEN $1::text = 'responding' THEN NOW() ELSE responded_at END,
      resolved_at = CASE WHEN $1::text = 'resolved' THEN NOW() ELSE resolved_at END,
      cancelled_at = CASE WHEN $1::text = 'cancelled' THEN NOW() ELSE cancelled_at END,
      updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;

    const { rows } = await pool.query(query, [status, sosId]);
    return rows[0];
  },
  /* ============================================
     RESOLVE SOS
  ============================================ */
  async resolveSOS(sosId, resolutionType, resolutionNotes) {
    const query = `
      UPDATE sos_alarms
      SET 
        status = 'resolved',
        resolution_type = $1,
        resolution_notes = $2,
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [
      resolutionType,
      resolutionNotes,
      sosId,
    ]);
    return rows[0];
  },

  /* ============================================
     CHECK RATE LIMIT (Recent SOS count)
  ============================================ */
  async checkRateLimit(userId, minutes = 10) {
    const query = `
      SELECT COUNT(*) as count
      FROM sos_alarms
      WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '${minutes} minutes';
    `;

    const { rows } = await pool.query(query, [userId]);
    return parseInt(rows[0].count);
  },

  /* ============================================
     CALCULATE FAKE ALARM SCORE
  ============================================ */
  async calculateFakeAlarmScore(userId) {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE resolution_type = 'false_alarm') as false_alarms,
        COUNT(*) FILTER (WHERE resolution_type = 'accidental') as accidental,
        COUNT(*) as total
      FROM sos_alarms
      WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '30 days';
    `;

    const { rows } = await pool.query(query, [userId]);
    const stats = rows[0];

    // Simple scoring: false_alarms * 10 + accidental * 5
    const score =
      parseInt(stats.false_alarms) * 10 + parseInt(stats.accidental) * 5;

    return {
      score,
      falseAlarms: parseInt(stats.false_alarms),
      accidental: parseInt(stats.accidental),
      total: parseInt(stats.total),
      autoFlag: score >= 30, // Flag if score >= 30
    };
  },

  /* ============================================
     MESSAGES - CREATE
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
     MESSAGES - GET LIST
  ============================================ */
  async getMessages(sosId, limit = 50, offset = 0) {
    const query = `
      SELECT 
        m.*,
        u.name as sender_name
      FROM sos_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.sos_id = $1
      ORDER BY m.created_at ASC
      LIMIT $2 OFFSET $3;
    `;

    const { rows } = await pool.query(query, [sosId, limit, offset]);
    return rows;
  },

  /* ============================================
     MESSAGES - MARK AS READ
  ============================================ */
  async markMessagesAsRead(sosId, userId) {
    const query = `
      UPDATE sos_messages
      SET is_read = TRUE, read_at = NOW()
      WHERE sos_id = $1
      AND sender_id != $2
      AND is_read = FALSE;
    `;

    await pool.query(query, [sosId, userId]);
  },

  /* ============================================
     OUTBOX - INSERT
  ============================================ */
  async insertOutbox(eventType, payload) {
    const query = `
      INSERT INTO outbox (
        event_type,
        payload,
        status,
        created_at
      )
      VALUES ($1, $2, 'pending', NOW())
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [
      eventType,
      JSON.stringify(payload),
    ]);
    return rows[0];
  },

  /* ============================================
     OUTBOX - GET PENDING
  ============================================ */
  async getPendingOutbox(limit = 10) {
    const query = `
      SELECT *
      FROM outbox
      WHERE status IN ('pending', 'failed')
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      AND retry_count < max_retries
      ORDER BY created_at ASC
      LIMIT $1;
    `;

    const { rows } = await pool.query(query, [limit]);
    return rows;
  },

  /* ============================================
     OUTBOX - UPDATE STATUS
  ============================================ */
 async updateOutboxStatus(id, status, errorMessage = null) {
  const query = `
    UPDATE outbox
    SET 
      status = $1::text,
      retry_count = CASE WHEN $1::text = 'failed' THEN retry_count + 1 ELSE retry_count END,
      error_message = $2,
      processed_at = CASE WHEN $1::text = 'processed' THEN NOW() ELSE processed_at END,
      next_retry_at = CASE WHEN $1::text = 'failed' THEN NOW() + INTERVAL '5 minutes' ELSE next_retry_at END
    WHERE id = $3;
  `;
  await pool.query(query, [status, errorMessage, id]);
},

  /* ============================================
     STATISTICS (Super Admin)
  ============================================ */
  async getStatistics({ startDate, endDate, adminId }) {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE resolution_type = 'genuine_emergency') as genuine,
        COUNT(*) FILTER (WHERE resolution_type = 'false_alarm') as fake,
        COUNT(*) FILTER (WHERE resolution_type = 'accidental') as accidental,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) as avg_response_time_minutes
      FROM sos_alarms
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    if (startDate) {
      query += ` AND created_at >= $${idx}`;
      values.push(startDate);
      idx++;
    }

    if (endDate) {
      query += ` AND created_at <= $${idx}`;
      values.push(endDate);
      idx++;
    }

    if (adminId) {
      query += ` AND acknowledged_by = $${idx}`;
      values.push(adminId);
      idx++;
    }

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* ============================================
     TOP ADMINS (by resolved count)
  ============================================ */
  async getTopAdmins({ startDate, endDate, limit = 10 }) {
    let query = `
      SELECT 
        u.id,
        u.name,
        COUNT(*) as resolved_count,
        AVG(EXTRACT(EPOCH FROM (s.resolved_at - s.acknowledged_at))/60) as avg_resolution_time_minutes
      FROM sos_alarms s
      JOIN users u ON s.acknowledged_by = u.id
      WHERE s.status = 'resolved'
    `;

    const values = [];
    let idx = 1;

    if (startDate) {
      query += ` AND s.created_at >= $${idx}`;
      values.push(startDate);
      idx++;
    }

    if (endDate) {
      query += ` AND s.created_at <= $${idx}`;
      values.push(endDate);
      idx++;
    }

    query += ` GROUP BY u.id, u.name ORDER BY resolved_count DESC LIMIT $${idx}`;
    values.push(limit);

    const { rows } = await pool.query(query, values);
    return rows;
  },
};

// // src/modules/panic-alarm/panic-alarm.model.js

// import pool from "../../../config/postgres.js";

// export const PanicAlarmModel = {
//   /* ============================================
//      CREATE SOS ALARM
//   ============================================ */
//   async createSOS(sosData) {
//     const {
//       userId,
//       latitude,
//       longitude,
//       locationAccuracy,
//       sosFor,
//       emergencyType,
//       quickNote,
//       estimatedCasualties,
//       userInjuredLevel,
//       canReceiveCall,
//       visibleInjuries,
//       fakeAlarmScore,
//       autoFlagged,
//     } = sosData;

//     const query = `
//       INSERT INTO sos_alarms (
//         user_id, latitude, longitude, location_accuracy,
//         sos_for, emergency_type, quick_note, estimated_casualties,
//         user_injured_level, can_receive_call, visible_injuries,
//         fake_alarm_score, auto_flagged, status, priority
//       )
//       VALUES (
//         $1, $2, $3, $4,
//         $5, $6, $7, $8,
//         $9, $10, $11,
//         $12, $13, 'created', 'high'
//       )
//       RETURNING *;
//     `;

//     const values = [
//       userId,
//       latitude,
//       longitude,
//       locationAccuracy || null,
//       sosFor,
//       emergencyType || null,
//       quickNote || null,
//       estimatedCasualties || 1,
//       userInjuredLevel || null,
//       canReceiveCall || null,
//       visibleInjuries || null,
//       fakeAlarmScore || 0,
//       autoFlagged || false,
//     ];

//     const { rows } = await pool.query(query, values);
//     return rows[0];
//   },

//   /* ============================================
//      GET SOS BY ID
//   ============================================ */
//   async getSOSById(sosId) {
//     const query = `
//       SELECT
//         s.*,
//         u.name as user_name,
//         u.phone as user_phone,
//         u.email as user_email,
//         a.name as admin_name,
//         a.phone as admin_phone
//       FROM sos_alarms s
//       JOIN users u ON u.id = s.user_id
//       LEFT JOIN users a ON a.id = s.acknowledged_by
//       WHERE s.id = $1;
//     `;

//     const { rows } = await pool.query(query, [sosId]);
//     return rows[0] || null;
//   },

//   /* ============================================
//      GET SOS BY USER (WITH FILTER)
//   ============================================ */
//   async getSOSByUser(userId, filter = "all") {
//     let statusCondition = "";

//     if (filter === "active") {
//       statusCondition =
//         "AND s.status IN ('created', 'acknowledged', 'responding')";
//     } else if (filter === "previous") {
//       statusCondition = "AND s.status = 'resolved'";
//     }

//     const query = `
//       SELECT
//         s.id,
//         s.status,
//         s.sos_for,
//         s.emergency_type,
//         s.quick_note,
//         s.latitude,
//         s.longitude,
//         s.address_text,
//         s.created_at,
//         s.acknowledged_at,
//         s.responded_at,
//         s.resolved_at,
//         s.resolution_type,
//         a.name as admin_name,
//         (
//           SELECT COUNT(*)
//           FROM messages
//           WHERE sos_id = s.id
//             AND is_read = FALSE
//             AND sender_type = 'admin'
//         ) as unread_messages
//       FROM sos_alarms s
//       LEFT JOIN users a ON a.id = s.acknowledged_by
//       WHERE s.user_id = $1
//       ${statusCondition}
//       ORDER BY s.created_at DESC;
//     `;

//     const { rows } = await pool.query(query, [userId]);
//     return rows;
//   },

//   /* ============================================
//      GET SOS FOR ADMIN (FILTER)
//   ============================================ */
//   async getSOSForAdmin(filter = "all", adminId = null) {
//     let statusCondition = "";
//     let assignmentCondition = "";
//     const values = [];
//     let idx = 1;

//     if (filter === "active") {
//       statusCondition =
//         "AND s.status IN ('created', 'acknowledged', 'responding')";
//     } else if (filter === "previous") {
//       statusCondition = "AND s.status = 'resolved'";
//     } else if (filter === "fake") {
//       statusCondition = "AND s.resolution_type = 'false_alarm'";
//     } else if (filter === "my") {
//       assignmentCondition = `AND s.acknowledged_by = $${idx}`;
//       values.push(adminId);
//       idx++;
//     }

//     const query = `
//       SELECT
//         s.id,
//         s.status,
//         s.sos_for,
//         s.emergency_type,
//         s.quick_note,
//         s.latitude,
//         s.longitude,
//         s.address_text,
//         s.priority,
//         s.fake_alarm_score,
//         s.auto_flagged,
//         s.created_at,
//         s.acknowledged_at,
//         s.acknowledged_by,
//         u.id as user_id,
//         u.name as user_name,
//         u.phone as user_phone,
//         a.name as admin_name,
//         (
//           SELECT COUNT(*)
//           FROM messages
//           WHERE sos_id = s.id
//         ) as message_count
//       FROM sos_alarms s
//       JOIN users u ON u.id = s.user_id
//       LEFT JOIN users a ON a.id = s.acknowledged_by
//       WHERE 1=1
//       ${statusCondition}
//       ${assignmentCondition}
//       ORDER BY
//         CASE WHEN s.status = 'created' THEN 0 ELSE 1 END,
//         s.priority DESC,
//         s.created_at DESC;
//     `;

//     const { rows } = await pool.query(query, values);
//     return rows;
//   },

//   /* ============================================
//      UPDATE CONTEXT
//   ============================================ */
//   async updateSOSContext(sosId, contextData) {
//     const {
//       emergencyType,
//       quickNote,
//       estimatedCasualties,
//       userInjuredLevel,
//       canReceiveCall,
//     } = contextData;

//     const query = `
//       UPDATE sos_alarms
//       SET emergency_type = $1,
//           quick_note = $2,
//           estimated_casualties = $3,
//           user_injured_level = $4,
//           can_receive_call = $5
//       WHERE id = $6
//       RETURNING *;
//     `;

//     const values = [
//       emergencyType || null,
//       quickNote || null,
//       estimatedCasualties || 1,
//       userInjuredLevel || null,
//       canReceiveCall || null,
//       sosId,
//     ];

//     const { rows } = await pool.query(query, values);
//     return rows[0];
//   },

//   /* ============================================
//      UPDATE ADDRESS TEXT
//   ============================================ */
//   async updateSOSAddress(sosId, addressText) {
//     const query = `
//       UPDATE sos_alarms
//       SET address_text = $1
//       WHERE id = $2;
//     `;

//     await pool.query(query, [addressText, sosId]);
//     return true;
//   },

//   /* ============================================
//      ACKNOWLEDGE SOS (ATOMIC)
//   ============================================ */
//   async acknowledgeSOS(sosId, adminId) {
//     const query = `
//       UPDATE sos_alarms
//       SET status = 'acknowledged',
//           acknowledged_by = $1,
//           acknowledged_at = NOW()
//       WHERE id = $2
//         AND acknowledged_by IS NULL
//       RETURNING *;
//     `;

//     const { rows } = await pool.query(query, [adminId, sosId]);
//     return rows[0] || null;
//   },

//   /* ============================================
//      UPDATE STATUS
//   ============================================ */
//   async updateSOSStatus(sosId, status) {
//     const allowedStatuses = [
//       "created",
//       "acknowledged",
//       "responding",
//       "resolved",
//     ];

//     if (!allowedStatuses.includes(status)) {
//       throw new Error("Invalid SOS status");
//     }

//     const respondedAtField =
//       status === "responding" ? ", responded_at = NOW()" : "";

//     const query = `
//       UPDATE sos_alarms
//       SET status = $1
//       ${respondedAtField}
//       WHERE id = $2
//       RETURNING *;
//     `;

//     const { rows } = await pool.query(query, [status, sosId]);
//     return rows[0];
//   },

//   /* ============================================
//      RESOLVE SOS
//   ============================================ */
//   async resolveSOS(sosId, resolutionData) {
//     const { resolutionType, resolutionNotes } = resolutionData;

//     const query = `
//       UPDATE sos_alarms
//       SET status = 'resolved',
//           resolution_type = $1,
//           resolution_notes = $2,
//           resolved_at = NOW()
//       WHERE id = $3
//       RETURNING *;
//     `;

//     const { rows } = await pool.query(query, [
//       resolutionType,
//       resolutionNotes || null,
//       sosId,
//     ]);

//     return rows[0];
//   },

//   /* ============================================
//      COUNT RECENT SOS (RATE LIMIT SUPPORT)
//   ============================================ */
//   async countRecentSOSByUser(userId, minutes = 10) {
//     const query = `
//       SELECT COUNT(*) as count
//       FROM sos_alarms
//       WHERE user_id = $1
//         AND created_at > NOW() - ($2 * INTERVAL '1 minute');
//     `;

//     const { rows } = await pool.query(query, [userId, minutes]);
//     return parseInt(rows[0].count);
//   },

//   /* ============================================
//      GET STATISTICS
//   ============================================ */
//   async getSOSStatistics({ year, month } = {}) {
//     const values = [];
//     let idx = 1;

//     let dateCondition = "";

//     if (year) {
//       dateCondition += ` AND EXTRACT(YEAR FROM created_at) = $${idx}`;
//       values.push(year);
//       idx++;
//     }

//     if (month) {
//       dateCondition += ` AND EXTRACT(MONTH FROM created_at) = $${idx}`;
//       values.push(month);
//       idx++;
//     }

//     const query = `
//       SELECT
//         COUNT(*) as total_sos,
//         COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
//         COUNT(*) FILTER (WHERE resolution_type = 'genuine_emergency') as genuine_count,
//         COUNT(*) FILTER (WHERE resolution_type = 'false_alarm') as fake_count,
//         COUNT(*) FILTER (WHERE status IN ('created', 'acknowledged', 'responding')) as active_count,
//         AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) as avg_resolution_time_minutes
//       FROM sos_alarms
//       WHERE 1=1
//       ${dateCondition};
//     `;

//     const { rows } = await pool.query(query, values);
//     return rows[0];
//   },

//   /* ============================================
//      GET ADMIN PERFORMANCE
//   ============================================ */
//   async getAdminPerformance(year = null) {
//     const values = [];
//     let idx = 1;

//     let yearCondition = "";

//     if (year) {
//       yearCondition = `AND EXTRACT(YEAR FROM s.created_at) = $${idx}`;
//       values.push(year);
//       idx++;
//     }

//     const query = `
//       SELECT
//         u.id,
//         u.name,
//         COUNT(*) as total_resolved,
//         COUNT(*) FILTER (WHERE s.resolution_type = 'genuine_emergency') as genuine_resolved,
//         COUNT(*) FILTER (WHERE s.resolution_type = 'false_alarm') as fake_resolved,
//         AVG(EXTRACT(EPOCH FROM (s.resolved_at - s.acknowledged_at))/60) as avg_response_time_minutes
//       FROM sos_alarms s
//       JOIN users u ON u.id = s.acknowledged_by
//       WHERE s.status = 'resolved'
//         AND s.acknowledged_by IS NOT NULL
//       ${yearCondition}
//       GROUP BY u.id, u.name
//       ORDER BY total_resolved DESC;
//     `;

//     const { rows } = await pool.query(query, values);
//     return rows;
//   },
// };
