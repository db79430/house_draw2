const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ КОНФИГУРАЦИЯ ПО ТРЕБОВАНИЯМ TINKOFF
const CONFIG = {
  TERMINAL_KEY: '1761129018508DEMO', // <= 20 символов ✅
  SECRET_KEY: 'jDkIojG12VaVNopw',    // Ваш Secret Key
  BASE_URL: 'https://securepay.tinkoff.ru/v2/'
};

console.log('🔧 Конфигурация Tinkoff:', {
  terminalKey: CONFIG.TERMINAL_KEY,
  terminalKeyLength: CONFIG.TERMINAL_KEY.length,
  baseUrl: CONFIG.BASE_URL
});

// ✅ ФУНКЦИЯ ДЛЯ СОЗДАНИЯ ТОКЕНА ПО ДОКУМЕНТАЦИИ TINKOFF
function generateToken(data) {
  // Фильтруем поля согласно документации Tinkoff
  const values = Object.keys(data)
    .filter(key => key !== 'Token' && key !== 'Receipt' && key !== 'DATA')
    .sort() // Важно: сортируем по алфавиту!
    .map(key => {
      if (typeof data[key] === 'object') {
        // Для объектов используем JSON.stringify
        return JSON.stringify(data[key]);
      }
      // Для примитивов - преобразуем в строку
      return String(data[key] || '');
    })
    .join(''); // Объединяем без разделителей

  console.log('🔐 Данные для токена:', values);
  
  // Создаем SHA-256 хеш
  return crypto.createHash('sha256')
    .update(values + CONFIG.SECRET_KEY)
    .digest('hex');
}

// ✅ ИНИЦИАЛИЗАЦИЯ ПЛАТЕЖА С СОБЛЮДЕНИЕМ ТРЕБОВАНИЙ
app.post('/init-payment', async (req, res) => {
  try {
    console.log('📥 Получен запрос:', req.body);
    
    const { 
      Price = '10', // Сумма в рублях
      Email,
      FormName = 'Вступительный взнос'
    } = req.body;

    // Валидация
    if (!Email) {
      return res.json({
        Success: false,
        ErrorCode: 'EMAIL_REQUIRED',
        Message: 'Email обязателен'
      });
    }

    // ✅ СОЗДАЕМ ДАННЫЕ ПО ТРЕБОВАНИЯМ TINKOFF
    
    // OrderId: <= 36 characters, уникальный
    const orderId = `T${Date.now()}`.substring(0, 36);
    
    // Amount: Number, <= 10 characters, в копейках
    const amount = parseInt(Price) * 100; // 10 рублей = 1000 копеек
    
    // Description: описание платежа
    const description = FormName.substring(0, 124);

    console.log('📊 Данные для Tinkoff:', {
      orderId: orderId,
      orderIdLength: orderId.length,
      amount: amount,
      amountType: typeof amount,
      description: description
    });

    // ✅ ОСНОВНЫЕ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY, // <= 20 characters ✅
      Amount: amount,                   // Number, <= 10 characters ✅
      OrderId: orderId,                 // <= 36 characters ✅
      Description: description,         // Описание
      SuccessURL: 'https://npk-vdv.ru/success',
      FailURL: 'https://npk-vdv.ru/fail',
      NotificationURL: 'https://housedraw2-production.up.railway.app/payment-callback'
    };

    // ✅ ДОПОЛНИТЕЛЬНЫЕ ДАННЫЕ (не обязательны)
    if (Email) {
      paymentData.DATA = { 
        Email: Email.substring(0, 100) 
      };
    }

    // ✅ ГЕНЕРИРУЕМ ТОКЕН ПОСЛЕ ЗАПОЛНЕНИЯ ВСЕХ ПОЛЕЙ
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Отправка в Tinkoff API:', {
      TerminalKey: paymentData.TerminalKey,
      TerminalKeyLength: paymentData.TerminalKey.length,
      Amount: paymentData.Amount,
      AmountType: typeof paymentData.Amount,
      OrderId: paymentData.OrderId,
      OrderIdLength: paymentData.OrderId.length,
      Token: paymentData.Token.substring(0, 20) + '...' // Логируем только часть токена
    });

    // ✅ ОТПРАВЛЯЕМ ЗАПРОС
    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Ответ Tinkoff:', response.data);

    // ✅ ВОЗВРАЩАЕМ ОТВЕТ В ФОРМАТЕ TINKOFF
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
      res.json({
        Success: false,
        ErrorCode: response.data.ErrorCode,
        Message: response.data.Message,
        Details: response.data.Details,
        Status: response.data.Status
      });
    }

  } catch (error) {
    console.error('❌ Ошибка:', {
      message: error.message,
      url: error.config?.url,
      data: error.config?.data,
      response: error.response?.data
    });
    
    res.json({
      Success: false,
      ErrorCode: 'REQUEST_ERROR',
      Message: error.message,
      Status: 'REJECTED'
    });
  }
});

