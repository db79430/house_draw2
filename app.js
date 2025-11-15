const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ РЕАЛЬНЫЕ КЛЮЧИ
const CONFIG = {
  TERMINAL_KEY: '1761129018508DEMO', // 20 символов ✅
  SECRET_KEY: 'jDkIojG12VaVNopw', // ⚠️ ЗАМЕНИТЕ!
  BASE_URL: 'https://securepay.tinkoff.ru/v2/' // ✅ ДОБАВЛЕН ЗАКРЫВАЮЩИЙ СЛЕШ!
};

console.log('🔧 TerminalKey:', CONFIG.TERMINAL_KEY);
console.log('🔧 Base URL:', CONFIG.BASE_URL);

// Функция для создания токена
function generateToken(data) {
  const values = Object.keys(data)
    .filter(key => key !== 'Token' && key !== 'Receipt' && key !== 'DATA')
    .sort()
    .map(key => {
      if (typeof data[key] === 'object') {
        return JSON.stringify(data[key]);
      }
      return String(data[key] || '');
    })
    .join('');

  return crypto.createHash('sha256')
    .update(values + CONFIG.SECRET_KEY)
    .digest('hex');
}

// Инициализация платежа
app.post('/init-payment', async (req, res) => {
  try {
    console.log('📥 Получен запрос:', req.body);
    
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

    const orderId = `T${Date.now()}`.substring(0, 36);
    const amount = 1000; // 10 рублей в копейках
    
    console.log(`💰 Сумма: ${amount} копеек`);

    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: FormName.substring(0, 124),
      SuccessURL: 'https://npk-vdv.ru/success',
      FailURL: 'https://npk-vdv.ru/fail',
      NotificationURL: 'https://housedraw2-production.up.railway.app/payment-callback'
    };

    // Добавляем дополнительные данные
    if (Email) {
      paymentData.DATA = { 
        Email: Email
      };
    }

    // Генерируем токен
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Отправка в Tinkoff:', {
      TerminalKey: paymentData.TerminalKey,
      Amount: paymentData.Amount,
      OrderId: paymentData.OrderId,
      Description: paymentData.Description
    });

    // ✅ ПРАВИЛЬНЫЙ URL: https://securepay.tinkoff.ru/v2/Init
    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Ответ Tinkoff:', response.data);

    if (response.data.Success) {
      res.json({
        Success: true,
        Status: response.data.Status,
        PaymentId: String(response.data.PaymentId),
        OrderId: orderId,
        Amount: amount,
        TerminalKey: CONFIG.TERMINAL_KEY,
        PaymentURL: response.data.PaymentURL,
        ErrorCode: '0'
      });
    } else {
      res.json({
        Success: false,
        ErrorCode: response.data.ErrorCode || 'UNKNOWN_ERROR',
        Message: response.data.Message || 'Ошибка платежа',
        Details: response.data.Details,
        Status: response.data.Status || 'REJECTED'
      });
    }

  } catch (error) {
    console.error('❌ Ошибка:', {
      message: error.message,
      url: `${CONFIG.BASE_URL}Init`,
      response: error.response?.data,
      status: error.response?.status
    });
    
    res.json({
      Success: false,
      ErrorCode: 'REQUEST_ERROR',
      Message: error.message,
      Status: 'REJECTED',
      Details: error.response?.data ? JSON.stringify(error.response.data) : undefined
    });
  }
});

// ✅ ДИАГНОСТИЧЕСКИЙ ENDPOINT
app.post('/debug-request', async (req, res) => {
  try {
    const orderId = `DEBUG${Date.now()}`;
    const amount = 1000;

    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: 'Диагностический платеж',
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html'
    };

    paymentData.Token = generateToken(paymentData);

    console.log('🐞 Диагностический запрос:', {
      url: `${CONFIG.BASE_URL}Init`,
      data: paymentData
    });

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData, {
      timeout: 10000
    });

    res.json({
      success: true,
      request: {
        url: `${CONFIG.BASE_URL}Init`,
        data: paymentData
      },
      response: response.data
    });

  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      request: {
        url: `${CONFIG.BASE_URL}Init`,
        terminalKey: CONFIG.TERMINAL_KEY
      },
      response: error.response?.data,
      status: error.response?.status
    });
  }
});

// ✅ ПРОВЕРКА SECRET KEY
app.get('/check-config', (req, res) => {
  // Создаем тестовые данные для проверки токена
  const testData = {
    TerminalKey: CONFIG.TERMINAL_KEY,
    Amount: 1000,
    OrderId: 'TEST123',
    Description: 'Test'
  };

  const token = generateToken(testData);

  res.json({
    config: {
      terminalKey: CONFIG.TERMINAL_KEY,
      baseUrl: CONFIG.BASE_URL,
      secretKeyLength: CONFIG.SECRET_KEY?.length || 0
    },
    tokenTest: {
      originalData: testData,
      generatedToken: token,
      tokenLength: token.length
    },
    status: 'CONFIG_CHECKED'
  });
});

// Статус сервера
app.get('/status', (req, res) => {
  res.json({ 
    status: 'OK',
    terminalKey: CONFIG.TERMINAL_KEY,
    baseUrl: CONFIG.BASE_URL,
    message: 'Base URL исправлен - добавлен закрывающий слеш'
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Сервер запущен');
  console.log('📍 Base URL:', CONFIG.BASE_URL);
});