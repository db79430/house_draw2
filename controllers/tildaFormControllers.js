// controllers/TildaController.js
import TildaFormService from '../services/TildaFormService.js';
import TinkoffService from '../services/TinkoffService.js';
import TokenGenerator from '../utils/tokenGenerator.js';
import CONFIG from '../config/index.js';
import User from '../models/Users.js';
import Payment from '../models/Payment.js';

class TildaController {
  /**
   * Основной метод для обработки вебхука от Tilda
   */
  async handleTildaWebhook(req, res) {
    console.log('🔍 Получен вебхук от Tilda...');
    
    try {
      console.log('📥 Raw данные от Tilda:', req.body);
      if (!this.verifyTildaSignature(req)) {
        console.warn('❌ Неверная подпись запроса от Tilda');
        return res.status(401).json({
          Success: false,
          Message: 'Invalid signature'
        });
      }

      // Нормализуем данные из Tilda (разные форматы)
      const { formData, tildaData } = this.normalizeTildaData(req.body);
      
      console.log('🔄 Нормализованные данные:', { formData, tildaData });

      // Валидация формы
      const validationErrors = TildaFormService.validateFormData(formData);
      if (validationErrors.length > 0) {
        return res.json({
          Success: false,
          ErrorCode: 'VALIDATION_ERROR',
          Message: validationErrors.join(', '),
          Details: validationErrors
        });
      }

      // Проверяем существующего пользователя
      const existingUser = await TildaFormService.findUserByFormData(formData);
      if (existingUser) {
        return res.json({
          Success: false,
          ErrorCode: 'USER_EXISTS', 
          Message: 'Пользователь с таким email или телефоном уже зарегистрирован'
        });
      }

      // Создаем пользователя
      const userResult = await TildaFormService.createUserFromForm(formData, tildaData);
      
      // Создаем платеж в Тинькофф
      const paymentResult = await this.createTinkoffPayment(userResult.user, formData);
      
      // Обновляем пользователя с payment_id
      await User.updateTinkoffPaymentId(userResult.user.id, paymentResult.tinkoffPaymentId);

      // Сохраняем платеж в БД
      await Payment.create({
        orderId: paymentResult.orderId,
        userId: userResult.user.id,
        amount: paymentResult.amount,
        tinkoffPaymentId: paymentResult.tinkoffPaymentId,
        description: 'Вступительный взнос в клуб',
        status: 'pending'
      });

      // Успешный ответ для Tilda
      console.log('✅ Платеж создан для Tilda');
      return res.json({
        Success: true,
        PaymentURL: paymentResult.paymentUrl,
        RedirectUrl: paymentResult.paymentUrl, // Дублируем для совместимости
        Status: 'redirect',
        PaymentId: paymentResult.tinkoffPaymentId,
        OrderId: paymentResult.orderId,
        Message: 'Платеж успешно создан'
      });

    } catch (error) {
      console.error('❌ Ошибка обработки вебхука:', error);
      return res.json({
        Success: false,
        ErrorCode: 'PROCESSING_ERROR',
        Message: error.message
      });
    }
  }

  verifyTildaSignature(req) {
    // Если в Tilda настроена подпись запросов
    const signature = req.headers['x-tilda-signature'];
    const publicKey = req.headers['x-tilda-public-key'];
    
    if (CONFIG.TILDA.VERIFY_SIGNATURE && signature) {
      // Здесь должна быть логика проверки подписи
      // Tilda использует HMAC-SHA256 для подписи
      console.log('🔐 Проверка подписи Tilda:', { signature, publicKey });
      
      // Временная заглушка - всегда возвращаем true для тестирования
      // В продакшене нужно реализовать настоящую проверку
      return true;
    }
    
    return true; // Если проверка подписи не настроена
  }

