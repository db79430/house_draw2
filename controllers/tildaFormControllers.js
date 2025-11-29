
// controllers/TildaController.js
import TildaFormService from '../services/TildaFormService.js';
import TinkoffService from '../services/TinkoffService.js';
import TokenGenerator from '../utils/tokenGenerator.js';
import CONFIG from '../config/index.js';
import User from '../models/Users.js';
import Payment from '../models/Payment.js';
import EmailService from '../services/EmailServices.js';

class TildaController {
  async handleTildaWebhook(req, res) {
    console.log('🔍 Получен вебхук от Tilda...');
    
    try {
      console.log('📥 Raw данные от Tilda:', req.body);
      
      // Нормализуем данные из Tilda
      const { formData, tildaData } = this.normalizeTildaData(req.body);
      
      console.log('🔄 Нормализованные данные:', { formData, tildaData });
  
      // Валидация формы
      const validationErrors = TildaFormService.validateFormData(formData);
      if (validationErrors.length > 0) {
        return res.json({
          "formid": req.body.formid || "tilda-form",
          "type": "error", 
          "Errors": validationErrors
        });
      }
  
      // Проверка существующего пользователя
      const existingUserCheck = await this.checkExistingUserAndPayments(formData);
      
      // Если пользователь уже оплатил - ошибка
      if (existingUserCheck.hasActivePayment) {
        console.log('⚠️ Пользователь уже оплатил взнос:', existingUserCheck.user.email);
        
        return res.json({
          "formid": req.body.formid || "tilda-form",
          "type": "error",
          "ErrorCode": "ALREADY_PAID", 
          "Message": "Вы уже оплатили вступительный взнос. Проверьте вашу почту для данных входа."
        });
      }
  
      let userResult;
      let memberNumber;
  
      // Если пользователь существует но не оплатил - используем его
      if (existingUserCheck.user) {
        console.log('🔄 Пользователь существует, но не оплатил');
        userResult = { user: existingUserCheck.user };
        memberNumber = existingUserCheck.user.membership_number;
        
        // Если номера нет - генерируем
        if (!memberNumber) {
          memberNumber = await User.generateUniqueMemberNumber();
          await User.updateMemberNumber(existingUserCheck.user.id, memberNumber);
        }
      } else {
        // СОЗДАЕМ НОВОГО ПОЛЬЗОВАТЕЛЯ
        userResult = await TildaFormService.createUserFromForm(formData, tildaData);
        
        // ГЕНЕРИРУЕМ НОМЕР ЧЛЕНА КЛУБА
        memberNumber = await User.generateUniqueMemberNumber();
        await User.updateMemberNumber(userResult.user.id, memberNumber);
  
        console.log('✅ Пользователь создан. Номер члена клуба:', memberNumber);
        userForEmail = await User.findById(userResult.user.id);
        
        // Отправляем приветственное письмо с номером
        await this.sendWelcomeEmail(userForEmail, memberNumber);
      }
  
      // 🔥 ПРАВИЛЬНЫЙ ОТВЕТ ДЛЯ TILDA
      const response = {
        "formid": req.body.formid || "tilda-form",
        "type": "success",
        "paymenturl": `http://npkvdv.ru/paymentfee?memberNumber=${memberNumber}`,
        "paymentid": memberNumber,
        "message": "Регистрация успешна. Переход к оплате."
      };
      
      console.log('🎯 Ответ для Tilda:', response);
  
      return res.json(response);
  
    } catch (error) {
      console.error('❌ Ошибка обработки вебхука:', error);
      return res.json({
        "formid": req.body.formid || "tilda-form", 
        "type": "error",
        "Message": error.message
      });
    }
  }

async sendWelcomeEmailNumber(user, memberNumber) {
    try {
      console.log(`📧 Отправка приветственного письма для: ${user.email}`);
      
      const userData = {
        name: user.name || user.fullname,
        email: user.email,
        phone: user.phone,
        city: user.city,
        memberNumber: memberNumber
      };

      const emailResult = await EmailService.sendWelcomeEmail(userData, memberNumber);
      
      if (emailResult.success) {
        console.log('✅ Приветственное письмо отправлено успешно');
        console.log(`   Номер члена клуба: ${memberNumber}`);
        console.log(`   Email: ${user.email}`);
        
        // 🔥 ИСПРАВЛЕНИЕ: Добавляем проверку на существование метода
        // if (typeof this.logEmailSent === 'function') {
        //   await this.logEmailSent(user.id, 'welcome', memberNumber);
        // } else {
        //   console.log('⚠️ Метод logEmailSent не найден, пропускаем логирование');
        // }
      } else {
        console.warn('⚠️ Не удалось отправить приветственное письмо:', emailResult.error);
      }
      
      return emailResult;
      
    } catch (error) {
      console.error('❌ Ошибка отправки приветственного письма:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Логирование отправки email в базу
   */
  // async logEmailSent(userId, emailType, memberNumber) {
  //   try {
  //     // Проверяем, что есть подключение к базе
  //     if (!db) {
  //       console.log('⚠️ База данных не доступна для логирования email');
  //       return;
  //     }

  //     await db.none(
  //       `INSERT INTO email_logs (user_id, email_type, member_number, sent_at) 
  //        VALUES ($1, $2, $3, $4)`,
  //       [userId, emailType, memberNumber, new Date()]
  //     );
      
  //     console.log('📝 Email логирование успешно');
  //   } catch (error) {
  //     console.error('❌ Ошибка логирования email:', error);
  //     // Не прерываем основной поток из-за ошибки логирования
  //   }
  // }


  /**
   * Создание платежа при нажатии кнопки оплаты
   */
  async createPayment(req, res) {
    try {
      const { memberNumber } = req.body;
      
      console.log('💳 Создание платежа для члена клуба:', memberNumber);

      if (!memberNumber) {
        return res.status(400).json({
          success: false,
          error: 'Номер члена клуба обязателен'
        });
      }

      // Ищем пользователя
      const user = await User.findByMemberNumber(memberNumber);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Член клуба не найден'
        });
      }

      // ПРОВЕРЯЕМ - если пользователь уже оплатил, не создаем новый платеж
      const hasSuccessfulPayment = await this.checkUserSuccessfulPayments(user.id);
      if (hasSuccessfulPayment) {
        console.log('✅ Пользователь уже оплатил:', user.email);
        return res.json({
          success: false,
          error: 'Вы уже оплатили вступительный взнос'
        });
      }

      // Проверяем нет ли активных pending платежей
      // const activePayment = await Payment.findActiveByUserId(user.id);
      // if (activePayment) {
      //   console.log('ℹ️ Активный платеж уже существует:', activePayment.id);
      //   return res.json({
      //     success: true,
      //     paymentUrl: activePayment.payment_url,
      //     message: 'Платеж уже создан'
      //   });
      // }

      // СОЗДАЕМ ПЛАТЕЖ В ТИНЬКОФФ
      console.log('🚀 Создаем новый платеж в Тинькофф...');
      const paymentResult = await this.createTinkoffPayment(user, memberNumber);
      
      // Обновляем пользователя
      await User.updateTinkoffPaymentId(user.id, paymentResult.tinkoffPaymentId);

      // Сохраняем платеж в БД
      await Payment.create({
        orderId: paymentResult.orderId,
        userId: user.id,
        amount: paymentResult.amount,
        tinkoffPaymentId: paymentResult.tinkoffPaymentId,
        description: `Вступительный взнос в клуб (Член клуба: ${memberNumber})`,
        status: 'pending',
        memberNumber: memberNumber,
        payment_url: paymentResult.paymentUrl
      });

      console.log('✅ Платеж создан для:', memberNumber);

      return res.json({
        success: true,
        paymentUrl: paymentResult.paymentUrl,
        orderId: paymentResult.orderId,
        paymentId: paymentResult.tinkoffPaymentId,
        message: 'Платеж успешно создан'
      });

    } catch (error) {
      console.error('❌ Ошибка создания платежа:', error);
      return res.status(500).json({
        success: false,
        error: 'Ошибка создания платежа: ' + error.message
      });
    }
  }

