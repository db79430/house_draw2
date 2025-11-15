const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const app = express();

app.use(cors());
app.use(express.json());

// Конфигурация
const CONFIG = {
  TERMINAL_KEY: '1761129018508DEMO', // 20 символов
  SECRET_KEY: 'jDkIojG12VaVNopw',
  BASE_URL: 'https://securepay.tinkoff.ru/v2/Init'
};

console.log('🔧 Server started with TerminalKey:', CONFIG.TERMINAL_KEY);

// ✅ ПРАВИЛЬНАЯ ФУНКЦИЯ ДЛЯ ТОКЕНА
function generateToken(data) {
  // Создаем копию объекта без Token
  const dataForToken = { ...data };
  delete dataForToken.Token;
  
  // Сортируем ключи в алфавитном порядке
  const sortedKeys = Object.keys(dataForToken).sort();
  
  // Создаем строку для хеширования
  const values = sortedKeys
    .map(key => {
      const value = dataForToken[key];
      
      // Для объектов преобразуем в JSON строку
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      
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

// ✅ ФУНКЦИЯ ДЛЯ СОЗДАНИЯ ЧЕКА (Receipt)
function createReceipt(amount, email, phone) {
  return {
    Email: email,
    Phone: phone,
    Taxation: 'osn', // Основная система налогообложения
    Items: [
      {
        Name: 'Вступительный взнос в клуб',
        Price: amount, // Цена в копейках
        Quantity: 1,
        Amount: amount, // Сумма в копейках
        PaymentMethod: 'full_payment',
        PaymentObject: 'service',
        Tax: 'none' // Без НДС
      }
    ]
  };
}

// ✅ ИСПРАВЛЕННЫЙ ENDPOINT С ПРАВИЛЬНЫМИ ПАРАМЕТРАМИ
app.post('/init-payment', async (req, res) => {
  try {
    console.log('📥 Received request:', req.body);
    
    // ✅ ПРАВИЛЬНЫЕ ПАРАМЕТРЫ СОГЛАСНО ДОКУМЕНТАЦИИ
    const { 
      Amount = 1000, // Number, <= 10 characters, сумма в копейках
      CustomerEmail = 'test@example.com',
      CustomerPhone = '+79999999999',
      Description = 'Вступительный взнос в клуб'
    } = req.body;

    // ✅ OrderId: String, <= 36 characters, уникальный
    const OrderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`.substring(0, 36);

    // ✅ TerminalKey: String, <= 20 characters
    const TerminalKey = CONFIG.TERMINAL_KEY;

    // ✅ ПОЛНЫЙ НАБОР ОБЯЗАТЕЛЬНЫХ ПАРАМЕТРОВ
    const paymentData = {
      TerminalKey: TerminalKey,        // Required, String, <= 20 chars
      Amount: parseInt(Amount),        // Required, Number, <= 10 chars (копейки)
      OrderId: OrderId,                // Required, String, <= 36 chars
      Description: Description.substring(0, 250), // Описание
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html',
      NotificationURL: 'https://housedraw2-production.up.railway.app/payment-callback',
      DATA: {
        Phone: CustomerPhone,
        Email: CustomerEmail
      },
      Receipt: createReceipt(parseInt(Amount), CustomerEmail, CustomerPhone)
    };

    // ✅ Token: String, подпись запроса (Required)
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Final payment data:', {
      TerminalKey: paymentData.TerminalKey,
      Amount: paymentData.Amount,
      OrderId: paymentData.OrderId,
      Description: paymentData.Description,
      Token: paymentData.Token
    });

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('📥 Tinkoff response:', response.data);

    if (response.data.Success) {
      res.json({
        Success: true,
        ErrorCode: '0',
        TerminalKey: TerminalKey,
        Status: response.data.Status,
        PaymentId: String(response.data.PaymentId),
        OrderId: OrderId,
        Amount: Amount,
        PaymentURL: response.data.PaymentURL
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
      Success: false,
      ErrorCode: 'INIT_ERROR',
      Message: error.response?.data?.Message || error.message,
      Details: error.response?.data
    });
  }
});

// ✅ ТЕСТОВЫЙ ENDPOINT С МИНИМАЛЬНЫМИ ОБЯЗАТЕЛЬНЫМИ ПОЛЯМИ
app.post('/test-minimal', async (req, res) => {
  try {
    // Минимальные обязательные поля
    const minimalData = {
      TerminalKey: CONFIG.TERMINAL_KEY,      // Required
      Amount: 1000,                          // Required (10 рублей)
      OrderId: `min_${Date.now()}`,          // Required
      Description: 'Минимальный тестовый платеж'
    };

    // Генерируем токен
    minimalData.Token = generateToken(minimalData);

    console.log('🧪 Minimal test request:', minimalData);

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, minimalData);

    res.json({
      Success: response.data.Success,
      Request: minimalData,
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

// ✅ ВАЛИДАЦИЯ ПАРАМЕТРОВ
app.post('/validate-params', (req, res) => {
  const testData = {
    TerminalKey: CONFIG.TERMINAL_KEY,
    Amount: 1000,
    OrderId: 'test_order_123456',
    Description: 'Тест валидации параметров'
  };

  const token = generateToken(testData);

  // Проверяем ограничения
  const validation = {
    terminalKey: {
      value: testData.TerminalKey,
      length: testData.TerminalKey.length,
      valid: testData.TerminalKey.length <= 20
    },
    amount: {
      value: testData.Amount,
      length: testData.Amount.toString().length,
      valid: testData.Amount.toString().length <= 10
    },
    orderId: {
      value: testData.OrderId,
      length: testData.OrderId.length,
      valid: testData.OrderId.length <= 36
    },
    token: {
      value: token,
      length: token.length
    }
  };

  res.json({
    validation: validation,
    testData: testData
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    Status: 'OK', 
    TerminalKey: CONFIG.TERMINAL_KEY,
    Timestamp: new Date().toISOString()
  });
});

// Обработка уведомлений
app.post('/payment-callback', express.json(), (req, res) => {
  console.log('📨 Payment callback:', req.body);
  res.json({ Success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔧 TerminalKey: ${CONFIG.TERMINAL_KEY} (${CONFIG.TERMINAL_KEY.length} chars)`);
});