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
import tildaAuthMiddleware from './middlewares/authMiddleware.js';
import diagnosticRoutes from './routes/network.js';
// import { checkEmailConfig }  from './config/emailConfig.js';
import AuthController from './controllers/AuthController.js';
import User from './models/Users.js';
import SlotController from './controllers/SlotController.js';

const app = express();
// app.use(cors());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Парсинг данных
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(express.static(__dirname));

app.use('/api', diagnosticRoutes);

app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/paymentfee', (req, res) => {
  res.sendFile(path.join(__dirname, 'paymentfee.html'));
});

// Создаем экземпляры контроллеров
// const tinkoffController = new TinkoffController();
// const emailController = new EmailController();
// const tildaController = new TildaController();

// Проверяем, что методы существуют
// console.log('🔍 Проверка методов контроллеров:');
// console.log('tildaController.handleTildaWebhook:', TildaController.handleTildaWebhook);
// console.log('tinkoffController.handleNotification:', TinkoffController.handleNotification);
// console.log('emailController.testEmail:', EmailController.testEmail);

// CORS Middleware
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin');
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Tilda-Api-Key');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
//   if (req.method === 'OPTIONS') {
//     return res.status(200).end();
//   }
  
//   next();
// });

// // Middleware для парсинга разных форматов данных
// app.use((req, res, next) => {
//   if (req.is('application/json')) {
//     json()(req, res, next);
//   } else if (req.is('application/x-www-form-urlencoded')) {
//     urlencoded({ extended: true })(req, res, next);
//   } else {
//     next();
//   }
// });

// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'X-Tilda-Api-Key', 'Origin', 'X-Requested-With', 'Accept'],
//   credentials: false
// }));

// // Упрощенный middleware для парсинга данных
// app.use(json());
// app.use(urlencoded({ extended: true }));

// Middleware для проверки API ключа Tilda
// const tildaAuthMiddleware = (req, res, next) => {
//   const TILDA_API_KEY = 'yhy1bcu4g5expmtldfv1';
//   const apiKey = req.headers['x-tilda-api-key'];
  
//   console.log('🔐 Проверка API ключа Tilda:', {
//     received: apiKey ? '***' + apiKey.slice(-4) : 'не указан',
//     expected: '***d08l'
//   });

//   // Пропускаем health check без API ключа
//   if (req.path === '/health' || req.path === '/') {
//     return next();
//   }

//   if (!apiKey) {
//     console.warn('⚠️ Попытка доступа без API ключа');
//     return res.status(401).json({
//       Success: false,
//       ErrorCode: 'MISSING_API_KEY',
//       Message: 'API key required in X-Tilda-Api-Key header'
//     });
//   }

//   if (apiKey !== TILDA_API_KEY) {
//     console.warn('❌ Неверный API ключ');
//     return res.status(403).json({
//       Success: false,
//       ErrorCode: 'INVALID_API_KEY', 
//       Message: 'Invalid API key'
//     });
//   }

//   console.log('✅ API ключ проверен успешно');
//   next();
// };

// ========== FALLBACK HANDLERS ==========

// const fallbackTildaHandler = async (req, res) => {
//   console.log('🎯 Fallback Tilda handler');
  
//   if (req.body.test === 'test') {
//     return res.json({
//       Success: true,
//       Message: 'Test connection successful',
//       Test: 'OK',
//       Timestamp: new Date().toISOString()
//     });
//   }
  
//   // Предполагаем, что paymentURL приходит в теле запроса
//   const paymentURL = req.body.paymentURL || req.body.PaymentURL;
  
//   res.json({
//     Success: true,
//     Message: 'Tilda webhook received (fallback)',
//     Status: 'redirect' 
//   });
// };

// const fallbackTildaHandler = async (req, res) => {
//   console.log('🎯 Fallback Tilda handler');
  
//   // Обработка тестового запроса
//   if (req.body.test === 'test') {
//     return res.json({
//       Success: true,
//       Message: 'Test connection successful',
//       Test: 'OK',
//       Timestamp: new Date().toISOString()
//     });
//   }
  
//   // Получаем paymentURL из запроса или используем значение по умолчанию
//   const paymentURL = req.body.paymentURL || req.body.PaymentURL;
  
