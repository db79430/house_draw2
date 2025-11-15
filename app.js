const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ РЕАЛЬНЫЕ КЛЮЧИ (замените на ваши!)
const CONFIG = {
  TERMINAL_KEY: '1761129018508DEMO',
  SECRET_KEY: 'jDkIojG12VaVNopw', 
  BASE_URL: 'https://securepay.tinkoff.ru/v2/'
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
      Price = '10', // ✅ ИЗМЕНИЛИ НА 10 РУБЛЕЙ
      Email,
      FormName = 'Вступительный взнос'
    } = req.body;

    if (!Email) {
      return res.json({
        success: false,
        error: 'Email обязателен'
      });
    }

    const orderId = `T${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // ✅ 10 РУБЛЕЙ В КОПЕЙКАХ
    const amount = parseInt(Price) * 100; // 10 рублей = 1000 копеек
    
    console.log(`💰 Сумма: ${amount} копеек (${Price} рублей)`);

    // Данные для Tinkoff API
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount, // 1000 копеек
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
      Amount: paymentData.Amount,
      Description: paymentData.Description,
      Email: Email
    });

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
      throw new Error(
        response.data.Message || 
        response.data.Details || 
        `Tinkoff Error: ${JSON.stringify(response.data)}`
      );
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    
    res.json({
      success: false,
      error: `Ошибка Tinkoff: ${error.message}`,
      details: error.response?.data
    });
  }
});

// Диагностический endpoint
app.post('/debug-10rub', async (req, res) => {
  try {
    const orderId = `DEBUG10${Date.now()}`;
    const amount = 1000; // 10 рублей в копейках

    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: 'Тест 10 рублей',
      SuccessURL: 'https://npk-vdv.ru/success',
      FailURL: 'https://npk-vdv.ru/fail',
      DATA: {
        Email: 'test@test.com'
      }
    };

    paymentData.Token = generateToken(paymentData);

    console.log('🐞 Debug 10 рублей:', paymentData);

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData);

    res.json({
      success: true,
      amount: `${amount} копеек (10 рублей)`,
      requestData: paymentData,
      response: response.data
    });

  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      requestData: JSON.parse(error.config?.data || '{}'),
      response: error.response?.data
    });
  }
});

// Статус сервера
app.get('/status', (req, res) => {
  res.json({ 
    status: 'OK',
    terminalKey: CONFIG.TERMINAL_KEY,
    amount: '10 рублей (1000 копеек)',
    message: 'Настроено для 10 рублей'
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Сервер запущен для суммы 10 рублей');
});