  /**
   * Проверка статуса платежа (для опроса со стороны фронтенда)
   */
  async checkPaymentStatus(req, res) {
    try {
      const { memberNumber } = req.params;
      
      console.log('🔍 Проверка статуса платежа для:', memberNumber);

      if (!memberNumber) {
        return res.status(400).json({
          success: false,
          error: 'Номер члена клуба обязателен'
        });
      }

      // Ищем пользователя
      const user = await User.findByMemberNumber(memberNumber);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Член клуба не найден'
        });
      }

      // Проверяем статус пользователя
      const paymentStatus = {
        memberNumber: memberNumber,
        userStatus: user.payment_status,
        membershipStatus: user.membership_status,
        hasPaid: user.payment_status === 'paid'
      };

      // Ищем последний платеж
      const latestPayment = await Payment.findLatestByUserId(user.id);
      if (latestPayment) {
        paymentStatus.payment = {
          status: latestPayment.status,
          amount: latestPayment.amount,
          created_at: latestPayment.created_at,
          payment_url: latestPayment.payment_url
        };
      }

      console.log('📊 Статус платежа:', paymentStatus);

      return res.json({
        success: true,
        ...paymentStatus
      });

    } catch (error) {
      console.error('❌ Ошибка проверки статуса платежа:', error);
      return res.status(500).json({
        success: false,
        error: 'Ошибка проверки статуса'
      });
    }
  }

  /**
   * Получение данных члена клуба для отображения на странице
   */
  async getMemberData(req, res) {
    try {
      const { memberNumber } = req.params;
      
      console.log('🔍 Получение данных члена клуба:', memberNumber);

      if (!memberNumber) {
        return res.status(400).json({
          success: false,
          error: 'Номер члена клуба обязателен'
        });
      }

      // Ищем пользователя в БД
      const user = await User.findByMemberNumber(memberNumber);
      
      if (!user) {
        console.log('❌ Член клуба не найден в БД:', memberNumber);
        return res.status(404).json({
          success: false,
          error: 'Член клуба не найден'
        });
      }

      // Получаем информацию о платежах
      const latestPayment = await Payment.findLatestByUserId(user.id);

      // Проверяем статус оплаты
      const hasSuccessfulPayment = await this.checkUserSuccessfulPayments(user.id);
      const hasActivePayment = latestPayment && latestPayment.status === 'pending';

      // Формируем ответ с данными
      const memberData = {
        success: true,
        memberNumber: user.membership_number,
        formData: {
          FullName: user.fullname,
          Phone: user.phone,
          Email: user.email,
          Yeardate: user.yeardate ? new Date(user.yeardate).toLocaleDateString('ru-RU') : '',
          City: user.city || '',
          Conditions: user.conditions === 'accepted' ? 'yes' : 'no',
          Checkbox: user.checkbox === 'accepted' ? 'yes' : 'no'
        },
        userData: {
          membership_status: user.membership_status,
          payment_status: user.payment_status,
          created_at: user.created_at
        },
        paymentInfo: {
          hasPaid: hasSuccessfulPayment,
          hasActivePayment: hasActivePayment,
          paymentData: latestPayment ? {
            status: latestPayment.status,
            amount: latestPayment.amount,
            payment_url: latestPayment.payment_url
          } : null
        }
      };

      console.log('✅ Данные члена клуба получены:', user.email);
      res.json(memberData);

    } catch (error) {
      console.error('❌ Ошибка получения данных члена клуба:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Проверка существующего пользователя и его платежей
   */
  async checkExistingUserAndPayments(formData) {
    try {
      const { Email, Phone } = formData;
      
      let user = null;

      // Проверяем по email
      if (Email) {
        const usersByEmail = await User.findByEmail(Email);
        if (usersByEmail && usersByEmail.length > 0) {
          user = usersByEmail[0];
        }
      }

      // Проверяем по телефону
      if (!user && Phone) {
        const usersByPhone = await User.findByPhone(Phone);
        if (usersByPhone && usersByPhone.length > 0) {
          user = usersByPhone[0];
        }
      }

      if (!user) {
        return { user: null, hasActivePayment: false };
      }

      // Проверяем есть ли успешные платежи
      const hasSuccessfulPayment = await this.checkUserSuccessfulPayments(user.id);
      
      console.log(`🔍 Проверка пользователя ${user.email}:`, {
        hasActivePayment: hasSuccessfulPayment,
        payment_status: user.payment_status
      });
      
      return {
        user: user,
        hasActivePayment: hasSuccessfulPayment
      };

    } catch (error) {
      console.error('❌ Ошибка проверки пользователя:', error);
      return { user: null, hasActivePayment: false };
    }
  }

  /**
   * Проверка успешных платежей пользователя
   */
  async checkUserSuccessfulPayments(userId) {
    try {
      const user = await User.findById(userId);
      
      // Проверяем статус пользователя
      if (user && user.payment_status === 'paid') {
        console.log('✅ Пользователь уже оплатил (по статусу):', user.email);
        return true;
      }
      
      // Проверяем успешные платежи в БД
      const successfulPayments = await Payment.findSuccessfulPaymentsByUserId(userId);
      
      const hasPayments = successfulPayments && successfulPayments.length > 0;
      console.log(`💰 Проверка платежей пользователя ${userId}:`, { 
        hasPayments, 
        count: successfulPayments?.length 
      });
      
      return hasPayments;
      
    } catch (error) {
      console.error('❌ Ошибка проверки платежей:', error);
      return false;
    }
  }

  /**
   * Создание платежа в Тинькофф
   */
  async createTinkoffPayment(user, memberNumber) {
    const orderId = TokenGenerator.generateOrderId();
    const amount = 1000; // 10 рублей

    const paymentData = {
      TerminalKey: CONFIG.TINKOFF.TERMINAL_KEY,
      Amount: amount,
      OrderId: orderId,
      Description: `Вступительный взнос в клуб. Член клуба: ${memberNumber}`,
      NotificationURL: `${CONFIG.APP.BASE_URL}/tinkoff-callback`,
      DATA: {
        Email: user.email,
        Phone: user.phone,
        MemberNumber: memberNumber
      }
    };

    console.log('📤 Отправка в Tinkoff:', paymentData);

    const tinkoffService = new TinkoffService();
    const tinkoffResponse = await tinkoffService.initPayment(paymentData);
    
    if (!tinkoffResponse.Success) {
      console.error('❌ Tinkoff API Error:', tinkoffResponse);
      throw new Error(tinkoffResponse.Message || tinkoffResponse.ErrorMessage || 'Ошибка создания платежа в Тинькофф');
    }

    return {
      orderId,
      amount,
      tinkoffPaymentId: tinkoffResponse.PaymentId,
      paymentUrl: tinkoffResponse.PaymentURL,
    };
  }

  // Остальные вспомогательные методы
  verifyTildaSignature(req) {
    return true;
  }

  normalizeTildaData(tildaData) {
    const formData = {};
    const technicalFields = ['formid', 'pageid', 'tranid', 'projectid', 'X-Tilda-Api-Key'];

    Object.keys(tildaData).forEach(key => {
      if (!technicalFields.includes(key) && tildaData[key] !== undefined && tildaData[key] !== '') {
        if (key === 'Conditions' || key === 'Checkbox') {
          formData[key] = this.normalizeCheckbox(tildaData[key]);
        } else {
          formData[key] = tildaData[key];
        }
      }
    });

    const tildaMeta = {
      formid: tildaData.formid || '',
      pageid: tildaData.pageid || '',
      tranid: tildaData.tranid || '',
      projectid: tildaData.projectid || ''
    };

    return { formData, tildaData: tildaMeta };
  }

  normalizeCheckbox(value) {
    if (value === 'on' || value === 'yes' || value === true || value === 'true') {
      return 'yes';
    }
    return 'no';
  }
}

export default TildaController;