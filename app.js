const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();

app.use(cors());
app.use(express.json());

// Конфигурация
const CONFIG = {
  TERMINAL_KEY: '1761129018508DEMO', // Ваш Terminal Key
  SECRET_KEY: 'jDkIojG12VaVNopw',     // Ваш Secret Key
  BASE_URL: 'https://securepay.tinkoff.ru/v2/'
};

// Функция для создания токена
function generateToken(data) {
  const values = Object.keys(data)
    .filter(key => key !== 'Token')
    .sort()
    .map(key => data[key])
    .join('');
  
  return crypto.createHash('sha256')
    .update(values + CONFIG.SECRET_KEY)
    .digest('hex');
}

// Инициализация платежа
app.post('/init-payment', async (req, res) => {
  try {
    const { orderId, amount, customerEmail, customerPhone, description } = req.body;

    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount, // Сумма в копейках
      OrderId: orderId,
      Description: description || 'Оплата заказа',
      DATA: {
        Email: customerEmail,
        Phone: customerPhone
      },
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html', // URL для успешной оплаты
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html'        // URL для неудачной оплаты
    };

    // Генерируем токен
    paymentData.Token = generateToken(paymentData);

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData);

    if (response.data.Success) {
      res.json({
        success: true,
        paymentId: response.data.PaymentId,
        paymentURL: response.data.PaymentURL
      });
    } else {
      throw new Error(response.data.Message || 'Ошибка инициализации платежа');
    }

  } catch (error) {
    console.error('Init payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Обработка уведомлений от Tinkoff (Callback)
app.post('/payment-callback', (req, res) => {
  try {
    const callbackData = req.body;
    
    // Проверяем подпись
    const receivedToken = callbackData.Token;
    delete callbackData.Token;
    
    const calculatedToken = generateToken(callbackData);
    
    if (receivedToken !== calculatedToken) {
      console.error('Invalid token in callback');
      return res.status(400).send('Invalid token');
    }

    // Обрабатываем статус платежа
    switch (callbackData.Status) {
      case 'AUTHORIZED':
      case 'CONFIRMED':
        // Платеж успешен
        console.log(`Payment ${callbackData.PaymentId} successful`);
        // Обновите статус заказа в вашей БД
        break;
      
      case 'REJECTED':
      case 'CANCELED':
        // Платеж отменен/отклонен
        console.log(`Payment ${callbackData.PaymentId} failed`);
        break;
      
      case 'REFUNDED':
        // Произведен возврат
        console.log(`Payment ${callbackData.PaymentId} refunded`);
        break;
    }

    // Всегда возвращаем успешный ответ Tinkoff
    res.json({ Success: true });

  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ Success: false });
  }
});

// Проверка статуса платежа
app.post('/check-payment', async (req, res) => {
  try {
    const { paymentId } = req.body;

    const checkData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      PaymentId: paymentId
    };

    checkData.Token = generateToken(checkData);

    const response = await axios.post(`${CONFIG.BASE_URL}GetState`, checkData);

    res.json({
      success: response.data.Success,
      status: response.data.Status,
      orderId: response.data.OrderId,
      amount: response.data.Amount
    });

  } catch (error) {
    console.error('Check payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});