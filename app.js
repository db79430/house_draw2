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
  BASE_URL: 'https://securepay.tinkoff.ru/v2/Init'
};

console.log('🔧 Server started with TerminalKey:', CONFIG.TERMINAL_KEY);

// ✅ ГЕНЕРАЦИЯ OrderId ТОЛЬКО ИЗ ЦИФР
function generateOrderId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

// ✅ ПРАВИЛЬНАЯ ГЕНЕРАЦИЯ ТОКЕНА согласно документации Tinkoff
function generateToken(paymentData) {
  // 1. Создаем массив объектов ключ:значение (только корневые поля)
  const tokenArray = [
    { TerminalKey: paymentData.TerminalKey },
    { Amount: paymentData.Amount.toString() },
    { OrderId: paymentData.OrderId },
    { Description: paymentData.Description }
  ];

  // 2. Добавляем пароль в массив
  tokenArray.push({ Password: CONFIG.SECRET_KEY });

  // 3. Сортируем массив по ключу в алфавитном порядке
  tokenArray.sort((a, b) => {
    const keyA = Object.keys(a)[0];
    const keyB = Object.keys(b)[0];
    return keyA.localeCompare(keyB);
  });

  // 4. Конкатенируем значения в одну строку
  let values = '';
  tokenArray.forEach(item => {
    const key = Object.keys(item)[0];
    const value = item[key];
    values += value.toString();
  });

  console.log('🔐 Token array:', tokenArray);
  console.log('🔐 Concatenated values:', values);

  // 5. Применяем SHA-256
  const token = crypto.createHash('sha256')
    .update(values)
    .digest('hex');

  console.log('🔐 Generated token:', token);
  return token;
}

// ✅ ENDPOINT С ПРАВИЛЬНОЙ ГЕНЕРАЦИЕЙ ТОКЕНА
app.post('/init-payment', async (req, res) => {
  try {
    console.log('📥 Received request:', req.body);
    
    const { 
      Email,
      Phone,
      ProductName = 'Вступительный взнос',
      Price = 1000
    } = req.body;

    const orderId = generateOrderId();
    const amount = Price;

    console.log('📋 OrderId:', orderId, 'Amount:', amount);

    // ✅ ФОРМИРУЕМ ДАННЫЕ ДЛЯ ЗАПРОСА
    const paymentData = {
      TerminalKey: CONFIG.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: ProductName.substring(0, 250),
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html'
    };

    // ✅ ДОБАВЛЯЕМ DATA ЕСЛИ ЕСТЬ (не участвует в токене!)
    if (Email || Phone) {
      paymentData.DATA = {};
      if (Email) paymentData.DATA.Email = Email;
      if (Phone) paymentData.DATA.Phone = Phone;
    }

    // ✅ ГЕНЕРИРУЕМ ТОКЕН ПРАВИЛЬНЫМ МЕТОДОМ
    paymentData.Token = generateToken(paymentData);

    console.log('📤 Final request to Tinkoff:', JSON.stringify(paymentData, null, 2));

    const response = await axios.post(`${CONFIG.BASE_URL}Init`, paymentData, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Tinkoff response:', response.data);

    if (response.data.Success) {
      res.json({
        Success: true,
        PaymentId: response.data.PaymentId,
        OrderId: orderId,
        Amount: amount,
        PaymentURL: response.data.PaymentURL
      });
    } else {
      res.json({
        Success: false,
        ErrorCode: response.data.ErrorCode,
        Message: response.data.Message,
        Details: response.data.Details
      });
    }

  } catch (error) {
    console.error('❌ Server error:', error.message);
    
    res.json({
      Success: false,
      ErrorCode: 'SERVER_ERROR',
      Message: error.message,
      Details: error.response?.data
    });
  }
});

// ✅ ENDPOINT ДЛЯ ТЕСТИРОВАНИЯ ТОКЕНА
app.post('/test-token', (req, res) => {
  const testData = {
    TerminalKey: CONFIG.TERMINAL_KEY,
    Amount: 1000,
    OrderId: '123456789',
    Description: 'Test Payment'
  };

  const token = generateToken(testData);

  // Показываем процесс генерации
  const tokenArray = [
    { TerminalKey: testData.TerminalKey },
    { Amount: testData.Amount.toString() },
    { OrderId: testData.OrderId },
    { Description: testData.Description },
    { Password: CONFIG.SECRET_KEY }
  ];

  tokenArray.sort((a, b) => {
    const keyA = Object.keys(a)[0];
    const keyB = Object.keys(b)[0];
    return keyA.localeCompare(keyB);
  });

  let values = '';
  tokenArray.forEach(item => {
    const key = Object.keys(item)[0];
    const value = item[key];
    values += value.toString();
  });

  res.json({
    testData: testData,
    tokenGenerationProcess: {
      step1_initialArray: [
        { TerminalKey: testData.TerminalKey },
        { Amount: testData.Amount.toString() },
        { OrderId: testData.OrderId },
        { Description: testData.Description },
        { Password: '***' + CONFIG.SECRET_KEY.slice(-4) }
      ],
      step2_sortedArray: tokenArray.map(item => {
        const key = Object.keys(item)[0];
        const value = item[key];
        return { [key]: key === 'Password' ? '***' + value.slice(-4) : value };
      }),
      step3_concatenatedString: values.replace(CONFIG.SECRET_KEY, '***' + CONFIG.SECRET_KEY.slice(-4)),
      step4_finalToken: token
    }
  });
});

// ✅ ENDPOINT С ПРИМЕРОМ ИЗ ДОКУМЕНТАЦИИ
app.post('/test-doc-example', (req, res) => {
  // Пример из документации
  const docExample = {
    TerminalKey: "MerchantTerminalKey",
    Amount: 19200,
    OrderId: "00000",
    Description: "Подарочная карта на 1000 рублей",
    Password: "11111111111111"
  };

  const tokenArray = [
    { TerminalKey: docExample.TerminalKey },
    { Amount: docExample.Amount.toString() },
    { OrderId: docExample.OrderId },
    { Description: docExample.Description },
    { Password: docExample.Password }
  ];

  tokenArray.sort((a, b) => {
    const keyA = Object.keys(a)[0];
    const keyB = Object.keys(b)[0];
    return keyA.localeCompare(keyB);
  });

  let values = '';
  tokenArray.forEach(item => {
    const key = Object.keys(item)[0];
    const value = item[key];
    values += value.toString();
  });

  const expectedToken = "72dd466f8ace0a37a1f740ce5fb78101712bc0665d91a8108c7c8a0ccd426db2";
  const actualToken = crypto.createHash('sha256').update(values).digest('hex');

  res.json({
    documentationExample: {
      initialData: docExample,
      sortedArray: tokenArray,
      concatenatedString: values,
      expectedToken: expectedToken,
      actualToken: actualToken,
      match: expectedToken === actualToken
    }
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Server running on port 3000');
});