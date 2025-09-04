const cacheService = require('./cache');

class UsageTracker {
  constructor() {
    this.metrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      aiCalls: 0,
      errors: 0
    };
  }

  async trackRequest(req, res, next) {
    this.metrics.requests++;
    
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      this.logRequest(req, res, duration);
    });
    
    next();
  }

  trackCacheHit() {
    this.metrics.cacheHits++;
  }

  trackCacheMiss() {
    this.metrics.cacheMisses++;
  }

  trackAICall(provider) {
    this.metrics.aiCalls++;
    // You can track per-provider stats here
  }

  trackError() {
    this.metrics.errors++;
  }

  logRequest(req, res, duration) {
    console.log({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  }

  getStats() {
    const cacheHitRate = this.metrics.requests > 0 
      ? ((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100).toFixed(2)
      : 0;

    return {
      ...this.metrics,
      cacheHitRate: `${cacheHitRate}%`,
      timestamp: new Date().toISOString()
    };
  }

  reset() {
    this.metrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      aiCalls: 0,
      errors: 0
    };
  }
}

module.exports = new UsageTracker();