  /**
   * Нормализация данных из Tilda (поддерживает разные форматы)
   */
  normalizeTildaData(tildaData) {
    let formData = {};
    let tildaMeta = {};

    // Формат 1: Прямые поля (новый формат Tilda)
    if (tildaData.name || tildaData.email || tildaData.phone) {
      formData = {
        FullName: tildaData.name || '',
        Email: tildaData.email || '',
        Phone: tildaData.phone || tildaData.tel || '',
        Age: tildaData.age || '',
        Yeardate: tildaData.yeardate || tildaData.birthdate || '',
        City: tildaData.city || '',
        Conditions: this.normalizeCheckbox(tildaData.conditions || tildaData.agree),
        Checkbox: this.normalizeCheckbox(tildaData.checkbox || tildaData.personaldata)
      };
    } 
    // Формат 2: Вложенные fields (старый формат)
    else if (tildaData.fields) {
      formData = {
        FullName: tildaData.fields.name || tildaData.fields.Name || '',
        Email: tildaData.fields.email || tildaData.fields.Email || '',
        Phone: tildaData.fields.phone || tildaData.fields.Phone || tildaData.fields.tel || '',
        Age: tildaData.fields.age || tildaData.fields.Age || '',
        Yeardate: tildaData.fields.yeardate || tildaData.fields.Yeardate || '',
        City: tildaData.fields.city || tildaData.fields.City || '',
        Conditions: this.normalizeCheckbox(tildaData.fields.conditions || tildaData.fields.agree),
        Checkbox: this.normalizeCheckbox(tildaData.fields.checkbox || tildaData.fields.personaldata)
      };
    }
    // Формат 3: Formparams (альтернативный формат)
    else if (tildaData.formparams) {
      Object.keys(tildaData.formparams).forEach(key => {
        const match = key.match(/\[(.*?)\]/);
        if (match) {
          formData[match[1]] = tildaData.formparams[key];
        }
      });
    }

    // Мета-данные Tilda
    tildaMeta = {
      formid: tildaData.formid || CONFIG.TILDA?.FORM_ID || 'bf403',
      pageid: tildaData.pageid || '',
      tranid: tildaData.tranid || '',
      projectid: tildaData.projectid || CONFIG.TILDA?.PROJECT_ID || '14245141'
    };

    return { formData, tildaData: tildaMeta };
  }

  /**
   * Нормализация чекбоксов (Tilda отправляет 'on' для отмеченных)
   */
  normalizeCheckbox(value) {
    if (value === 'on' || value === 'yes' || value === true) {
      return 'yes';
    }
    return 'no';
  }

  /**
   * Создание платежа в Тинькофф
   */
  async createTinkoffPayment(user, formData) {
    const orderId = TokenGenerator.generateOrderId();
    const amount = 1000;

    const paymentData = {
      Amount: amount,
      OrderId: orderId,
      Description: 'Вступительный взнос в клуб',
      SuccessURL: CONFIG.APP.SUCCESS_URL,
      FailURL: CONFIG.APP.FAIL_URL,
      NotificationURL: `${CONFIG.APP.BASE_URL}/tinkoff-callback`,
      DATA: {
        Name: user.fullname,
        Email: user.email,
        Phone: user.phone,
        UserId: user.id,
        FormId: 'bf403'
      }
    };

    console.log('📤 Отправка в Tinkoff:', paymentData);
    
    const tinkoffResponse = await TinkoffService.initPayment(paymentData);
    
    if (!tinkoffResponse.Success) {
      throw new Error(tinkoffResponse.Message || 'Ошибка создания платежа в Тинькофф');
    }

    return {
      orderId,
      amount,
      tinkoffPaymentId: tinkoffResponse.PaymentId,
      paymentUrl: tinkoffResponse.PaymentURL
    };
  }

  /**
   * Валидация формы без создания платежа
   */
  async validateForm(req, res) {
    try {
      const { formData, tildaData } = this.normalizeTildaData(req.body);
      
      const validationErrors = TildaFormService.validateFormData(formData);
      
      if (validationErrors.length > 0) {
        return res.json({
          Success: false,
          Valid: false,
          Errors: validationErrors
        });
      }

      const existingUser = await TildaFormService.findUserByFormData(formData);
      if (existingUser) {
        return res.json({
          Success: false,
          Valid: false,
          Errors: ['Пользователь с таким email или телефоном уже зарегистрирован']
        });
      }

      res.json({
        Success: true,
        Valid: true,
        Message: 'Форма валидна'
      });

    } catch (error) {
      res.json({
        Success: false,
        Valid: false,
        Errors: [error.message]
      });
    }
  }

  /**
   * Проверка статуса платежа
   */
  async checkPaymentStatus(req, res) {
    try {
      const { OrderId, Email, Phone } = req.body;
      
      let user;
      if (OrderId) {
        user = await User.findByOrderId(OrderId);
      } else if (Email) {
        user = await User.findByEmail(Email);
      } else if (Phone) {
        user = await User.findByPhone(Phone);
      }

      if (!user) {
        return res.json({ 
          Success: false, 
          Message: 'Пользователь не найден' 
        });
      }

      if (user.payment_id) {
        const state = await TinkoffService.getPaymentState(user.payment_id);
        
        res.json({
          Success: true,
          TinkoffStatus: state.Status,
          User: {
            name: user.fullname,
            email: user.email,
            phone: user.phone,
            payment_status: user.payment_status,
            membership_status: user.membership_status
          }
        });
      } else {
        res.json({
          Success: true,
          TinkoffStatus: 'UNKNOWN',
          User: user
        });
      }
      
    } catch (error) {
      res.json({
        Success: false,
        Message: error.message
      });
    }
  }
}

export default TildaController();