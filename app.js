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

// ✅ ПРАВИЛЬНАЯ ФУНКЦИЯ ДЛЯ ТОКЕНА (исправленная)
function generateToken(data) {
  // Создаем копию объекта без Token
  const dataForToken = { ...data };
  delete dataForToken.Token;
  delete dataForToken.Receipt;
  delete dataForToken.DATA;
  
  // Сортируем ключи в алфавитном порядке
  const sortedKeys = Object.keys(dataForToken).sort();
  
  // Создаем строку для хеширования
  const values = sortedKeys
    .map(key => {
      const value = dataForToken[key];
      return String(value || '');
    })
    .join('');
  
  console.log('🔐 Data for token:', values);
  
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

    // Генерируем уникальный OrderId (максимум 36 символов)
    const orderId = `order_${Date.now()}`.substring(0, 36);
    
    // ✅ ОСНОВНЫЕ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ (минимальный набор)
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: parseInt(amount), // Сумма в копейках
      OrderId: orderId,
      Description: description.substring(0, 250),
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html',
      NotificationURL: 'https://housedraw2-production.up.railway.app/payment-callback'
    };

    // ✅ ДОБАВЛЯЕМ ДОПОЛНИТЕЛЬНЫЕ ДАННЫЕ (если нужно)
    if (customerEmail || customerPhone) {
      paymentData.DATA = JSON.stringify({
        Email: customerEmail,
        Phone: customerPhone
      });
    }

    // ✅ ГЕНЕРИРУЕМ ТОКЕН
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Final payment data:', JSON.stringify(paymentData, null, 2));

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
        orderId: orderId,
        amount: amount
      });
    } else {
      throw new Error(response.data.Message || `Error Code: ${response.data.ErrorCode}`);
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
      details: error.response?.data,
      errorCode: error.response?.data?.ErrorCode
    });
  }
});

// ✅ ПРОСТОЙ ТЕСТОВЫЙ ENDPOINT (минимальные данные)
app.post('/test-simple', async (req, res) => {
  try {
    const orderId = `test_${Date.now()}`;
    
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: 1000, // 10 рублей
      OrderId: orderId,
      Description: 'Тестовый платеж',
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html'
    };

    // Генерируем токен
    paymentData.Token = generateToken(paymentData);

    console.log('🧪 Simple test request:', paymentData);

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData);

    res.json({
      success: response.data.Success,
      request: paymentData,
      response: response.data
    });

  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      response: error.response?.data
    });
  }
});

// ✅ ENDPOINT ДЛЯ ПРОВЕРКИ ПОДКЛЮЧЕНИЯ
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    terminalKey: CONFIG.TERMINAL_KEY,
    timestamp: new Date().toISOString()
  });
});

// ✅ ВАЛИДАЦИЯ ТОКЕНА
app.post('/validate-token', (req, res) => {
  const testData = {
    TerminalKey: CONFIG.TERMINAL_KEY,
    Amount: 1000,
    OrderId: 'test_order_123',
    Description: 'Test Order'
  };

  const token = generateToken(testData);

  res.json({
    testData: testData,
    generatedToken: token,
    secretKeyLength: CONFIG.SECRET_KEY.length
  });
});

// Обработка уведомлений от Tinkoff
app.post('/payment-callback', express.json(), (req, res) => {
  console.log('📨 Payment callback:', req.body);
  res.json({ Success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔧 TerminalKey: ${CONFIG.TERMINAL_KEY}`);
  console.log(`🔧 BaseURL: ${CONFIG.BASE_URL}`);
});