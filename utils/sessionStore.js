import session from 'express-session';
import { createClient } from 'redis';

class RedisSessionStore extends session.Store {
  constructor(options = {}) {
    super(options);
    this.client = options.client;
    this.prefix = options.prefix || 'session:';
    this.ttl = options.ttl || 86400; // 24 часа в секундах
  }

  async get(sid, callback) {
    if (!this.client || !this.client.isReady) {
      return callback(null, null);
    }

    try {
      const key = this.prefix + sid;
      const data = await this.client.get(key);
      if (data) {
        const result = JSON.parse(data);
        callback(null, result);
      } else {
        callback(null, null);
      }
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, sessionData, callback) {
    if (!this.client || !this.client.isReady) {
      return callback(null);
    }

    try {
      const key = this.prefix + sid;
      await this.client.setEx(key, this.ttl, JSON.stringify(sessionData));
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid, callback) {
    if (!this.client || !this.client.isReady) {
      return callback(null);
    }

    try {
      const key = this.prefix + sid;
      await this.client.del(key);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async touch(sid, sessionData, callback) {
    // Просто обновляем TTL при касании
    if (!this.client || !this.client.isReady) {
      return callback(null);
    }

    try {
      const key = this.prefix + sid;
      await this.client.expire(key, this.ttl);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}

export default RedisSessionStore;