import express, { json, urlencoded } from 'express';
import session from 'express-session';
import cors from 'cors';
import CONFIG from './config/index.js';
import runMigrations from './database/migrate.js';
import path from 'path';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import crypto from 'crypto';
import connectPgSimple from 'connect-pg-simple';

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


const PostgresSessionStore = connectPgSimple(session);

const sessionStore = new PostgresSessionStore({
  conString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  createTableIfMissing: true,
  tableName: 'user_sessions',
  schemaName: 'public',
  pruneSessionInterval: 60 * 15, // Чистка каждые 15 минут
  errorLog: console.error
});

const app = express();

// Redis клиент для сессий
let redisClient = null;


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
    // Разрешаем все origins в development
    if (!origin || process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }

    // Разрешенные домены в production
    const allowedOrigins = [
      'https://npkvdv.ru',
      'https://www.npkvdv.ru',
      'https://tilda.cc',
      'https://*.tilda.ws'
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));


app.use((req, res, next) => {
  // Разрешаем кросс-доменные запросы с куками
  const origin = req.headers.origin;
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  console.log('Query:', req.query);
  console.log('Body:', req.body);

  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');

    // Для Tilda
    if (origin.includes('tilda')) {
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, X-Tilda-Auth');
    }
  }

  // Предзапросы OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: false, // ⚠️ Важно: false вместо true
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  },
  name: 'npkvdv.sid',
  rolling: false, // ⚠️ Лучше false для производительности
  unset: 'destroy'
}));


// Парсинг данных
app.use(express.json());

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
    req.session.csrfToken = randomBytes(32).toString('hex');
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
    // Проверяем БД
    const dbResult = await db.one('SELECT 1 as test');
    console.log('✅ Database connection successful');

    // Проверяем Redis
    let redisStatus = 'disconnected';
    if (redisClient && redisClient.isReady) {
      await redisClient.ping();
      redisStatus = 'connected';
      console.log('✅ Redis connection successful');
    }

    // Проверяем таблицы
    const userCount = await db.one('SELECT COUNT(*) as count FROM users')
      .catch(() => ({ count: 0 }));

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: redisStatus
      },
      data: {
        users_count: userCount.count
      },
      message: 'Сервер работает корректно'
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
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

// app.get('/get-member-number', async (req, res) => {
//   try {
//     console.log('=== ЗАПРОС ПОИСКА ПОЛЬЗОВАТЕЛЯ ===');
//     console.log('Query параметры:', req.query);

//     const { email, phone } = req.query;

//     // Валидация
//     if (!email && !phone) {
//       return res.json({
//         success: false,
//         error: 'Необходимо указать email или телефон'
//       });
//     }

//     const user = await User.findUserByEmailOrPhone(email, phone);

//     if (user) {
//       console.log('Пользователь найден:', {
//         membership_number: user.membership_number,
//         email: user.email,
//         phone: user.phone
//       });

//       res.json({
//         success: true,
//         memberNumber: user.membership_number,
//         user: {
//           fullname: user.fullname || user.name || 'Не указано',
//           email: user.email || 'Не указано',
//           phone: user.phone || 'Не указано',
//           city: user.city || 'Не указан'
//         }
//       });
//     } else {
//       console.log('Пользователь не найден');

//       // Для тестирования: возвращаем тестового пользователя
//       if (process.env.NODE_ENV === 'development') {
//         console.log('Режим разработки: возвращаем тестового пользователя');

//         // Проверяем тестовые данные
//         const testEmail = 'test@example.com';
//         const testPhones = ['79991234567', '89123456789', '1234567890'];

//         if (email === testEmail ||
//           (phone && testPhones.includes(phone.replace(/\D/g, '').slice(-10)))) {

//           res.json({
//             success: true,
//             memberNumber: 'TEST12345',
//             user: {
//               fullname: 'Тестовый Пользователь',
//               email: email || 'test@example.com',
//               phone: phone || '+7 (999) 123-45-67',
//               city: 'Москва'
//             }
//           });
//           return;
//         }
//       }

//       res.json({
//         success: false,
//         error: 'Пользователь не найден. Проверьте введенные данные.'
//       });
//     }

//   } catch (error) {
//     console.error('Ошибка в /get-member-number:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Внутренняя ошибка сервера'
//     });
//   }
// });

