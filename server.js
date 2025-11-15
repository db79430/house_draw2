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

// ✅ ПРАВИЛЬНАЯ ФУНКЦИЯ ДЛЯ ТОКЕНА (согласно документации Tinkoff)
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

// ✅ ИСПРАВЛЕННЫЙ ENDPOINT ДЛЯ ИНИЦИАЛИЗАЦИИ ПЛАТЕЖА
app.post('/init-payment', async (req, res) => {
  try {
    console.log('📥 Received request:', req.body);
    
    const { 
      Email,
      Phone = '+79999999999'
    } = req.body;

    if (!Email) {
      return res.json({
        Success: false,
        ErrorCode: 'EMAIL_REQUIRED',
        Message: 'Email обязателен'
      });
    }

    // ✅ ПРАВИЛЬНЫЙ ФОРМАТ ДАННЫХ
    const orderId = `T${Date.now()}`;
    const amount = 1000; // 10 рублей в копейках

    // ✅ ОСНОВНЫЕ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: 'Вступительный взнос в клуб',
      SuccessURL: 'https://yoursite.tilda.ws/success',
      FailURL: 'https://yoursite.tilda.ws/fail',
      DATA: {
        Email: Email,
        Phone: Phone
      }
    };

    // ✅ ГЕНЕРИРУЕМ ТОКЕН ПОСЛЕ ЗАПОЛНЕНИЯ ВСЕХ ДАННЫХ
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

// ✅ АЛЬТЕРНАТИВНЫЙ ВАРИАНТ - ПРОСТАЯ ГЕНЕРАЦИЯ ТОКЕНА
function generateTokenSimple(data) {
  // Самый простой и надежный способ согласно документации
  const values = 
    data.Amount +
    data.OrderId +
    (data.Description || '') +
    (data.TerminalKey || CONFIG.TERMINAL_KEY) +
    CONFIG.SECRET_KEY;

  console.log('🔐 Simple token data:', values);
  
  return crypto.createHash('sha256')
    .update(values)
    .digest('hex');
}

// ✅ ТЕСТОВЫЙ ENDPOINT С ПРОСТОЙ ГЕНЕРАЦИЕЙ ТОКЕНА
app.post('/init-simple', async (req, res) => {
  try {
    const { Email } = req.body;

    const orderId = `SIMPLE${Date.now()}`;
    const amount = 1000;

    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: 'Тестовый платеж',
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html',
      DATA: {
        Email: Email || 'test@test.com',
        Phone: '+79999999999'
      }
    };

    // Используем простую генерацию токена
    paymentData.Token = generateTokenSimple(paymentData);

    console.log('🧪 Simple request:', paymentData);

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
      details: error.response?.data
    });
  }
});

// ✅ ENDPOINT ДЛЯ ПРОВЕРКИ ФОРМАТА ДАННЫХ
app.post('/debug-init', async (req, res) => {
  try {
    const orderId = `DEBUG${Date.now()}`;
    const amount = 1000;

    // Минимальный набор данных
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: 'Debug payment',
      SuccessURL: 'https://example.com/success',
      FailURL: 'https://example.com/fail'
    };

    // Генерируем токен только из обязательных полей
    const tokenData = {
      Amount: paymentData.Amount,
      OrderId: paymentData.OrderId,
      Password: CONFIG.SECRET_KEY
    };

    paymentData.Token = crypto.createHash('sha256')
      .update(Object.values(tokenData).join(''))
      .digest('hex');

    console.log('🐛 Debug request:', paymentData);

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

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Server running on port 3000');
});