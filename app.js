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
  // 1. Создаем массив объектов ключ:значение для ВСЕХ полей (кроме Token)
  const tokenArray = [];
  
  // Добавляем все поля из paymentData
  Object.keys(paymentData).forEach(key => {
    if (key !== 'Token' && paymentData[key] !== undefined && paymentData[key] !== null) {
      if (typeof paymentData[key] === 'object') {
        // Для объектов (DATA) - преобразуем в JSON строку
        tokenArray.push({ [key]: JSON.stringify(paymentData[key]) });
      } else {
        tokenArray.push({ [key]: paymentData[key].toString() });
      }
    }
  });

  // 2. Добавляем пароль в массив
  tokenArray.push({ Password: CONFIG.SECRET_KEY });

  // 3. Сортируем массив по ключу в алфавитном порядке
  tokenArray.sort((a, b) => {
    const keyA = Object.keys(a)[0];
    const keyB = Object.keys(b)[0];
    return keyA.localeCompare(keyB);
  });

  // 4. Конкатенируем значения в одну строку
  let values = '';
  tokenArray.forEach(item => {
    const key = Object.keys(item)[0];
    const value = item[key];
    values += value;
  });

  console.log('🔐 Token array:', JSON.stringify(tokenArray.map(item => {
    const key = Object.keys(item)[0];
    const value = item[key];
    return { [key]: key === 'Password' ? '***' + value.slice(-4) : value };
  }), null, 2));
  console.log('🔐 Concatenated values:', values.replace(CONFIG.SECRET_KEY, '***' + CONFIG.SECRET_KEY.slice(-4)));

  // 5. Применяем SHA-256
  const token = crypto.createHash('sha256')
    .update(values)
    .digest('hex');

  console.log('🔐 Generated token:', token);
  return token;
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
      Description: ProductName.substring(0, 250),
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html'
    };

    // ✅ ДОБАВЛЯЕМ DATA ЕСЛИ ЕСТЬ
    if (Email || Phone) {
      paymentData.DATA = {};
      if (Email) paymentData.DATA.Email = Email;
      if (Phone) paymentData.DATA.Phone = Phone;
    }

    // ✅ ГЕНЕРИРУЕМ ТОКЕН ПРАВИЛЬНЫМ МЕТОДОМ (ВКЛЮЧАЯ ВСЕ ПОЛЯ)
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

// ✅ ENDPOINT С МИНИМАЛЬНЫМИ ДАННЫМИ (только обязательные поля)
app.post('/init-minimal', async (req, res) => {
  try {
    const orderId = generateOrderId();
    const amount = 1000;

    // ✅ МИНИМАЛЬНЫЙ НАБОР ОБЯЗАТЕЛЬНЫХ ПОЛЕЙ
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: 'Test payment'
    };

    // ✅ ГЕНЕРИРУЕМ ТОКЕН
    paymentData.Token = generateToken(paymentData);

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
  // Тестовые данные с разными типами полей
  const testData = {
    TerminalKey: CONFIG.TERMINAL_KEY,
    Amount: 1000,
    OrderId: '123456789',
    Description: 'Test Payment',
    SuccessURL: 'https://example.com/success',
    FailURL: 'https://example.com/fail',
    DATA: {
      Email: 'test@test.com',
      Phone: '+79999999999'
    }
  };

  const token = generateToken(testData);

  res.json({
    testData: testData,
    generatedToken: token,
    note: 'Токен сгенерирован из ВСЕХ полей (кроме Token) + Password'
  });
});

// ✅ ENDPOINT ДЛЯ ПРОВЕРКИ КЛЮЧЕЙ
app.get('/check-keys', (req, res) => {
  res.json({
    terminalKey: CONFIG.TERMINAL_KEY,
    secretKey: '***' + CONFIG.SECRET_KEY.slice(-4),
    baseUrl: CONFIG.BASE_URL,
    status: 'active'
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Server running on port 3000');
  console.log('🔑 TerminalKey:', CONFIG.TERMINAL_KEY);
});