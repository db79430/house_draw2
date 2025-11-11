const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();

// ✅ ПРАВИЛЬНЫЙ CORS MIDDLEWARE
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://npk-vdv.ru',
    'https://your-site.tilda.ws',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*'); // Для тестов
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Headers');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Обрабатываем preflight запросы
  if (req.method === 'OPTIONS') {
    console.log('🛫 Preflight request received');
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Тестовые данные Tinkoff
const CONFIG = {
  TERMINAL_KEY: '1761129018508DEMO',
  SECRET_KEY: 'jDkIojG12VaVNopw', 
  BASE_URL: 'https://rest-api-test.tinkoff.ru/v2/'
};

// Функция для создания токена
function generateToken(data) {
  const values = Object.keys(data)
    .filter(key => key !== 'Token' && key !== 'Receipt' && key !== 'DATA')
    .sort()
    .map(key => {
      if (typeof data[key] === 'object') {
        return JSON.stringify(data[key]);
      }
      return String(data[key]);
    })
    .join('');

  return crypto.createHash('sha256')
    .update(values + CONFIG.SECRET_KEY)
    .digest('hex');
}

// Инициализация платежа
app.post('/init-payment', async (req, res) => {
  // ✅ ДОБАВЛЯЕМ CORS HEADERS ДЛЯ КОНКРЕТНОГО РОУТА
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  try {
    const { 
      OrderId,
      Price,
      Email,
      FormName,
      FormId,
      ProjectId,
      Phone,
      Name
    } = req.body;

    console.log('📥 Получен запрос от:', req.get('origin'));
    console.log('📦 Данные:', req.body);

    const orderId = OrderId || 'T' + Date.now();
    const amount = Math.round(parseFloat(Price || '1000') * 100);

    // Данные для Tinkoff API
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: FormName || 'Вступительный взнос в клуб',
      SuccessURL: 'https://npk-vdv.ru/success',
      FailURL: 'https://npk-vdv.ru/fail',
      NotificationURL: `https://p7402kx7-3000.euw.devtunnels.ms/payment-callback`
    };

    // Добавляем дополнительные данные
    if (Email || Phone || Name) {
      paymentData.DATA = {
        Email: Email || '',
        Phone: Phone || '',
        Name: Name || '',
        FormId: FormId || '',
        ProjectId: ProjectId || ''
      };
    }

    // Генерируем токен
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Отправка в Tinkoff API...');

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Ответ от Tinkoff API:', response.data);

    if (response.data.Success) {
      res.json({
        success: true,
        PaymentURL: response.data.PaymentURL, // Для Tinkoff Integration
        paymentURL: response.data.PaymentURL, // Для обычных запросов
        paymentId: response.data.PaymentId,
        orderId: orderId
      });
    } else {
      throw new Error(response.data.Message || 'Ошибка инициализации платежа');
    }

  } catch (error) {
    console.error('❌ Init payment error:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: error.response?.data?.Message || error.message
    });
  }
});

// Callback от Tinkoff
app.post('/payment-callback', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  console.log('🔔 Callback от Tinkoff:', req.body);
  res.json({ Success: true });
});

// ✅ ТЕСТОВЫЙ ENDPOINT ДЛЯ ПРОВЕРКИ CORS
app.get('/test-cors', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({ 
    message: 'CORS работает!',
    timestamp: new Date().toISOString(),
    origin: req.get('origin'),
    headers: req.headers
  });
});

app.post('/test-cors', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({ 
    message: 'POST CORS работает!',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

// Статус сервера
app.get('/status', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({ 
    status: 'OK',
    server: 'Tinkoff Payment Server',
    terminalKey: CONFIG.TERMINAL_KEY,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🌐 CORS настроен для: https://npk-vdv.ru`);
  console.log(`📞 Тестовые endpoints:`);
  console.log(`   GET  https://p7402kx7-3000.euw.devtunnels.ms/status`);
  console.log(`   GET  https://p7402kx7-3000.euw.devtunnels.ms/test-cors`);
  console.log(`   POST https://p7402kx7-3000.euw.devtunnels.ms/test-cors`);
});