const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ КОНФИГУРАЦИЯ
const CONFIG = {
  TERMINAL_KEY: '1761129018508DEMO',
  SECRET_KEY: 'jDkIojG12VaVNopw',
  BASE_URL: 'https://securepay.tinkoff.ru/v2/'
};

console.log('🔧 Tinkoff SpeedPay Server запущен');

// ✅ ФУНКЦИЯ ДЛЯ СОЗДАНИЯ ТОКЕНА
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

// ✅ 1. ENDPOINT ДЛЯ ИНИЦИАЛИЗАЦИИ ПЛАТЕЖА (SpeedPay)
app.post('/init-payment', async (req, res) => {
  try {
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

    const orderId = `T${Date.now()}`;
    const amount = parseInt(Price) * 100;

    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: FormName.substring(0, 124),
      SuccessURL: 'https://npk-vdv.ru/success',
      FailURL: 'https://npk-vdv.ru/fail',
      NotificationURL: 'https://housedraw2-production.up.railway.app/payment-callback'
    };

    if (Email) {
      paymentData.DATA = { Email: Email };
    }

    paymentData.Token = generateToken(paymentData);

    console.log('📤 Инициализация платежа для SpeedPay');

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData);

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
      throw new Error(response.data.Message || 'Ошибка инициализации платежа');
    }

  } catch (error) {
    console.error('❌ Ошибка инициализации:', error.message);
    res.json({
      Success: false,
      ErrorCode: 'INIT_ERROR',
      Message: error.message
    });
  }
});

// ✅ 2. ENDPOINT ДЛЯ ЗАВЕРШЕНИЯ ПЛАТЕЖА (SpeedPay)
app.post('/confirm-payment', async (req, res) => {
  try {
    const { PaymentId, Amount } = req.body;

    if (!PaymentId || !Amount) {
      return res.json({
        Success: false,
        ErrorCode: 'MISSING_PARAMS',
        Message: 'PaymentId и Amount обязательны'
      });
    }

    const confirmData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      PaymentId: PaymentId,
      Amount: Amount
    };

    confirmData.Token = generateToken(confirmData);

    console.log('📤 Подтверждение платежа:', { PaymentId, Amount });

    const response = await axios.post(`${CONFIG.BASE_URL}Confirm`, confirmData);

    if (response.data.Success) {
      res.json({
        Success: true,
        ErrorCode: '0',
        Status: response.data.Status,
        PaymentId: PaymentId
      });
    } else {
      throw new Error(response.data.Message || 'Ошибка подтверждения платежа');
    }

  } catch (error) {
    console.error('❌ Ошибка подтверждения:', error.message);
    res.json({
      Success: false,
      ErrorCode: 'CONFIRM_ERROR',
      Message: error.message
    });
  }
});

// ✅ 3. ENDPOINT ДЛЯ ПОЛУЧЕНИЯ СТАТУСА ПЛАТЕЖА
app.post('/get-state', async (req, res) => {
  try {
    const { PaymentId } = req.body;

    if (!PaymentId) {
      return res.json({
        Success: false,
        ErrorCode: 'MISSING_PAYMENT_ID',
        Message: 'PaymentId обязателен'
      });
    }

    const stateData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      PaymentId: PaymentId
    };

    stateData.Token = generateToken(stateData);

    const response = await axios.post(`${CONFIG.BASE_URL}GetState`, stateData);

    res.json({
      Success: true,
      Status: response.data.Status,
      PaymentId: PaymentId,
      OrderId: response.data.OrderId,
      Amount: response.data.Amount,
      OriginalAmount: response.data.OriginalAmount,
      ErrorCode: response.data.ErrorCode || '0'
    });

  } catch (error) {
    console.error('❌ Ошибка получения статуса:', error.message);
    res.json({
      Success: false,
      ErrorCode: 'STATE_ERROR',
      Message: error.message
    });
  }
});

