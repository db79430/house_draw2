const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const app = express();

app.use(cors());
app.use(express.json());

// Конфигурация
const CONFIG = {
  TERMINAL_KEY: '1761129018508DEMO',
  SECRET_KEY: 'jDkIojG12VaVNopw',
  BASE_URL: 'https://securepay.tinkoff.ru/v2/'
};

console.log('🔧 Server started with TerminalKey:', CONFIG.TERMINAL_KEY);

// ✅ ПРАВИЛЬНАЯ ФУНКЦИЯ ДЛЯ ТОКЕНА (согласно документации Tinkoff)
function generateToken(data) {
  // Сортируем ключи в алфавитном порядке
  const sortedKeys = Object.keys(data).sort();
  
  // Создаем строку для хеширования
  const values = sortedKeys
    .map(key => {
      const value = data[key];
      // Для объектов преобразуем в JSON строку
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return String(value || '');
    })
    .join('');
  
  console.log('🔐 Data for token:', values);
  console.log('🔐 Secret key:', CONFIG.SECRET_KEY);
  
  const token = crypto.createHash('sha256')
    .update(values + CONFIG.SECRET_KEY)
    .digest('hex');
  
  console.log('🔐 Generated token:', token);
  return token;
}

// ✅ ИСПРАВЛЕННЫЙ ENDPOINT ДЛЯ ИНИЦИАЛИЗАЦИИ ПЛАТЕЖА
app.post('/init-payment', async (req, res) => {
  try {
    console.log('📥 Received request:', req.body);
    
    const { 
      amount = 1000, 
      customerEmail = 'test@example.com',
      customerPhone = '+79999999999',
      description = 'Тестовый платеж'
    } = req.body;

    // Генерируем уникальный OrderId
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // ✅ ПРАВИЛЬНЫЙ ФОРМАТ ДАННЫХ
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: parseInt(amount), // Убеждаемся, что это число
      OrderId: orderId,
      Description: description.substring(0, 250), // Ограничение длины
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html',
      NotificationURL: 'https://housedraw2-production.up.railway.app/payment-callback'
    };

    // ✅ ДОБАВЛЯЕМ DATA КАК СТРОКУ (не объект!)
    paymentData.DATA = JSON.stringify({
      Email: customerEmail,
      Phone: customerPhone
    });

    // ✅ ГЕНЕРИРУЕМ ТОКЕН ПЕРЕД ОТПРАВКОЙ
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Sending to Tinkoff:', JSON.stringify(paymentData, null, 2));

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('📥 Tinkoff response:', response.data);

    if (response.data.Success) {
      res.json({
        success: true,
        paymentId: response.data.PaymentId,
        paymentURL: response.data.PaymentURL,
        orderId: orderId
      });
    } else {
      throw new Error(response.data.Message || `Error: ${response.data.ErrorCode}`);
    }

  } catch (error) {
    console.error('❌ Init payment error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    res.status(500).json({
      success: false,
      error: error.response?.data?.Message || error.message,
      details: error.response?.data
    });
  }
});

// ✅ ТЕСТОВЫЙ ENDPOINT ДЛЯ ПРОВЕРКИ
app.post('/test-payment', async (req, res) => {
  try {
    const testData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: 1000,
      OrderId: `test_${Date.now()}`,
      Description: 'Тестовый платеж',
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html',
      DATA: JSON.stringify({
        Email: 'test@test.com',
        Phone: '+79999999999'
      })
    };

    testData.Token = generateToken(testData);

    console.log('🧪 Test request to Tinkoff:', testData);

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, testData);

    res.json({
      success: response.data.Success,
      request: testData,
      response: response.data
    });

  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      request: error.config?.data,
      response: error.response?.data
    });
  }
});

// ✅ ENDPOINT ДЛЯ ПРОВЕРКИ КОНФИГУРАЦИИ
app.get('/check-config', (req, res) => {
  const testData = {
    TerminalKey: CONFIG.TERMINAL_KEY,
    Amount: 1000,
    OrderId: 'test123',
    Description: 'Test'
  };

  const token = generateToken(testData);

  res.json({
    terminalKey: CONFIG.TERMINAL_KEY,
    baseUrl: CONFIG.BASE_URL,
    testToken: token,
    testData: testData
  });
});

// Обработка уведомлений от Tinkoff
app.post('/payment-callback', express.json(), (req, res) => {
  console.log('📨 Payment callback received:', req.body);
  res.json({ Success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});