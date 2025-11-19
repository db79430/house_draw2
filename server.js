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
  
  // Получаем paymentURL из запроса или используем значение по умолчанию
  const paymentURL = req.body.paymentURL || req.body.PaymentURL;
  
  // Возвращаем JSON с URL для редиректа (если Tilda сама выполняет редирект)
  return res.json({
    Success: true,
    Message: 'Tilda webhook received (fallback)',
    PaymentURL: paymentURL,
    Status: 'redirect',
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

app.post('/tilda-webhook', tildaAuthMiddleware, (req, res) => {
  if (typeof TildaController.handleTildaWebhook === 'function') {
    return TildaController.handleTildaWebhook(req, res);
  } else {
    return fallbackTildaHandler(req, res);
  }
});

app.post('/tilda-form-submit', tildaAuthMiddleware, (req, res) => {
  if (typeof TildaController.handleTildaWebhook === 'function') {
    return TildaController.handleTildaWebhook(req, res);
  } else {
    return fallbackTildaHandler(req, res);
  }
});

app.post('/tilda-validate', tildaAuthMiddleware, (req, res) => {
  if (typeof TildaController.validateForm === 'function') {
    return TildaController.validateForm(req, res);
  } else {
    return fallbackTildaHandler(req, res);
  }
});

app.post('/check-payment', tildaAuthMiddleware, (req, res) => {
  if (typeof TildaController.checkPaymentStatus === 'function') {
    return TildaController.checkPaymentStatus(req, res);
  } else {
    return fallbackTildaHandler(req, res);
  }
});

// Tinkoff Callback
app.post('/tinkoff-callback', (req, res) => {
  if (typeof TinkoffController.handleNotification === 'function') {
    return TinkoffController.handleNotification(req, res);
  } else {
    return fallbackTinkoffHandler(req, res);
  }
});

// Email routes
app.post('/test-email', tildaAuthMiddleware, (req, res) => {
  if (typeof EmailController.testEmail === 'function') {
    return EmailController.testEmail(req, res);
  } else {
    return fallbackEmailHandler(req, res);
  }
});

app.get('/test-smtp', tildaAuthMiddleware, (req, res) => {
  if (typeof EmailController.testSMTPConnection === 'function') {
    return EmailController.testSMTPConnection(req, res);
  } else {
    return fallbackEmailHandler(req, res);
  }
});
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


// import express, { json, urlencoded } from 'express';
// import axios from 'axios'; // Добавляем импорт axios
// import CONFIG from './config/index.js'
// import runMigrations from './database/migrate.js';

// // Импортируем классы контроллеров
// import TinkoffController from './controllers/TinkoffController.js';
// import EmailController from './controllers/EmailController.js';
// import TildaController from "./controllers/tildaFormControllers.js"

// // Services and repositories
// import UserServices from './services/UserServices.js';
// import PaymentRepository from './repositories/PaymentRepository.js';
// import db from './database/index.js';
// import tildaAuthMiddleware from './middlewares/authMiddleware.js';
// import crypto from 'crypto'; // Добавляем для генерации токена

// const app = express();

// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Headers', '*');
//   res.header('Access-Control-Allow-Methods', '*');
  
//   if (req.method === 'OPTIONS') {
//     return res.status(200).end();
//   }
  
//   next();
// });

// // Парсинг данных
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // ========== FALLBACK HANDLERS ==========

// const fallbackTildaHandler = async (req, res) => {
//   console.log('🎯 Fallback Tilda handler');
  
//   try {
//     // Обработка тестового запроса
//     if (req.body.test === 'test') {
//       return res.json({
//         Success: true,
//         Message: 'Test connection successful',
//         Test: 'OK',
//         Timestamp: new Date().toISOString()
//       });
//     }

//     // Получаем данные из Tilda
//     const tildaData = req.body;
//     console.log('📦 Tilda data received:', tildaData);

//     // Формируем OrderId - должен быть уникальным для каждого платежа
//     const orderId = tildaData.orderid || tildaData.OrderId || `TILDA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
//     // Конвертируем сумму в копейки (рубли * 100)
//     const amountInCents = Math.round(Number(tildaData.amount || tildaData.Amount || 1000) * 100);

//     // Формируем данные для Tinkoff API
//     const paymentData = {
//       TerminalKey: process.env.TERMINAL_KEY || CONFIG.TINKOFF.TERMINAL_KEY,
//       Amount: amountInCents,
//       OrderId: orderId,
//       Description: (tildaData.description || tildaData.Description || 'Оплата заказа').substring(0, 250),
//       SuccessURL: tildaData.success_url || process.env.SUCCESS_URL || CONFIG.APP.SUCCESS_URL,
//       FailURL: tildaData.fail_url || process.env.FAIL_URL || CONFIG.APP.FAIL_URL,
//       NotificationURL: process.env.NOTIFICATION_URL || CONFIG.APP.NOTIFICATION_URL || `${process.env.BASE_URL}/api/tinkoff/webhook`,
//       PayType: 'O' // O - одностадийная оплата
//     };

//     // Добавляем данные клиента если есть
//     if (tildaData.email) {
//       paymentData.CustomerKey = tildaData.email;
//       paymentData.Receipt = {
//         Email: tildaData.email,
//         Phone: tildaData.phone || '+79999999999',
//         Taxation: 'osn',
//         Items: [
//           {
//             Name: tildaData.product_name || tildaData.description || 'Товар',
//             Price: amountInCents,
//             Quantity: 1,
//             Amount: amountInCents,
//             PaymentMethod: 'full_payment',
//             PaymentObject: 'commodity',
//             Tax: 'vat20'
//           }
//         ]
//       };
//     }

//     console.log('📤 Sending to Tinkoff API:', {
//       ...paymentData,
//       Amount: `${amountInCents} kopecks (${amountInCents / 100} RUB)`
//     });

//     // Генерируем токен для Tinkoff API
//     const generateToken = (data) => {
//       const secretKey = process.env.SECRET_KEY || CONFIG.TINKOFF.SECRET_KEY;
//       const tokenData = {
//         TerminalKey: data.TerminalKey,
//         Amount: data.Amount,
//         OrderId: data.OrderId,
//         Password: secretKey
//       };
      
//       const sortedKeys = Object.keys(tokenData).sort();
//       const valuesString = sortedKeys.map(key => tokenData[key]).join('');
      
//       return crypto.createHash('sha256').update(valuesString).digest('hex');
//     };

//     paymentData.Token = generateToken(paymentData);

//     // Вызываем Tinkoff API Init метод
//     const tinkoffResponse = await axios.post(
//       'https://securepay.tinkoff.ru/v2/Init',
//       paymentData,
//       {
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         timeout: 15000
//       }
//     );

//     console.log('✅ Tinkoff API response:', tinkoffResponse.data);

//     // Проверяем успешность запроса
//     if (tinkoffResponse.data.Success) {
//       // Согласно вашему примеру, PaymentURL приходит в ответе
//       const paymentUrl = tinkoffResponse.data.PaymentURL;
      
//       console.log('🔗 Payment URL received:', paymentUrl);
//       console.log('💰 Payment ID:', tinkoffResponse.data.PaymentId);
//       console.log('📋 Order ID:', tinkoffResponse.data.OrderId);
      
//       // Возвращаем ответ в формате Tinkoff API + дополнительные поля для Tilda
//       return res.json({
//         Success: true,
//         ErrorCode: "0",
//         TerminalKey: tinkoffResponse.data.TerminalKey,
//         Status: "NEW",
//         PaymentId: tinkoffResponse.data.PaymentId,
//         OrderId: tinkoffResponse.data.OrderId,
//         Amount: tinkoffResponse.data.Amount,
//         PaymentURL: paymentUrl,
//         Message: 'Payment initialized successfully'
//       });
//     } else {
//       // Обработка ошибки от Tinkoff
//       console.error('❌ Tinkoff API error:', tinkoffResponse.data);
      
//       return res.status(400).json({
//         Success: false,
//         ErrorCode: tinkoffResponse.data.ErrorCode,
//         Message: tinkoffResponse.data.Message || 'Payment initialization failed',
//         Details: tinkoffResponse.data.Details
//       });
//     }

//   } catch (error) {
//     console.error('💥 Error in fallbackTildaHandler:', error);
    
//     // Обработка различных типов ошибок
//     if (error.response) {
//       // Ошибка от Tinkoff API
//       const tinkoffError = error.response.data;
//       return res.status(400).json({
//         Success: false,
//         ErrorCode: tinkoffError.ErrorCode || 'HTTP_ERROR',
//         Message: tinkoffError.Message || 'Tinkoff API error',
//         StatusCode: error.response.status
//       });
//     } else if (error.request) {
//       // Нет соединения с Tinkoff API
//       return res.status(500).json({
//         Success: false,
//         ErrorCode: 'CONNECTION_ERROR',
//         Message: 'Cannot connect to payment service'
//       });
//     } else {
//       // Другие ошибки
//       return res.status(500).json({
//         Success: false,
//         ErrorCode: 'INTERNAL_ERROR',
//         Message: 'Internal server error',
//         Error: error.message
//       });
//     }
//   }
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

// // ========== ROUTES ==========

// // Health check (публичный)
// app.get('/health', async (req, res) => {
//   try {
//     await db.one('SELECT 1 as test');
    
//     res.json({ 
//       status: 'OK', 
//       timestamp: new Date().toISOString(),
//       service: 'Tilda Webhook Handler',
//       message: 'Сервер работает корректно'
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: 'ERROR',
//       database: 'disconnected',
//       error: error.message,
//       timestamp: new Date().toISOString()
//     });
//   }
// });

// // Главная страница (публичная)
// app.get('/', (req, res) => {
//   res.json({ 
//     status: 'OK', 
//     message: 'Tilda Webhook Server is running',
//     timestamp: new Date().toISOString(),
//     endpoints: [
//       'POST /tilda-webhook (protected)',
//       'POST /tilda-form-submit (protected)',
//       'POST /tinkoff-callback',
//       'GET /health'
//     ]
//   });
// });

// app.post('/tilda-webhook', tildaAuthMiddleware, (req, res) => {
//   if (typeof TildaController.handleTildaWebhook === 'function') {
//     return TildaController.handleTildaWebhook(req, res);
//   } else {
//     return fallbackTildaHandler(req, res);
//   }
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

// // Start server
// async function startServer() {
//   try {
//     await runMigrations();
    
//     app.listen(CONFIG.APP.PORT, '0.0.0.0', () => {
//       console.log('🚀 Server started successfully');
//       console.log(`📍 Port: ${CONFIG.APP.PORT}`);
//       console.log(`🔐 Tilda API Key: 770a56bbd1fdada08l`);
//       console.log(`🌐 URL: https://housedraw2-production.up.railway.app`);
//       console.log('✅ Контроллеры инициализированы');
//     });
//   } catch (error) {
//     console.error('❌ Failed to start server:', error);
//     process.exit(1);
//   }
// }

// startServer();