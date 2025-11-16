import CONFIG from '../config/index.js'
import Helpers from '../utils/Helpers.js';
import Payment from '../models/Payment.js';
import TildaFormService from '../services/TildaFormService.js';
import TinkoffService from '../services/TinkoffService.js';
import User from '../models/Users.js';



class TildaController {
  async processFormAndPayment(req, res) {
    try {
      console.log('📥 Данные из Tilda формы bf403:', req.body);

      // Данные из Tilda формы
      const formData = {
        FullName: req.body.name || req.body.FullName,
        Email: req.body.email || req.body.Email,
        Phone: req.body.phone || req.body.Phone || req.body.tel,
        Yeardate: req.body.yeardate || req.body.Yeardate || req.body.date,
        City: req.body.city || req.body.City,
        Conditions: req.body.conditions || req.body.Conditions || req.body.agree,
        Checkbox: req.body.checkbox || req.body.Checkbox
      };

      // Tilda системные данные
      const tildaData = {
        formid: req.body.formid || CONFIG.TILDA.FORM_ID,
        pageid: req.body.pageid,
        tranid: req.body.tranid
      };

      // Валидация формы
      const validationErrors = TildaFormService.validateFormData(formData);
      if (validationErrors.length > 0) {
        return res.json({
          Success: false,
          ErrorCode: 'VALIDATION_ERROR',
          Message: validationErrors.join(', ')
        });
      }

      // Проверяем, не регистрировался ли пользователь ранее
      const existingUser = await TildaFormService.findUserByFormData(formData);
      if (existingUser) {
        return res.json({
          Success: false,
          ErrorCode: 'USER_EXISTS',
          Message: 'Пользователь с таким email или телефоном уже зарегистрирован'
        });
      }

      // Создаем пользователя из данных формы
      const userResult = await TildaFormService.createUserFromForm(formData, tildaData);
      
      // Генерируем OrderId для платежа
      const orderId = Helpers.generateOrderId();
      const amount = 1000; // 10 рублей в копейках

      // Подготавливаем данные для Tinkoff
      const paymentData = {
        Amount: amount,
        OrderId: orderId,
        Description: 'Вступительный взнос в клуб',
        SuccessURL: CONFIG.APP.SUCCESS_URL,
        FailURL: CONFIG.APP.FAIL_URL,
        NotificationURL: `${CONFIG.APP.BASE_URL}/payment-notification`,
        DATA: {
          Name: userResult.user.fullname,
          Email: userResult.user.email,
          Phone: userResult.user.phone
        }
      };

      // Инициализируем платеж в Tinkoff
      const tinkoffResponse = await TinkoffService.initPayment(paymentData);

      if (tinkoffResponse.Success) {
        // Обновляем payment_id пользователя
        await User.updateTinkoffPaymentId(userResult.user.id, tinkoffResponse.PaymentId);

        // Создаем запись о платеже
        await Payment.create({
          orderId: orderId,
          userId: userResult.user.id,
          amount: amount,
          tinkoffPaymentId: tinkoffResponse.PaymentId,
          description: 'Вступительный взнос в клуб',
          tinkoffResponse: tinkoffResponse
        });

        res.json({
          Success: true,
          PaymentId: tinkoffResponse.PaymentId,
          OrderId: orderId,
          Amount: amount,
          PaymentURL: tinkoffResponse.PaymentURL,
          User: {
            id: userResult.user.id,
            email: userResult.user.email,
            login: userResult.credentials.login
          }
        });
      } else {
        throw new Error(tinkoffResponse.Message || 'Ошибка инициализации платежа');
      }

    } catch (error) {
      console.error('❌ Ошибка обработки формы и платежа:', error.message);
      
      res.json({
        Success: false,
        ErrorCode: 'PROCESSING_ERROR',
        Message: error.message
      });
    }
  }

  async handleTildaWebhook(req, res) {
    try {
      console.log('📨 Tilda webhook received:', req.body);

      // Tilda отправляет данные в формате formparams[name]=value
      const formData = {};
      if (req.body.formparams) {
        Object.keys(req.body.formparams).forEach(key => {
          const match = key.match(/\[(.*?)\]/);
          if (match) {
            formData[match[1]] = req.body.formparams[key];
          }
        });
      }

      // Добавляем системные поля
      formData.formid = req.body.formid;
      formData.pageid = req.body.pageid;

      // Обрабатываем форму
      await this.processFormAndPayment({ body: formData }, res);

    } catch (error) {
      console.error('❌ Ошибка обработки Tilda webhook:', error);
      res.json({
        Success: false,
        ErrorCode: 'WEBHOOK_ERROR',
        Message: error.message
      });
    }
  }

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

      // Если есть payment_id, проверяем статус в Tinkoff
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
            membership_status: user.membership_status,
            login: user.login
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

export default TildaController;