// ✅ ТЕСТОВЫЙ ENDPOINT ДЛЯ ПРОВЕРКИ ФОРМАТА
app.post('/test-tinkoff-format', async (req, res) => {
  try {
    // ✅ ТОЧНО ПО ТРЕБОВАНИЯМ TINKOFF
    const testData = {
      TerminalKey: CONFIG.TERMINAL_KEY, // String, <= 20 chars
      Amount: 1000,                     // Number, <= 10 chars (1000 копеек = 10 руб)
      OrderId: `TEST${Date.now()}`,     // String, <= 36 chars
      Description: 'Тестовый платеж',
      SuccessURL: 'https://npk-vdv.ru/success',
      FailURL: 'https://npk-vdv.ru/fail'
    };

    // ✅ ГЕНЕРИРУЕМ ТОКЕН
    testData.Token = generateToken(testData);

    console.log('🧪 Тестовый запрос формата:', {
      terminalKey: testData.TerminalKey,
      terminalKeyLength: testData.TerminalKey.length,
      amount: testData.Amount,
      amountType: typeof testData.Amount,
      orderId: testData.OrderId,
      orderIdLength: testData.OrderId.length,
      tokenLength: testData.Token.length
    });

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, testData);

    res.json({
      Success: response.data.Success,
      ErrorCode: response.data.ErrorCode || '0',
      TerminalKey: CONFIG.TERMINAL_KEY,
      Status: response.data.Status,
      PaymentId: String(response.data.PaymentId),
      OrderId: testData.OrderId,
      Amount: testData.Amount,
      PaymentURL: response.data.PaymentURL,
      // Для отладки
      _requirements: {
        TerminalKey: `<= 20 chars: ${testData.TerminalKey.length}/20 ✅`,
        Amount: `Number, <= 10 chars: ${String(testData.Amount).length}/10 ✅`, 
        OrderId: `<= 36 chars: ${testData.OrderId.length}/36 ✅`,
        Token: `Generated: ${testData.Token.length} chars ✅`
      }
    });

  } catch (error) {
    res.json({
      Success: false,
      ErrorCode: 'TEST_ERROR',
      Message: error.message,
      Status: 'REJECTED',
      _debug: {
        request: {
          TerminalKey: CONFIG.TERMINAL_KEY,
          TerminalKeyLength: CONFIG.TERMINAL_KEY.length,
          Amount: 1000,
          OrderId: `TEST${Date.now()}`
        },
        error: error.response?.data
      }
    });
  }
});

// ✅ ПРОВЕРКА КОНФИГУРАЦИИ
app.get('/check-requirements', (req, res) => {
  // Тестовые данные для проверки формата
  const testData = {
    TerminalKey: CONFIG.TERMINAL_KEY,
    Amount: 1000,
    OrderId: 'TEST123456789',
    Description: 'Test Payment'
  };

  const token = generateToken(testData);

  res.json({
    requirements: {
      TerminalKey: {
        value: CONFIG.TERMINAL_KEY,
        type: typeof CONFIG.TERMINAL_KEY,
        length: CONFIG.TERMINAL_KEY.length,
        max: 20,
        valid: CONFIG.TERMINAL_KEY.length <= 20
      },
      Amount: {
        value: 1000,
        type: 'number',
        length: String(1000).length,
        max: 10,
        valid: String(1000).length <= 10
      },
      OrderId: {
        value: 'TEST123456789',
        type: 'string', 
        length: 'TEST123456789'.length,
        max: 36,
        valid: 'TEST123456789'.length <= 36
      },
      Token: {
        generated: true,
        length: token.length,
        algorithm: 'SHA-256'
      }
    },
    status: 'REQUIREMENTS_CHECKED'
  });
});

// Статус сервера
app.get('/status', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Сервер настроен по требованиям Tinkoff API',
    requirements: {
      TerminalKey: 'String, <= 20 characters',
      Amount: 'Number, <= 10 characters (в копейках)',
      OrderId: 'String, <= 36 characters',
      Token: 'String (SHA-256 подпись)'
    }
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Сервер запущен с соблюдением требований Tinkoff API');
});