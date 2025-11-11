const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();

// CORS настройки
app.use(cors({
  origin: '*', // Разрешаем все домены для тестов
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Конфигурация с значениями по умолчанию
const CONFIG = {
  TERMINAL_KEY: process.env.TERMINAL_KEY,
  SECRET_KEY: process.env.SECRET_KEY,
  BASE_URL: process.env.BASE_URL 
};

console.log('🔧 Конфигурация:', {
  terminalKey: CONFIG.TERMINAL_KEY,
  baseUrl: CONFIG.BASE_URL
});

// Функция для создания токена
function generateToken(data) {
  try {
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
  } catch (error) {
    console.error('❌ Ошибка генерации токена:', error);
    throw error;
  }
}

// Инициализация платежа
app.post('/init-payment', async (req, res) => {
  console.log('📥 POST /init-payment вызван');
  
  try {
    const { 
      OrderId,
      Price = '1000',
      Email,
      FormName = 'Вступительный взнос',
      FormId,
      ProjectId,
      Phone,
      Name
    } = req.body;

    console.log('📦 Получены данные:', { Price, Email });

    // Валидация
    if (!Email) {
      return res.status(400).json({
        success: false,
        error: 'Email обязателен для оплаты'
      });
    }

    const orderId = OrderId || `T${Date.now()}`;
    const amount = Math.round(parseFloat(Price) * 100);

    console.log(`💰 Сумма: ${amount} копеек`);

    // Данные для Tinkoff API
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: FormName,
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html',
      NotificationURL: `https://${req.get('host')}/payment-callback`
    };

    // Добавляем дополнительные данные
    paymentData.DATA = {
      Email: Email,
      Phone: Phone || '',
      Name: Name || '',
      FormId: FormId || '',
      ProjectId: ProjectId || ''
    };

    // Генерируем токен
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Отправка в Tinkoff API...');

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Ответ от Tinkoff:', {
      Success: response.data.Success,
      Error: response.data.Error,
      Message: response.data.Message
    });

    if (response.data.Success) {
      res.json({
        success: true,
        PaymentURL: response.data.PaymentURL,
        paymentURL: response.data.PaymentURL,
        paymentId: response.data.PaymentId,
        orderId: orderId
      });
    } else {
      throw new Error(response.data.Message || response.data.Details || 'Ошибка Tinkoff API');
    }

  } catch (error) {
    console.error('❌ Ошибка в /init-payment:', error.message);
    
    // Подробное логирование ошибки
    if (error.response) {
      console.error('📡 Ответ Tinkoff:', error.response.data);
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'Нет дополнительной информации'
    });
  }
});

// Простой тестовый endpoint
app.post('/test-payment', async (req, res) => {
  try {
    console.log('🧪 Тестовый запрос платежа');
    
    const testData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: 100000, // 1000 рублей
      OrderId: 'TEST' + Date.now(),
      Description: 'Тестовый платеж',
      SuccessURL: 'https://npk-vdv.ru/success',
      FailURL: 'https://npk-vdv.ru/fail'
    };

    testData.Token = generateToken(testData);

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, testData, {
      timeout: 10000
    });

    res.json({
      success: true,
      test: 'Платежная система работает',
      tinkoffResponse: response.data
    });

  } catch (error) {
    console.error('❌ Тестовый платеж не удался:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      tinkoffError: error.response?.data
    });
  }
});

// Callback от Tinkoff
app.post('/payment-callback', (req, res) => {
  console.log('🔔 Callback от Tinkoff:', req.body);
  res.json({ Success: true });
});

// Статус сервера
app.get('/status', (req, res) => {
  res.json({ 
    status: 'OK',
    server: 'Tinkoff Payment Server',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    config: {
      terminalKey: CONFIG.TERMINAL_KEY ? 'SET' : 'MISSING',
      baseUrl: CONFIG.BASE_URL
    }
  });
});

// Корневой маршрут
app.get('/', (req, res) => {
  res.json({ 
    message: 'Tinkoff Payment Server is running! 🚀',
    endpoints: {
      'POST /init-payment': 'Инициализация платежа',
      'POST /test-payment': 'Тестовый платеж',
      'POST /payment-callback': 'Callback от Tinkoff',
      'GET /status': 'Статус сервера'
    },
    usage: 'Отправьте POST на /init-payment с {Price: "1000", Email: "test@test.com"}'
  });
});

// Обработка 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: ['GET /', 'GET /status', 'POST /init-payment', 'POST /test-payment']
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🔧 TerminalKey: ${CONFIG.TERMINAL_KEY}`);
  console.log(`🌐 Base URL: ${CONFIG.BASE_URL}`);
});