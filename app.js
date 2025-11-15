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
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return timestamp + random;
}

// ✅ ПРАВИЛЬНАЯ ФУНКЦИЯ ДЛЯ ТОКЕНА (согласно официальной документации)
function generateToken(data) {
  // Копируем данные без Token и Receipt
  const dataForToken = { ...data };
  delete dataForToken.Token;
  delete dataForToken.Receipt;
  
  // СОРТИРОВКА ПО АЛФАВИТНОМУ ПОРЯДКУ КЛЮЧЕЙ
  const sortedKeys = Object.keys(dataForToken).sort();
  
  let values = '';
  sortedKeys.forEach(key => {
    const value = dataForToken[key];
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'object') {
        // Для объектов типа DATA - JSON без пробелов
        values += JSON.stringify(value).replace(/\s+/g, '');
      } else {
        values += String(value);
      }
    }
  });
  
  // ДОБАВЛЯЕМ СЕКРЕТНЫЙ КЛЮЧ
  values += CONFIG.SECRET_KEY;
  
  console.log('🔐 Data for token:', values);
  
  return crypto.createHash('sha256')
    .update(values)
    .digest('hex');
}

// ✅ ПРОСТАЯ ГЕНЕРАЦИЯ ТОКЕНА (альтернативный метод)
function generateTokenSimple(data) {
  // Только обязательные поля в правильном порядке
  const tokenData = {
    Amount: data.Amount,
    OrderId: data.OrderId,
    Password: CONFIG.SECRET_KEY
  };
  
  const values = Object.values(tokenData).join('');
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

    console.log('📋 Generated OrderId:', orderId);

    // ✅ МИНИМАЛЬНЫЙ НАБОР ДАННЫХ ДЛЯ ТЕСТА
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: ProductName,
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html'
    };

    // ✅ ДОБАВЛЯЕМ DATA ЕСЛИ ЕСТЬ
    if (Email || Phone) {
      paymentData.DATA = {};
      if (Email) paymentData.DATA.Email = Email;
      if (Phone) paymentData.DATA.Phone = Phone;
    }

    // ✅ ГЕНЕРИРУЕМ ТОКЕН ПРАВИЛЬНЫМ МЕТОДОМ
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Sending to Tinkoff:', JSON.stringify(paymentData, null, 2));

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Tinkoff response:', response.data);

    if (response.data.Success) {
      res.json({
        Success: true,
        ErrorCode: '0',
        PaymentId: String(response.data.PaymentId),
        OrderId: orderId,
        Amount: amount,
        PaymentURL: response.data.PaymentURL
      });
    } else {
      throw new Error(response.data.Message || JSON.stringify(response.data));
    }

  } catch (error) {
    console.error('❌ Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    res.json({
      Success: false,
      ErrorCode: 'INIT_ERROR',
      Message: error.response?.data?.Message || error.message,
      Details: error.response?.data
    });
  }
});

// ✅ ENDPOINT С ПРОСТОЙ ГЕНЕРАЦИЕЙ ТОКЕНА
app.post('/init-simple', async (req, res) => {
  try {
    const { 
      Email,
      Phone,
      ProductName = 'Вступительный взнос',
      Price = 1000
    } = req.body;

    const orderId = generateOrderId();
    const amount = Price;

    // ✅ МИНИМАЛЬНЫЕ ДАННЫЕ
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: ProductName,
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html'
    };

    // ✅ ПРОСТАЯ ГЕНЕРАЦИЯ ТОКЕНА
    paymentData.Token = generateTokenSimple(paymentData);

    console.log('📤 Simple request:', paymentData);

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData);

    res.json({
      Success: response.data.Success,
      PaymentURL: response.data.PaymentURL,
      Request: paymentData,
      Response: response.data
    });

  } catch (error) {
    res.json({
      Success: false,
      Error: error.message,
      Response: error.response?.data
    });
  }
});

// ✅ ENDPOINT ДЛЯ ПРОВЕРКИ КЛЮЧЕЙ И ТОКЕНА
app.get('/check-keys', (req, res) => {
  const testData = {
    TerminalKey: CONFIG.TERMINAL_KEY,
    Amount: 1000,
    OrderId: '123456789',
    Description: 'Test'
  };

  const token1 = generateToken(testData);
  const token2 = generateTokenSimple(testData);

  res.json({
    keys: {
      terminalKey: CONFIG.TERMINAL_KEY,
      secretKey: '***' + CONFIG.SECRET_KEY.slice(-4)
    },
    tokens: {
      method1: token1,
      method2: token2,
      testData: testData
    }
  });
});

// ✅ ENDPOINT ДЛЯ ТЕСТИРОВАНИЯ ФОРМАТА
app.post('/test-format', async (req, res) => {
  try {
    // Данные как в документации Tinkoff
    const testData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: 1000,
      OrderId: generateOrderId(),
      Description: "Тестовый платеж"
    };

    // Генерируем токен
    testData.Token = generateToken(testData);

    console.log('🧪 Test request:', testData);

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
      response: error.response?.data
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Server running on port 3000');
});