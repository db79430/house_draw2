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

// ✅ ПРАВИЛЬНАЯ ФУНКЦИЯ ДЛЯ ТОКЕНА (включая Receipt и DATA)
function generateToken(data) {
  // Создаем копию объекта
  const dataForToken = { ...data };
  
  // Удаляем Token если есть
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

// ✅ ИСПРАВЛЕННЫЙ ENDPOINT С RECEIPT
app.post('/init-payment', async (req, res) => {
  try {
    console.log('📥 Received request:', req.body);
    
    const { 
      amount = 1000, 
      customerEmail = 'test@example.com',
      customerPhone = '+79999999999',
      description = 'Вступительный взнос в клуб'
    } = req.body;

    // Генерируем уникальный OrderId
    const orderId = `order_${Date.now()}`;
    
    // ✅ ПОЛНЫЙ НАБОР ДАННЫХ КАК В ПРИМЕРЕ
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: parseInt(amount),
      OrderId: orderId,
      Description: description,
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html',
      NotificationURL: 'https://housedraw2-production.up.railway.app/payment-callback',
      DATA: {
        Phone: customerPhone,
        Email: customerEmail
      },
      Receipt: createReceipt(parseInt(amount), customerEmail, customerPhone)
    };

    // ✅ ГЕНЕРИРУЕМ ТОКЕН ПОСЛЕ ДОБАВЛЕНИЯ ВСЕХ ДАННЫХ
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

// ✅ ТЕСТОВЫЙ ENDPOINT С ТОЧНЫМИ ПАРАМЕТРАМИ КАК В ПРИМЕРЕ
app.post('/test-exact', async (req, res) => {
  try {
    const testData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: 140000, // 1400 рублей как в примере
      OrderId: "21090",
      Description: "Подарочная карта на 1000 рублей",
      DATA: {
        Phone: "+71234567890",
        Email: "a@test.com"
      },
      Receipt: {
        Email: "a@test.com",
        Phone: "+71234567890",
        Taxation: "osn",
        Items: [
          {
            Name: "Подарочная карта на 1000 рублей",
            Price: 140000,
            Quantity: 1,
            Amount: 140000,
            PaymentMethod: "full_payment",
            PaymentObject: "commodity",
            Tax: "none"
          }
        ]
      }
    };

    // Генерируем токен
    testData.Token = generateToken(testData);

    console.log('🧪 Exact test request:', JSON.stringify(testData, null, 2));

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

// ✅ ВАЛИДАЦИЯ ТОКЕНА С RECEIPT
app.post('/validate-with-receipt', (req, res) => {
  const testData = {
    TerminalKey: CONFIG.TERMINAL_KEY,
    Amount: 140000,
    OrderId: "21090",
    Description: "Подарочная карта на 1000 рублей",
    DATA: {
      Phone: "+71234567890",
      Email: "a@test.com"
    },
    Receipt: {
      Email: "a@test.com",
      Phone: "+71234567890",
      Taxation: "osn",
      Items: [
        {
          Name: "Подарочная карта на 1000 рублей",
          Price: 140000,
          Quantity: 1,
          Amount: 140000,
          PaymentMethod: "full_payment",
          PaymentObject: "commodity",
          Tax: "none"
        }
      ]
    }
  };

  const token = generateToken(testData);

  res.json({
    testData: testData,
    generatedToken: token,
    expectedToken: "68711168852240a2f34b6a8b19d2cfbd296c7d2a6dff8b23eda6278985959346"
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    terminalKey: CONFIG.TERMINAL_KEY,
    timestamp: new Date().toISOString()
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
});