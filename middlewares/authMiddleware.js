// middlewares/authMiddleware.js
import CONFIG from '../config/index.js';

const tildaAuthMiddleware = (req, res, next) => {
  // Проверяем API ключ от Tilda
  const apiKey = req.headers['x-tilda-key'] || req.query.apikey;
  
  if (!apiKey) {
    console.warn('⚠️ Попытка доступа без API ключа');
    return res.status(401).json({
      Success: false,
      Message: 'API key required'
    });
  }

  if (apiKey !== CONFIG.TILDA.API_KEY) {
    console.warn('❌ Неверный API ключ:', apiKey);
    return res.status(403).json({
      Success: false,
      Message: 'Invalid API key'
    });
  }

  console.log('✅ API ключ проверен');
  next();
};

export default tildaAuthMiddleware;