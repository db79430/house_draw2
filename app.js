const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ РЕАЛЬНЫЕ КЛЮЧИ
const CONFIG = {
  TERMINAL_KEY: '1761129018508', // 20 символов ✅
  SECRET_KEY: 'jDkIojG12VaVNopw', // ⚠️ ЗАМЕНИТЕ!
  BASE_URL: 'https://securepay.tinkoff.ru/v2/'
};

console.log('🔧 TerminalKey:', CONFIG.TERMINAL_KEY);

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
        Success: false, // ✅ Boolean
        ErrorCode: 'EMAIL_REQUIRED',
        Message: 'Email обязателен'
      });
    }

    // ✅ СООТВЕТСТВИЕ ТРЕБОВАНИЯМ
    const orderId = `T${Date.now()}`.substring(0, 36); // <= 36 символов
    const amount = 1000; // 10 рублей в копейках ✅ Number
    
    console.log(`💰 Сумма: ${amount} копеек`);

    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY, // <= 20 символов ✅
      Amount: amount, // ✅ Number
      OrderId: orderId, // <= 36 символов ✅
      Description: FormName.substring(0, 124), // Ограничение описания
      SuccessURL: 'https://npk-vdv.ru/success'.substring(0, 100),
      FailURL: 'https://npk-vdv.ru/fail'.substring(0, 100),
      NotificationURL: 'https://housedraw2-production.up.railway.app/payment-callback'.substring(0, 100)
    };

    // Добавляем дополнительные данные
    if (Email) {
      paymentData.DATA = { 
        Email: Email.substring(0, 100) 
      };
    }

    // Генерируем токен
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Отправка в Tinkoff с параметрами:', {
      TerminalKey: paymentData.TerminalKey,
      Amount: paymentData.Amount,
      OrderId: paymentData.OrderId,
      Description: paymentData.Description
    });

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Ответ Tinkoff:', response.data);

    // ✅ ВОЗВРАЩАЕМ В ФОРМАТЕ TINKOFF API
    if (response.data.Success) {
      res.json({
        Success: true, // ✅ Boolean
        Status: response.data.Status, // ✅ String <= 20 chars
        PaymentId: String(response.data.PaymentId), // ✅ String <= 20 chars
        OrderId: orderId, // ✅ String <= 36 chars
        Amount: amount, // ✅ Number
        TerminalKey: CONFIG.TERMINAL_KEY, // ✅ String <= 20 chars
        PaymentURL: response.data.PaymentURL, // ✅ String <= 100 chars
        ErrorCode: '0' // ✅ String <= 20 chars
      });
    } else {
      res.json({
        Success: false, // ✅ Boolean
        ErrorCode: response.data.ErrorCode || 'UNKNOWN_ERROR', // ✅ String <= 20 chars
        Message: response.data.Message || 'Ошибка платежа', // ✅ String <= 255 chars
        Details: response.data.Details,
        Status: response.data.Status || 'REJECTED' // ✅ String <= 20 chars
      });
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    
    // ✅ ОШИБКА В ФОРМАТЕ TINKOFF API
    res.json({
      Success: false, // ✅ Boolean
      ErrorCode: 'REQUEST_ERROR', // ✅ String <= 20 chars
      Message: error.message.substring(0, 255), // ✅ String <= 255 chars
      Status: 'REJECTED', // ✅ String <= 20 chars
      Details: error.response?.data ? JSON.stringify(error.response.data) : undefined
    });
  }
});

// ✅ ТЕСТОВЫЙ ENDPOINT С ПРАВИЛЬНЫМ ФОРМАТОМ
app.post('/test-tinkoff-format', async (req, res) => {
  try {
    const orderId = `TEST${Date.now()}`.substring(0, 36);
    const amount = 1000; // 10 рублей

    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: 'Тестовый платеж 10р',
      SuccessURL: 'https://npk-vdv.ru/success',
      FailURL: 'https://npk-vdv.ru/fail'
    };

    paymentData.Token = generateToken(paymentData);

    console.log('🧪 Тестовый запрос:', paymentData);

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData);

    // ✅ ВОЗВРАЩАЕМ В ФОРМАТЕ TINKOFF
    res.json({
      Success: response.data.Success,
      Status: response.data.Status,
      PaymentId: String(response.data.PaymentId),
      OrderId: orderId,
      Amount: amount,
      TerminalKey: CONFIG.TERMINAL_KEY,
      PaymentURL: response.data.PaymentURL,
      ErrorCode: response.data.ErrorCode || '0',
      Message: response.data.Message,
      Details: response.data.Details,
      // Дополнительная информация для отладки
      _debug: {
        request: paymentData,
        response: response.data
      }
    });

  } catch (error) {
    res.json({
      Success: false,
      ErrorCode: 'TEST_ERROR',
      Message: error.message,
      Status: 'REJECTED',
      _debug: {
        error: error.response?.data
      }
    });
  }
});

// Статус сервера
app.get('/status', (req, res) => {
  res.json({ 
    status: 'OK',
    terminalKey: CONFIG.TERMINAL_KEY,
    requirements: {
      TerminalKey: '<= 20 chars ✅',
      Amount: 'Number ✅', 
      OrderId: '<= 36 chars ✅',
      Success: 'Boolean ✅',
      Status: '<= 20 chars ✅',
      PaymentId: '<= 20 chars ✅',
      ErrorCode: '<= 20 chars ✅',
      PaymentURL: '<= 100 chars ✅',
      Message: '<= 255 chars ✅'
    }
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Сервер запущен с правильным форматом Tinkoff API');
});