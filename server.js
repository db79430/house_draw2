const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const qs = require('qs');

const app = express();
const PORT = process.env.PORT || 3000;

// Конфигурация
const CONFIG = {
  TERMINAL_KEY: '1761129018508DEMO',
  SECRET_KEY: 'jDkIojG12VaVNopw',
  BASE_URL: 'https://securepay.tinkoff.ru/v2/'
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Улучшенная функция для создания токена
function generateToken(data) {
  // Создаем копию объекта чтобы не мутировать оригинал
  const dataCopy = { ...data };
  
  // Удаляем токен если он есть
  delete dataCopy.Token;
  
  // Сортируем ключи в алфавитном порядке
  const sortedKeys = Object.keys(dataCopy).sort();
  
  // Создаем строку для хеширования
  const valuesString = sortedKeys
    .map(key => {
      const value = dataCopy[key];
      
      // Обрабатываем вложенные объекты (например, DATA)
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      
      return String(value);
    })
    .join('');
  
  const fullString = valuesString + CONFIG.SECRET_KEY;
  
  console.log('Строка для хеширования:', fullString);
  
  return crypto
    .createHash('sha256')
    .update(fullString)
    .digest('hex');
}

// Функция для проверки токена (для уведомлений)
function verifyToken(receivedData) {
  const receivedToken = receivedData.Token;
  const dataWithoutToken = { ...receivedData };
  delete dataWithoutToken.Token;
  
  const calculatedToken = generateToken(dataWithoutToken);
  
  return receivedToken === calculatedToken;
}

// Инициализация платежа
app.post('/api/init-payment', async (req, res) => {
  try {
    const { amount, orderId, description, customerEmail, customerPhone } = req.body;

    // Базовая валидация
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Неверная сумма платежа'
      });
    }

    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: Math.round(amount * 100), // Конвертируем в копейки
      OrderId: orderId || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      Description: description || 'Оплата заказа',
      SuccessURL: `${req.protocol}://${req.get('host')}/success`,
      FailURL: `${req.protocol}://${req.get('host')}/fail`,
      NotificationURL: `${req.protocol}://${req.get('host')}/api/notification`,
      PayType: 'O' // Одностадийная оплата
    };

    // Добавляем дополнительные параметры если они есть
    if (customerEmail) {
      paymentData.DATA = {
        ...paymentData.DATA,
        Email: customerEmail
      };
    }

    if (customerPhone) {
      paymentData.DATA = {
        ...paymentData.DATA,
        Phone: customerPhone
      };
    }

    // Генерируем токен
    console.log('Данные для генерации токена:', paymentData);
    paymentData.Token = generateToken(paymentData);
    console.log('Сгенерированный токен:', paymentData.Token);

    const response = await axios.post(
      `${CONFIG.BASE_URL}Init`,
      paymentData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('Ответ от Тинькофф:', response.data);

    if (response.data.Success) {
      res.json({
        success: true,
        paymentId: response.data.PaymentId,
        paymentURL: response.data.PaymentURL,
        orderId: paymentData.OrderId
      });
    } else {
      throw new Error(response.data.Message || `Ошибка: ${response.data.ErrorCode}`);
    }

  } catch (error) {
    console.error('Ошибка инициализации платежа:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Обработка уведомлений от Тинькофф
app.post('/api/notification', express.json(), (req, res) => {
  try {
    const notification = req.body;
    
    console.log('Получено уведомление:', JSON.stringify(notification, null, 2));
    
    // Проверяем токен
    if (!verifyToken(notification)) {
      console.error('Неверный токен в уведомлении');
      return res.status(400).send('Invalid token');
    }

    // Обрабатываем статус платежа
    const statusMap = {
      'NEW': 'Новый',
      'FORM_SHOWED': 'Показана форма',
      'DEADLINE_EXPIRED': 'Просрочен',
      'CANCELED': 'Отменен',
      'PREAUTHORIZING': 'Предавторизация',
      'AUTHORIZING': 'Авторизация',
      'AUTHORIZED': 'Авторизован',
      'AUTH_FAIL': 'Ошибка авторизации',
      'REJECTED': 'Отклонен',
      '3DS_CHECKING': 'Проверка по 3-D Secure',
      '3DS_CHECKED': 'Проверен по 3-D Secure',
      'REVERSING': 'Реверсирование',
      'PARTIAL_REVERSED': 'Частично реверсирован',
      'REVERSED': 'Реверсирован',
      'CONFIRMING': 'Подтверждение',
      'CONFIRMED': 'Подтвержден',
      'REFUNDING': 'Возврат',
      'PARTIAL_REFUNDED': 'Частично возвращен',
      'REFUNDED': 'Возвращен'
    };

    console.log('Статус платежа:', {
      orderId: notification.OrderId,
      paymentId: notification.PaymentId,
      status: notification.Status,
      statusText: statusMap[notification.Status] || 'Неизвестный статус',
      amount: notification.Amount ? notification.Amount / 100 : 0
    });

    // Здесь можно обновить статус заказа в вашей БД
    // updateOrderStatus(notification.OrderId, notification.Status);

    // Всегда отвечаем OK если токен верный
    res.send('OK');

  } catch (error) {
    console.error('Ошибка обработки уведомления:', error);
    res.status(500).send('Error');
  }
});

// Проверка статуса платежа
app.post('/api/check-status', async (req, res) => {
  try {
    const { paymentId, orderId } = req.body;

    if (!paymentId && !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Необходим paymentId или orderId'
      });
    }

    const checkData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      ...(paymentId && { PaymentId: paymentId }),
      ...(orderId && { OrderId: orderId })
    };

    checkData.Token = generateToken(checkData);

    const response = await axios.post(
      `${CONFIG.BASE_URL}GetState`,
      checkData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error('Ошибка проверки статуса:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Отмена платежа
app.post('/api/cancel-payment', async (req, res) => {
  try {
    const { paymentId } = req.body;

    const cancelData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      PaymentId: paymentId
    };

    cancelData.Token = generateToken(cancelData);

    const response = await axios.post(
      `${CONFIG.BASE_URL}Cancel`,
      cancelData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error('Ошибка отмены платежа:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Тестовый endpoint для проверки генерации токена
app.post('/api/debug-token', (req, res) => {
  try {
    const testData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: 10000,
      OrderId: 'test_order_123',
      Description: 'Тестовый платеж'
    };

    const token = generateToken(testData);

    res.json({
      originalData: testData,
      generatedToken: token,
      secretKey: CONFIG.SECRET_KEY.substring(0, 5) + '...' // Показываем только часть ключа для безопасности
    });

  } catch (error) {
    console.error('Ошибка отладки:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Страница успешной оплаты
app.get('/success', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Платеж успешно завершен</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: green; font-size: 24px; }
          button { padding: 10px 20px; margin: 10px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="success">✅ Платеж успешно завершен!</div>
        <p>Спасибо за ваш заказ.</p>
        <button onclick="window.close()">Закрыть</button>
        <button onclick="window.location.href='/'">Вернуться на сайт</button>
      </body>
    </html>
  `);
});

// Страница ошибки оплаты
app.get('/fail', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Ошибка оплаты</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: red; font-size: 24px; }
          button { padding: 10px 20px; margin: 10px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="error">❌ Ошибка при оплате</div>
        <p>Попробуйте еще раз или свяжитесь с поддержкой.</p>
        <button onclick="window.close()">Закрыть</button>
        <button onclick="window.location.href='/'">Попробовать снова</button>
      </body>
    </html>
  `);
});

// Старт сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📍 URL для Tilda: http://localhost:${PORT}/api/init-payment`);
  console.log(`📍 Тестовая форма: http://localhost:${PORT}`);
  console.log(`📍 Отладка токена: http://localhost:${PORT}/api/debug-token`);
});