const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();

app.use(cors({
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ✅ ОБРАБОТКА OPTIONS ЗАПРОСОВ ВРУЧНУЮ
// app.options('*', (req, res) => {
//   res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
//   res.header('Access-Control-Allow-Credentials', 'true');
//   res.status(200).end();
// });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const CONFIG = {
    TERMINAL_KEY: '1761129018508DEMO', // Явно указываем значения
    SECRET_KEY: 'jDkIojG12VaVNopw', 
    BASE_URL: 'https://rest-api-test.tinkoff.ru/v2/'
  };

// Конфигурация
// const CONFIG = {
//   TERMINAL_KEY: process.env.TERMINAL_KEY,
//   SECRET_KEY: process.env.SECRET_KEY,
//   BASE_URL: process.env.BASE_URL || 'https://rest-api-test.tinkoff.ru/v2/'
// };

console.log('🔧 Конфигурация:', {
  terminalKey: CONFIG.TERMINAL_KEY,
  baseUrl: CONFIG.BASE_URL
});

// Функция для создания токена
function generateToken(data) {
  const values = Object.keys(data)
    .filter(key => key !== 'Token' && key !== 'Receipt' && key !== 'DATA')
    .sort()
    .map(key => {
      if (typeof data[key] === 'object') {
        return JSON.stringify(data[key]);
      }
      return String(data[key] || '');
    })
    .join('');

  return crypto.createHash('sha256')
    .update(values + CONFIG.SECRET_KEY)
    .digest('hex');
}

// ✅ Инициализация платежа с явными CORS headers
app.post('/init-payment', async (req, res) => {
  // ✅ ЯВНО УСТАНАВЛИВАЕМ CORS HEADERS
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  try {
    console.log('📥 Получен запрос от:', req.headers.origin);
    
    const { 
      Price = '10',
      Email,
      FormName = 'Вступительный взнос',
      Phone = '',
      Name = ''
    } = req.body;

    console.log('📦 Данные:', { Price, Email });

    if (!Email) {
      return res.status(400).json({
        success: false,
        error: 'Email обязателен для оплаты'
      });
    }

    const orderId = `T${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const amount = Math.round(parseFloat(Price) * 100);

    // Данные для Tinkoff API
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: FormName,
      SuccessURL: 'https://npk-vdv.ru/success',
      FailURL: 'https://npk-vdv.ru/fail',
      NotificationURL: `https://housedraw2-production.up.railway.app/payment-callback`
    };

    // Добавляем дополнительные данные
    paymentData.DATA = {
      Email: Email,
      Phone: Phone,
      Name: Name
    };

    // Генерируем токен
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Отправка в Tinkoff...');

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Ответ Tinkoff:', response.data.Success);

    if (response.data.Success) {
      res.json({
        success: true,
        PaymentURL: response.data.PaymentURL,
        paymentURL: response.data.PaymentURL,
        paymentId: response.data.PaymentId,
        orderId: orderId
      });
    } else {
      throw new Error(response.data.Message || 'Ошибка Tinkoff API');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    
    res.json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

// ✅ Тестовый endpoint для проверки CORS
app.get('/test-cors', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  res.json({
    success: true,
    message: 'CORS работает! 🎉',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    server: 'Railway'
  });
});

// ✅ Простой тестовый POST
app.post('/test-simple', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  res.json({
    success: true,
    message: 'POST запрос работает!',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Callback от Tinkoff
app.post('/payment-callback', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  console.log('🔔 Callback от Tinkoff');
  res.json({ Success: true });
});

// Статус сервера
app.get('/status', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({ 
    status: 'OK ✅',
    server: 'Tinkoff Payment Server on Railway',
    timestamp: new Date().toISOString(),
    cors: 'Enabled',
    domain: 'housedraw2-production.up.railway.app'
  });
});

// Корневой маршрут
app.get('/', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({ 
    message: '🚀 Tinkoff Payment Server is running!',
    endpoints: {
      'GET /status': 'Статус сервера',
      'GET /test-cors': 'Тест CORS',
      'POST /test-simple': 'Простой POST тест',
      'POST /init-payment': 'Инициализация платежа'
    },
    test: 'Откройте консоль и выполните: fetch("https://housedraw2-production.up.railway.app/test-cors")'
  });
});

// ✅ ПРАВИЛЬНАЯ ОБРАБОТКА 404 (без звездочки)
app.use((req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /status', 
      'GET /test-cors',
      'POST /test-simple',
      'POST /init-payment',
      'POST /payment-callback'
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Домен: housedraw2-production.up.railway.app`);
  console.log(`🔧 TerminalKey: ${CONFIG.TERMINAL_KEY}`);
});