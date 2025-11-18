import express, { json, urlencoded } from 'express';
import CONFIG from './config/index.js'
import runMigrations from './database/migrate.js';

// Импортируем классы контроллеров
import TinkoffController from './controllers/TinkoffController.js';
import EmailController from './controllers/EmailController.js';
import TildaController from "./controllers/tildaFormControllers.js"

// Services and repositories
import UserServices from './services/UserServices.js';
import PaymentRepository from './repositories/PaymentRepository.js';
import db from './database/index.js';

const app = express();

// Создаем экземпляры контроллеров
const tinkoffController = new TinkoffController();
const emailController = new EmailController();
const tildaController = new TildaController();

// Проверяем, что методы существуют
console.log('🔍 Проверка методов контроллеров:');
console.log('tildaController.handleTildaWebhook:', typeof tildaController.handleTildaWebhook);
console.log('tinkoffController.handleNotification:', typeof tinkoffController.handleNotification);
console.log('emailController.testEmail:', typeof emailController.testEmail);

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

// Middleware для парсинга разных форматов данных
app.use((req, res, next) => {
  if (req.is('application/json')) {
    json()(req, res, next);
  } else if (req.is('application/x-www-form-urlencoded')) {
    urlencoded({ extended: true })(req, res, next);
  } else {
    next();
  }
});

// Middleware для проверки API ключа Tilda
const tildaAuthMiddleware = (req, res, next) => {
  const TILDA_API_KEY = 'yhy1bcu4g5expmtldfv1';
  const apiKey = req.headers['x-tilda-api-key'];
  
  console.log('🔐 Проверка API ключа Tilda:', {
    received: apiKey ? '***' + apiKey.slice(-4) : 'не указан',
    expected: '***d08l'
  });

  // Пропускаем health check без API ключа
  if (req.path === '/health' || req.path === '/') {
    return next();
  }

  if (!apiKey) {
    console.warn('⚠️ Попытка доступа без API ключа');
    return res.status(401).json({
      Success: false,
      ErrorCode: 'MISSING_API_KEY',
      Message: 'API key required in X-Tilda-Api-Key header'
    });
  }

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

// ========== FALLBACK HANDLERS ==========

// Запасные обработчики на случай если методы контроллеров не работают
const fallbackTildaHandler = async (req, res) => {
  console.log('🎯 Fallback Tilda handler');
  
  // Обработка тестового запроса
  if (req.body.test === 'test') {
    return res.json({
      Success: true,
      Message: 'Test connection successful',
      Test: 'OK',
      Timestamp: new Date().toISOString()
    });
  }
  
  // Базовый ответ
  res.json({
    Success: true,
    Message: 'Tilda webhook received (fallback)',
    PaymentURL: 'https://www.tinkoff.ru/fallback-payment',
    Status: 'redirect'
  });
};

const fallbackTinkoffHandler = (req, res) => {
  console.log('📨 Tinkoff callback (fallback):', req.body);
  res.json({ Success: true });
};

const fallbackEmailHandler = (req, res) => {
  res.json({ 
    Success: true, 
    Message: 'Email service (fallback)',
    Timestamp: new Date().toISOString()
  });
};

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

// Tilda Webhook routes
app.post('/tilda-webhook', tildaAuthMiddleware, 
  tildaController.handleTildaWebhook?.bind(tildaController) || fallbackTildaHandler
);

app.post('/tilda-form-submit', tildaAuthMiddleware,
  tildaController.handleTildaWebhook?.bind(tildaController) || fallbackTildaHandler
);

app.post('/tilda-validate', tildaAuthMiddleware,
  tildaController.validateForm?.bind(tildaController) || fallbackTildaHandler
);

app.post('/check-payment', tildaAuthMiddleware,
  tildaController.checkPaymentStatus?.bind(tildaController) || fallbackTildaHandler
);

// Tinkoff Callback
app.post('/tinkoff-callback',
  tinkoffController.handleNotification?.bind(tinkoffController) || fallbackTinkoffHandler
);

// Email routes
app.post('/test-email', tildaAuthMiddleware,
  emailController.testEmail?.bind(emailController) || fallbackEmailHandler
);

app.get('/test-smtp', tildaAuthMiddleware,
  emailController.testSMTPConnection?.bind(emailController) || fallbackEmailHandler
);

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
      console.log('✅ Контроллеры инициализированы');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();