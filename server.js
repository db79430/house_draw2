import express, { json, urlencoded } from 'express';
import CONFIG from './config/index.js'
import runMigrations from './database/migrate.js';

// Controllers
import TinkoffController from './controllers/TinkoffController.js';
import EmailController from './controllers/EmailController.js';
import UserServices from './services/UserServices.js';
import PaymentRepository from './repositories/PaymentRepository.js';
import db from './database/index.js';
import TildaController from "./controllers/tildaFormControllers.js"

const app = express();

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Tilda-Api-Key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Middleware для проверки API ключа Tilda
const tildaAuthMiddleware = (req, res, next) => {
  // Tilda API ключ из настроек - ДОЛЖЕН СОВПАДАТЬ С TILDA!
  const TILDA_API_KEY = '770a56bbd1fdada08l';
  
  // Получаем API ключ из заголовка
  const apiKey = req.headers['x-tilda-api-key'];
  
  console.log('🔐 Проверка API ключа Tilda:', {
    received: apiKey ? '***' + apiKey.slice(-4) : 'не указан',
    expected: '***d08l'
  });

  // Пропускаем health check без API ключа
  if (req.path === '/health' || req.path === '/') {
    return next();
  }

  // Проверяем наличие API ключа
  if (!apiKey) {
    console.warn('⚠️ Попытка доступа без API ключа');
    return res.status(401).json({
      Success: false,
      ErrorCode: 'MISSING_API_KEY',
      Message: 'API key required in X-Tilda-Api-Key header'
    });
  }

  // Проверяем корректность API ключа
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
};

// Middleware
app.use(json());
app.use(urlencoded({ extended: true }));

// ========== ROUTES ==========

// Health check (публичный)
app.get('/health', async (req, res) => {
  try {
    await db.one('SELECT 1 as test');
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'Tilda Webhook Handler',
      message: 'Сервер работает корректно'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Главная страница (публичная)
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Tilda Webhook Server is running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /tilda-webhook (protected)',
      'POST /tilda-form-submit (protected)',
      'POST /tinkoff-callback',
      'GET /health'
    ]
  });
});

// Tilda Webhook (защищенный)
app.post('/tilda-webhook', tildaAuthMiddleware, TildaController.handleTildaWebhook);
app.post('/tilda-form-submit', tildaAuthMiddleware, TildaController.handleTildaWebhook);

// Tinkoff Callback (не защищаем - они сами шлют запросы)
app.post('/tinkoff-callback', TinkoffController.handleNotification);

// Дополнительные роуты (защищенные)
app.post('/tilda-validate', tildaAuthMiddleware, TildaController.validateForm);
app.post('/check-payment', tildaAuthMiddleware, TildaController.checkPaymentStatus);

// Email routes (защищенные)
app.post('/test-email', tildaAuthMiddleware, EmailController.testEmail);
app.get('/test-smtp', tildaAuthMiddleware, EmailController.testSMTPConnection);

// Admin routes (защищенные)
app.get('/admin/stats', tildaAuthMiddleware, async (req, res) => {
  try {
    const userStats = await UserServices.getSystemStats();
    const paymentStats = await PaymentRepository.getDailyStatistics();
    
    res.json({
      Success: true,
      UserStats: userStats,
      PaymentStats: paymentStats,
      Timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      Success: false,
      Message: error.message
    });
  }
});

// Обработка 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl,
    available_routes: [
      'GET /',
      'GET /health',
      'POST /tilda-webhook',
      'POST /tinkoff-callback'
    ]
  });
});

// Start server
async function startServer() {
  try {
    await runMigrations();
    
    app.listen(CONFIG.APP.PORT, '0.0.0.0', () => {
      console.log('🚀 Server started successfully');
      console.log(`📍 Port: ${CONFIG.APP.PORT}`);
      console.log(`🔐 Tilda API Key: 770a56bbd1fdada08l`);
      console.log(`🌐 URL: https://housedraw2-production.up.railway.app`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();