// Middleware для проверки API ключа Tilda (ОТКЛЮЧЕНО ДЛЯ ТЕСТИРОВАНИЯ)
const tildaAuthMiddleware = (req, res, next) => {
    const TILDA_API_KEY = '770a56bbd1fdada08l';
    
    // Получаем API ключ из разных источников
    const apiKeyFromHeader = req.headers['x-tilda-api-key'];
    const apiKeyFromBody = req.body.apikey || req.body.api_key;
    
    console.log('🔐 Информация о API ключе (ПРОВЕРКА ОТКЛЮЧЕНА):', {
      fromHeader: apiKeyFromHeader ? '***' + apiKeyFromHeader.slice(-4) : 'не указан',
      fromBody: apiKeyFromBody ? '***' + apiKeyFromBody.slice(-4) : 'не указан',
      path: req.path,
      method: req.method
    });
  
    // Логируем все заголовки для отладки
    console.log('📧 Все заголовки запроса:', req.headers);
    console.log('📦 Тело запроса:', req.body);
  
    // ВРЕМЕННО ОТКЛЮЧАЕМ ПРОВЕРКУ API КЛЮЧА
    console.log('⚠️ Пропускаем проверку API ключа для тестирования Tilda');
    return next();
  };

  export default tildaAuthMiddleware;