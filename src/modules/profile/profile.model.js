// src/modules/profile/profile.model.js

import pool from "../../config/postgres.js";

export const ProfileModel = {
  /* ============================================
     GET PROFILE BY USER ID
  ============================================ */
  async getProfileByUserId(userId) {
    const query = `
      SELECT 
        p.*,
        u.id as user_id,
        u.name,
        u.email,
        u.phone,
        u.cnic,
        u.role,
        u.phone_verified,
        u.email_verified,
        u.created_at as user_created_at,
        u.updated_at as user_updated_at
      FROM users u
      LEFT JOIN profile p ON u.id = p.user_id
      WHERE u.id = $1;
    `;

    const { rows } = await pool.query(query, [userId]);
    return rows[0] || null;
  },

  /* ============================================
     CREATE PROFILE
  ============================================ */
  async createProfile(userId, data) {
    const query = `
      INSERT INTO profile (
        user_id,
        dob,
        gender,
        nationality,
        address_line,
        city,
        province,
        country,
        postal_code,
        emergency_contact,
        profile_image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const values = [
      userId,
      data.dob || null,
      data.gender || null,
      data.nationality || null,
      data.addressLine || null,
      data.city || null,
      data.province || null,
      data.country || "Pakistan",
      data.postalCode || null,
      data.emergencyContact ? JSON.stringify(data.emergencyContact) : null,
      data.profileImageUrl || null,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* ============================================
     UPDATE PROFILE (UPSERT)
  ============================================ */
  async upsertProfile(userId, data) {
    // Check if profile exists
    const existingProfile = await this.findByUserId(userId);

    if (existingProfile) {
      // Update existing profile
      return await this.updateProfile(userId, data);
    } else {
      // Create new profile
      return await this.createProfile(userId, data);
    }
  },

  /* ============================================
     UPDATE PROFILE
  ============================================ */
  async updateProfile(userId, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.dob !== undefined) {
      fields.push(`dob = $${idx++}`);
      values.push(data.dob);
    }
    if (data.gender !== undefined) {
      fields.push(`gender = $${idx++}`);
      values.push(data.gender);
    }
    if (data.nationality !== undefined) {
      fields.push(`nationality = $${idx++}`);
      values.push(data.nationality);
    }
    if (data.addressLine !== undefined) {
      fields.push(`address_line = $${idx++}`);
      values.push(data.addressLine);
    }
    if (data.city !== undefined) {
      fields.push(`city = $${idx++}`);
      values.push(data.city);
    }
    if (data.province !== undefined) {
      fields.push(`province = $${idx++}`);
      values.push(data.province);
    }
    if (data.country !== undefined) {
      fields.push(`country = $${idx++}`);
      values.push(data.country);
    }
    if (data.postalCode !== undefined) {
      fields.push(`postal_code = $${idx++}`);
      values.push(data.postalCode);
    }
    if (data.emergencyContact !== undefined) {
      fields.push(`emergency_contact = $${idx++}`);
      values.push(JSON.stringify(data.emergencyContact));
    }
    if (data.profileImageUrl !== undefined) {
      fields.push(`profile_image_url = $${idx++}`);
      values.push(data.profileImageUrl);
    }

    if (fields.length === 0) {
      // No fields to update
      return await this.findByUserId(userId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE profile
      SET ${fields.join(", ")}
      WHERE user_id = $${idx}
      RETURNING *;
    `;

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* ============================================
     FIND PROFILE BY USER ID (PROFILE TABLE ONLY)
  ============================================ */
  async findByUserId(userId) {
    const query = `
      SELECT * FROM profile
      WHERE user_id = $1;
    `;

    const { rows } = await pool.query(query, [userId]);
    return rows[0] || null;
  },

  /* ============================================
     UPDATE USER NAME (for admin or user)
  ============================================ */
  async updateUserName(userId, name) {
    const query = `
      UPDATE users
      SET name = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING name;
    `;

    const { rows } = await pool.query(query, [name, userId]);
    return rows[0];
  },

  /* ============================================
     GET ALL PROFILES (ADMIN - with pagination & search)
  ============================================ */
  async getAllProfiles({ search, sortBy, order, limit, offset }) {
    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.cnic,
        u.role,
        u.phone_verified,
        u.email_verified,
        u.created_at,
        p.profile_image_url,
        p.city,
        p.province
      FROM users u
      LEFT JOIN profile p ON u.id = p.user_id
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    // Search filter
    if (search) {
      query += ` AND (
        u.name ILIKE $${idx} OR 
        u.email ILIKE $${idx} OR 
        u.phone ILIKE $${idx}
      )`;
      values.push(`%${search}%`);
      idx++;
    }

    // Sorting
    const validSortColumns = ["name", "email", "created_at", "role"];
    const sortColumn = validSortColumns.includes(sortBy)
      ? sortBy
      : "created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";

    query += ` ORDER BY u.${sortColumn} ${sortOrder}`;

    // Pagination
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  /* ============================================
     COUNT ALL PROFILES (for pagination)
  ============================================ */
  async countAllProfiles(search) {
    let query = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE 1=1
    `;

    const values = [];

    if (search) {
      query += ` AND (
        u.name ILIKE $1 OR 
        u.email ILIKE $1 OR 
        u.phone ILIKE $1
      )`;
      values.push(`%${search}%`);
    }

    const { rows } = await pool.query(query, values);
    return parseInt(rows[0].total);
  },

  /* ============================================
     DELETE USER (ADMIN ONLY)
  ============================================ */
  async deleteUser(userId) {
    // Profile will be auto-deleted due to CASCADE
    const query = `
      DELETE FROM users
      WHERE id = $1
      RETURNING id;
    `;

    const { rows } = await pool.query(query, [userId]);
    return rows[0];
  },

  /* ============================================
     UPDATE USER BY ADMIN (including sensitive data)
  ============================================ */
  async updateUserByAdmin(userId, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(data.email);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(data.phone);
    }
    if (data.cnic !== undefined) {
      fields.push(`cnic = $${idx++}`);
      values.push(data.cnic);
    }
    if (data.role !== undefined) {
      fields.push(`role = $${idx++}`);
      values.push(data.role);
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING id, name, email, phone, cnic, role, phone_verified, email_verified;
    `;

    const { rows } = await pool.query(query, values);
    return rows[0];
  },
};
