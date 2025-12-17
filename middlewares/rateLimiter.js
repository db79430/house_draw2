import redisService from '../utils/redis.js';

export const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 минут
    max = 100, // максимум 100 запросов за окно
    keyGenerator = (req) => req.ip,
    skip = () => false,
    message = 'Too many requests, please try again later.'
  } = options;

  return async (req, res, next) => {
    // Пропускаем если функция skip возвращает true
    if (skip(req)) {
      return next();
    }

    // Если Redis недоступен, пропускаем rate limiting
    if (!redisService.isConnected) {
      return next();
    }

    const key = `rate-limit:${keyGenerator(req)}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Получаем историю запросов
      let requests = await redisService.get(key) || [];
      
      // Фильтруем старые запросы
      requests = requests.filter(timestamp => timestamp > windowStart);
      
      // Проверяем лимит
      if (requests.length >= max) {
        const retryAfter = Math.ceil((requests[0] + windowMs - now) / 1000);
        
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
          success: false,
          error: message,
          retryAfter: `${retryAfter} seconds`
        });
      }
      
      // Добавляем текущий запрос
      requests.push(now);
      await redisService.set(key, requests, Math.ceil(windowMs / 1000));
      
      // Устанавливаем заголовки для клиента
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - requests.length);
      res.setHeader('X-RateLimit-Reset', Math.ceil((requests[0] + windowMs) / 1000));
      
      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // В случае ошибки Redis пропускаем rate limiting
      next();
    }
  };
};

// Специальный rate limiter для API
export const apiRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // 100 запросов на IP
});

// Более строгий rate limiter для аутентификации
export const authRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 5, // 5 попыток входа в час
  keyGenerator: (req) => `auth:${req.ip}:${req.body.email || 'unknown'}`,
  message: 'Too many login attempts, please try again later.'
});