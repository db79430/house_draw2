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

// ✅ ФУНКЦИЯ ДЛЯ ГЕНЕРАЦИИ УНИКАЛЬНОГО OrderId
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `order_${timestamp}_${random}`;
}

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
function createReceipt(amount, email, phone, description) {
  return {
    Email: email,
    Phone: phone,
    Taxation: 'osn', // Основная система налогообложения
    Items: [
      {
        Name: description.substring(0, 128), // Ограничение длины названия
        Price: amount, // Цена в копейках
        Quantity: 1,
        Amount: amount, // Сумма в копейках
        PaymentMethod: 'full_payment',
        PaymentObject: 'service', // услуга
        Tax: 'none' // Без НДС
      }
    ]
  };
}

// ✅ ИСПРАВЛЕННЫЙ ENDPOINT С УНИКАЛЬНЫМИ ДАННЫМИ
app.post('/init-payment', async (req, res) => {
  try {
    console.log('📥 Received request body:', req.body);
    
    // ✅ ПОЛУЧАЕМ ДАННЫЕ ОТ КЛИЕНТА
    const { 
      Amount,           // Сумма в копейках (обязательно)
      CustomerEmail,    // Email клиента (обязательно)
      CustomerPhone,    // Телефон клиента (обязательно)
      Description = 'Вступительный взнос в клуб' // Описание по умолчанию
    } = req.body;

    // ✅ ПРОВЕРКА ОБЯЗАТЕЛЬНЫХ ПОЛЕЙ
    if (!Amount || !CustomerEmail || !CustomerPhone) {
      return res.status(400).json({
        Success: false,
        ErrorCode: 'MISSING_REQUIRED_FIELDS',
        Message: 'Отсутствуют обязательные поля: Amount, CustomerEmail, CustomerPhone'
      });
    }

    // ✅ ГЕНЕРИРУЕМ УНИКАЛЬНЫЕ ДАННЫЕ
    const orderId = generateOrderId(); // Уникальный ID заказа
    const amount = parseInt(Amount);   // Сумма в копейках

    // ✅ ФОРМИРУЕМ ДАННЫЕ ДЛЯ TINKOFF
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,  // Ваш TerminalKey
      Amount: amount,                    // Уникальная сумма от клиента
      OrderId: orderId,                  // Уникальный OrderId
      Description: Description,          // Описание от клиента или по умолчанию
      DATA: {
        Phone: CustomerPhone,            // Телефон от клиента
        Email: CustomerEmail             // Email от клиента
      },
      Receipt: createReceipt(amount, CustomerEmail, CustomerPhone, Description),
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html', // Ваш URL успеха
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html',       // Ваш URL неудачи
      NotificationURL: 'https://housedraw2-production.up.railway.app/payment-callback'
    };

    // ✅ ГЕНЕРИРУЕМ ТОКЕН
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Sending to Tinkoff:');
    console.log('TerminalKey:', paymentData.TerminalKey);
    console.log('Amount:', paymentData.Amount);
    console.log('OrderId:', paymentData.OrderId);
    console.log('Description:', paymentData.Description);
    console.log('Email:', paymentData.DATA.Email);
    console.log('Phone:', paymentData.DATA.Phone);

    // ✅ ОТПРАВЛЯЕМ ЗАПРОС В TINKOFF
    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('📥 Tinkoff API response:', response.data);

    // ✅ ВОЗВРАЩАЕМ ОТВЕТ
    if (response.data.Success) {
      res.json({
        Success: true,
        ErrorCode: '0',
        TerminalKey: paymentData.TerminalKey,
        Status: response.data.Status,
        PaymentId: String(response.data.PaymentId),
        OrderId: paymentData.OrderId,
        Amount: paymentData.Amount,
        PaymentURL: response.data.PaymentURL,
        Description: paymentData.Description
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

// ✅ ТЕСТОВЫЙ ENDPOINT С РЕАЛЬНЫМИ ДАННЫМИ
app.post('/test-real-payment', async (req, res) => {
  try {
    // Генерируем реальные тестовые данные
    const orderId = generateOrderId();
    const amount = 10000; // 100 рублей в копейках
    
    const realData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: "Тестовый платеж за услуги",
      DATA: {
        Phone: "+79991234567",
        Email: "realuser@example.com"
      },
      Receipt: {
        Email: "realuser@example.com",
        Phone: "+79991234567",
        Taxation: "osn",
        Items: [
          {
            Name: "Тестовый платеж за услуги",
            Price: amount,
            Quantity: 1,
            Amount: amount,
            PaymentMethod: "full_payment",
            PaymentObject: "service",
            Tax: "none"
          }
        ]
      },
      SuccessURL: 'https://your-site.tilda.ws/success',
      FailURL: 'https://your-site.tilda.ws/fail'
    };

    // Генерируем токен
    realData.Token = generateToken(realData);

    console.log('🧪 Real test payment request:');
    console.log('OrderId:', realData.OrderId);
    console.log('Amount:', realData.Amount);
    console.log('Description:', realData.Description);

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, realData);

    res.json({
      Success: response.data.Success,
      OrderId: realData.OrderId,
      Amount: realData.Amount,
      Description: realData.Description,
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

// ✅ ПОЛУЧЕНИЕ ИНФОРМАЦИИ О КОНФИГУРАЦИИ
app.get('/config', (req, res) => {
  res.json({
    TerminalKey: CONFIG.TERMINAL_KEY,
    BaseURL: CONFIG.BASE_URL,
    ExampleOrderId: generateOrderId(),
    Timestamp: new Date().toISOString()
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
  // Здесь можно обновить статус заказа в вашей БД
  res.json({ Success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});