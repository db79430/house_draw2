import express, { json, urlencoded } from 'express';
import session from 'express-session';
import CONFIG from './config/index.js'
import runMigrations from './database/migrate.js';
import path from 'path';

import dotenv from 'dotenv';
dotenv.config();

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
import { fileURLToPath } from 'url';
import authenticateToken from './middlewares/auth.js'
import Payment from './models/Payment.js';
import Slot from './models/Slots.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

const app = express();
// app.use(cors());

app.use(session({
  secret: process.env.SESSION_SECRET || '9VZ9O4zoG9qRzbxAOMCM5eS/t2sDegtmU3ooqH2KR3U=',
  resave: false,
  saveUninitialized: true,
  cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 часа
  }
}));

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
app.use(express.static(path.join(__dirname, 'public')));

// app.use((req, res, next) => {
//   console.log('🎯 ==== INCOMING REQUEST ====');
//   console.log('Time:', new Date().toISOString());
//   console.log('Method:', req.method);
//   console.log('URL:', req.url);
//   console.log('Headers:', req.headers);
//   console.log('Body:', req.body);
//   console.log('IP:', req.ip);
//   console.log('🎯 ==== END REQUEST ====');
//   next();
// });



// API роуты - ПОСЛЕ HTML
app.get('/api/health', async (req, res) => {
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

    // 🔥 Вариант 1: Если модель исправлена
    const user = await User.findOne({ membership_number: memberNumber });

    // 🔥 Вариант 2: Если добавили отдельный метод
    // const user = await User.findByMembershipNumber(memberNumber);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    console.log('✅ User found:', user.id);

    // Получаем данные параллельно для скорости
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

app.get('/', (req, res) => {
  console.log('📄 Serving index.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// app.get('/paymentfee', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'paymentfee.html'));
// });

app.get('/paymentfee', (req, res) => {
  console.log('🎯 ==== PAYMENTFEE PAGE REQUEST ====');
  console.log('Query params:', req.query);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  
  // Проверяем и сохраняем memberNumber безопасно
  if (req.query.memberNumber) {
    console.log('✅ Member number from URL:', req.query.memberNumber);
    
    // Проверяем, что сессия существует перед записью
    if (req.session) {
      req.session.memberNumber = req.query.memberNumber;
      console.log('💾 Saved to session:', req.session.memberNumber);
    } else {
      console.warn('⚠️  Session is not available');
    }
  }
  
  res.sendFile(path.join(__dirname, 'public', 'paymentfee.html'));
});

app.get('/api/paymentfee', async (req, res) => {
  console.log('🎯 ==== API PAYMENTFEE REQUEST ====');
  console.log('Query params:', req.query);
  
  const { memberNumber, email, phone } = req.query;
  
  try {
    // Если есть memberNumber - ищем по нему
    if (memberNumber) {
      console.log('🔍 Поиск по memberNumber:', memberNumber);
      
      // Здесь ваш код поиска в БД
      const user = await findUserByMemberNumber(memberNumber);
      
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
      } else {
        return res.json({
          success: false,
          error: 'Пользователь не найден'
        });
      }
    }
    
    // Если есть email - ищем по email
    if (email) {
      console.log('🔍 Поиск по email:', email);
      
      const user = await findUserByEmail(email);
      
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
    
    // Если есть phone - ищем по телефону
    if (phone) {
      console.log('🔍 Поиск по phone:', phone);
      
      const user = await findUserByPhone(phone);
      
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
    
    // Если ничего не нашли
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

  if (memberNumber) {
    console.log('🎯 Dashboard request with member number:', memberNumber);
  }

  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.post('/purchase', authenticateToken, (req, res) =>
  slotController.purchase(req, res)
);


const tildaController = new TildaController();
const tinkoffController = new TinkoffController();
// const emailController = new EmailController();
const authController = new AuthController();
const slotController = new SlotController();

app.get('/tilda-webhook', (req, res) => {
  console.log('🔔 GET /tilda-webhook - Tilda connectivity check');
  console.log('📋 Query parameters:', req.query);
  console.log('🌐 Headers:', req.headers);

  // Tilda ожидает JSON ответ с определенной структурой
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
  console.log('✅ Тестовый вебхук получен:', req.body);
  res.json({ status: 'success', received: req.body });
});

// app.get('/get-member-number', async (req, res) => {
//   try {
//     const { email, phone } = req.query;
//     const user = await User.findUserByEmailOrPhone(email, phone);

//     if (user) {
//       // Пробуем разные варианты названия поля
//       const memberNumber = user.membership_number

//       console.log('✅ Найден пользователь:', {
//         email: user.email,
//         memberNumber: memberNumber,
//         availableFields: Object.keys(user)
//       });

//       res.json({
//         success: true,
//         memberNumber: memberNumber,
//         userData: {
//           name: user.name || user.fullname,
//           email: user.email,
//           phone: user.phone,
//           city: user.city
//         }
//       });
//     } else {
//       res.json({ success: false, error: 'Пользователь не найден' });
//     }
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

app.get('/get-member-number', async (req, res) => {
  try {
    const { email, phone } = req.query;
    
    console.log('🔍 GET MEMBER NUMBER REQUEST:', { 
      email: email || 'undefined', 
      phone: phone || 'undefined' 
    });
    
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        error: 'Укажите email или телефон'
      });
    }
    
    const user = await User.findUserByEmailOrPhone(email, phone);
    
    if (user) {
      // Пробуем разные варианты названия поля member number
      const memberNumber = user.member_number || 
                          user.membership_number || 
                          user.memberNumber || 
                          user.member_id ||
                          `USER${user.id}`;
      
      console.log('✅ User found:', {
        id: user.id,
        email: user.email,
        memberNumber: memberNumber
      });
      
      // Сохраняем в сессии безопасно
      if (req.session) {
        req.session.memberNumber = memberNumber;
        req.session.userData = {
          name: user.name || user.fullname || user.first_name + ' ' + user.last_name,
          email: user.email,
          phone: user.phone,
          city: user.city || user.location
        };
        console.log('💾 Session updated with memberNumber:', memberNumber);
      }
      
      res.json({
        success: true,
        memberNumber: memberNumber,
        userData: {
          name: user.name || user.fullname || user.first_name + ' ' + user.last_name,
          email: user.email,
          phone: user.phone,
          city: user.city || user.location
        }
      });
    } else {
      console.log('❌ User not found');
      res.json({ 
        success: false, 
        error: 'Пользователь не найден. Проверьте email или телефон.' 
      });
    }
  } catch (error) {
    console.error('Error in get-member-number:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера: ' + error.message 
    });
  }
});

// Tilda routes
app.post('/tilda-validate', tildaAuthMiddleware, (req, res) => tildaController.validateForm(req, res));
app.post('/check-payment', tildaAuthMiddleware, (req, res) => tildaController.checkPaymentStatus(req, res));

// Tinkoff Callback
app.post('/tinkoff-callback', (req, res) => tinkoffController.handleNotification(req, res));

// app.post('/find-order', tildaAuthMiddleware, (req, res) => tildaController.findOrder(req, res));

app.post('/create-payment', (req, res) => tildaController.createPayment(req, res));
// app.get('/get-member/:memberNumber', (req, res) => tildaController.getMemberData(req, res));
app.get('/check-payment-status/:memberNumber', (req, res) => tildaController.checkPaymentStatus(req, res));

// Email routes
// app.post('/test-email', tildaAuthMiddleware, (req, res) => emailController.testEmail(req, res));

// Fallback route 
app.post('/tilda-fallback', tildaAuthMiddleware);

app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});


// Auth routes 
app.post('/auth-login', (req, res) => authController.login(req, res));
app.post('/auth-validate', (req, res) => authController.validate(req, res));
app.get('/auth-profile', (req, res) => authController.getProfile(req, res));
// app.post('/auth-change-password', (req, res) => authController.changePassword(req, res));
app.post('/auth-logout', (req, res) => authController.logout(req, res));


// Получение слотов пользователя
app.get('/my-slots', (req, res) =>
  slotController.getUserSlots(req, res)
);

// Получение статистики
app.get('/statistics', (req, res) =>
  slotController.getStatistics(req, res)
);

// Уведомления от Tinkoff (не требует авторизации)
app.post('/payment-notification', (req, res) =>
  slotController.handlePaymentNotification(req, res)
);

console.log('🔧 Environment Check:');
console.log('   Current directory:', process.cwd());
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   YANDEX_EMAIL exists:', !!process.env.YANDEX_EMAIL);
console.log('   All env variables:', Object.keys(process.env).filter(key =>
  key.includes('YANDEX') || key.includes('EMAIL') || key.includes('APP')
))

app.use((req, res, next) => {
  console.log('📋 Session Check:');
  console.log('   Session ID:', req.sessionID);
  console.log('   Has session object:', !!req.session);
  console.log('   Session keys:', req.session ? Object.keys(req.session) : 'No session');
  next();
});

// Start server
async function startServer() {
  try {
    await runMigrations();

    app.listen(CONFIG.APP.PORT, '0.0.0.0', () => {
      console.log('🚀 Server started successfully');
      console.log(`📍 Port: ${CONFIG.APP.PORT}`);
      console.log(`🔐 Tilda API Key: 770a56bbd1fdada08l`);
      console.log('✅ Контроллеры инициализированы');
      console.log('   YANDEX_EMAIL exists:', process.env.YANDEX_EMAIL);
      console.log('   YANDEX_EMAIL exists:', process.env.YANDEX_APP_PASSWORD);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

