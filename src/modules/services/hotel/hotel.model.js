// src/modules/hotels/hotels.model.js

import pool from "../../../config/postgres.js";

export const HotelsModel = {
  /* ============================================
     CREATE HOTEL
  ============================================ */
  async createHotel(data, userId) {
    const query = `
      INSERT INTO hotels (
        name,
        address,
        region,
        latitude,
        longitude,
        phone,
        email,
        description,
        main_image_url,
        main_image_public_id,
        amenities,
        is_all_season,
        season_open_from,
        season_open_to,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;

    const values = [
      data.name,
      data.address,
      data.region,
      data.latitude,
      data.longitude,
      data.phone || null,
      data.email || null,
      data.description || null,
      data.mainImageUrl,
      data.mainImagePublicId || null,
      JSON.stringify(data.amenities || []),
      data.isAllSeason || false,
      data.seasonOpenFrom || null,
      data.seasonOpenTo || null,
      userId,
      userId,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* ============================================
     CHECK IF HOTEL EXISTS
  ============================================ */
  async checkHotelExists(name, latitude, longitude) {
    const query = `
      SELECT id, name, latitude, longitude
      FROM hotels
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
     GET HOTEL BY ID
  ============================================ */
  async getHotelById(hotelId, userId = null) {
    let query = `
      SELECT 
        h.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', hi.id,
              'image_url', hi.image_url,
              'caption', hi.caption,
              'display_order', hi.display_order
            ) ORDER BY hi.display_order
          ) FILTER (WHERE hi.id IS NOT NULL),
          '[]'
        ) as images
    `;

    if (userId) {
      query += `,
        EXISTS(SELECT 1 FROM saved_hotels WHERE user_id = $2 AND hotel_id = h.id) as is_saved
      `;
    }

    query += `
      FROM hotels h
      LEFT JOIN hotel_images hi ON h.id = hi.hotel_id
      WHERE h.id = $1
      GROUP BY h.id;
    `;

    const values = userId ? [hotelId, userId] : [hotelId];
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  },

  /* ============================================
     GET ALL HOTELS
  ============================================ */
  async getAllHotels({
    search,
    region,
    isAllSeason,
    isActive,
    sortBy = "created_at",
    order = "desc",
    limit = 20,
    offset = 0,
    userId ,
  }) {
    let query = `
      SELECT 
        h.*
    `;

    if (userId) {
      query += `,
        EXISTS(SELECT 1 FROM saved_hotels WHERE user_id = $1 AND hotel_id = h.id) as is_saved
      `;
    }

    query += `
      FROM hotels h
      WHERE 1=1
    `;

    const values = userId ? [userId] : [];
    let idx = userId ? 2 : 1;

    // Active filter
    if (isActive !== undefined) {
      query += ` AND h.is_active = $${idx}`;
      values.push(isActive);
      idx++;
    }

    // Search filter
    if (search) {
      query += ` AND (
        h.name ILIKE $${idx} OR 
        h.address ILIKE $${idx} OR
        h.description ILIKE $${idx}
      )`;
      values.push(`%${search}%`);
      idx++;
    }

    // Region filter
    if (region) {
      query += ` AND h.region = $${idx}`;
      values.push(region);
      idx++;
    }

    // All season filter
    if (isAllSeason !== undefined) {
      query += ` AND h.is_all_season = $${idx}`;
      values.push(isAllSeason);
      idx++;
    }

    // Sorting
    const validSortColumns = {
      created_at: "h.created_at",
      name: "h.name",
      view_count: "h.view_count",
      average_rating: "h.average_rating",
      region: "h.region",
    };

    const sortColumn = validSortColumns[sortBy] || "h.created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Pagination
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  /* ============================================
     COUNT HOTELS
  ============================================ */
  async countHotels({ search, region, isAllSeason, isActive }) {
    let query = `
      SELECT COUNT(*) as total
      FROM hotels h
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    if (isActive !== undefined) {
      query += ` AND h.is_active = $${idx}`;
      values.push(isActive);
      idx++;
    }

    if (search) {
      query += ` AND (
        h.name ILIKE $${idx} OR 
        h.address ILIKE $${idx} OR
        h.description ILIKE $${idx}
      )`;
      values.push(`%${search}%`);
      idx++;
    }

    if (region) {
      query += ` AND h.region = $${idx}`;
      values.push(region);
      idx++;
    }

    if (isAllSeason !== undefined) {
      query += ` AND h.is_all_season = $${idx}`;
      values.push(isAllSeason);
      idx++;
    }

    const { rows } = await pool.query(query, values);
    return parseInt(rows[0].total);
  },

  /* ============================================
     GET NEARBY HOTELS (by place location)
  ============================================ */
  async getNearbyHotels(placeLat, placeLon, radiusKm = 10, userId = null) {
    let query = `
      SELECT 
        h.*,
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(h.latitude)) *
            cos(radians(h.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(h.latitude))
          )
        ) AS distance
    `;

    if (userId) {
      query += `,
        EXISTS(SELECT 1 FROM saved_hotels WHERE user_id = $4 AND hotel_id = h.id) as is_saved
      `;
    }

    query += `
      FROM hotels h
      WHERE h.is_active = TRUE
      HAVING distance <= $3
      ORDER BY distance ASC;
    `;

    const values = userId
      ? [placeLat, placeLon, radiusKm, userId]
      : [placeLat, placeLon, radiusKm];

    const { rows } = await pool.query(query, values);
    return rows;
  },


 
  /* ============================================
     UPDATE HOTEL
  ============================================ */
  async updateHotel(hotelId, data, userId) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.address !== undefined) {
      fields.push(`address = $${idx++}`);
      values.push(data.address);
    }
    if (data.region !== undefined) {
      fields.push(`region = $${idx++}`);
      values.push(data.region);
    }
    if (data.latitude !== undefined) {
      fields.push(`latitude = $${idx++}`);
      values.push(data.latitude);
    }
    if (data.longitude !== undefined) {
      fields.push(`longitude = $${idx++}`);
      values.push(data.longitude);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(data.email);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.mainImageUrl !== undefined) {
      fields.push(`main_image_url = $${idx++}`);
      values.push(data.mainImageUrl);
    }
    if (data.mainImagePublicId !== undefined) {
      fields.push(`main_image_public_id = $${idx++}`);
      values.push(data.mainImagePublicId);
    }
    if (data.amenities !== undefined) {
      fields.push(`amenities = $${idx++}`);
      values.push(JSON.stringify(data.amenities));
    }
    if (data.isAllSeason !== undefined) {
      fields.push(`is_all_season = $${idx++}`);
      values.push(data.isAllSeason);
    }
    if (data.seasonOpenFrom !== undefined) {
      fields.push(`season_open_from = $${idx++}`);
      values.push(data.seasonOpenFrom);
    }
    if (data.seasonOpenTo !== undefined) {
      fields.push(`season_open_to = $${idx++}`);
      values.push(data.seasonOpenTo);
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    fields.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
    values.push(userId, hotelId);

    const query = `
      UPDATE hotels
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *;
    `;

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* ============================================
     UPDATE ACTIVE STATUS
  ============================================ */
  async updateActiveStatus(hotelId, isActive, userId) {
    const query = `
      UPDATE hotels
      SET 
        is_active = $1,
        updated_by = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [isActive, userId, hotelId]);
    return rows[0];
  },

  /* ============================================
     DELETE HOTEL
  ============================================ */
  async deleteHotel(hotelId) {
    const query = `
      DELETE FROM hotels
      WHERE id = $1
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [hotelId]);
    return rows[0];
  },

  /* ============================================
     INCREMENT VIEW COUNT
  ============================================ */
  async incrementViewCount(hotelId) {
    const query = `
      UPDATE hotels
      SET view_count = view_count + 1
      WHERE id = $1
      RETURNING view_count;
    `;

    const { rows } = await pool.query(query, [hotelId]);
    return rows[0];
  },

  /* ============================================
     HOTEL IMAGES OPERATIONS
  ============================================ */

  async addHotelImage(
    hotelId,
    imageUrl,
    publicId,
    caption,
    displayOrder,
    userId,
  ) {
    const query = `
      INSERT INTO hotel_images (
        hotel_id,
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
      hotelId,
      imageUrl,
      publicId,
      caption,
      displayOrder || 0,
      userId,
    ]);
    return rows[0];
  },

  async getHotelImages(hotelId) {
    const query = `
      SELECT *
      FROM hotel_images
      WHERE hotel_id = $1
      ORDER BY display_order ASC, created_at ASC;
    `;

    const { rows } = await pool.query(query, [hotelId]);
    return rows;
  },

  async getHotelImageById(imageId, hotelId) {
    const query = `
      SELECT *
      FROM hotel_images
      WHERE id = $1 AND hotel_id = $2;
    `;

    const { rows } = await pool.query(query, [imageId, hotelId]);
    return rows[0] || null;
  },

  async deleteHotelImage(imageId) {
    const query = `
      DELETE FROM hotel_images
      WHERE id = $1
      RETURNING cloudinary_public_id;
    `;

    const { rows } = await pool.query(query, [imageId]);
    return rows[0];
  },

  /* ============================================
     SAVED HOTELS OPERATIONS
  ============================================ */

  async saveHotel(userId, hotelId) {
    const query = `
      INSERT INTO saved_hotels (user_id, hotel_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, hotel_id) DO NOTHING
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [userId, hotelId]);
    return rows[0];
  },

  async unsaveHotel(userId, hotelId) {
    const query = `
      DELETE FROM saved_hotels
      WHERE user_id = $1 AND hotel_id = $2
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [userId, hotelId]);
    return rows[0];
  },

  async getSavedHotels(userId, limit = 50, offset = 0) {
    const query = `
      SELECT 
        h.*,
        sh.created_at as saved_at,
        TRUE as is_saved
      FROM saved_hotels sh
      JOIN hotels h ON sh.hotel_id = h.id
      WHERE sh.user_id = $1
      ORDER BY sh.created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const { rows } = await pool.query(query, [userId, limit, offset]);
    return rows;
  },

  async countSavedHotels(userId) {
    const query = `
      SELECT COUNT(*) as total
      FROM saved_hotels
      WHERE user_id = $1;
    `;

    const { rows } = await pool.query(query, [userId]);
    return parseInt(rows[0].total);
  },

  /* ============================================
     GET TRENDING HOTELS
  ============================================ */
  async getTrendingHotels(limit = 10, userId ) {
    let query = `
      SELECT 
        h.*
    `;

    if (userId) {
      query += `,
        EXISTS(SELECT 1 FROM saved_hotels WHERE user_id = $2 AND hotel_id = h.id) as is_saved
      `;
    }

    query += `
      FROM hotels h
      WHERE h.is_active = TRUE
      ORDER BY h.view_count DESC, h.average_rating DESC
      LIMIT $1;
    `;

    const values = userId ? [limit, userId] : [limit];
    const { rows } = await pool.query(query, values);
    return rows;
  },
};
