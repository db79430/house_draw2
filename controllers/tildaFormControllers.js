// controllers/TildaController.js
import TildaFormService from '../services/TildaFormService.js';
import TinkoffService from '../services/TinkoffService.js';
import TokenGenerator from '../utils/tokenGenerator.js';
import CONFIG from '../config/index.js';
import User from '../models/Users.js';
import Payment from '../models/Payment.js';
import EmailService from '../services/EmailServices.js';
import db from '../database/index.js'; // ⚠️ ДОБАВЬТЕ ИМПОРТ db
import crypto from 'crypto';

class TildaController {
  async handleTildaWebhook(req, res) {
    console.log(`🔍 [${new Date().toISOString()}] Получен вебхук от Tilda...`);
    
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
  
      // 🔥 ИСПРАВЛЕНИЕ: Используем транзакцию с advisory lock
      const result = await this.processUserRegistration(formData, tildaData);
      
      if (result.error) {
        console.log('❌ Ошибка регистрации:', result.error);
        
        return res.json({
          "formid": req.body.formid || "tilda-form",
          "type": "error",
          "ErrorCode": result.errorCode || "REGISTRATION_ERROR", 
          "Message": result.error
        });
      }
  
      // 🔥 ПРАВИЛЬНЫЙ ОТВЕТ ДЛЯ TILDA
      const response = {
        "formid": req.body.formid || "tilda-form",
        "type": "success",
        "paymenturl": `https://npkvdv.ru/paymentfee?memberNumber=${result.memberNumber}`,
        "paymentid": result.memberNumber,
        "message": "Регистрация успешна. Переход к оплате."
      };
      
      console.log('🎯 Ответ для Tilda:', response);
  
      return res.json(response);
  
    } catch (error) {
      console.error('❌ Критическая ошибка обработки вебхука:', error);
      return res.json({
        "formid": req.body.formid || "tilda-form", 
        "type": "error",
        "Message": "Внутренняя ошибка сервера. Попробуйте позже."
      });
    }
  }

  /**
   * 🔥 ИСПРАВЛЕНИЕ: Атомарная обработка регистрации с транзакцией
   */
  async processUserRegistration(formData, tildaData) {
    const { Email, Phone } = formData;
    
    // Создаем уникальный ключ для блокировки (email + phone)
    const lockKey = `${Email?.toLowerCase() || ''}_${Phone || ''}`;
    const lockId = this.generateAdvisoryLockId(lockKey);
    
    return await db.task(async t => {
      try {
        // 🔒 1. Блокируем по email/phone для предотвращения race condition
        // Используем oneOrNone вместо none, так как SELECT возвращает данные
        await t.oneOrNone('SELECT pg_advisory_xact_lock($1)', [lockId]);
        
        // ⏱️ 2. Проверяем существующего пользователя с блокировкой FOR UPDATE
        const existingUser = await this.findExistingUserWithLock(t, Email, Phone);
        
        // 3. Если пользователь уже оплатил - возвращаем ошибку
        if (existingUser && existingUser.payment_status === 'paid') {
          return {
            error: 'Вы уже оплатили вступительный взнос. Проверьте вашу почту для данных входа.',
            errorCode: 'ALREADY_PAID'
          };
        }
        
        let user;
        let isNewUser = false;
        let memberNumber;
        
        // 4. Если пользователь существует но не оплатил - используем его
        if (existingUser) {
          console.log('🔄 Пользователь существует, но не оплатил:', existingUser.email);
          user = existingUser;
          memberNumber = existingUser.membership_number;
        } else {
          // 5. СОЗДАЕМ НОВОГО ПОЛЬЗОВАТЕЛЯ в рамках транзакции
          console.log('🆕 Создаем нового пользователя');
          
          const userResult = await User.createUserFromFormInTransaction(
            t, // Передаем транзакцию
            formData, 
            tildaData
          );
          
          user = userResult;
          isNewUser = true;
        }
        
        // 6. ГЕНЕРИРУЕМ НОМЕР ЧЛЕНА КЛУБА если его нет
        if (!user.membership_number) {
          memberNumber = await this. generateUniqueMemberNumberInTransaction(t, user.id);
          console.log('✅ Сгенерирован номер члена клуба:', memberNumber);
          
          // Обновляем пользователя с новым номером
          await t.none(
            'UPDATE users SET membership_number = $1, updated_at = NOW() WHERE id = $2',
            [memberNumber, user.id]
          );
          
          user.membership_number = memberNumber;
        } else {
          memberNumber = user.membership_number;
        }
        
        // 7. Отправляем письмо только для новых пользователей
        if (isNewUser) {
          await this.sendWelcomeEmailAsync(user, memberNumber); // 🔥 Асинхронно, не блокируем транзакцию
        }
        
        // 8. Логируем успешную обработку
        await this.logWebhookProcessing(t, user.id, memberNumber, isNewUser);
        
        return {
          success: true,
          user,
          memberNumber,
          isNewUser
        };
        
      } catch (error) {
        console.error('❌ Ошибка в транзакции регистрации:', error);
        throw error;
      }
    });
  }

  async generateUniqueMemberNumberInTransaction(transaction, userId) {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      try {
        // Генерация на основе timestamp и случайного числа
        const timestamp = Date.now().toString().slice(-8); // последние 8 цифр
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const memberNumber = `MBR${timestamp}${random}`;
        
        // Проверяем уникальность в транзакции
        const existing = await transaction.oneOrNone(
          'SELECT id FROM users WHERE membership_number = $1',
          [memberNumber]
        );
        
        if (!existing) {
          return memberNumber;
        }
        
        attempts++;
        console.log(`🔄 Попытка ${attempts}: номер ${memberNumber} уже существует, генерируем новый...`);
        
        // Небольшая задержка перед следующей попыткой
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        attempts++;
        console.error(`❌ Ошибка генерации номера (попытка ${attempts}):`, error);
        
        if (attempts >= maxAttempts) {
          // Крайний случай: используем timestamp + userId
          const fallbackNumber = `MBR${Date.now()}${userId}`;
          console.log(`🆘 Используем fallback номер: ${fallbackNumber}`);
          return fallbackNumber;
        }
      }
    }
    
    // Если все попытки исчерпаны
    const finalNumber = `MBR${Date.now()}${userId}${Math.floor(Math.random() * 1000)}`;
    return finalNumber;
  }


  /**
   * 🔥 ИСПРАВЛЕНИЕ: Поиск пользователя с блокировкой FOR UPDATE SKIP LOCKED
   */
