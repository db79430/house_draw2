const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const CONFIG = {
  TERMINAL_KEY: '1761129018508DEMO',
  SECRET_KEY: 'jDkIojG12VaVNopw',
  BASE_URL: 'https://securepay.tinkoff.ru/v2/'
};

console.log('🔧 Server started with TerminalKey:', CONFIG.TERMINAL_KEY);

// ✅ ГЕНЕРАЦИЯ OrderId ТОЛЬКО ИЗ ЦИФР
function generateOrderId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

// ✅ ПРАВИЛЬНАЯ ГЕНЕРАЦИЯ ТОКЕНА согласно документации Tinkoff
function generateToken(paymentData) {
  // Создаем объект для подписи (без Token)
  const dataForToken = { ...paymentData };
  delete dataForToken.Token;
  
  // СОРТИРУЕМ КЛЮЧИ в алфавитном порядке
  const sortedKeys = Object.keys(dataForToken).sort();
  
  let values = '';
  
  sortedKeys.forEach(key => {
    const value = dataForToken[key];
    
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'object') {
        // Для объектов (DATA) - JSON без пробелов
        values += JSON.stringify(value, Object.keys(value).sort()).replace(/\s+/g, '');
      } else {
        values += String(value);
      }
    }
  });
  
  // ДОБАВЛЯЕМ ПАРОЛЬ (SecretKey) в конец
  values += CONFIG.SECRET_KEY;
  
  console.log('🔐 Data for token generation:', values);
  
  const token = crypto.createHash('sha256')
    .update(values)
    .digest('hex');
  
  console.log('🔐 Generated token:', token);
  return token;
}

// ✅ ПРОСТОЙ МЕТОД ГЕНЕРАЦИИ ТОКЕНА (для теста)
function generateTokenSimple(amount, orderId) {
  const values = amount + orderId + CONFIG.SECRET_KEY;
  console.log('🔐 Simple token data:', values);
  return crypto.createHash('sha256')
    .update(values)
    .digest('hex');
}

// ✅ ENDPOINT С ПРАВИЛЬНОЙ ГЕНЕРАЦИЕЙ ТОКЕНА
app.post('/init-payment', async (req, res) => {
  try {
    console.log('📥 Received request:', req.body);
    
    const { 
      Email,
      Phone,
      ProductName = 'Вступительный взнос',
      Price = 1000
    } = req.body;

    const orderId = generateOrderId();
    const amount = Price;

    console.log('📋 OrderId:', orderId, 'Amount:', amount);

    // ✅ ФОРМИРУЕМ ДАННЫЕ ДЛЯ ЗАПРОСА
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: ProductName.substring(0, 250), // Ограничение длины
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html'
    };

    // ✅ ДОБАВЛЯЕМ DATA ЕСЛИ ЕСТЬ
    if (Email || Phone) {
      paymentData.DATA = {};
      if (Email) paymentData.DATA.Email = Email;
      if (Phone) paymentData.DATA.Phone = Phone;
    }

    // ✅ ГЕНЕРИРУЕМ ТОКЕН
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Final request to Tinkoff:', JSON.stringify(paymentData, null, 2));

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Tinkoff response:', response.data);

    if (response.data.Success) {
      res.json({
        Success: true,
        PaymentId: response.data.PaymentId,
        OrderId: orderId,
        Amount: amount,
        PaymentURL: response.data.PaymentURL
      });
    } else {
      res.json({
        Success: false,
        ErrorCode: response.data.ErrorCode,
        Message: response.data.Message,
        Details: response.data.Details
      });
    }

  } catch (error) {
    console.error('❌ Server error:', error.message);
    
    res.json({
      Success: false,
      ErrorCode: 'SERVER_ERROR',
      Message: error.message,
      Details: error.response?.data
    });
  }
});

// ✅ ENDPOINT С МИНИМАЛЬНЫМИ ДАННЫМИ
app.post('/init-minimal', async (req, res) => {
  try {
    const orderId = generateOrderId();
    const amount = 1000;

    // ✅ МИНИМАЛЬНЫЙ НАБОР ДАННЫХ
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: 'Test payment'
    };

    // ✅ ПРОСТАЯ ГЕНЕРАЦИЯ ТОКЕНА
    paymentData.Token = generateTokenSimple(amount, orderId);

    console.log('📤 Minimal request:', paymentData);

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData);

    res.json({
      request: paymentData,
      response: response.data
    });

  } catch (error) {
    res.json({
      error: error.message,
      response: error.response?.data
    });
  }
});

// ✅ ENDPOINT ДЛЯ ТЕСТИРОВАНИЯ ТОКЕНА
app.post('/test-token', (req, res) => {
  const testData = {
    TerminalKey: CONFIG.TERMINAL_KEY,
    Amount: 1000,
    OrderId: '123456789',
    Description: 'Test Payment'
  };

  // Тестируем оба метода генерации токена
  const token1 = generateToken(testData);
  const token2 = generateTokenSimple(testData.Amount, testData.OrderId);

  res.json({
    testData: testData,
    secretKey: '***' + CONFIG.SECRET_KEY.slice(-4),
    tokens: {
      fullMethod: token1,
      simpleMethod: token2
    },
    tokenGeneration: {
      fullMethod: 'All fields sorted alphabetically + SecretKey',
      simpleMethod: 'Amount + OrderId + SecretKey'
    }
  });
});

// ✅ ENDPOINT ДЛЯ ПРОВЕРКИ КЛЮЧЕЙ
app.get('/check-keys', (req, res) => {
  res.json({
    terminalKey: CONFIG.TERMINAL_KEY,
    secretKeyLength: CONFIG.SECRET_KEY.length,
    baseUrl: CONFIG.BASE_URL
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Server running on port 3000');
  console.log('🔑 TerminalKey:', CONFIG.TERMINAL_KEY);
  console.log('🔑 SecretKey length:', CONFIG.SECRET_KEY.length);
});