const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ ПРАВИЛЬНЫЕ КЛЮЧИ И ФОРМАТ
const CONFIG = {
  TERMINAL_KEY: '1761129018508DEMO',
  SECRET_KEY: 'jDkIojG12VaVNopw',
  BASE_URL: 'https://securepay.tinkoff.ru/v2/'
};

console.log('🔧 Server started with TerminalKey:', CONFIG.TERMINAL_KEY);

// ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ ДЛЯ ТОКЕНА (правильная последовательность полей)
function generateToken(data) {
  // Правильная последовательность полей согласно документации Tinkoff
  const tokenData = {
    TerminalKey: data.TerminalKey,
    Amount: data.Amount,
    OrderId: data.OrderId,
    Description: data.Description,
    Password: CONFIG.SECRET_KEY // ВАЖНО: добавляем пароль в конец
  };

  // Собираем значения в правильном порядке
  const values = [
    tokenData.TerminalKey,
    tokenData.Amount,
    tokenData.OrderId,
    tokenData.Description,
    tokenData.Password
  ].join('');

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

    // ✅ ОСНОВНЫЕ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ согласно документации
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: 'Вступительный взнос в клуб',
      SuccessURL: 'https://yoursite.tilda.ws/page/success', // Ваш URL успеха
      FailURL: 'https://yoursite.tilda.ws/page/fail',       // Ваш URL ошибки
      NotificationURL: 'https://your-server-url/notification', // Для уведомлений
      DATA: JSON.stringify({
        Email: Email,
        Phone: '+79999999999'
      })
    };

    // ✅ ГЕНЕРИРУЕМ ТОКЕН ПРАВИЛЬНО
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

// ✅ ЭНДПОИНТ ДЛЯ УВЕДОМЛЕНИЙ О СТАТУСЕ ПЛАТЕЖА
app.post('/notification', (req, res) => {
  console.log('📨 Payment notification:', req.body);
  
  // Проверяем токен уведомления
  const notificationData = req.body;
  
  // Обрабатываем статус платежа
  if (notificationData.Status === 'CONFIRMED') {
    console.log('✅ Payment confirmed for OrderId:', notificationData.OrderId);
    // Здесь можно обновить статус в вашей БД
  }
  
  // Всегда отвечаем OK на уведомления
  res.json({ Success: true });
});

// ✅ ЭНДПОИНТ ДЛЯ ПРОВЕРКИ СТАТУСА ПЛАТЕЖА
app.post('/check-payment', async (req, res) => {
  try {
    const { PaymentId } = req.body;
    
    const checkData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      PaymentId: PaymentId
    };
    
    checkData.Token = generateToken(checkData);
    
    const response = await axios.post(`${CONFIG.BASE_URL}GetState`, checkData);
    
    res.json({
      Success: true,
      Status: response.data.Status
    });
    
  } catch (error) {
    res.json({
      Success: false,
      Message: error.message
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Server running on port 3000');
});