// ✅ 4. CALLBACK ДЛЯ УВЕДОМЛЕНИЙ ОТ TINKOFF
app.post('/payment-callback', (req, res) => {
  try {
    const callbackData = req.body;
    console.log('🔔 Callback от Tinkoff:', callbackData);

    // ✅ ПРОВЕРЯЕМ ПОДПИСЬ CALLBACK
    const receivedToken = callbackData.Token;
    const checkData = { ...callbackData };
    delete checkData.Token;
    
    const calculatedToken = generateToken(checkData);
    
    if (receivedToken !== calculatedToken) {
      console.error('❌ Неверная подпись в callback');
      return res.status(400).json({ Success: false });
    }

    // ✅ ОБРАБАТЫВАЕМ СТАТУС ПЛАТЕЖА
    switch (callbackData.Status) {
      case 'CONFIRMED':
        console.log(`✅ Платеж ${callbackData.PaymentId} подтвержден`);
        // Здесь можно обновить статус заказа в БД
        break;
      case 'AUTHORIZED':
        console.log(`🟡 Платеж ${callbackData.PaymentId} авторизован`);
        break;
      case 'REJECTED':
        console.log(`❌ Платеж ${callbackData.PaymentId} отклонен`);
        break;
      case 'REFUNDED':
        console.log(`↩️ Платеж ${callbackData.PaymentId} возвращен`);
        break;
    }

    // ✅ ВСЕГДА ВОЗВРАЩАЕМ УСПЕХ TINKOFF
    res.json({ Success: true });

  } catch (error) {
    console.error('❌ Ошибка обработки callback:', error);
    res.json({ Success: false });
  }
});

// ✅ 5. ENDPOINT ДЛЯ SpeedPay ИНТЕГРАЦИИ
app.get('/speedpay-config', (req, res) => {
  res.json({
    terminalKey: CONFIG.TERMINAL_KEY,
    baseUrl: 'https://housedraw2-production.up.railway.app',
    endpoints: {
      init: '/init-payment',
      confirm: '/confirm-payment',
      getState: '/get-state',
      callback: '/payment-callback'
    }
  });
});

// ✅ 6. HTML СТРАНИЦА С SpeedPay ДЛЯ ТЕСТИРОВАНИЯ
app.get('/speedpay-demo', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Tinkoff SpeedPay Demo</title>
        <script src="https://static.tinkoff.ru/js/pay-form/0.2.0/pay-form.js"></script>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .container { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
            button { background: #FFDD2D; color: #333; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 10px 0; }
            .status { margin: 20px 0; padding: 15px; border-radius: 5px; }
            .success { background: #e8f5e8; color: #27ae60; }
            .error { background: #ffe8e8; color: #e74c3c; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>🎯 Tinkoff SpeedPay Demo</h2>
            <p>Тестирование интеграции SpeedPay</p>
            
            <div>
                <label>Email:</label>
                <input type="email" id="email" value="test@test.com" style="padding: 10px; width: 100%; margin: 10px 0;">
            </div>
            
            <button onclick="initSpeedPay()">🚀 Инициализировать SpeedPay</button>
            
            <div id="payment-container"></div>
            <div id="status"></div>
        </div>

        <script>
            const config = {
                terminalKey: '${CONFIG.TERMINAL_KEY}',
                view: 'button',
                size: 'large',
                payment: {
                    amount: 1000,
                    order: 'SPEEDPAY_' + Date.now(),
                    description: 'Тест SpeedPay'
                },
                features: {
                    showEmail: true,
                    showPhone: false
                }
            };

            async function initSpeedPay() {
                const email = document.getElementById('email').value;
                const statusDiv = document.getElementById('status');
                
                try {
                    statusDiv.innerHTML = '<div class="status">⏳ Инициализация платежа...</div>';
                    
                    // Инициализируем платеж через наш бэкенд
                    const response = await fetch('/init-payment', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            Price: '10',
                            Email: email,
                            FormName: 'SpeedPay тест'
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.Success && result.PaymentURL) {
                        statusDiv.innerHTML = '<div class="status success">✅ Платеж создан! Перенаправляем...</div>';
                        // Открываем страницу оплаты Tinkoff
                        window.location.href = result.PaymentURL;
                    } else {
                        throw new Error(result.Message || 'Ошибка создания платежа');
                    }
                    
                } catch (error) {
                    statusDiv.innerHTML = '<div class="status error">❌ ' + error.message + '</div>';
                }
            }

            // Автоматическая инициализация при загрузке
            document.addEventListener('DOMContentLoaded', function() {
                console.log('SpeedPay demo загружен');
            });
        </script>
    </body>
    </html>
  `);
});

// ✅ 7. СТАТУС СЕРВЕРА
app.get('/status', (req, res) => {
  res.json({ 
    status: 'OK',
    server: 'Tinkoff SpeedPay Backend',
    timestamp: new Date().toISOString(),
    features: [
      'SpeedPay инициализация',
      'Подтверждение платежей', 
      'Получение статуса',
      'Callback обработка',
      'HTML демо-страница'
    ]
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 SpeedPay Backend запущен на порту 3000');
  console.log('📍 Демо страница: https://housedraw2-production.up.railway.app/speedpay-demo');
  console.log('📍 Конфиг: https://housedraw2-production.up.railway.app/speedpay-config');
});