//   // Возвращаем JSON с URL для редиректа (если Tilda сама выполняет редирект)
//   return res.json({
//     Success: true,
//     Message: 'Tilda webhook received (fallback)',
//     PaymentURL: paymentURL,
//     Status: 'redirect',
//   });
// };

// const fallbackTinkoffHandler = (req, res) => {
//   console.log('📨 Tinkoff callback (fallback):', req.body);
//   res.json({ Success: true });
// };

// const fallbackEmailHandler = (req, res) => {
//   res.json({ 
//     Success: true, 
//     Message: 'Email service (fallback)',
//     Timestamp: new Date().toISOString()
//   });
// };

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

// app.post('/tilda-webhook', tildaAuthMiddleware, (req, res) => {
//   if (typeof TildaController.handleTildaWebhook === 'function') {
//     return TildaController.handleTildaWebhook(req, res);
//   } else {
//     return fallbackTildaHandler(req, res);
//   }
// });

// app.post('/tilda-webhook', tildaAuthMiddleware, (req, res) => {
//   return TildaController.handleTildaWebhook(req, res);
// });

// app.post('/tilda-form-submit', tildaAuthMiddleware, (req, res) => {
//   if (typeof TildaController.handleTildaWebhook === 'function') {
//     return TildaController.handleTildaWebhook(req, res);
//   } else {
//     return fallbackTildaHandler(req, res);
//   }
// });

// app.post('/tilda-validate', tildaAuthMiddleware, (req, res) => {
//   if (typeof TildaController.validateForm === 'function') {
//     return TildaController.validateForm(req, res);
//   } else {
//     return fallbackTildaHandler(req, res);
//   }
// });

// app.post('/check-payment', tildaAuthMiddleware, (req, res) => {
//   if (typeof TildaController.checkPaymentStatus === 'function') {
//     return TildaController.checkPaymentStatus(req, res);
//   } else {
//     return fallbackTildaHandler(req, res);
//   }
// });

// // Tinkoff Callback
// app.post('/tinkoff-callback', (req, res) => {
//   if (typeof TinkoffController.handleNotification === 'function') {
//     return TinkoffController.handleNotification(req, res);
//   } else {
//     return fallbackTinkoffHandler(req, res);
//   }
// });

// // Email routes
// app.post('/test-email', tildaAuthMiddleware, (req, res) => {
//   if (typeof EmailController.testEmail === 'function') {
//     return EmailController.testEmail(req, res);
//   } else {
//     return fallbackEmailHandler(req, res);
//   }
// });

// app.get('/test-smtp', tildaAuthMiddleware, (req, res) => {
//   if (typeof EmailController.testSMTPConnection === 'function') {
//     return EmailController.testSMTPConnection(req, res);
//   } else {
//     return fallbackEmailHandler(req, res);
//   }
// });

// Tilda routes
// app.post('/tilda-validate', tildaAuthMiddleware, (req, res) => TildaController.validateForm(req, res));
// app.post('/check-payment', tildaAuthMiddleware, (req, res) => TildaController.checkPaymentStatus(req, res));

// // Tinkoff Callback
// app.post('/tinkoff-callback', (req, res) => TinkoffController.handleNotification(req, res));

// // Email routes
// app.post('/test-email', tildaAuthMiddleware, (req, res) => EmailController.testEmail(req, res));

const tildaController = new TildaController();
const tinkoffController = new TinkoffController(); 
const emailController = new EmailController();
const authController = new AuthController();

// Tilda routes
app.post('/tilda-webhook', tildaAuthMiddleware, (req, res) => tildaController.handleTildaWebhook(req, res));
app.post('/tilda-validate', tildaAuthMiddleware, (req, res) => tildaController.validateForm(req, res));
app.post('/check-payment', tildaAuthMiddleware, (req, res) => tildaController.checkPaymentStatus(req, res));

// Tinkoff Callback
app.post('/tinkoff-callback', (req, res) => tinkoffController.handleNotification(req, res));

// app.post('/find-order', tildaAuthMiddleware, (req, res) => tildaController.findOrder(req, res));

