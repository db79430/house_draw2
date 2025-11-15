const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ ПРАВИЛЬНЫЕ КЛЮЧИ И ФОРМАТ
const CONFIG = {
  TERMINAL_KEY: '1761129018508',
  SECRET_KEY: 'jDkIojG12VaVNopw',
  BASE_URL: 'https://rest-api-test.tinkoff.ru/v2/Init'
};

console.log('🔧 Server started with TerminalKey:', CONFIG.TERMINAL_KEY);

// ✅ УПРОЩЕННАЯ ФУНКЦИЯ ДЛЯ ТОКЕНА (как в документации Tinkoff)
function generateToken(data) {
  // Только основные поля для токена
  const tokenData = {
    TerminalKey: data.TerminalKey,
    Amount: data.Amount,
    OrderId: data.OrderId,
    Description: data.Description,
    SuccessURL: data.SuccessURL,
    FailURL: data.FailURL
  };

  const values = Object.keys(tokenData)
    .sort() // Важно: сортировка по алфавиту
    .map(key => String(tokenData[key] || ''))
    .join('');

  console.log('🔐 Data for token:', values);
  
  return crypto.createHash('sha256')
    .update(values + CONFIG.SECRET_KEY)
    .digest('hex');
}

// ✅ ИСПРАВЛЕННЫЙ ENDPOINT ДЛЯ ИНИЦИАЛИЗАЦИИ ПЛАТЕЖА
app.post('/init-payment', async (req, res) => {
  try {
    console.log('📥 Received request:', req.body);
    
    const { 
      Price = '10',
      Email,
      FormName = 'Вступительный взнос'
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

    // ✅ ОСНОВНЫЕ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ (без лишних)
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: 'Вступительный взнос в клуб',
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html', // Стандартный URL
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html'       // Стандартный URL
    };

    // ✅ ДОБАВЛЯЕМ DATA ТОЛЬКО ЕСЛИ НУЖНО
    paymentData.DATA = {
      Email: Email,
      Phone: '+79999999999' // Обязательное поле для некоторых терминалов
    };

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
        TerminalKey: CONFIG.TERMINAL_KEY,
        Status: response.data.Status,
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

// ✅ ТЕСТОВЫЙ ENDPOINT С ПРОСТЫМИ ДАННЫМИ
app.post('/test-simple', async (req, res) => {
  try {
    const testData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: 1000,
      OrderId: `TEST${Date.now()}`,
      Description: 'Тестовый платеж',
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html',
      DATA: {
        Email: 'test@test.com',
        Phone: '+79999999999'
      }
    };

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
      request: error.config?.data,
      response: error.response?.data
    });
  }
});

// ✅ ПРОВЕРКА КЛЮЧЕЙ
app.get('/check-keys', (req, res) => {
  const testData = {
    TerminalKey: CONFIG.TERMINAL_KEY,
    Amount: 1000,
    OrderId: 'CHECK123',
    Description: 'Check'
  };

  const token = generateToken(testData);

  res.json({
    keys: {
      terminalKey: CONFIG.TERMINAL_KEY,
      secretKey: '***' + CONFIG.SECRET_KEY.slice(-4), // Не показываем полный ключ
      baseUrl: CONFIG.BASE_URL
    },
    tokenTest: {
      data: testData,
      token: token
    }
  });
});

app.get('/status', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Исправлен формат данных для Tinkoff API'
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Server running on port 3000');
});