// Middleware для проверки API ключа Tilda (УПРОЩЕННАЯ ВЕРСИЯ ДЛЯ ТЕСТИРОВАНИЯ)
const tildaAuthMiddleware = (req, res, next) => {
    const TILDA_API_KEY = 'yhy1bcu4g5expmtldfv1';
    
    // Получаем API ключ из разных источников
    const apiKeyFromHeader = req.headers['x-tilda-api-key'];
    const apiKeyFromBody = req.body.apikey || req.body.api_key;
    
    console.log('🔐 Проверка API ключа Tilda:', {
      fromHeader: apiKeyFromHeader ? '***' + apiKeyFromHeader.slice(-4) : 'не указан',
      fromBody: apiKeyFromBody ? '***' + apiKeyFromBody.slice(-4) : 'не указан'
    });
  
    // ДЛЯ ТЕСТИРОВАНИЯ - пропускаем все запросы
    console.log('⚠️ Пропускаем проверку API ключа для тестирования');
    return next();
  
    // Раскомментируйте этот код позже, когда Tilda будет отправлять API ключ:
    /*
    if (!apiKeyFromHeader && !apiKeyFromBody) {
      console.warn('⚠️ Попытка доступа без API ключа');
      return res.status(401).json({
        Success: false,
        ErrorCode: 'MISSING_API_KEY',
        Message: 'API key required'
      });
    }
  
    const apiKey = apiKeyFromHeader || apiKeyFromBody;
    if (apiKey !== TILDA_API_KEY) {
      console.warn('❌ Неверный API ключ');
      return res.status(403).json({
        Success: false,
        ErrorCode: 'INVALID_API_KEY', 
        Message: 'Invalid API key'
      });
    }
  
    console.log('✅ API ключ проверен успешно');
    next();
    */
  };