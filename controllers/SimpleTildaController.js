import TinkoffService from '../services/TinkoffService.js';
import TokenGenerator from '../utils/tokenGenerator.js';
import CONFIG from '../config/index.js';

const processFormAndPayment = async (req, res) => {
  console.log('🔍 Обработка формы...');
  
  try {
    console.log('📥 Данные:', req.body);
    
    // Простая валидация
    if (!req.body.Email && !req.body.Phone) {
      return res.status(400).json({
        Success: false,
        Message: 'Email или телефон обязателен'
      });
    }

    const orderId = TokenGenerator.generateOrderId();
    const amount = 1000;

    const paymentData = {
      Amount: amount,
      OrderId: orderId,
      Description: 'Вступительный взнос',
      SuccessURL: CONFIG.APP.SUCCESS_URL,
      FailURL: CONFIG.APP.FAIL_URL,
      DATA: {
        Name: req.body.FullName || 'Пользователь',
        Email: req.body.Email || '',
        Phone: req.body.Phone || ''
      }
    };

    console.log('📤 Отправка в Tinkoff:', paymentData);
    
    const tinkoffResponse = await TinkoffService.initPayment(paymentData);
    
    if (tinkoffResponse.Success) {
      console.log('✅ Платеж создан для Tilda');
      
      // Tilda ожидает определенный формат ответа
      return res.json({
        Success: true,
        PaymentURL: tinkoffResponse.PaymentURL,
        RedirectUrl: tinkoffResponse.PaymentURL,
        Status: 'redirect',
        PaymentId: tinkoffResponse.PaymentId,
        OrderId: orderId
      });
    } else {
      throw new Error(tinkoffResponse.Message);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({
      Success: false,
      Message: error.message
    });
  }
};

export default processFormAndPayment ;