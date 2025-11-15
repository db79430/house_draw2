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

// ✅ ПРАВИЛЬНАЯ ФУНКЦИЯ ДЛЯ ТОКЕНА
function generateToken(data) {
  // Сортируем поля в алфавитном порядке и собираем значения
  const sortedKeys = Object.keys(data).sort();
  
  let values = '';
  sortedKeys.forEach(key => {
    if (key !== 'Token' && key !== 'Shops' && key !== 'Receipt') {
      const value = data[key];
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'object') {
          values += JSON.stringify(value);
        } else {
          values += String(value);
        }
      }
    }
  });
  
  // Добавляем секретный ключ в конец
  values += CONFIG.SECRET_KEY;
  
  console.log('🔐 Data for token:', values);
  
  return crypto.createHash('sha256')
    .update(values)
    .digest('hex');
}

// ✅ ИСПРАВЛЕННЫЙ ENDPOINT - БЕЗ ОБЯЗАТЕЛЬНОГО EMAIL
app.post('/init-payment', async (req, res) => {
  try {
    console.log('📥 Received request:', req.body);
    
    const { 
      Email,
      Phone 
    } = req.body;

    // ✅ ПРАВИЛЬНЫЙ ФОРМАТ ДАННЫХ
    const orderId = `T${Date.now()}`;
    const amount = 1000; // 10 рублей в копейках

    // ✅ ОСНОВНЫЕ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: 'Вступительный взнос в клуб',
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html'
    };

    // ✅ ДОБАВЛЯЕМ DATA ТОЛЬКО ЕСЛИ ЕСТЬ ДАННЫЕ
    const dataFields = {};
    if (Email) dataFields.Email = Email;
    if (Phone) dataFields.Phone = Phone;
    
    if (Object.keys(dataFields).length > 0) {
      paymentData.DATA = dataFields;
    }

    // ✅ ГЕНЕРИРУЕМ ТОКЕН
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

// ✅ МИНИМАЛЬНЫЙ ENDPOINT ТОЛЬКО С ОБЯЗАТЕЛЬНЫМИ ПОЛЯМИ
app.post('/init-minimal', async (req, res) => {
  try {
    const orderId = `MIN${Date.now()}`;
    const amount = 1000;

    // ✅ МИНИМАЛЬНЫЙ НАБОР ОБЯЗАТЕЛЬНЫХ ПОЛЕЙ
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: 'Вступительный взнос',
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html'
    };

    // ✅ ГЕНЕРИРУЕМ ТОКЕН ИЗ МИНИМАЛЬНЫХ ПОЛЕЙ
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Minimal request:', paymentData);

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData);

    res.json({
      Success: response.data.Success,
      PaymentURL: response.data.PaymentURL,
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

// ✅ ENDPOINT ДЛЯ ПРОВЕРКИ ТОКЕНА
app.get('/check-token', (req, res) => {
  const testData = {
    TerminalKey: CONFIG.TERMINAL_KEY,
    Amount: 1000,
    OrderId: 'TEST123',
    Description: 'Test Payment'
  };

  const token = generateToken(testData);

  res.json({
    testData: testData,
    generatedToken: token,
    expectedFields: ['TerminalKey', 'Amount', 'OrderId', 'Description', 'Token']
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Server running on port 3000');
});