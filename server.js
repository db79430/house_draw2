import express, { json, urlencoded } from 'express';
import session from 'express-session';
import cors from 'cors';
import CONFIG from './config/index.js';
import runMigrations from './database/migrate.js';
import path from 'path';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

// Импортируем классы контроллеров
import TinkoffController from './controllers/TinkoffController.js';
import EmailController from './controllers/EmailController.js';
import TildaController from './controllers/tildaFormControllers.js';

// Services and repositories
import UserServices from './services/UserServices.js';
import PaymentRepository from './repositories/PaymentRepository.js';
import db from './database/index.js';
import tildaAuthMiddleware from './middlewares/authMiddleware.js';
import diagnosticRoutes from './routes/network.js';
import AuthController from './controllers/AuthController.js';
import User from './models/Users.js';
import SlotController from './controllers/SlotController.js';
import authenticateToken from './middlewares/auth.js';
import Payment from './models/Payment.js';
import Slot from './models/Slots.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Redis клиент для сессий
let redisClient = null;
let sessionStore = null;

const initializeRedis = async () => {
  try {
    if (process.env.REDIS_URL) {
      redisClient = createClient({
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
        }
      });

      redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      redisClient.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      await redisClient.connect();

      // Используем кастомный Redis Store
      const RedisSessionStore = (await import('./utils/sessionStore.js')).default;
      sessionStore = new RedisSessionStore({
        client: redisClient,
        prefix: 'session:',
        ttl: 86400
      });

      console.log('✅ Redis session store создан');
      return true;
    }
  } catch (error) {
    console.log('⚠️ Redis не доступен, используем memory store:', error.message);
    return false;
  }
};

// CORS настройки
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://npkvdv.ru',
      'https://www.npkvdv.ru',
      'https://npk-vdv.ru',
      'http://localhost:3000',
      'http://localhost:8080'
    ];

    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('tilda.ws')) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    // Разрешаем все CORS preflight запросы
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 часа
    return res.status(200).end();
  }
  next();
});

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  },
  name: 'npkvdv.sid',
  rolling: true,
  unset: 'destroy'
}));

// Парсинг данных
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// Статические файлы
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Логирование запросов
app.use((req, res, next) => {
  if (req.path.includes('/api/') || req.path.includes('/auth')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('Session ID:', req.sessionID);
  }
  next();
});