app.post('/create-payment', (req, res) => tildaController.createPayment(req, res));
app.get('/get-member/:memberNumber', (req, res) => tildaController.getMemberData(req, res));
app.get('/check-payment-status/:memberNumber', (req, res) => tildaController.checkPaymentStatus(req, res));

// Email routes
app.post('/test-email', tildaAuthMiddleware, (req, res) => emailController.testEmail(req, res));

// Fallback route 
app.post('/tilda-fallback', tildaAuthMiddleware);

// Auth routes 
app.post('/auth-login', (req, res) => authController.login(req, res));
app.post('/auth-validate', (req, res) => authController.validate(req, res));
app.get('/auth-profile', (req, res) => authController.getProfile(req, res));
// app.post('/auth-change-password', (req, res) => authController.changePassword(req, res));
app.post('/auth-logout', (req, res) => authController.logout(req, res));

app.get('/dashboard', SlotController.getDashboard);
app.post('/purchase-slots', SlotController.purchaseSlots);
app.get('/purchase-history', SlotController.getPurchaseHistory);

// Эндпоинт для поиска пользователя по email/телефону
// app.post('/find-user-by-credentials', async (req, res) => {
//   try {
//       const { email, phone } = req.body;
//       console.log('🔍 Searching user by credentials:', { email, phone });
      
//       // Ищем пользователя в базе данных
//       let user;
//       if (email) {
//           user = await User.findOne({ where: { email } });
//       } else if (phone) {
//           user = await User.findOne({ where: { phone } });
//       }
      
//       if (user) {
//           console.log('✅ User found:', user.membership_number);
//           return res.json({
//               success: true,
//               memberNumber: user.membership_number,
//               email: user.email,
//               phone: user.phone
//           });
//       } else {
//           console.log('❌ User not found');
//           return res.json({
//               success: false,
//               error: 'User not found'
//           });
//       }
//   } catch (error) {
//       console.error('❌ Error finding user:', error);
//       return res.status(500).json({
//           success: false,
//           error: 'Internal server error'
//       });
//   }
// });

// // Добавьте этот метод в ваш контроллер
// app.post('/find-user-by-email', async (req, res) => {
//   try {
//       const { email } = req.body;
//       console.log('🔍 Searching user by email:', email);
      
//       if (!email) {
//           return res.json({ success: false, error: 'Email is required' });
//       }

//       // Ищем пользователя в базе по email
//       const user = await User.findOne({ where: { email } });
      
//       if (user) {
//           console.log('✅ User found:', user.membership_number);
//           return res.json({
//               success: true,
//               memberNumber: user.membership_number,
//               email: user.email
//           });
//       } else {
//           console.log('❌ User not found with email:', email);
//           return res.json({ success: false, error: 'User not found' });
//       }
//   } catch (error) {
//       console.error('❌ Error finding user by email:', error);
//       return res.json({ success: false, error: 'Server error' });
//   }
// });

// // Admin routes (защищенные)
// app.get('/admin/stats', tildaAuthMiddleware, async (req, res) => {
//   try {
//     const userStats = await UserServices.getSystemStats();
//     const paymentStats = await PaymentRepository.getDailyStatistics();
    
//     res.json({
//       Success: true,
//       UserStats: userStats,
//       PaymentStats: paymentStats,
//       Timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     res.json({
//       Success: false,
//       Message: error.message
//     });
//   }
// });

// const emailConfig = checkEmailConfig();
// console.log('📧 Email configuration check:');
// console.log('  RESEND_API_KEY:', emailConfig.apiKeyExists ? '✅ Present' : '❌ Missing');
// console.log('  Resend configured:', emailConfig.resendConfigured ? '✅ Yes' : '❌ No');
// console.log('  From email:', emailConfig.fromEmail);

// if (!emailConfig.resendConfigured) {
//   console.log('⚠️  Email service is disabled. Emails will not be sent.');
// }

// Обработка 404
// app.use((req, res) => {
//   res.status(404).json({
//     error: 'Route not found',
//     method: req.method,
//     url: req.originalUrl,
//     available_routes: [
//       'GET /',
//       'GET /health',
//       'POST /tilda-webhook',
//       'POST /tinkoff-callback'
//     ]
//   });
// });

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

