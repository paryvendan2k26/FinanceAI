// services/rateLimiter.js - Fixed RedisStore import issue
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

// Create Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

// Handle Redis connection errors gracefully
redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

// Custom Redis store implementation (fixes the import issue)
class CustomRedisStore {
  constructor(options = {}) {
    this.client = options.client || redis;
    this.prefix = options.prefix || 'rl:';
    this.resetExpiryOnChange = options.resetExpiryOnChange !== false;
  }

  async increment(key, windowMs) {
    const redisKey = this.prefix + key;
    
    try {
      const pipeline = this.client.multi();
      pipeline.incr(redisKey);
      
      if (this.resetExpiryOnChange) {
        pipeline.expire(redisKey, Math.ceil(windowMs / 1000));
      } else {
        pipeline.ttl(redisKey);
      }
      
      const results = await pipeline.exec();
      const count = results[0][1];
      const ttl = results[1][1];
      
      // Set expiry if key is new
      if (!this.resetExpiryOnChange && ttl === -1) {
        await this.client.expire(redisKey, Math.ceil(windowMs / 1000));
      }
      
      return {
        totalHits: count,
        resetTime: new Date(Date.now() + (ttl * 1000))
      };
    } catch (error) {
      console.error('Redis increment error:', error);
      // Fallback to allowing the request if Redis fails
      return {
        totalHits: 1,
        resetTime: new Date(Date.now() + windowMs)
      };
    }
  }

  async decrement(key) {
    const redisKey = this.prefix + key;
    try {
      await this.client.decr(redisKey);
    } catch (error) {
      console.error('Redis decrement error:', error);
    }
  }

  async resetKey(key) {
    const redisKey = this.prefix + key;
    try {
      await this.client.del(redisKey);
    } catch (error) {
      console.error('Redis reset error:', error);
    }
  }
}

// Create store instance
const redisStore = new CustomRedisStore({
  client: redis,
  prefix: 'rate_limit:'
});

// Basic rate limiter for all requests
const basicRateLimit = rateLimit({
  store: redisStore,
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Increased from 10 to 100
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting if Redis is down
  skip: (req, res) => {
    if (redis.status !== 'ready') {
      console.warn('Redis not ready, skipping rate limit');
      return true;
    }
    return false;
  }
});

// Strict rate limiter for AI API calls
const aiApiRateLimit = rateLimit({
  store: redisStore,
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.API_RATE_LIMIT_PER_MINUTE) || 5, // Increased from 2 to 5
  keyGenerator: (req) => `ai-api:${req.ip}:${req.user?.id || 'anonymous'}`,
  message: {
    error: 'AI API rate limit exceeded. Please wait before making another request.',
    retryAfter: '1 minute'
  },
  skip: (req, res) => {
    // Skip rate limiting if we have cached result or Redis is down
    if (req.cacheHit === true || redis.status !== 'ready') {
      return true;
    }
    return false;
  }
});

// File upload rate limiter
const uploadRateLimit = rateLimit({
  store: redisStore,
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Increased from 3 to 5 uploads per 5 minutes
  message: {
    error: 'Upload rate limit exceeded. Please wait before uploading again.',
    retryAfter: '5 minutes'
  },
  skip: (req, res) => {
    if (redis.status !== 'ready') {
      console.warn('Redis not ready, skipping upload rate limit');
      return true;
    }
    return false;
  }
});

// Fallback in-memory rate limiter for when Redis is completely unavailable
const MemoryStore = require('express-rate-limit').MemoryStore;

const fallbackRateLimit = rateLimit({
  store: new MemoryStore(),
  windowMs: 15 * 60 * 1000,
  max: 50, // More restrictive when using memory store
  message: {
    error: 'Too many requests. Service temporarily using backup rate limiting.',
    retryAfter: '15 minutes'
  }
});

module.exports = {
  basicRateLimit,
  aiApiRateLimit,
  uploadRateLimit,
  fallbackRateLimit,
  redis // Export Redis client for other services
};