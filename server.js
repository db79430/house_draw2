const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ КОНФИГУРАЦИЯ ДЛЯ PAYMENT INTEGRATION
const CONFIG = {
    TERMINAL_KEY: '1761129018508DEMO',
    SECRET_KEY: 'jDkIojG12VaVNopw',
    BASE_URL: 'https://securepay.tinkoff.ru/v2/Init'
};

console.log('🔧 Payment Integration Server запущен');

// Функция для создания токена
function generateToken(data) {
  const requiredFields = {
    TerminalKey: data.TerminalKey,
    Amount: data.Amount,
    OrderId: data.OrderId,
    Description: data.Description || '',
    SuccessURL: data.SuccessURL || '',
    FailURL: data.FailURL || ''
  };

  const values = Object.keys(requiredFields)
    .sort()
    .map(key => String(requiredFields[key]))
    .join('');

  return crypto.createHash('sha256')
    .update(values + CONFIG.SECRET_KEY)
    .digest('hex');
}

// ✅ ENDPOINT ДЛЯ PAYMENT INTEGRATION
app.post('/payment-integration/init', async (req, res) => {
  try {
    console.log('📥 Payment Integration запрос:', req.body);
    
    // Данные от Tinkoff Integration
    const { orderId, amount, description, customerDetails } = req.body;

    // Используем orderId от Tinkoff или создаем свой
    const finalOrderId = orderId || `T${Date.now()}`;
    const finalAmount = amount || 1000; // 10 рублей по умолчанию
    const finalDescription = description || 'Вступительный взнос';

    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: finalAmount,
      OrderId: finalOrderId,
      Description: finalDescription,
      SuccessURL: 'https://npk-vdv.ru/success',
      FailURL: 'https://npk-vdv.ru/fail',
      NotificationURL: 'https://housedraw2-production.up.railway.app/payment-integration/callback'
    };

    // Добавляем данные клиента если есть
    if (customerDetails) {
      paymentData.DATA = {
        Email: customerDetails.email || 'test@test.com',
        Phone: customerDetails.phone || '+79999999999'
      };
    }

    paymentData.Token = generateToken(paymentData);

    console.log('📤 Отправка в Tinkoff:', paymentData);

    const response = await axios.post(`${CONFIG.BASE_URL}`, paymentData);

    console.log('📥 Ответ Tinkoff:', response.data);

    if (response.data.Success) {
      // ✅ ВОЗВРАЩАЕМ PaymentURL КАК СТРОКУ (как требуется в документации)
      res.json({
        success: true,
        PaymentURL: response.data.PaymentURL, // С большой P для Tinkoff
        paymentUrl: response.data.PaymentURL, // С маленькой p для совместимости
        paymentId: response.data.PaymentId,
        orderId: finalOrderId,
        amount: finalAmount
      });
    } else {
      throw new Error(response.data.Message || 'Ошибка инициализации платежа');
    }

  } catch (error) {
    console.error('❌ Ошибка Payment Integration:', error.response?.data || error.message);
    
    res.json({
      success: false,
      error: error.response?.data?.Message || error.message,
      details: error.response?.data
    });
  }
});

// ✅ ПРОСТОЙ ENDPOINT ДЛЯ ТЕСТИРОВАНИЯ
app.post('/payment-integration/simple-init', async (req, res) => {
  try {
    const orderId = `PI${Date.now()}`;
    const amount = 1000;

    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: 'Тест Payment Integration',
      SuccessURL: 'https://npk-vdv.ru/success',
      FailURL: 'https://npk-vdv.ru/fail'
    };

    paymentData.Token = generateToken(paymentData);

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData);

    if (response.data.Success) {
      // ✅ ВОЗВРАЩАЕМ ТОЛЬКО PaymentURL КАК СТРОКУ
      res.json({
        PaymentURL: response.data.PaymentURL
      });
    } else {
      throw new Error(response.data.Message);
    }

  } catch (error) {
    res.json({
      error: error.message
    });
  }
});

// ✅ CALLBACK ДЛЯ PAYMENT INTEGRATION
app.post('/payment-integration/callback', (req, res) => {
  try {
    const callbackData = req.body;
    console.log('🔔 Payment Integration Callback:', callbackData);

    // Проверяем подпись
    const receivedToken = callbackData.Token;
    const checkData = { ...callbackData };
    delete checkData.Token;
    
    const calculatedToken = generateToken(checkData);
    
    if (receivedToken !== calculatedToken) {
      console.error('❌ Неверная подпись в callback');
      return res.status(400).json({ Success: false });
    }

    // Обрабатываем статус
    console.log(`📊 Payment Integration Status: ${callbackData.Status}`);
    
    // Всегда возвращаем успех
    res.json({ Success: true });

  } catch (error) {
    console.error('❌ Ошибка callback:', error);
    res.json({ Success: false });
  }
});

// ✅ ENDPOINT ДЛЯ ПОЛУЧЕНИЯ СТАТУСА
app.post('/payment-integration/status', async (req, res) => {
  try {
    const { paymentId } = req.body;

    const stateData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      PaymentId: paymentId
    };

    stateData.Token = generateToken(stateData);

    const response = await axios.post(`${CONFIG.BASE_URL}GetState`, stateData);

    res.json({
      success: true,
      status: response.data.Status,
      paymentId: paymentId,
      orderId: response.data.OrderId,
      amount: response.data.Amount
    });

  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Статус сервера
app.get('/payment-integration/status', (req, res) => {
  res.json({
    status: 'OK',
    server: 'Tinkoff Payment Integration Backend',
    endpoints: {
      'POST /payment-integration/init': 'Инициализация платежа',
      'POST /payment-integration/simple-init': 'Простая инициализация',
      'POST /payment-integration/callback': 'Callback от Tinkoff',
      'POST /payment-integration/status': 'Получение статуса'
    },
    testUrl: 'https://housedraw2-production.up.railway.app/payment-integration-test.html'
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Payment Integration Server запущен');
});