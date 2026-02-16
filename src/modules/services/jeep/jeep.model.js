// src/modules/jeeps/jeeps.model.js

import pool from "../../../config/postgres.js";

export const JeepsModel = {
  /* ============================================
     DRIVER OPERATIONS
  ============================================ */

  /* Create driver */
  async createDriver(data, userId) {
    const query = `
      INSERT INTO jeep_drivers (
        full_name,
        cnic,
        phone,
        address,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      data.fullName,
      data.cnic,
      data.phone,
      data.address || null,
      userId,
      userId,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* Check if driver exists by CNIC */
  async checkDriverExistsByCNIC(cnic) {
    const query = `
      SELECT id, full_name, cnic, phone, is_active
      FROM jeep_drivers
      WHERE cnic = $1
      LIMIT 1;
    `;

    const { rows } = await pool.query(query, [cnic]);
    return rows[0] || null;
  },

  /* Get driver by ID */
  async getDriverById(driverId, includeJeeps = false) {
    let query = `
      SELECT 
        d.*,
        COUNT(j.id) as jeep_count
    `;

    if (includeJeeps) {
      query += `,
        COALESCE(
          json_agg(
            json_build_object(
              'id', j.id,
              'name', j.name,
              'jeep_number', j.jeep_number,
              'region', j.region,
              'is_active', j.is_active,
              'is_available', j.is_available
            )
          ) FILTER (WHERE j.id IS NOT NULL),
          '[]'
        ) as jeeps
      `;
    }

    query += `
      FROM jeep_drivers d
      LEFT JOIN jeeps j ON d.id = j.driver_id
      WHERE d.id = $1
      GROUP BY d.id;
    `;

    const { rows } = await pool.query(query, [driverId]);
    return rows[0] || null;
  },

  /* Get all drivers */
  async getAllDrivers({
    search,
    sortBy = "created_at",
    order = "desc",
    limit = 20,
    offset = 0,
  }) {
    let query = `
      SELECT 
        d.*,
        COUNT(j.id) as jeep_count
      FROM jeep_drivers d
      LEFT JOIN jeeps j ON d.id = j.driver_id
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    // Search filter
    if (search) {
      query += ` AND (
        d.full_name ILIKE $${idx} OR 
        d.cnic ILIKE $${idx} OR
        d.phone ILIKE $${idx}
      )`;
      values.push(`%${search}%`);
      idx++;
    }

    // Group by
    query += ` GROUP BY d.id`;

    // Sorting
    const validSortColumns = {
      created_at: "d.created_at",
      full_name: "d.full_name",
      cnic: "d.cnic",
    };

    const sortColumn = validSortColumns[sortBy] || "d.created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Pagination
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  /* Count drivers */
  async countDrivers({ search }) {
    let query = `
      SELECT COUNT(*) as total
      FROM jeep_drivers d
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    if (search) {
      query += ` AND (
        d.full_name ILIKE $${idx} OR 
        d.cnic ILIKE $${idx} OR
        d.phone ILIKE $${idx}
      )`;
      values.push(`%${search}%`);
      idx++;
    }

    const { rows } = await pool.query(query, values);
    return parseInt(rows[0].total);
  },

  /* Update driver */
  async updateDriver(driverId, data, userId) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.fullName !== undefined) {
      fields.push(`full_name = $${idx++}`);
      values.push(data.fullName);
    }
    if (data.cnic !== undefined) {
      fields.push(`cnic = $${idx++}`);
      values.push(data.cnic);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(data.phone);
    }
    if (data.address !== undefined) {
      fields.push(`address = $${idx++}`);
      values.push(data.address);
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    fields.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
    values.push(userId, driverId);

    const query = `
      UPDATE jeep_drivers
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *;
    `;

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* Update driver active status */
  async updateDriverActiveStatus(driverId, isActive, userId) {
    const query = `
      UPDATE jeep_drivers
      SET 
        is_active = $1,
        updated_by = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [isActive, userId, driverId]);
    return rows[0];
  },

  /* Delete driver */
  async deleteDriver(driverId) {
    const query = `
      DELETE FROM jeep_drivers
      WHERE id = $1
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [driverId]);
    return rows[0];
  },

  /* Check if driver has jeeps */
  async checkDriverHasJeeps(driverId) {
    const query = `
      SELECT COUNT(*) as count
      FROM jeeps
      WHERE driver_id = $1;
    `;

    const { rows } = await pool.query(query, [driverId]);
    return parseInt(rows[0].count) > 0;
  },

  /* ============================================
     JEEP OPERATIONS
  ============================================ */

  /* Create jeep */
  async createJeep(data, userId) {
    const query = `
      INSERT INTO jeeps (
        name,
        description,
        region,
        jeep_number,
        vehicle_type,
        capacity,
        driver_id,
        main_image_url,
        main_image_public_id,
        is_available,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;

    const values = [
      data.name,
      data.description || null,
      data.region,
      data.jeepNumber,
      data.vehicleType || null,
      data.capacity,
      data.driverId,
      data.mainImageUrl,
      data.mainImagePublicId || null,
      data.isAvailable !== undefined ? data.isAvailable : true,
      userId,
      userId,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* Check if jeep exists by number */
  async checkJeepExistsByNumber(jeepNumber) {
    const query = `
      SELECT id, name, jeep_number
      FROM jeeps
      WHERE jeep_number = $1
      LIMIT 1;
    `;

    const { rows } = await pool.query(query, [jeepNumber]);
    return rows[0] || null;
  },

  /* Get jeep by ID */
  async getJeepById(jeepId, userId = null) {
    let query = `
      SELECT 
        j.*,
        d.full_name as driver_full_name,
        d.cnic as driver_cnic,
        d.phone as driver_phone,
        d.address as driver_address,
        d.is_active as driver_is_active,
        d.full_name as driver_name
    `;

    if (userId) {
      query += `,
        EXISTS(SELECT 1 FROM saved_jeeps WHERE user_id = $2 AND jeep_id = j.id) as is_saved
      `;
    }

    query += `
      FROM jeeps j
      LEFT JOIN jeep_drivers d ON j.driver_id = d.id
      WHERE j.id = $1;
    `;

    const values = userId ? [jeepId, userId] : [jeepId];
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  },

  /* Get all jeeps */
  async getAllJeeps({
    search,
    region,
    isAvailable,
    isActive,
    sortBy = "created_at",
    order = "desc",
    limit = 20,
    offset = 0,
    userId,
  }) {
    let query = `
      SELECT 
        j.*,
        d.full_name as driver_name,
        d.phone as driver_phone
    `;

    if (userId) {
      query += `,
        EXISTS(SELECT 1 FROM saved_jeeps WHERE user_id = $1 AND jeep_id = j.id) as is_saved
      `;
    }

    query += `
      FROM jeeps j
      LEFT JOIN jeep_drivers d ON j.driver_id = d.id
      WHERE 1=1
    `;

    const values = userId ? [userId] : [];
    let idx = userId ? 2 : 1;

    // Active filter
    if (isActive !== undefined) {
      query += ` AND j.is_active = $${idx}`;
      values.push(isActive);
      idx++;
    }

    // Available filter
    if (isAvailable !== undefined) {
      query += ` AND j.is_available = $${idx}`;
      values.push(isAvailable);
      idx++;
    }

    // Search filter
    if (search) {
      query += ` AND (
        j.name ILIKE $${idx} OR 
        j.description ILIKE $${idx} OR
        j.jeep_number ILIKE $${idx} OR
        d.full_name ILIKE $${idx}
      )`;
      values.push(`%${search}%`);
      idx++;
    }

    // Region filter
    if (region) {
      query += ` AND j.region = $${idx}`;
      values.push(region);
      idx++;
    }

    // Sorting
    const validSortColumns = {
      created_at: "j.created_at",
      name: "j.name",
      view_count: "j.view_count",
      average_rating: "j.average_rating",
      region: "j.region",
      capacity: "j.capacity",
    };

    const sortColumn = validSortColumns[sortBy] || "j.created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Pagination
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  /* Count jeeps */
  async countJeeps({ search, region, isAvailable, isActive }) {
    let query = `
      SELECT COUNT(*) as total
      FROM jeeps j
      LEFT JOIN jeep_drivers d ON j.driver_id = d.id
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    if (isActive !== undefined) {
      query += ` AND j.is_active = $${idx}`;
      values.push(isActive);
      idx++;
    }

    if (isAvailable !== undefined) {
      query += ` AND j.is_available = $${idx}`;
      values.push(isAvailable);
      idx++;
    }

    if (search) {
      query += ` AND (
        j.name ILIKE $${idx} OR 
        j.description ILIKE $${idx} OR
        j.jeep_number ILIKE $${idx} OR
        d.full_name ILIKE $${idx}
      )`;
      values.push(`%${search}%`);
      idx++;
    }

    if (region) {
      query += ` AND j.region = $${idx}`;
      values.push(region);
      idx++;
    }

    const { rows } = await pool.query(query, values);
    return parseInt(rows[0].total);
  },

  /* Get jeeps by region */
  async getJeepsByRegion(region, userId = null) {
    let query = `
      SELECT 
        j.*,
        d.full_name as driver_name,
        d.phone as driver_phone
    `;

    if (userId) {
      query += `,
        EXISTS(SELECT 1 FROM saved_jeeps WHERE user_id = $2 AND jeep_id = j.id) as is_saved
      `;
    }

    query += `
      FROM jeeps j
      LEFT JOIN jeep_drivers d ON j.driver_id = d.id
      WHERE j.region = $1 AND j.is_active = TRUE AND j.is_available = TRUE
      ORDER BY j.average_rating DESC, j.view_count DESC;
    `;

    const values = userId ? [region, userId] : [region];
    const { rows } = await pool.query(query, values);
    return rows;
  },

  /* Update jeep */
  async updateJeep(jeepId, data, userId) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.region !== undefined) {
      fields.push(`region = $${idx++}`);
      values.push(data.region);
    }
    if (data.jeepNumber !== undefined) {
      fields.push(`jeep_number = $${idx++}`);
      values.push(data.jeepNumber);
    }
    if (data.vehicleType !== undefined) {
      fields.push(`vehicle_type = $${idx++}`);
      values.push(data.vehicleType);
    }
    if (data.capacity !== undefined) {
      fields.push(`capacity = $${idx++}`);
      values.push(data.capacity);
    }
    if (data.mainImageUrl !== undefined) {
      fields.push(`main_image_url = $${idx++}`);
      values.push(data.mainImageUrl);
    }
    if (data.mainImagePublicId !== undefined) {
      fields.push(`main_image_public_id = $${idx++}`);
      values.push(data.mainImagePublicId);
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    fields.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
    values.push(userId, jeepId);

    const query = `
      UPDATE jeeps
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *;
    `;

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* Update jeep availability */
  async updateAvailability(jeepId, isAvailable, userId) {
    const query = `
      UPDATE jeeps
      SET 
        is_available = $1,
        updated_by = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [isAvailable, userId, jeepId]);
    return rows[0];
  },

  /* Update jeep active status */
  async updateActiveStatus(jeepId, isActive, userId) {
    const query = `
      UPDATE jeeps
      SET 
        is_active = $1,
        updated_by = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [isActive, userId, jeepId]);
    return rows[0];
  },

  /* Delete jeep */
  async deleteJeep(jeepId) {
    const query = `
      DELETE FROM jeeps
      WHERE id = $1
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [jeepId]);
    return rows[0];
  },

  /* Increment view count */
  async incrementViewCount(jeepId) {
    const query = `
      UPDATE jeeps
      SET view_count = view_count + 1
      WHERE id = $1
      RETURNING view_count;
    `;

    const { rows } = await pool.query(query, [jeepId]);
    return rows[0];
  },

  /* ============================================
     SAVED JEEPS OPERATIONS
  ============================================ */

  /* Save jeep */
  async saveJeep(userId, jeepId) {
    const query = `
      INSERT INTO saved_jeeps (user_id, jeep_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, jeep_id) DO NOTHING
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [userId, jeepId]);
    return rows[0];
  },

  /* Unsave jeep */
  async unsaveJeep(userId, jeepId) {
    const query = `
      DELETE FROM saved_jeeps
      WHERE user_id = $1 AND jeep_id = $2
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [userId, jeepId]);
    return rows[0];
  },

  /* Get saved jeeps */
  async getSavedJeeps(userId, limit = 50, offset = 0) {
    const query = `
      SELECT 
        j.*,
        d.full_name as driver_name,
        d.phone as driver_phone,
        sj.created_at as saved_at,
        TRUE as is_saved
      FROM saved_jeeps sj
      JOIN jeeps j ON sj.jeep_id = j.id
      LEFT JOIN jeep_drivers d ON j.driver_id = d.id
      WHERE sj.user_id = $1
      ORDER BY sj.created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const { rows } = await pool.query(query, [userId, limit, offset]);
    return rows;
  },

  /* Count saved jeeps */
  async countSavedJeeps(userId) {
    const query = `
      SELECT COUNT(*) as total
      FROM saved_jeeps
      WHERE user_id = $1;
    `;

    const { rows } = await pool.query(query, [userId]);
    return parseInt(rows[0].total);
  },

  /* ============================================
     GET TRENDING JEEPS
  ============================================ */
  async getTrendingJeeps(limit = 10, userId) {
    let query = `
      SELECT 
        j.*,
        d.full_name as driver_name,
        d.phone as driver_phone
    `;

    if (userId) {
      query += `,
        EXISTS(SELECT 1 FROM saved_jeeps WHERE user_id = $2 AND jeep_id = j.id) as is_saved
      `;
    }

    query += `
      FROM jeeps j
      LEFT JOIN jeep_drivers d ON j.driver_id = d.id
      WHERE j.is_active = TRUE AND j.is_available = TRUE
      ORDER BY j.view_count DESC, j.average_rating DESC
      LIMIT $1;
    `;

    const values = userId ? [limit, userId] : [limit];
    const { rows } = await pool.query(query, values);
    return rows;
  },
};