/**
 * 🔥 Вспомогательный метод для проверки существующего пользователя
 */
async findExistingUserWithLock(transaction, email, phone) {
  if (!email && !phone) {
    return null;
  }
  
  try {
    let query;
    let params;
    
    if (email && phone) {
      // Ищем по email ИЛИ phone
      query = `
        SELECT * FROM users 
        WHERE (
          LOWER(email) = LOWER($1) 
          OR phone = $2
          OR (phone IS NOT NULL AND REPLACE(REPLACE(phone, '+', ''), ' ', '') = REPLACE(REPLACE($2, '+', ''), ' ', ''))
        )
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;
      params = [email.toLowerCase(), phone];
    } else if (email) {
      // Ищем только по email
      query = `
        SELECT * FROM users 
        WHERE LOWER(email) = LOWER($1)
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;
      params = [email.toLowerCase()];
    } else {
      // Ищем только по phone
      query = `
        SELECT * FROM users 
        WHERE phone = $1
        OR (phone IS NOT NULL AND REPLACE(REPLACE(phone, '+', ''), ' ', '') = REPLACE(REPLACE($1, '+', ''), ' ', ''))
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;
      params = [phone];
    }
    
    const user = await transaction.oneOrNone(query, params);
    return user;
    
  } catch (error) {
    console.error('❌ Ошибка поиска пользователя с блокировкой:', error);
    return null;
  }
}

/**
 * 🔥 Исправленная генерация ID для advisory lock
 */
generateAdvisoryLockId(key) {
  if (!key || key === '_') {
    // Если нет email и phone, используем случайный ID
    return Math.floor(Math.random() * 1000000);
  }
  
  // Создаем стабильный хэш из ключа
  const hash = crypto.createHash('md5').update(key).digest('hex');
  // Берем первые 6 символов и конвертируем в число
  return parseInt(hash.substring(0, 6), 16);
}

/**
 * 🔥 Исправленное логирование обработки вебхука
 */
async logWebhookProcessing(transaction, userId, memberNumber, isNewUser) {
  try {
    // Используем oneOrNone для INSERT...RETURNING или none для простого INSERT
    await transaction.none(
      `INSERT INTO webhook_logs 
       (user_id, member_number, action_type, processed_at) 
       VALUES ($1, $2, $3, $4)`,
      [
        userId,
        memberNumber,
        isNewUser ? 'user_created' : 'user_updated',
        new Date()
      ]
    );
  } catch (error) {
    console.error('❌ Ошибка логирования вебхука:', error.message);
    // Не прерываем основную транзакцию
  }
}

  /**
   * 🔥 ИСПРАВЛЕНИЕ: Генерация ID для advisory lock
   */
  generateAdvisoryLockId(key) {
    // Создаем стабильный хэш из ключа
    const hash = crypto.createHash('md5').update(key).digest('hex');
    // Берем первые 8 символов и конвертируем в число
    return parseInt(hash.substring(0, 8), 16);
  }

  /**
   * 🔥 ИСПРАВЛЕНИЕ: Асинхронная отправка email (не блокирует транзакцию)
   */
  async sendWelcomeEmailAsync(user, memberNumber) {
    // Запускаем в фоне, не ждем завершения
    setImmediate(async () => {
      try {
        console.log(`📧 Асинхронная отправка письма для: ${user.email}`);
        
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
        } else {
          console.warn('⚠️ Не удалось отправить приветственное письмо:', emailResult.error);
        }
      } catch (error) {
        console.error('❌ Ошибка асинхронной отправки письма:', error);
      }
    });
  }

  /**
   * 🔥 ИСПРАВЛЕНИЕ: Логирование обработки вебхука
   */
  async logWebhookProcessing(transaction, userId, memberNumber, isNewUser) {
    try {
      await transaction.none(
        `INSERT INTO webhook_logs 
         (user_id, member_number, action_type, processed_at, created_at) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          memberNumber,
          isNewUser ? 'user_created' : 'user_updated',
          new Date(),
          new Date()
        ]
      );
    } catch (error) {
      console.error('❌ Ошибка логирования вебхука:', error);
      // Не прерываем основную транзакцию
    }
  }

  async createPayment(req, res) {
    try {
      const { memberNumber } = req.body;
      
      console.log(`💳 [${new Date().toISOString()}] Создание платежа для:`, memberNumber);
  
      if (!memberNumber) {
        return res.status(400).json({
          success: false,
          error: 'Номер члена клуба обязателен'
        });
      }
  
      // 🔥 ИСПРАВЛЕНИЕ: Используем транзакцию для поиска пользователя
      const result = await db.task(async t => {
        // Блокируем пользователя по memberNumber
        const user = await t.oneOrNone(
          `SELECT * FROM users 
           WHERE membership_number = $1 
           FOR UPDATE SKIP LOCKED
           LIMIT 1`,
          [memberNumber]
        );
        
        if (!user) {
          throw new Error('Член клуба не найден');
        }
        
        return { user };
      });
      
      const { user } = result;
      
      // Проверяем успешные платежи отдельно
      const successfulPayments = await db.any(
        'SELECT * FROM payments WHERE user_id = $1 AND status IN ($2:csv)',
        [user.id, ['success', 'confirmed', 'paid']]
      );
      
      if (successfulPayments.length > 0) {
        return res.json({
          success: false,
          error: 'Вы уже оплатили вступительный взнос. На почту отправлено письмо для авторизации.'
        });
      }
      
      // 🔥 СОЗДАЕМ ПЛАТЕЖ В ТИНЬКОФФ с уникальным OrderId
      const orderId = TokenGenerator.generateOrderId();
      const amount = 1000; // 10 рублей
      
      console.log('🚀 Создаем новый платеж в Тинькофф...');
      const paymentResult = await this.createTinkoffPayment(user, memberNumber, orderId, amount);
      
      // 🔥 ИСПРАВЛЕНИЕ: Сохраняем платеж в транзакции
      await db.task(async t => {
        // Проверяем нет ли уже такого OrderId (защита от повторных запросов)
        const existingOrder = await t.oneOrNone(
          'SELECT id FROM payments WHERE order_id = $1',
          [orderId]
        );
        
        if (existingOrder) {
          console.log('⚠️ Платеж с таким OrderId уже существует:', orderId);
          return;
        }
        
        // Сохраняем новый платеж
        await t.none(
          `INSERT INTO payments (
            order_id, user_id, amount, tinkoff_payment_id,
            description, status, payment_url,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            orderId,
            user.id,
            amount,
            paymentResult.tinkoffPaymentId,
            `Внесение минимального паевого взноса в паевой фонд (Индивидуальный № пайщика: ${memberNumber})`,
            'pending',
            memberNumber,
            paymentResult.paymentUrl,
            new Date(),
            new Date()
          ]
        );
        
        // Обновляем пользователя
        await t.none(
          'UPDATE users SET tinkoff_payment_id = $1, updated_at = $2 WHERE id = $3',
          [paymentResult.tinkoffPaymentId, new Date(), user.id]
        );
      });
      
      console.log('✅ Платеж создан для:', memberNumber);
      
      return res.json({
        success: true,
        paymentUrl: paymentResult.paymentUrl,
        orderId: orderId,
        paymentId: paymentResult.tinkoffPaymentId,
        message: 'Платеж успешно создан'
      });
  
    } catch (error) {
      console.error('❌ Ошибка создания платежа:', error);
      
      const errorMessage = error.message.includes('Член клуба не найден') 
        ? 'Член клуба не найден'
        : error.message.includes('уже оплатили')
        ? 'Вы уже оплатили вступительный взнос. На почту отправлено письмо для авторизации.'
        : 'Ошибка создания платежа. Попробуйте позже.';
      
      return res.status(400).json({
        success: false,
        error: errorMessage
      });
    }
  }

  /**
   * 🔥 ИСПРАВЛЕНИЕ: Создание платежа в Тинькофф с retry логикой
   */
  async createTinkoffPayment(user, memberNumber, orderId, amount) {
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Попытка ${attempt}/${maxRetries} создания платежа в Тинькофф`);
        
        const paymentData = {
          TerminalKey: CONFIG.TINKOFF.TERMINAL_KEY,
          Amount: amount,
          OrderId: orderId,
          Description: `Внесение минимального паевого взноса в паевой фонд (Индивидуальный № пайщика: ${memberNumber})`,
          NotificationURL: `${CONFIG.APP.BASE_URL}/tinkoff-callback`,
          DATA: {
            Email: user.email,
            Phone: user.phone,
            MemberNumber: memberNumber
          }
        };

        console.log('📤 Отправка в Tinkoff:', {
          ...paymentData,
          TerminalKey: '***' // Не логируем ключ
        });

        const tinkoffService = new TinkoffService();
        const tinkoffResponse = await tinkoffService.initPayment(paymentData);
        
        if (!tinkoffResponse.Success) {
          throw new Error(tinkoffResponse.Message || tinkoffResponse.ErrorMessage || 'Ошибка создания платежа в Тинькофф');
        }

        console.log('✅ Платеж в Тинькофф создан успешно');
        
        return {
          orderId,
          amount,
          tinkoffPaymentId: tinkoffResponse.PaymentId,
          paymentUrl: tinkoffResponse.PaymentURL,
        };
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Попытка ${attempt} не удалась:`, error.message);
        
        if (attempt < maxRetries) {
          // Ждем перед следующей попыткой (экспоненциальная задержка)
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Не удалось создать платеж в Тинькофф после нескольких попыток');
  }

  async checkPaymentStatus(req, res) {
    try {
      const { memberNumber } = req.params;
      
      console.log(`🔍 [${new Date().toISOString()}] Проверка статуса платежа для:`, memberNumber);

      if (!memberNumber) {
        return res.status(400).json({
          success: false,
          error: 'Номер члена клуба обязателен'
        });
      }

      // 🔥 ИСПРАВЛЕНИЕ: Получаем все данные за один запрос
      const result = await db.task(async t => {
        const user = await t.oneOrNone(
          'SELECT * FROM users WHERE membership_number = $1',
          [memberNumber]
        );
        
        if (!user) {
          throw new Error('Член клуба не найден');
        }
        
        const latestPayment = await t.oneOrNone(
          `SELECT * FROM payments 
           WHERE user_id = $1 
           ORDER BY created_at DESC 
           LIMIT 1`,
          [user.id]
        );
        
        const successfulPayments = await t.any(
          'SELECT * FROM payments WHERE user_id = $1 AND status IN ($2:csv)',
          [user.id, ['success', 'confirmed', 'paid']]
        );
        
        return { user, latestPayment, successfulPayments };
      });
      
      const { user, latestPayment, successfulPayments } = result;
      
      const paymentStatus = {
        memberNumber: memberNumber,
        userStatus: user.payment_status,
        membershipStatus: user.membership_status,
        hasPaid: user.payment_status === 'paid' || successfulPayments.length > 0,
        successfulPaymentsCount: successfulPayments.length
      };

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

  async checkExistingUserAndPayments(formData) {
    try {
      const { Email, Phone } = formData;
      
      // 🔥 ИСПРАВЛЕНИЕ: Используем один запрос вместо нескольких
      const user = await db.task(async t => {
        return await t.oneOrNone(`
          SELECT u.*, 
            COUNT(p.id) FILTER (WHERE p.status IN ('success', 'confirmed', 'paid')) as successful_payments_count
          FROM users u
          LEFT JOIN payments p ON p.user_id = u.id
          WHERE (
            LOWER(u.email) = LOWER($1) 
            OR u.phone = $2
            OR (u.phone IS NOT NULL AND REPLACE(u.phone, '+', '') = REPLACE($2, '+', ''))
          )
          GROUP BY u.id
          LIMIT 1
        `, [Email?.toLowerCase() || '', Phone || '']);
      });
      
      if (!user) {
        return { user: null, hasActivePayment: false };
      }
      
      const hasActivePayment = user.payment_status === 'paid' || user.successful_payments_count > 0;
      
      console.log(`🔍 Проверка пользователя ${user.email}:`, {
        hasActivePayment,
        payment_status: user.payment_status,
        successful_payments: user.successful_payments_count
      });
      
      return {
        user: {
          ...user,
          successful_payments_count: user.successful_payments_count
        },
        hasActivePayment
      };

    } catch (error) {
      console.error('❌ Ошибка проверки пользователя:', error);
      return { user: null, hasActivePayment: false };
    }
  }

  async checkUserSuccessfulPayments(userId) {
    try {
      const result = await db.oneOrNone(
        `SELECT 
          COUNT(*) as count,
          MAX(payment_status) as user_payment_status
         FROM (
           SELECT payment_status FROM users WHERE id = $1
           UNION ALL
           SELECT status FROM payments WHERE user_id = $1 AND status IN ('success', 'confirmed', 'paid')
         ) as statuses`,
        [userId]
      );
      
      const hasPayments = result && (
        result.user_payment_status === 'paid' || 
        parseInt(result.count) > (result.user_payment_status === 'paid' ? 1 : 0)
      );
      
      console.log(`💰 Проверка платежей пользователя ${userId}:`, { 
        hasPayments, 
        count: result?.count,
        user_payment_status: result?.user_payment_status
      });
      
      return hasPayments;
      
    } catch (error) {
      console.error('❌ Ошибка проверки платежей:', error);
      return false;
    }
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