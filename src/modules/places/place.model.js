// src/modules/places/places.model.js

import pool from "../../config/postgres.js";

export const PlacesModel = {
  /* ============================================
     CREATE PLACE
  ============================================ */
  async createPlace(data, userId) {
    const query = `
      INSERT INTO places (
        name,
        description,
        region,
        type,
        latitude,
        longitude,
        main_image_url,
        safety_status,
        safety_message,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const values = [
      data.name,
      data.description,
      data.region,
      data.type,
      data.latitude,
      data.longitude,
      data.mainImageUrl,
      data.safetyStatus || "safe",
      data.safetyMessage || null,
      userId,
      userId,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* ============================================
     CHECK IF PLACE EXISTS (by name and coordinates)
  ============================================ */
  async checkPlaceExists(name, latitude, longitude) {
    const query = `
      SELECT id, name, latitude, longitude
      FROM places
      WHERE 
        LOWER(name) = LOWER($1)
        OR (
          ABS(latitude - $2) < 0.0001 
          AND ABS(longitude - $3) < 0.0001
        )
      LIMIT 1;
    `;

    const { rows } = await pool.query(query, [name, latitude, longitude]);
    return rows[0] || null;
  },

  /* ============================================
   GET PLACE BY ID
============================================ */
  async getPlaceById(placeId, userId) {
    const query = `
    SELECT 
      p.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', pi.id,
            'image_url', pi.image_url,
            'caption', pi.caption,
            'display_order', pi.display_order
          ) ORDER BY pi.display_order
        ) FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) as images,
      EXISTS(SELECT 1 FROM saved_places WHERE user_id = $2 AND place_id = p.id) as is_saved
    FROM places p
    LEFT JOIN place_images pi ON p.id = pi.place_id
    WHERE p.id = $1
    GROUP BY p.id;
  `;

    const values = [placeId, userId];
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  },

  /* ============================================
   GET ALL PLACES (with filters, search, sort, pagination)
============================================ */
  async getAllPlaces({
    search,
    region,
    type,
    safetyStatus,
    isActive = true,
    sortBy = "created_at",
    order = "desc",
    limit = 20,
    offset = 0,
    userId, // ✅ Always provided (authenticated user)
  }) {
    let query = `
    SELECT 
      p.*,
      EXISTS(SELECT 1 FROM saved_places WHERE user_id = $1 AND place_id = p.id) as is_saved
    FROM places p
    WHERE 1=1
  `;

    const values = [userId]; // ✅ userId is first parameter
    let idx = 2; // Start from $2

    // Active filter (for public users)
    if (isActive !== undefined) {
      query += ` AND p.is_active = $${idx}`;
      values.push(isActive);
      idx++;
    }

    // Search filter
    if (search) {
      query += ` AND (
      p.name ILIKE $${idx} OR 
      p.description ILIKE $${idx} OR
      p.type ILIKE $${idx}
    )`;
      values.push(`%${search}%`);
      idx++;
    }

    // Region filter
    if (region) {
      query += ` AND p.region = $${idx}`;
      values.push(region);
      idx++;
    }

    // Type filter
    if (type) {
      query += ` AND p.type = $${idx}`;
      values.push(type);
      idx++;
    }

    // Safety status filter
    if (safetyStatus) {
      query += ` AND p.safety_status = $${idx}`;
      values.push(safetyStatus);
      idx++;
    }

    // Sorting
    const validSortColumns = {
      created_at: "p.created_at",
      name: "p.name",
      view_count: "p.view_count",
      average_rating: "p.average_rating",
      region: "p.region",
    };

    const sortColumn = validSortColumns[sortBy] || "p.created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Pagination
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  /* ============================================
     COUNT PLACES (for pagination)
  ============================================ */
  async countPlaces({ search, region, type, safetyStatus, isActive }) {
    let query = `
      SELECT COUNT(*) as total
      FROM places p
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    if (isActive !== undefined) {
      query += ` AND p.is_active = $${idx}`;
      values.push(isActive);
      idx++;
    }

    if (search) {
      query += ` AND (
        p.name ILIKE $${idx} OR 
        p.description ILIKE $${idx} OR
        p.type ILIKE $${idx}
      )`;
      values.push(`%${search}%`);
      idx++;
    }

    if (region) {
      query += ` AND p.region = $${idx}`;
      values.push(region);
      idx++;
    }

    if (type) {
      query += ` AND p.type = $${idx}`;
      values.push(type);
      idx++;
    }

    if (safetyStatus) {
      query += ` AND p.safety_status = $${idx}`;
      values.push(safetyStatus);
      idx++;
    }

    const { rows } = await pool.query(query, values);
    return parseInt(rows[0].total);
  },

  /* ============================================
     UPDATE PLACE
  ============================================ */
  async updatePlace(placeId, data, userId) {
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
    if (data.type !== undefined) {
      fields.push(`type = $${idx++}`);
      values.push(data.type);
    }
    if (data.latitude !== undefined) {
      fields.push(`latitude = $${idx++}`);
      values.push(data.latitude);
    }
    if (data.longitude !== undefined) {
      fields.push(`longitude = $${idx++}`);
      values.push(data.longitude);
    }
    if (data.mainImageUrl !== undefined) {
      fields.push(`main_image_url = $${idx++}`);
      values.push(data.mainImageUrl);
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    fields.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
    values.push(userId, placeId);

    const query = `
      UPDATE places
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *;
    `;

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* ============================================
     UPDATE SAFETY STATUS
  ============================================ */
  async updateSafetyStatus(
    placeId,
    safetyStatus,
    safetyMessage,
    safetyFlags,
    userId,
  ) {
    const query = `
      UPDATE places
      SET 
        safety_status = $1,
        safety_message = $2,
        safety_flags = $3,
        updated_by = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *;
    `;

    const values = [
      safetyStatus,
      safetyMessage,
      safetyFlags ? JSON.stringify(safetyFlags) : null,
      userId,
      placeId,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* ============================================
     UPDATE ACTIVE STATUS
  ============================================ */
  async updateActiveStatus(placeId, isActive, userId) {
    const query = `
      UPDATE places
      SET 
        is_active = $1,
        updated_by = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [isActive, userId, placeId]);
    return rows[0];
  },

  /* ============================================
     DELETE PLACE
  ============================================ */
  async deletePlace(placeId) {
    // Images will be cascade deleted
    const query = `
      DELETE FROM places
      WHERE id = $1
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [placeId]);
    return rows[0];
  },

  /* ============================================
     INCREMENT VIEW COUNT
  ============================================ */
  async incrementViewCount(placeId) {
    const query = `
      UPDATE places
      SET view_count = view_count + 1
      WHERE id = $1
      RETURNING view_count;
    `;

    const { rows } = await pool.query(query, [placeId]);
    return rows[0];
  },

  /* ============================================
     PLACE IMAGES OPERATIONS
  ============================================ */

  async addPlaceImage(
    placeId,
    imageUrl,
    publicId,
    caption,
    displayOrder,
    userId,
  ) {
    const query = `
      INSERT INTO place_images (
        place_id,
        image_url,
        cloudinary_public_id,
        caption,
        display_order,
        uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [
      placeId,
      imageUrl,
      publicId,
      caption,
      displayOrder || 0,
      userId,
    ]);
    return rows[0];
  },

  async getPlaceImages(placeId) {
    const query = `
      SELECT *
      FROM place_images
      WHERE place_id = $1
      ORDER BY display_order ASC, created_at ASC;
    `;

    const { rows } = await pool.query(query, [placeId]);
    return rows;
  },

  async deletePlaceImage(imageId) {
    const query = `
      DELETE FROM place_images
      WHERE id = $1
      RETURNING cloudinary_public_id;
    `;

    const { rows } = await pool.query(query, [imageId]);
    return rows[0];
  },

  /* ============================================
     SAVED PLACES OPERATIONS
  ============================================ */

  async savePlace(userId, placeId) {
    const query = `
      INSERT INTO saved_places (user_id, place_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, place_id) DO NOTHING
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [userId, placeId]);
    return rows[0];
  },

  async unsavePlace(userId, placeId) {
    const query = `
      DELETE FROM saved_places
      WHERE user_id = $1 AND place_id = $2
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [userId, placeId]);
    return rows[0];
  },

  async getSavedPlaces(userId, limit = 20, offset = 0) {
    const query = `
      SELECT 
        p.*,
        sp.created_at as saved_at,
        TRUE as is_saved
      FROM saved_places sp
      JOIN places p ON sp.place_id = p.id
      WHERE sp.user_id = $1
      ORDER BY sp.created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const { rows } = await pool.query(query, [userId, limit, offset]);
    return rows;
  },

  async countSavedPlaces(userId) {
    const query = `
      SELECT COUNT(*) as total
      FROM saved_places
      WHERE user_id = $1;
    `;

    const { rows } = await pool.query(query, [userId]);
    return parseInt(rows[0].total);
  },

  /* ============================================
   GET TRENDING PLACES (by views)
============================================ */
  async getTrendingPlaces(limit = 10, userId) {
    const query = `
    SELECT 
      p.*,
      EXISTS(SELECT 1 FROM saved_places WHERE user_id = $2 AND place_id = p.id) as is_saved
    FROM places p
    WHERE p.is_active = TRUE
    ORDER BY p.view_count DESC, p.average_rating DESC
    LIMIT $1;
  `;

    const values = [limit, userId];
    const { rows } = await pool.query(query, values);
    return rows;
  },

  // get place Coordinate
  async getPlaceCoordinates(placeId) {
    const query = `
    SELECT latitude, longitude
    FROM places
    WHERE id = $1
  `;
    const { rows } = await pool.query(query, [placeId]);
    return rows[0] || null;
  },
};