// server.js - исправленный endpoint /get-member-number
app.get('/get-member-number', async (req, res) => {
  try {
    console.log('=== ЗАПРОС ПОИСКА ПОЛЬЗОВАТЕЛЯ ===');
    console.log('Query params:', req.query);
    console.log('Request URL:', req.url);

    const { email, phone, debug } = req.query;

    // Валидация
    if (!email && !phone) {
      return res.json({
        success: false,
        error: 'Необходимо указать email или телефон'
      });
    }

    // Для отладки: покажем все пользователи
    if (debug === 'true') {
      const allUsers = await db.manyOrNone(`
        SELECT 
          id, email, phone, membership_number, fullname,
          LENGTH(phone) as phone_length,
          REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', ''), '(', '') as phone_clean
        FROM users 
        WHERE phone IS NOT NULL 
        LIMIT 20
      `);

      console.log('📋 Все пользователи (первые 20):');
      allUsers.forEach((u, i) => {
        console.log(`${i + 1}. ID:${u.id} | Email:${u.email} | Phone:${u.phone} | Clean:${u.phone_clean} | Member:${u.membership_number}`);
      });
    }

    let user = null;
    let searchMethod = '';

    // 1. Поиск по email (точное совпадение)
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      console.log('🔍 Поиск по email:', cleanEmail);

      try {
        user = await db.oneOrNone(`
          SELECT 
            id,
            email,
            phone,
            membership_number,
            fullname,
            city
          FROM users 
          WHERE email ILIKE $1
        `, [`%${cleanEmail}%`]);  // ILIKE для регистронезависимого поиска

        if (user) {
          console.log('✅ Найден по email:', {
            id: user.id,
            member: user.membership_number,
            email: user.email
          });
          searchMethod = 'email';
        } else {
          console.log('❌ Не найден по email:', cleanEmail);
        }
      } catch (error) {
        console.error('Ошибка поиска по email:', error);
      }
    }

    // 2. Поиск по телефону
    if (!user && phone) {
      console.log('🔍 Поиск по телефону:', phone);

      try {
        // Нормализуем номер телефона
        const cleanPhone = phone.replace(/\D/g, '');
        console.log('Цифры телефона:', cleanPhone);

        if (cleanPhone.length < 10) {
          console.log('❌ Недостаточно цифр для поиска');
        } else {
          // Пробуем разные варианты поиска
          const searchQueries = [
            // Вариант 1: Ищем по всем цифрам
            `
            SELECT * FROM users 
            WHERE phone IS NOT NULL 
            AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
              phone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', '') = $1
            LIMIT 1
            `,
            // Вариант 2: Ищем по последним 10 цифрам
            `
            SELECT * FROM users 
            WHERE phone IS NOT NULL 
            AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
              phone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', '') LIKE $1
            LIMIT 1
            `,
            // Вариант 3: Ищем по последним 9 цифрам (без кода страны)
            `
            SELECT * FROM users 
            WHERE phone IS NOT NULL 
            AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
              phone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', '') LIKE $1
            LIMIT 1
            `
          ];

          const params = [
            cleanPhone,                          // точное совпадение
            `%${cleanPhone.slice(-10)}%`,       // последние 10 цифр
            `%${cleanPhone.slice(-9)}%`         // последние 9 цифр
          ];

          for (let i = 0; i < searchQueries.length; i++) {
            console.log(`🔍 Попытка ${i + 1} с параметром:`, params[i]);
            user = await db.oneOrNone(searchQueries[i], [params[i]]);

            if (user) {
              console.log(`✅ Найден по варианту ${i + 1}:`, {
                id: user.id,
                phone: user.phone,
                member: user.membership_number
              });
              searchMethod = 'phone';
              break;
            }
          }

          if (!user) {
            console.log('❌ Не найден по телефону после всех попыток');

            // Покажем что есть в базе для отладки
            const sample = await db.manyOrNone(`
              SELECT 
                id,
                phone,
                email,
                membership_number,
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                  phone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', '') as phone_clean
              FROM users 
              WHERE phone IS NOT NULL 
              LIMIT 5
            `);

            console.log('📋 Примеры телефонов в базе:');
            sample.forEach(u => {
              console.log(`  - ${u.phone} (clean: ${u.phone_clean}) -> ${u.email}`);
            });
          }
        }
      } catch (error) {
        console.error('Ошибка поиска по телефону:', error);
      }
    }

    // 3. Формируем ответ
    if (user && user.membership_number) {
      console.log('🎉 Пользователь найден!', {
        id: user.id,
        member: user.membership_number,
        method: searchMethod
      });

      res.json({
        success: true,
        memberNumber: user.membership_number,
        user: {
          fullname: user.fullname || 'Не указано',
          email: user.email || 'Не указано',
          phone: user.phone || 'Не указано',
          city: user.city || 'Не указан'
        },
        debug: process.env.NODE_ENV === 'development' ? {
          searchMethod: searchMethod,
          userId: user.id,
          rawPhone: user.phone
        } : undefined
      });

    } else {
      console.log('❌ Пользователь не найден');

      // Для тестирования
      if (process.env.NODE_ENV !== 'production') {
        // Проверяем тестовые данные
        const testEmails = ['test@example.com', 'daria9457@gmail.com'];
        const testPhones = ['9151908455', '79151908455', '+79151908455'];

        const cleanEmail = email ? email.toLowerCase().trim() : '';
        const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

        if (testEmails.includes(cleanEmail) ||
          testPhones.some(tp => cleanPhone.includes(tp.replace(/\D/g, '')))) {

          console.log('🛠 Возвращаем тестовые данные');

          res.json({
            success: true,
            memberNumber: 'MBRTEST12345',
            user: {
              fullname: 'Тестовый Пользователь',
              email: email || 'test@example.com',
              phone: phone || '+7 (915) 190-84-55',
              city: 'Москва'
            }
          });
          return;
        }
      }

      res.json({
        success: false,
        error: 'Пользователь не найден. Проверьте введенные данные.',
        debug: process.env.NODE_ENV === 'development' ? {
          emailProvided: email,
          phoneProvided: phone,
          foundUser: !!user
        } : undefined
      });
    }

  } catch (error) {
    console.error('❌ Ошибка в /get-member-number:', error);
    console.error('Stack:', error.stack);

    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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