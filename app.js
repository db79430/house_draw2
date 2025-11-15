const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ АЛЬТЕРНАТИВНЫЕ ТЕСТОВЫЕ КЛЮЧИ
// const CONFIG = {
//   TERMINAL_KEY: process.env.TERMINAL_KEY, // Альтернативный ключ
//   SECRET_KEY: process.env.SECRET_KEY, 
//   BASE_URL: 'https://rest-api-test.tinkoff.ru/v2/'
// };

const CONFIG = {
    TERMINAL_KEY: '1761129018508',
    SECRET_KEY: 'jDkIojG12VaVNopw', 
    BASE_URL: 'https://rest-api-test.tinkoff.ru/v2/'
  };

console.log('🔧 Используется TerminalKey:', CONFIG.TERMINAL_KEY);

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
      Price = '10', // Используем 1000 рублей вместо 10
      Email,
      FormName = 'Вступительный взнос'
    } = req.body;

    // Валидация
    if (!Email) {
      return res.json({
        success: false,
        error: 'Email обязателен'
      });
    }

    const orderId = `T${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const amount = Math.round(parseFloat(Price) * 100); // В копейках

    console.log(`💰 Сумма: ${amount} копеек (${Price} рублей)`);

    // ✅ ПРАВИЛЬНЫЙ ФОРМАТ ДЛЯ TINKOFF
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: FormName.substring(0, 124), // Ограничение длины
    };

    // ✅ ДОБАВЛЯЕМ ОБЯЗАТЕЛЬНЫЕ URL
    paymentData.SuccessURL = 'https://securepay.tinkoff.ru/html/payForm/success.html';
    paymentData.FailURL = 'https://securepay.tinkoff.ru/html/payForm/fail.html';

    // ✅ ДОБАВЛЯЕМ DATA ЕСЛИ ЕСТЬ EMAIL
    if (Email) {
      paymentData.DATA = { Email: Email };
    }

    // ✅ ГЕНЕРИРУЕМ ТОКЕН ПОСЛЕ ВСЕХ ПОЛЕЙ
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Отправка в Tinkoff:', JSON.stringify(paymentData, null, 2));

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Ответ Tinkoff:', response.data);

    if (response.data.Success) {
      res.json({
        success: true,
        PaymentURL: response.data.PaymentURL,
        paymentURL: response.data.PaymentURL,
        paymentId: response.data.PaymentId,
        orderId: orderId
      });
    } else {
      // ✅ ДЕТАЛЬНАЯ ИНФОРМАЦИЯ ОБ ОШИБКЕ
      throw new Error(
        response.data.Message || 
        response.data.Details || 
        `Tinkoff Error: ${JSON.stringify(response.data)}`
      );
    }

  } catch (error) {
    console.error('❌ Ошибка 403:', {
      message: error.message,
      response: error.response?.data,
      config: error.config?.data
    });
    
    res.json({
      success: false,
      error: `Ошибка Tinkoff: ${error.message}`,
      details: error.response?.data
    });
  }
});

// ✅ ТЕСТОВЫЙ ENDPOINT ДЛЯ ПРОВЕРКИ TINKOFF
app.post('/test-tinkoff', async (req, res) => {
  try {
    const testData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: 100000, // 1000 рублей
      OrderId: 'TEST' + Date.now(),
      Description: 'Тестовый платеж',
      SuccessURL: 'https://example.com/success',
      FailURL: 'https://example.com/fail'
    };

    testData.Token = generateToken(testData);

    console.log('🧪 Тестовый запрос к Tinkoff:', testData);

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, testData);

    res.json({
      success: true,
      tinkoffResponse: response.data,
      terminalKey: CONFIG.TERMINAL_KEY,
      usedKeys: 'TinkoffBankTest'
    });

  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      tinkoffError: error.response?.data,
      terminalKey: CONFIG.TERMINAL_KEY
    });
  }
});

// Статус сервера
app.get('/status', (req, res) => {
  res.json({ 
    status: 'OK',
    terminalKey: CONFIG.TERMINAL_KEY,
    message: 'Используются ключи TinkoffBankTest'
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Сервер запущен');
});