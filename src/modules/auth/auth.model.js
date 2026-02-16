// src/models/auth.model.js
import pool from "../../config/postgres.js";

/* ======================================================
   AUTH MODEL
   - Handles ONLY database operations related to auth
   - No business logic here
====================================================== */

export const AuthModel = {
  /* ------------------------------
     CREATE USER
  ------------------------------ */
  async createUser({
    name,
    email,
    phone,
    cnic,
    passwordHash,
    phoneVerified = false,
    emailVerified = false,
    role = "user",
  }) {
    const query = `
      INSERT INTO users (
        name,
        email,
        phone,
        cnic,
        password_hash,
        phone_verified,
        email_verified,
        role
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, email, phone, cnic, phone_verified, email_verified, role, created_at;
    `;

    const values = [
      name,
      email,
      phone,
      cnic,
      passwordHash,
      phoneVerified,
      emailVerified,
      role,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /* ------------------------------
     FIND USER BY PHONE
  ------------------------------ */
  async findUserByPhone(phone) {
    const query = `
      SELECT *
      FROM users
      WHERE phone = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [phone]);
    return rows[0] || null;
  },

  /* ------------------------------
     FIND USER BY EMAIL
  ------------------------------ */
  async findUserByEmail(email) {
    const query = `
      SELECT *
      FROM users
      WHERE email = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [email]);
    return rows[0] || null;
  },

  /* ------------------------------
     FIND USER BY ID
  ------------------------------ */
  async findUserById(userId) {
    const query = `
      SELECT *
      FROM users
      WHERE id = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows[0] || null;
  },

  /* ------------------------------
     UPDATE PASSWORD
  ------------------------------ */
  async updatePassword(userId, newPasswordHash) {
    const query = `
      UPDATE users
      SET password_hash = $1,
          updated_at = NOW()
      WHERE id = $2;
    `;
    await pool.query(query, [newPasswordHash, userId]);
  },

  
  // /* ------------------------------
  //    UPDATE USER - SELF (cannot change role)
  // ------------------------------ */
  // async updateSelf(userId, { name, email, phone }) {
  //   const fields = [];
  //   const values = [];
  //   let idx = 1;

  //   if (name) {
  //     fields.push(`name = $${idx++}`);
  //     values.push(name);
  //   }
  //   if (email) {
  //     fields.push(`email = $${idx++}`);
  //     values.push(email);
  //   }
  //   if (phone) {
  //     fields.push(`phone = $${idx++}`);
  //     values.push(phone);
  //   }

  //   if (fields.length === 0) return; // nothing to update

  //   fields.push(`updated_at = NOW()`);

  //   const query = `
  //     UPDATE users
  //     SET ${fields.join(", ")}
  //     WHERE id = $${idx}
  //     RETURNING id, name, email, phone, cnic, role, phone_verified, email_verified;
  //   `;
  //   values.push(userId);

  //   const { rows } = await pool.query(query, values);
  //   return rows[0];
  // },

  // /* ------------------------------
  //    UPDATE USER - ADMIN (can update role)
  // ------------------------------ */
  // async updateByAdmin(userId, { name, email, phone, role }) {
  //   const fields = [];
  //   const values = [];
  //   let idx = 1;

  //   if (name) {
  //     fields.push(`name = $${idx++}`);
  //     values.push(name);
  //   }
  //   if (email) {
  //     fields.push(`email = $${idx++}`);
  //     values.push(email);
  //   }
  //   if (phone) {
  //     fields.push(`phone = $${idx++}`);
  //     values.push(phone);
  //   }
  //   if (role) {
  //     fields.push(`role = $${idx++}`);
  //     values.push(role);
  //   }

  //   if (fields.length === 0) return; // nothing to update

  //   fields.push(`updated_at = NOW()`);

  //   const query = `
  //     UPDATE users
  //     SET ${fields.join(", ")}
  //     WHERE id = $${idx}
  //     RETURNING id, name, email, phone, cnic, role, phone_verified, email_verified;
  //   `;
  //   values.push(userId);

  //   const { rows } = await pool.query(query, values);
  //   return rows[0];
  // },

  // /* ------------------------------
  //    LIST ALL USERS (Optional - Admin)
  // ------------------------------ */
  // async listUsers(limit = 50, offset = 0) {
  //   const query = `
  //     SELECT id, name, email, phone, cnic, role, phone_verified, email_verified, created_at
  //     FROM users
  //     ORDER BY created_at DESC
  //     LIMIT $1 OFFSET $2;
  //   `;
  //   const { rows } = await pool.query(query, [limit, offset]);
  //   return rows;
  // },
};
