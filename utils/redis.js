import { createClient } from 'redis';

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.init();
  }

  async init() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.log('Too many attempts to reconnect. Redis connection terminated');
              return new Error('Too many retries.');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('✅ Redis client ready');
      });

      this.client.on('end', () => {
        console.log('🔴 Redis connection ended');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      // Не бросаем ошибку, чтобы приложение могло работать без Redis
    }
  }

  // Базовые операции
  async set(key, value, ttl = null) {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping set operation');
      return null;
    }

    try {
      if (ttl) {
        return await this.client.setEx(key, ttl, JSON.stringify(value));
      }
      return await this.client.set(key, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
      return null;
    }
  }

  async get(key) {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping get operation');
      return null;
    }

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping delete operation');
      return null;
    }

    try {
      return await this.client.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
      return null;
    }
  }

  async exists(key) {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping exists operation');
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async increment(key, by = 1) {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping increment operation');
      return null;
    }

    try {
      return await this.client.incrBy(key, by);
    } catch (error) {
      console.error('Redis increment error:', error);
      return null;
    }
  }

  // Кэширование с автоматическим инвалидацией
  async cache(key, fetchFn, ttl = 3600) {
    try {
      const cached = await this.get(key);
      if (cached !== null) {
        console.log(`✅ Cache hit for key: ${key}`);
        return cached;
      }

      console.log(`❌ Cache miss for key: ${key}`);
      const data = await fetchFn();
      
      if (data !== null && data !== undefined) {
        await this.set(key, data, ttl);
      }
      
      return data;
    } catch (error) {
      console.error(`Cache error for key ${key}:`, error);
      return await fetchFn();
    }
  }

  async once(key, operationFn, ttl = 60) {
    const lockKey = `lock:${key}`;
    
    try {
      // Пробуем установить блокировку
      const lockAcquired = await this.set(lockKey, 1, ttl);
      
      if (lockAcquired === 'OK') {
        console.log(`🔒 Lock acquired for: ${key}`);
        try {
          const result = await operationFn();
          return result;
        } finally {
          // Всегда снимаем блокировку
          await this.del(lockKey);
          console.log(`🔓 Lock released for: ${key}`);
        }
      } else {
        console.log(`⏳ Operation ${key} is already in progress`);
        return null;
      }
    } catch (error) {
      console.error(`Once operation error for ${key}:`, error);
      // В случае ошибки снимаем блокировку
      await this.del(lockKey).catch(() => {});
      throw error;
    }
  }

  // Управление списками (очереди)
  async pushToList(key, value) {
    if (!this.isConnected || !this.client) return null;
    
    try {
      return await this.client.rPush(key, JSON.stringify(value));
    } catch (error) {
      console.error('Redis push error:', error);
      return null;
    }
  }

  async popFromList(key) {
    if (!this.isConnected || !this.client) return null;
    
    try {
      const data = await this.client.lPop(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis pop error:', error);
      return null;
    }
  }

  async getListLength(key) {
    if (!this.isConnected || !this.client) return 0;
    
    try {
      return await this.client.lLen(key);
    } catch (error) {
      console.error('Redis list length error:', error);
      return 0;
    }
  }

  // Установка времени жизни ключа
  async expire(key, ttl) {
    if (!this.isConnected || !this.client) return null;
    
    try {
      return await this.client.expire(key, ttl);
    } catch (error) {
      console.error('Redis expire error:', error);
      return null;
    }
  }

  // Публикация событий
  async publish(channel, message) {
    if (!this.isConnected || !this.client) return null;
    
    try {
      return await this.client.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error('Redis publish error:', error);
      return null;
    }
  }

  // Закрытие соединения
  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        console.log('🔴 Redis disconnected');
      } catch (error) {
        console.error('Error disconnecting Redis:', error);
      }
    }
  }
}

// Экспортируем синглтон
const redisService = new RedisService();
export default redisService;