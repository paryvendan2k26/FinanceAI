const Redis = require('ioredis');
const crypto = require('crypto');

class CacheService {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    this.defaultTTL = parseInt(process.env.CACHE_TTL_SECONDS) || 3600;
    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  generateKey(query, symbol = '', sources = []) {
    const normalized = {
      query: query?.toLowerCase().trim(),
      symbol: symbol?.toUpperCase(),
      sources: sources.slice(0, 5).sort()
    };
    
    const hash = crypto.createHash('md5')
      .update(JSON.stringify(normalized))
      .digest('hex');
    
    return `analysis:${hash}`;
  }

  async get(key) {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        // Update access count
        await this.redis.incr(`${key}:count`);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, data, ttl = null) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      const expiry = ttl || this.defaultTTL;
      await this.redis.setex(key, expiry, JSON.stringify(cacheData));
      await this.redis.setex(`${key}:count`, expiry, '1');
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      return await this.redis.exists(key) === 1;
    } catch (error) {
      return false;
    }
  }

  async delete(key) {
    try {
      await this.redis.del(key);
      await this.redis.del(`${key}:count`);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async flush() {
    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  async getStats() {
    try {
      const info = await this.redis.info('memory');
      const keys = await this.redis.dbsize();
      return { keys, memory: info };
    } catch (error) {
      return { keys: 0, memory: 'unavailable' };
    }
  }
}

module.exports = new CacheService();