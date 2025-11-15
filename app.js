const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const CONFIG = {
  TERMINAL_KEY: '1761129018508DEMO',
  SECRET_KEY: 'jDkIojG12VaVNopw',
  BASE_URL: 'https://securepay.tinkoff.ru/v2/'
};

console.log('🔧 Server started with TerminalKey:', CONFIG.TERMINAL_KEY);

// ✅ ГЕНЕРАЦИЯ OrderId ТОЛЬКО ИЗ ЦИФР
function generateOrderId() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return timestamp + random;
}

// ✅ ПРАВИЛЬНАЯ ФУНКЦИЯ ДЛЯ ТОКЕНА (согласно документации)
function generateToken(data) {
  // Убираем Token из данных для подписи
  const dataForToken = { ...data };
  delete dataForToken.Token;
  delete dataForToken.Receipt; // Receipt не участвует в подписи
  
  // Сортируем поля в алфавитном порядке
  const sortedKeys = Object.keys(dataForToken).sort();
  
  let values = '';
  sortedKeys.forEach(key => {
    const value = dataForToken[key];
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'object') {
        values += JSON.stringify(value);
      } else {
        values += String(value);
      }
    }
  });
  
  // Добавляем секретный ключ в конец
  values += CONFIG.SECRET_KEY;
  
  console.log('🔐 Data for token:', values);
  
  return crypto.createHash('sha256')
    .update(values)
    .digest('hex');
}

// ✅ ИСПРАВЛЕННЫЙ ENDPOINT С ПРАВИЛЬНЫМ ФОРМАТОМ
app.post('/init-payment', async (req, res) => {
  try {
    console.log('📥 Received request:', req.body);
    
    const { 
      Email,
      Phone,
      ProductName = 'Вступительный взнос',
      Price = 1000
    } = req.body;

    // ✅ ПРАВИЛЬНЫЙ OrderId ТОЛЬКО ИЗ ЦИФР
    const orderId = generateOrderId();
    const amount = Price; // В копейках

    console.log('📋 Generated OrderId:', orderId, 'Length:', orderId.length);

    // ✅ ФОРМАТ СОГЛАСНО ДОКУМЕНТАЦИИ
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: ProductName,
      SuccessURL: 'https://yoursite.tilda.ws/success',
      FailURL: 'https://yoursite.tilda.ws/fail',
      DATA: {
        Phone: Phone || '+79999999999',
        Email: Email || 'customer@example.com'
      },
      Receipt: {
        Email: Email || 'customer@example.com',
        Phone: Phone || '+79999999999',
        Taxation: 'osn',
        Items: [
          {
            Name: ProductName,
            Price: amount,
            Quantity: 1,
            Amount: amount,
            Tax: 'vat10',
            PaymentMethod: 'full_payment',
            PaymentObject: 'service'
          }
        ]
      }
    };

    // ✅ ГЕНЕРИРУЕМ ТОКЕН ПОСЛЕ ЗАПОЛНЕНИЯ ВСЕХ ДАННЫХ
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

// ✅ УПРОЩЕННЫЙ ENDPOINT БЕЗ RECEIPT (если не нужен чек)
app.post('/init-simple', async (req, res) => {
  try {
    const { 
      Email,
      Phone,
      ProductName = 'Вступительный взнос',
      Price = 1000
    } = req.body;

    const orderId = generateOrderId();
    const amount = Price;

    // ✅ УПРОЩЕННЫЙ ФОРМАТ БЕЗ RECEIPT
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: ProductName,
      SuccessURL: 'https://yoursite.tilda.ws/success',
      FailURL: 'https://yoursite.tilda.ws/fail'
    };

    // ✅ ДОБАВЛЯЕМ DATA ЕСЛИ ЕСТЬ ДАННЫЕ
    if (Email || Phone) {
      paymentData.DATA = {};
      if (Email) paymentData.DATA.Email = Email;
      if (Phone) paymentData.DATA.Phone = Phone;
    }

    paymentData.Token = generateToken(paymentData);

    console.log('📤 Simple request:', paymentData);

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData);

    res.json({
      Success: response.data.Success,
      PaymentURL: response.data.PaymentURL,
      Response: response.data
    });

  } catch (error) {
    res.json({
      Success: false,
      Error: error.message,
      Response: error.response?.data
    });
  }
});

// ✅ ПРОВЕРКА ФОРМАТА ДАННЫХ
app.get('/test-format', (req, res) => {
  const testData = {
    TerminalKey: CONFIG.TERMINAL_KEY,
    Amount: 1000,
    OrderId: generateOrderId(),
    Description: "Тестовый платеж",
    DATA: {
      Phone: "+79999999999",
      Email: "test@test.com"
    },
    Receipt: {
      Email: "test@test.com",
      Phone: "+79999999999",
      Taxation: "osn",
      Items: [
        {
          Name: "Тестовый товар",
          Price: 1000,
          Quantity: 1,
          Amount: 1000,
          Tax: "vat10"
        }
      ]
    }
  };

  testData.Token = generateToken(testData);

  res.json({
    exampleFormat: testData,
    requiredFields: ['TerminalKey', 'Amount', 'OrderId', 'Description', 'Token'],
    optionalFields: ['DATA', 'Receipt', 'SuccessURL', 'FailURL']
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Server running on port 3000');
});