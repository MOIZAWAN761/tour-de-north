// import pg from "pg";
// import { SUPABASE_DATABASE_URL } from "./env.js";

// // If you want, you can use one for production (SUPABASE_DATABASE_URL) and one for local dev (DATABASE_URL)
// const pool = new pg.Pool({
//   connectionString: SUPABASE_DATABASE_URL,
// });

// export default pool;

// import dns from "dns";
// dns.setDefaultResultOrder("ipv4first"); // Force Node.js to use IPv4

// import pg from "pg";
// import { SUPABASE_DATABASE_URL } from "./env.js";

// const pool = new pg.Pool({
//   connectionString: SUPABASE_DATABASE_URL,
// });

// export default pool;
// src/config/postgres.js
// PRODUCTION-READY PostgreSQL Connection Pool

import pg from "pg";
const { Pool } = pg;
import { SUPABASE_DATABASE_URL } from "./env.js";

const pool = new Pool({
  connectionString: SUPABASE_DATABASE_URL,
  
  // ✅ Connection Pool Settings (prevents connection timeout issues)
  max: 20, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients to keep alive
  
  // ✅ Connection Timeout Settings
  connectionTimeoutMillis: 10000, // 10 seconds to establish connection
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  
  // ✅ Keep-Alive Settings (prevents "Connection terminated unexpectedly")
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000, // 10 seconds
  
  // ✅ Statement Timeout (prevents hanging queries)
  statement_timeout: 30000, // 30 seconds max per query
  
  // ✅ SSL Settings (if using Supabase or other cloud providers)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // For Supabase/cloud providers
  } : false,
});

// ✅ Connection Pool Event Handlers
pool.on('connect', (client) => {
  console.log('✅ PostgreSQL client connected to pool');
});

pool.on('acquire', (client) => {
  // Client is checked out from the pool
  // Useful for debugging connection usage
});

pool.on('remove', (client) => {
  console.log('🔄 PostgreSQL client removed from pool');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err.message);
  // Don't exit process - pool will handle reconnection
  
  // Log additional details
  if (err.code === 'ECONNRESET') {
    console.log('⚠️  Connection reset by peer. Pool will attempt to reconnect.');
  } else if (err.code === 'ECONNREFUSED') {
    console.log('⚠️  Connection refused. Check if PostgreSQL is running.');
  } else if (err.code === '57P01') {
    console.log('⚠️  PostgreSQL admin shutdown detected.');
  }
});

// ✅ Graceful Shutdown
const gracefulShutdown = async () => {
  console.log('🛑 Closing PostgreSQL pool...');
  try {
    await pool.end();
    console.log('✅ PostgreSQL pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing PostgreSQL pool:', error);
  }
};

// Listen for process termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ✅ Health Check Function
export const checkDatabaseConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection healthy:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

export default pool;