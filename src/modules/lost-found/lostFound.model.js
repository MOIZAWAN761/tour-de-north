// src/modules/lost-and-found/lostfound.model.js

import pool from "../../config/postgres.js";

export const LostFoundModel = {
  /* ============================================
     LOST ITEMS OPERATIONS
  ============================================ */

  // Create lost report
  async createLostReport(data, userId) {
    const query = `
      INSERT INTO lost_reports (
        user_id,
        item_category,
        item_name,
        description,
        lost_location,
        lost_date,
        contact_phone,
        contact_email,
        image_url,
        latitude,
        longitude,
        additional_details
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;

    const values = [
      userId,
      data.itemCategory,
      data.itemName,
      data.description,
      data.lostLocation,
      data.lostDate,
      data.contactPhone,
      data.contactEmail || null,
      data.imageUrl || null,
      data.latitude || null,
      data.longitude || null,
      data.additionalDetails ? JSON.stringify(data.additionalDetails) : null,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Get all lost reports with filters (minimal info for list view)
  async getAllLostReports({
    search,
    itemCategory,
    lostLocation,
    dateFrom,
    dateTo,
    status = "active",
    sortBy = "created_at",
    order = "desc",
    limit = 20,
    offset = 0,
    userId = null,
    myItemsOnly = false,
  }) {
    let query = `
      SELECT 
        lr.id,
        lr.item_category,
        lr.item_name,
        lr.image_url,
        lr.lost_location,
        lr.lost_date,
        lr.status,
        lr.created_at,
        (SELECT COUNT(*) FROM lost_claims WHERE lost_report_id = lr.id) as claim_count
      FROM lost_reports lr
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    // My items only filter
    if (myItemsOnly && userId) {
      query += ` AND lr.user_id = $${idx}`;
      values.push(userId);
      idx++;
    }

    // Status filter
    if (status) {
      query += ` AND lr.status = $${idx}`;
      values.push(status);
      idx++;
    }

    // Search filter
    if (search) {
      query += ` AND (
        lr.item_name ILIKE $${idx} OR 
        lr.description ILIKE $${idx} OR
        lr.item_category ILIKE $${idx}
      )`;
      values.push(`%${search}%`);
      idx++;
    }

    // Category filter
    if (itemCategory) {
      query += ` AND lr.item_category = $${idx}`;
      values.push(itemCategory);
      idx++;
    }

    // Location filter
    if (lostLocation) {
      query += ` AND lr.lost_location ILIKE $${idx}`;
      values.push(`%${lostLocation}%`);
      idx++;
    }

    // Date range filter
    if (dateFrom) {
      query += ` AND lr.lost_date >= $${idx}`;
      values.push(dateFrom);
      idx++;
    }

    if (dateTo) {
      query += ` AND lr.lost_date <= $${idx}`;
      values.push(dateTo);
      idx++;
    }

    // Sorting
    const validSortColumns = {
      created_at: "lr.created_at",
      lost_date: "lr.lost_date",
      item_name: "lr.item_name",
      claim_count: "claim_count",
    };

    const sortColumn = validSortColumns[sortBy] || "lr.created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Pagination
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  // Count lost reports
  async countLostReports({
    search,
    itemCategory,
    lostLocation,
    dateFrom,
    dateTo,
    status = "active",
    userId = null,
    myItemsOnly = false,
  }) {
    let query = `
      SELECT COUNT(*) as total
      FROM lost_reports lr
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    if (myItemsOnly && userId) {
      query += ` AND lr.user_id = $${idx}`;
      values.push(userId);
      idx++;
    }

    if (status) {
      query += ` AND lr.status = $${idx}`;
      values.push(status);
      idx++;
    }

    if (search) {
      query += ` AND (
        lr.item_name ILIKE $${idx} OR 
        lr.description ILIKE $${idx} OR
        lr.item_category ILIKE $${idx}
      )`;
      values.push(`%${search}%`);
      idx++;
    }

    if (itemCategory) {
      query += ` AND lr.item_category = $${idx}`;
      values.push(itemCategory);
      idx++;
    }

    if (lostLocation) {
      query += ` AND lr.lost_location ILIKE $${idx}`;
      values.push(`%${lostLocation}%`);
      idx++;
    }

    if (dateFrom) {
      query += ` AND lr.lost_date >= $${idx}`;
      values.push(dateFrom);
      idx++;
    }

    if (dateTo) {
      query += ` AND lr.lost_date <= $${idx}`;
      values.push(dateTo);
      idx++;
    }

    const { rows } = await pool.query(query, values);
    return parseInt(rows[0].total);
  },

  // Get lost report by ID
  async getLostReportById(reportId, userId = null) {
    const query = `
      SELECT 
        lr.*,
        u.name as user_name,
        u.phone as user_phone,
        u.email as user_email,
        (SELECT COUNT(*) FROM lost_claims WHERE lost_report_id = lr.id) as claim_count,
        CASE WHEN lr.user_id = $2 THEN true ELSE false END as is_owner
      FROM lost_reports lr
      LEFT JOIN users u ON lr.user_id = u.id
      WHERE lr.id = $1;
    `;

    const { rows } = await pool.query(query, [reportId, userId]);
    return rows[0] || null;
  },

  // Update lost report status
  async updateLostReportStatus(reportId, status, resolvedDate = null) {
    const query = `
      UPDATE lost_reports
      SET 
        status = $1,
        resolved_date = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [status, resolvedDate, reportId]);
    return rows[0];
  },

  // Delete lost report (soft delete by changing status)
  async deleteLostReport(reportId) {
    const query = `
      DELETE FROM lost_reports
      WHERE id = $1
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [reportId]);
    return rows[0];
  },

  /* ============================================
     FOUND ITEMS OPERATIONS
  ============================================ */

  // Create found report
  async createFoundReport(data, userId) {
    const query = `
      INSERT INTO found_reports (
        user_id,
        item_category,
        item_name,
        description,
        found_location,
        found_date,
        current_location,
        contact_phone,
        contact_email,
        image_url,
        latitude,
        longitude,
        additional_details
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const values = [
      userId,
      data.itemCategory,
      data.itemName,
      data.description,
      data.foundLocation,
      data.foundDate,
      data.currentLocation,
      data.contactPhone,
      data.contactEmail || null,
      data.imageUrl || null,
      data.latitude || null,
      data.longitude || null,
      data.additionalDetails ? JSON.stringify(data.additionalDetails) : null,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Get all found reports with filters (minimal info for list view)
  async getAllFoundReports({
    search,
    itemCategory,
    foundLocation,
    dateFrom,
    dateTo,
    status = "active",
    sortBy = "created_at",
    order = "desc",
    limit = 20,
    offset = 0,
    userId = null,
    myItemsOnly = false,
  }) {
    let query = `
      SELECT 
        fr.id,
        fr.item_category,
        fr.item_name,
        fr.image_url,
        fr.found_location,
        fr.current_location,
        fr.found_date,
        fr.status,
        fr.created_at,
        (SELECT COUNT(*) FROM found_claims WHERE found_report_id = fr.id) as claim_count
      FROM found_reports fr
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    // My items only filter
    if (myItemsOnly && userId) {
      query += ` AND fr.user_id = $${idx}`;
      values.push(userId);
      idx++;
    }

    // Status filter
    if (status) {
      query += ` AND fr.status = $${idx}`;
      values.push(status);
      idx++;
    }

    // Search filter
    if (search) {
      query += ` AND (
        fr.item_name ILIKE $${idx} OR 
        fr.description ILIKE $${idx} OR
        fr.item_category ILIKE $${idx}
      )`;
      values.push(`%${search}%`);
      idx++;
    }

    // Category filter
    if (itemCategory) {
      query += ` AND fr.item_category = $${idx}`;
      values.push(itemCategory);
      idx++;
    }

    // Location filter
    if (foundLocation) {
      query += ` AND fr.found_location ILIKE $${idx}`;
      values.push(`%${foundLocation}%`);
      idx++;
    }

    // Date range filter
    if (dateFrom) {
      query += ` AND fr.found_date >= $${idx}`;
      values.push(dateFrom);
      idx++;
    }

    if (dateTo) {
      query += ` AND fr.found_date <= $${idx}`;
      values.push(dateTo);
      idx++;
    }

    // Sorting
    const validSortColumns = {
      created_at: "fr.created_at",
      found_date: "fr.found_date",
      item_name: "fr.item_name",
      claim_count: "claim_count",
    };

    const sortColumn = validSortColumns[sortBy] || "fr.created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Pagination
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  // Count found reports
  async countFoundReports({
    search,
    itemCategory,
    foundLocation,
    dateFrom,
    dateTo,
    status = "active",
    userId = null,
    myItemsOnly = false,
  }) {
    let query = `
      SELECT COUNT(*) as total
      FROM found_reports fr
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    if (myItemsOnly && userId) {
      query += ` AND fr.user_id = $${idx}`;
      values.push(userId);
      idx++;
    }

    if (status) {
      query += ` AND fr.status = $${idx}`;
      values.push(status);
      idx++;
    }

    if (search) {
      query += ` AND (
        fr.item_name ILIKE $${idx} OR 
        fr.description ILIKE $${idx} OR
        fr.item_category ILIKE $${idx}
      )`;
      values.push(`%${search}%`);
      idx++;
    }

    if (itemCategory) {
      query += ` AND fr.item_category = $${idx}`;
      values.push(itemCategory);
      idx++;
    }

    if (foundLocation) {
      query += ` AND fr.found_location ILIKE $${idx}`;
      values.push(`%${foundLocation}%`);
      idx++;
    }

    if (dateFrom) {
      query += ` AND fr.found_date >= $${idx}`;
      values.push(dateFrom);
      idx++;
    }

    if (dateTo) {
      query += ` AND fr.found_date <= $${idx}`;
      values.push(dateTo);
      idx++;
    }

    const { rows } = await pool.query(query, values);
    return parseInt(rows[0].total);
  },

  // Get found report by ID
  async getFoundReportById(reportId, userId = null) {
    const query = `
      SELECT 
        fr.*,
        u.name as user_name,
        u.phone as user_phone,
        u.email as user_email,
        (SELECT COUNT(*) FROM found_claims WHERE found_report_id = fr.id) as claim_count,
        CASE WHEN fr.user_id = $2 THEN true ELSE false END as is_owner
      FROM found_reports fr
      LEFT JOIN users u ON fr.user_id = u.id
      WHERE fr.id = $1;
    `;

    const { rows } = await pool.query(query, [reportId, userId]);
    return rows[0] || null;
  },

  // Update found report status
  async updateFoundReportStatus(reportId, status, resolvedDate = null) {
    const query = `
      UPDATE found_reports
      SET 
        status = $1,
        resolved_date = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [status, resolvedDate, reportId]);
    return rows[0];
  },

  // Delete found report
  async deleteFoundReport(reportId) {
    const query = `
      DELETE FROM found_reports
      WHERE id = $1
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [reportId]);
    return rows[0];
  },

  /* ============================================
     LOST CLAIMS OPERATIONS (someone claims they found a lost item)
  ============================================ */

  // Create lost claim
  async createLostClaim(lostReportId, userId, notes) {
    const query = `
      INSERT INTO lost_claims (
        lost_report_id,
        claimer_id,
        notes
      )
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [lostReportId, userId, notes]);
    return rows[0];
  },

  // Get claims for a lost report
  async getLostClaims(lostReportId) {
    const query = `
      SELECT 
        lc.*,
        u.name as claimer_name,
        u.phone as claimer_phone,
        u.email as claimer_email
      FROM lost_claims lc
      LEFT JOIN users u ON lc.claimer_id = u.id
      WHERE lc.lost_report_id = $1
      ORDER BY lc.created_at DESC;
    `;

    const { rows } = await pool.query(query, [lostReportId]);
    return rows;
  },

  // Check if user already claimed
  async checkLostClaim(lostReportId, userId) {
    const query = `
      SELECT id FROM lost_claims
      WHERE lost_report_id = $1 AND claimer_id = $2;
    `;

    const { rows } = await pool.query(query, [lostReportId, userId]);
    return rows[0] || null;
  },

  /* ============================================
     FOUND CLAIMS OPERATIONS (someone claims a found item is theirs)
  ============================================ */

  // Create found claim
  async createFoundClaim(foundReportId, userId, notes) {
    const query = `
      INSERT INTO found_claims (
        found_report_id,
        claimer_id,
        notes
      )
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [foundReportId, userId, notes]);
    return rows[0];
  },

  // Get claims for a found report
  async getFoundClaims(foundReportId) {
    const query = `
      SELECT 
        fc.*,
        u.name as claimer_name,
        u.phone as claimer_phone,
        u.email as claimer_email
      FROM found_claims fc
      LEFT JOIN users u ON fc.claimer_id = u.id
      WHERE fc.found_report_id = $1
      ORDER BY fc.created_at DESC;
    `;

    const { rows } = await pool.query(query, [foundReportId]);
    return rows;
  },

  // Check if user already claimed
  async checkFoundClaim(foundReportId, userId) {
    const query = `
      SELECT id FROM found_claims
      WHERE found_report_id = $1 AND claimer_id = $2;
    `;

    const { rows } = await pool.query(query, [foundReportId, userId]);
    return rows[0] || null;
  },

  /* ============================================
     RESOLVED CASES OPERATIONS
  ============================================ */

  // Create resolved case
  async createResolvedCase(data, resolvedBy) {
    const query = `
      INSERT INTO resolved_cases (
        lost_report_id,
        found_report_id,
        resolution_type,
        resolved_by,
        resolution_notes,
        verification_method
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      data.lostReportId || null,
      data.foundReportId || null,
      data.resolutionType,
      resolvedBy,
      data.resolutionNotes || null,
      data.verificationMethod || null,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Get all resolved cases
  async getAllResolvedCases({
    search,
    itemCategory,
    resolutionType,
    dateFrom,
    dateTo,
    sortBy = "created_at",
    order = "desc",
    limit = 20,
    offset = 0,
    userId = null,
    myItemsOnly = false,
  }) {
    let query = `
      SELECT 
        rc.*,
        lr.item_name as lost_item_name,
        lr.item_category as item_category,
        lr.lost_location,
        lr.lost_date,
        fr.found_location,
        fr.found_date,
        u_lost.name as lost_reporter_name,
        u_found.name as found_reporter_name,
        u_resolved.name as resolved_by_name
      FROM resolved_cases rc
      LEFT JOIN lost_reports lr ON rc.lost_report_id = lr.id
      LEFT JOIN found_reports fr ON rc.found_report_id = fr.id
      LEFT JOIN users u_lost ON lr.user_id = u_lost.id
      LEFT JOIN users u_found ON fr.user_id = u_found.id
      LEFT JOIN users u_resolved ON rc.resolved_by = u_resolved.id
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    // My items only filter
    if (myItemsOnly && userId) {
      query += ` AND (lr.user_id = $${idx} OR fr.user_id = $${idx})`;
      values.push(userId);
      idx++;
    }

    // Search filter
    if (search) {
      query += ` AND (
        lr.item_name ILIKE $${idx} OR 
        fr.item_name ILIKE $${idx} OR
        lr.description ILIKE $${idx} OR
        fr.description ILIKE $${idx}
      )`;
      values.push(`%${search}%`);
      idx++;
    }

    // Category filter
    if (itemCategory) {
      query += ` AND (lr.item_category = $${idx} OR fr.item_category = $${idx})`;
      values.push(itemCategory);
      idx++;
    }

    // Resolution type filter
    if (resolutionType) {
      query += ` AND rc.resolution_type = $${idx}`;
      values.push(resolutionType);
      idx++;
    }

    // Date range filter
    if (dateFrom) {
      query += ` AND rc.resolved_date >= $${idx}`;
      values.push(dateFrom);
      idx++;
    }

    if (dateTo) {
      query += ` AND rc.resolved_date <= $${idx}`;
      values.push(dateTo);
      idx++;
    }

    // Sorting
    const validSortColumns = {
      created_at: "rc.created_at",
      resolved_date: "rc.resolved_date",
    };

    const sortColumn = validSortColumns[sortBy] || "rc.created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Pagination
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  // Count resolved cases
  async countResolvedCases({
    search,
    itemCategory,
    resolutionType,
    dateFrom,
    dateTo,
    userId = null,
    myItemsOnly = false,
  }) {
    let query = `
      SELECT COUNT(*) as total
      FROM resolved_cases rc
      LEFT JOIN lost_reports lr ON rc.lost_report_id = lr.id
      LEFT JOIN found_reports fr ON rc.found_report_id = fr.id
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    if (myItemsOnly && userId) {
      query += ` AND (lr.user_id = $${idx} OR fr.user_id = $${idx})`;
      values.push(userId);
      idx++;
    }

    if (search) {
      query += ` AND (
        lr.item_name ILIKE $${idx} OR 
        fr.item_name ILIKE $${idx} OR
        lr.description ILIKE $${idx} OR
        fr.description ILIKE $${idx}
      )`;
      values.push(`%${search}%`);
      idx++;
    }

    if (itemCategory) {
      query += ` AND (lr.item_category = $${idx} OR fr.item_category = $${idx})`;
      values.push(itemCategory);
      idx++;
    }

    if (resolutionType) {
      query += ` AND rc.resolution_type = $${idx}`;
      values.push(resolutionType);
      idx++;
    }

    if (dateFrom) {
      query += ` AND rc.resolved_date >= $${idx}`;
      values.push(dateFrom);
      idx++;
    }

    if (dateTo) {
      query += ` AND rc.resolved_date <= $${idx}`;
      values.push(dateTo);
      idx++;
    }

    const { rows } = await pool.query(query, values);
    return parseInt(rows[0].total);
  },

  // Get resolved case by ID
  async getResolvedCaseById(caseId) {
    const query = `
      SELECT 
        rc.*,
        lr.item_name as lost_item_name,
        lr.item_category,
        lr.description as lost_description,
        lr.lost_location,
        lr.lost_date,
        lr.image_url as lost_image_url,
        fr.item_name as found_item_name,
        fr.description as found_description,
        fr.found_location,
        fr.found_date,
        fr.image_url as found_image_url,
        u_lost.name as lost_reporter_name,
        u_lost.phone as lost_reporter_phone,
        u_found.name as found_reporter_name,
        u_found.phone as found_reporter_phone,
        u_resolved.name as resolved_by_name,
        u_resolved.role as resolved_by_role
      FROM resolved_cases rc
      LEFT JOIN lost_reports lr ON rc.lost_report_id = lr.id
      LEFT JOIN found_reports fr ON rc.found_report_id = fr.id
      LEFT JOIN users u_lost ON lr.user_id = u_lost.id
      LEFT JOIN users u_found ON fr.user_id = u_found.id
      LEFT JOIN users u_resolved ON rc.resolved_by = u_resolved.id
      WHERE rc.id = $1;
    `;

    const { rows } = await pool.query(query, [caseId]);
    return rows[0] || null;
  },

  /* ============================================
     MATCHING OPERATIONS (for police/admin)
  ============================================ */

  // Find potential matches for lost item in found items
  async findPotentialMatches(lostReportId) {
    const query = `
      SELECT 
        fr.*,
        u.name as user_name,
        u.phone as user_phone,
        (
          CASE 
            WHEN fr.item_category = lr.item_category THEN 50
            ELSE 0
          END +
          CASE 
            WHEN fr.found_location ILIKE '%' || lr.lost_location || '%' 
            OR lr.lost_location ILIKE '%' || fr.found_location || '%' 
            THEN 30
            ELSE 0
          END +
          CASE 
            WHEN ABS(EXTRACT(EPOCH FROM (fr.found_date - lr.lost_date))/86400) <= 7 THEN 20
            ELSE 0
          END
        ) as match_score
      FROM found_reports fr
      LEFT JOIN users u ON fr.user_id = u.id
      CROSS JOIN lost_reports lr
      WHERE lr.id = $1
        AND fr.status = 'active'
      HAVING match_score >= 30
      ORDER BY match_score DESC
      LIMIT 10;
    `;

    const { rows } = await pool.query(query, [lostReportId]);
    return rows;
  },

  // Find potential matches for found item in lost items
  async findLostMatches(foundReportId) {
    const query = `
      SELECT 
        lr.*,
        u.name as user_name,
        u.phone as user_phone,
        (
          CASE 
            WHEN lr.item_category = fr.item_category THEN 50
            ELSE 0
          END +
          CASE 
            WHEN lr.lost_location ILIKE '%' || fr.found_location || '%' 
            OR fr.found_location ILIKE '%' || lr.lost_location || '%' 
            THEN 30
            ELSE 0
          END +
          CASE 
            WHEN ABS(EXTRACT(EPOCH FROM (fr.found_date - lr.lost_date))/86400) <= 7 THEN 20
            ELSE 0
          END
        ) as match_score
      FROM lost_reports lr
      LEFT JOIN users u ON lr.user_id = u.id
      CROSS JOIN found_reports fr
      WHERE fr.id = $1
        AND lr.status = 'active'
      HAVING match_score >= 30
      ORDER BY match_score DESC
      LIMIT 10;
    `;

    const { rows } = await pool.query(query, [foundReportId]);
    return rows;
  },

  /* ============================================
     STATISTICS (for admin)
  ============================================ */

  // Get statistics
  async getStatistics(dateFrom, dateTo) {
    const query = `
      SELECT 
        -- Lost items stats
        (SELECT COUNT(*) FROM lost_reports WHERE status = 'active' 
          AND ($1::date IS NULL OR lost_date >= $1)
          AND ($2::date IS NULL OR lost_date <= $2)
        ) as active_lost_count,
        
        (SELECT COUNT(*) FROM lost_reports WHERE status = 'resolved'
          AND ($1::date IS NULL OR lost_date >= $1)
          AND ($2::date IS NULL OR lost_date <= $2)
        ) as resolved_lost_count,
        
        -- Found items stats
        (SELECT COUNT(*) FROM found_reports WHERE status = 'active'
          AND ($1::date IS NULL OR found_date >= $1)
          AND ($2::date IS NULL OR found_date <= $2)
        ) as active_found_count,
        
        (SELECT COUNT(*) FROM found_reports WHERE status = 'resolved'
          AND ($1::date IS NULL OR found_date >= $1)
          AND ($2::date IS NULL OR found_date <= $2)
        ) as resolved_found_count,
        
        -- Resolved cases
        (SELECT COUNT(*) FROM resolved_cases
          WHERE ($1::date IS NULL OR resolved_date >= $1)
          AND ($2::date IS NULL OR resolved_date <= $2)
        ) as total_resolved_cases,
        
        -- Most lost categories
        (SELECT json_agg(category_stats)
         FROM (
           SELECT item_category, COUNT(*) as count
           FROM lost_reports
           WHERE ($1::date IS NULL OR lost_date >= $1)
           AND ($2::date IS NULL OR lost_date <= $2)
           GROUP BY item_category
           ORDER BY count DESC
           LIMIT 5
         ) category_stats
        ) as top_lost_categories,
        
        -- Most found categories
        (SELECT json_agg(category_stats)
         FROM (
           SELECT item_category, COUNT(*) as count
           FROM found_reports
           WHERE ($1::date IS NULL OR found_date >= $1)
           AND ($2::date IS NULL OR found_date <= $2)
           GROUP BY item_category
           ORDER BY count DESC
           LIMIT 5
         ) category_stats
        ) as top_found_categories,
        
        -- Most lost locations
        (SELECT json_agg(location_stats)
         FROM (
           SELECT lost_location, COUNT(*) as count
           FROM lost_reports
           WHERE ($1::date IS NULL OR lost_date >= $1)
           AND ($2::date IS NULL OR lost_date <= $2)
           GROUP BY lost_location
           ORDER BY count DESC
           LIMIT 5
         ) location_stats
        ) as top_lost_locations,
        
        -- Most found locations
        (SELECT json_agg(location_stats)
         FROM (
           SELECT found_location, COUNT(*) as count
           FROM found_reports
           WHERE ($1::date IS NULL OR found_date >= $1)
           AND ($2::date IS NULL OR found_date <= $2)
           GROUP BY found_location
           ORDER BY count DESC
           LIMIT 5
         ) location_stats
        ) as top_found_locations;
    `;

    const { rows } = await pool.query(query, [
      dateFrom || null,
      dateTo || null,
    ]);
    return rows[0];
  },
};
