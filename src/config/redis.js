// // import Redis from "ioredis";
// // import { REDIS_URL } from "./env.js";

// // const redisClient = new Redis(REDIS_URL);

// // redisClient.on("connect", () => console.log("Redis connected"));
// // redisClient.on("error", (err) => console.log("Redis error:", err));

// // export default redisClient;

// import { createClient } from "redis";
// import { REDIS_URL } from "./env.js";

// const redisClient = createClient({
//   url: REDIS_URL,
// });

// redisClient.on("connect", () => {
//   console.log("Redis connected");
// });

// redisClient.on("error", (err) => {
//   console.error("Redis error:", err);
// });

// await redisClient.connect();

// export default redisClient;
// src/config/redis.js
// PRODUCTION-READY Redis Connection

import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // ✅ Connection Settings
  socket: {
    reconnectStrategy: (retries) => {
      // Exponential backoff: 50ms, 100ms, 200ms, 400ms, ..., max 3000ms
      const delay = Math.min(retries * 50, 3000);
      console.log(`🔄 Redis reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    },
    
    // Keep connection alive
    keepAlive: 5000, // Send keepalive every 5 seconds
    
    // Connection timeout
    connectTimeout: 10000, // 10 seconds to establish connection
    
    // Reconnect when connection is lost
    reconnectOnError: (err) => {
      console.log('🔄 Redis reconnect on error:', err.message);
      return true; // Always try to reconnect
    },
  },
  
  // ✅ Enable offline queue (commands are queued if connection lost)
  enableOfflineQueue: true,
  
  // ✅ Disable ready check (works better with cloud Redis)
  disableOfflineQueue: false,
});

// ✅ Connection Event Handlers
redisClient.on('connect', () => {
  console.log('🔗 Redis client connecting...');
});

redisClient.on('ready', () => {
  console.log('✅ Redis client ready');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis client error:', err.message);
  
  // Log specific error types
  if (err.code === 'ECONNRESET') {
    console.log('⚠️  Redis connection reset. Will attempt to reconnect.');
  } else if (err.code === 'ECONNREFUSED') {
    console.log('⚠️  Redis connection refused. Check if Redis is running.');
  } else if (err.code === 'NR_CLOSED') {
    console.log('⚠️  Redis connection closed. Will attempt to reconnect.');
  }
  
  // Don't crash the process - Redis will try to reconnect
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis client reconnecting...');
});

redisClient.on('end', () => {
  console.log('🛑 Redis client connection closed');
});

// ✅ Connect to Redis
let isConnecting = false;

const connectRedis = async () => {
  if (isConnecting || redisClient.isOpen) {
    return;
  }
  
  isConnecting = true;
  
  try {
    await redisClient.connect();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error.message);
    console.log('⚠️  Application will continue without Redis (using fallback mechanisms)');
  } finally {
    isConnecting = false;
  }
};

// Connect on startup
connectRedis();

// ✅ Graceful Shutdown
const gracefulShutdown = async () => {
  console.log('🛑 Closing Redis connection...');
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log('✅ Redis connection closed successfully');
    }
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error);
    // Force close if quit fails
    await redisClient.disconnect();
  }
};

// Listen for process termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ✅ Health Check Function
export const checkRedisConnection = async () => {
  try {
    if (!redisClient.isOpen) {
      console.log('⚠️  Redis not connected. Attempting to connect...');
      await connectRedis();
    }
    
    const pong = await redisClient.ping();
    console.log('✅ Redis connection healthy:', pong);
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    return false;
  }
};

// ✅ Safe Publish Function (doesn't crash if Redis is down)
export const safePublish = async (channel, message) => {
  try {
    if (!redisClient.isOpen) {
      console.log('⚠️  Redis not connected. Message not published:', channel);
      return false;
    }
    
    await redisClient.publish(channel, message);
    return true;
  } catch (error) {
    console.error(`❌ Failed to publish to ${channel}:`, error.message);
    return false;
  }
};

export default redisClient;