// Инициализация сессии
app.use((req, res, next) => {
  if (!req.session.initialized) {
    req.session.initialized = true;
    req.session.createdAt = new Date().toISOString();
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
});

// Инициализация контроллеров
const tildaController = new TildaController();
const tinkoffController = new TinkoffController();
const emailController = new EmailController();
const authController = new AuthController();
const slotController = new SlotController();

// API роуты
app.get('/api/health', async (req, res) => {
  try {
    await db.one('SELECT 1 as test');

    const redisStatus = redisClient?.isReady ? 'connected' : 'disconnected';

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: redisStatus
      },
      message: 'Сервер работает корректно'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      services: {
        database: 'disconnected',
        redis: redisClient?.isReady ? 'connected' : 'disconnected'
      },
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const memberNumber = req.query.member;

    if (!memberNumber) {
      return res.status(400).json({
        success: false,
        message: 'Требуется параметр member'
      });
    }

    console.log('📊 Dashboard API request for member:', memberNumber);

    const user = await User.findOne({ membership_number: memberNumber });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    console.log('✅ User found:', user.id);

    const [userSlots, paymentHistory, availableSlots] = await Promise.all([
      Slot.findByUserIdSlots(user.id).catch(() => []),
      Payment.getPaymentHistory(user.id, 10).catch(() => []),
      Slot.getAvailableSlotsCount().catch(() => 0)
    ]);

    const dashboardData = {
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        phone: user.phone,
        membership_number: user.membership_number,
        membership_status: user.membership_status,
        created_at: user.created_at
      },
      statistics: {
        totalSlots: userSlots.length,
        activeSlots: userSlots.filter(slot => slot.status === 'active').length,
        availableSlots: availableSlots
      },
      slots: userSlots,
      paymentHistory: paymentHistory
    };

    console.log('✅ Dashboard loaded successfully');

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ Dashboard API error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка загрузки дашборда',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// HTML страницы
app.get('/', (req, res) => {
  console.log('📄 Serving index.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/paymentfee', (req, res) => {
  console.log('🎯 PAYMENTFEE PAGE REQUEST');

  if (req.query.memberNumber) {
    console.log('✅ Member number from URL:', req.query.memberNumber);

    if (req.session) {
      req.session.memberNumber = req.query.memberNumber;
    }
  }

  res.sendFile(path.join(__dirname, 'public', 'paymentfee.html'));
});

app.get('/api/paymentfee', async (req, res) => {
  console.log('🎯 API PAYMENTFEE REQUEST');

  const { memberNumber, email, phone } = req.query;

  try {
    if (memberNumber) {
      console.log('🔍 Поиск по memberNumber:', memberNumber);
      const user = await User.findByMembershipNumber(memberNumber);

      if (user) {
        return res.json({
          success: true,
          user: {
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            city: user.city,
            memberNumber: user.membership_number || memberNumber
          }
        });
      }
    }

    if (email) {
      console.log('🔍 Поиск по email:', email);
      const user = await User.findByEmail(email);

      if (user) {
        return res.json({
          success: true,
          user: {
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            city: user.city,
            memberNumber: user.membership_number
          },
          memberNumber: user.membership_number
        });
      }
    }

    if (phone) {
      console.log('🔍 Поиск по phone:', phone);
      const user = await User.findByPhone(phone);

      if (user) {
        return res.json({
          success: true,
          user: {
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            city: user.city,
            memberNumber: user.membership_number
          },
          memberNumber: user.membership_number
        });
      }
    }

    return res.json({
      success: false,
      error: 'Пользователь не найден. Проверьте введенные данные.'
    });

  } catch (error) {
    console.error('❌ Ошибка поиска:', error);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

app.get('/auth', (req, res) => {
  console.log('📄 Serving auth.html');
  res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

app.get('/dashboard', (req, res) => {
  const memberNumber = req.query.member;

  console.log('📄 Serving dashboard.html', {
    memberNumber: memberNumber,
    queryParams: req.query
  });

  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/successfulpayment', (req, res) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self' data: blob:; " +
    "style-src 'self' 'unsafe-inline' blob:; " +
    "script-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "font-src 'self' data:;"
  );

  res.sendFile(path.join(__dirname, 'public', 'successfulpayment.html'));
});

// Tilda webhook
app.get('/tilda-webhook', (req, res) => {
  res.json({
    Success: true,
    Message: 'Webhook is available',
    Method: 'GET',
    Test: 'OK',
    Timestamp: new Date().toISOString()
  });
});

app.post('/tilda-webhook', (req, res) => tildaController.handleTildaWebhook(req, res));

app.post('/test-webhook', (req, res) => {
  res.json({ status: 'success', received: req.body });
});

app.get('/get-member-number', async (req, res) => {
  try {
    const { email, phone } = req.query;
    const user = await User.findUserByEmailOrPhone(email, phone);

    if (user) {
      const memberNumber = user.membership_number;

      res.json({
        success: true,
        memberNumber: memberNumber,
        userData: {
          name: user.name || user.fullname,
          email: user.email,
          phone: user.phone,
          city: user.city
        }
      });
    } else {
      res.json({ success: false, error: 'Пользователь не найден' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tilda routes
app.post('/tilda-validate', tildaAuthMiddleware, (req, res) => tildaController.validateForm(req, res));
app.post('/check-payment', tildaAuthMiddleware, (req, res) => tildaController.checkPaymentStatus(req, res));

// Tinkoff Callback
app.post('/tinkoff-callback', (req, res) => tinkoffController.handleNotification(req, res));

app.post('/create-payment', (req, res) => tildaController.createPayment(req, res));
app.get('/check-payment-status/:memberNumber', (req, res) => tildaController.checkPaymentStatus(req, res));

// Email routes
app.post('/test-email', tildaAuthMiddleware, (req, res) => emailController.testEmail(req, res));

// Auth routes 
app.post('/auth-login', (req, res) => authController.login(req, res));
app.post('/auth-validate', (req, res) => authController.validate(req, res));
app.get('/auth-profile', (req, res) => authController.getProfile(req, res));
app.post('/auth-logout', (req, res) => authController.logout(req, res));

// Slot routes
app.post('/purchase', authenticateToken, (req, res) =>
  slotController.purchase(req, res)
);

app.get('/my-slots', (req, res) =>
  slotController.getUserSlots(req, res)
);

app.get('/statistics', (req, res) =>
  slotController.getStatistics(req, res)
);

app.post('/payment-notification', (req, res) =>
  slotController.handlePaymentNotification(req, res)
);

// УДАЛИТЕ ЭТИ СТРОКИ если они есть - они вызывают ошибку path-to-regexp:
// app.use('/api/', apiRateLimiter);
// app.use('/auth-login', authRateLimiter);
// app.post('/tilda-fallback', tildaAuthMiddleware);

// Простые 404 и обработка ошибок
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
async function startServer() {
  try {
    // Инициализируем Redis
    await initializeRedis();

    // Запускаем миграции
    await runMigrations();

    const server = app.listen(CONFIG.APP.PORT, '0.0.0.0', () => {
      console.log('🚀 Server started successfully');
      console.log(`📍 Port: ${CONFIG.APP.PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('✅ Контроллеры инициализированы');
      console.log('✅ Redis status:', redisClient?.isReady ? 'connected' : 'disconnected');
    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
      console.log('🛑 Received shutdown signal, closing server...');

      server.close(async () => {
        console.log('✅ HTTP server closed');

        if (redisClient) {
          await redisClient.quit();
          console.log('✅ Redis connection closed');
        }

        process.exit(0);
      });

      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();