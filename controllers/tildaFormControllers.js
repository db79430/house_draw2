// // controllers/TildaController.js
// import TildaFormService from '../services/TildaFormService.js';
// import TinkoffService from '../services/TinkoffService.js';
// import TokenGenerator from '../utils/tokenGenerator.js';
// import CONFIG from '../config/index.js';
// import User from '../models/Users.js';
// import Payment from '../models/Payment.js';
// import EmailService from '../services/EmailServices.js';
// import db from '../database/index.js'; // ⚠️ ДОБАВЬТЕ ИМПОРТ db
// import crypto from 'crypto';

// class TildaController {
//   async handleTildaWebhook(req, res) {
//     console.log(`🔍 [${new Date().toISOString()}] Получен вебхук от Tilda...`);
//     console.log('=== ТИЛЬДА ВЕБХУК ПОЛУЧЕН ===');
//     console.log('Headers:', req.headers);
//     console.log('Raw body:', req.body);
//     console.log('Body type:', typeof req.body);
//     console.log('Body keys:', Object.keys(req.body || {}));

//     try {
//       console.log('📥 Raw данные от Tilda:', req.body);

//       // Нормализуем данные из Tilda
//       const { formData, tildaData } = this.normalizeTildaData(req.body);

//       console.log('🔄 Нормализованные данные:', { formData, tildaData });

//       // Валидация формы
//       const validationErrors = TildaFormService.validateFormData(formData);
//       if (validationErrors.length > 0) {
//         return res.json({
//           "formid": req.body.formid || "tilda-form",
//           "type": "error",
//           "Errors": validationErrors
//         });
//       }

//       // 🔥 ИСПРАВЛЕНИЕ: Используем транзакцию с advisory lock
//       const result = await this.processUserRegistration(formData, tildaData);

//       if (result.error) {
//         console.log('❌ Ошибка регистрации:', result.error);

//         return res.json({
//           "formid": req.body.formid || "tilda-form",
//           "type": "error",
//           "ErrorCode": result.errorCode || "REGISTRATION_ERROR",
//           "Message": result.error
//         });
//       }

//       // 🔥 ПРАВИЛЬНЫЙ ОТВЕТ ДЛЯ TILDA
//       const response = {
//         "formid": req.body.formid || "tilda-form",
//         "type": "success",
//         "paymenturl": `https://npkvdv.ru/paymentfee?memberNumber=${result.memberNumber}`,
//         "paymentid": result.memberNumber,
//         "message": "Регистрация успешна. Переход к оплате."
//       };

//       console.log('🎯 Ответ для Tilda:', response);

//       return res.json(response);

//     } catch (error) {
//       console.error('❌ Критическая ошибка обработки вебхука:', error);
//       return res.json({
//         "formid": req.body.formid || "tilda-form",
//         "type": "error",
//         "Message": "Внутренняя ошибка сервера. Попробуйте позже."
//       });
//     }
//   }

//   /**
//    * 🔥 ИСПРАВЛЕНИЕ: Атомарная обработка регистрации с транзакцией
//    */
//   // async processUserRegistration(formData, tildaData) {
//   //   console.log('🔍 Вход в метод processUserRegistration');
//   //   const { Email, Phone, Name, Fullname } = formData;
//   //   console.log('Входящие данные:', { Email, Phone, Name, Fullname });

//   //   return await db.task(async t => {
//   //     console.log('✅ Начало транзакции БД');
//   //     try {
//   //       console.log('🔒 Выполнение запроса findExistingUserWithLock...');
//   //       const existingUser = await this.findExistingUserWithLock(t, Email, Phone);
//   //       console.log('🔒 Результат запроса:', existingUser ? `Найден пользователь: ID=${existingUser.id}` : 'Пользователь не найден');

//   //       let user;

//   //       if (existingUser) {
//   //         console.log('⚠️ Пользователь уже существует. Возвращаем существующего...');
//   //         user = existingUser;
//   //       } else {
//   //         console.log('🆕 Пользователь не найден, создаем нового...');
//   //         user = await User.createUserFromFormInTransaction(t, formData, tildaData);

//   //         if (!user) {
//   //           throw new Error('Не удалось создать пользователя');
//   //         }

//   //         console.log('✅ Новый пользователь создан, ID:', user.id);
//   //       }

//   //       console.log('✅ Все операции успешно завершены');
//   //       return user;

//   //     } catch (error) {
//   //       console.error('❌ Ошибка внутри транзакции:', error);
//   //       throw error;
//   //     }
//   //   });
//   // }

//   async processUserRegistration(formData, tildaData) {
//     console.log('🔥 === DEBUG: НАЧАЛО processUserRegistration ===');
//     console.log('📥 Данные формы:', JSON.stringify(formData, null, 2));

//     try {
//       console.log('🔍 Шаг 1: Пробую запустить транзакцию...');

//       const result = await db.task(async t => {
//         console.log('✅ Транзакция начата');

//         // ПРОВЕРКА: может ли транзакция работать?
//         const testQuery = await t.one('SELECT NOW() as time, 1 as test');
//         console.log('📊 Тест БД:', testQuery);

//         // Поиск существующего пользователя
//         console.log('🔍 Ищу пользователя по email:', formData.Email);
//         const existingUser = await t.oneOrNone(
//           'SELECT id, email FROM users WHERE LOWER(email) = $1',
//           [formData.Email.toLowerCase()]
//         );
//         console.log('👤 Результат поиска:', existingUser ? `Найден: ${existingUser.email}` : 'Не найден');

//         if (!existingUser) {
//           console.log('🆕 СОЗДАЮ НОВОГО ПОЛЬЗОВАТЕЛЯ...');

//           // ПРОСТАЯ ВСТАВКА для теста
//           const newUser = await t.one(`
//                     INSERT INTO users (
//                         email, 
//                         phone, 
//                         fullname, 
//                         city,
//                         status,
//                         email_confirmed,
//                         created_at,
//                         updated_at
//                     ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
//                     RETURNING id, email, phone
//                 `, [
//             formData.Email.toLowerCase(),
//             formData.Phone,
//             formData.FullName,
//             formData.City || 'Москва',
//             'accepted',
//             true
//           ]);

//           console.log('✅ ПОЛЬЗОВАТЕЛЬ СОЗДАН! ID:', newUser.id);

//           // Генерируем номер участника
//           const memberNumber = `MBR${Date.now()}${Math.floor(Math.random() * 1000)}`;
//           console.log('🔢 Сгенерирован номер:', memberNumber);

//           // Обновляем пользователя с номером
//           await t.none(
//             'UPDATE users SET membership_number = $1 WHERE id = $2',
//             [memberNumber, newUser.id]
//           );

//           return {
//             success: true,
//             user: newUser,
//             memberNumber: memberNumber,
//             isNewUser: true
//           };
//         }

//         return {
//           success: true,
//           user: existingUser,
//           memberNumber: existingUser.membership_number || 'NO_NUMBER',
//           isNewUser: false
//         };

//       }).catch(error => {
//         console.error('💥 ОШИБКА В ТРАНЗАКЦИИ:', error.message);
//         console.error('💥 Stack:', error.stack);
//         throw error;
//       });

//       console.log('🎉 Транзакция успешно завершена!');
//       console.log('📋 Результат:', result);

//       return result;

//     } catch (error) {
//       console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message);
//       throw error;
//     }
//   }
//   async generateUniqueMemberNumberInTransaction(transaction, userId) {
//     let attempts = 0;
//     const maxAttempts = 10;

//     while (attempts < maxAttempts) {
//       try {
//         // Генерация на основе timestamp и случайного числа
//         const timestamp = Date.now().toString().slice(-8); // последние 8 цифр
//         const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
//         const memberNumber = `MBR${timestamp}${random}`;

//         // Проверяем уникальность в транзакции
//         const existing = await transaction.oneOrNone(
//           'SELECT id FROM users WHERE membership_number = $1',
//           [memberNumber]
//         );

//         if (!existing) {
//           return memberNumber;
//         }

//         attempts++;
//         console.log(`🔄 Попытка ${attempts}: номер ${memberNumber} уже существует, генерируем новый...`);

//         // Небольшая задержка перед следующей попыткой
//         await new Promise(resolve => setTimeout(resolve, 10));

//       } catch (error) {
//         attempts++;
//         console.error(`❌ Ошибка генерации номера (попытка ${attempts}):`, error);

//         if (attempts >= maxAttempts) {
//           // Крайний случай: используем timestamp + userId
//           const fallbackNumber = `MBR${Date.now()}${userId}`;
//           console.log(`🆘 Используем fallback номер: ${fallbackNumber}`);
//           return fallbackNumber;
//         }
//       }
//     }

//     // Если все попытки исчерпаны
//     const finalNumber = `MBR${Date.now()}${userId}${Math.floor(Math.random() * 1000)}`;
//     return finalNumber;
//   }


//   /**
//    * 🔥 ИСПРАВЛЕНИЕ: Поиск пользователя с блокировкой FOR UPDATE SKIP LOCKED
//    */
//   /**
//    * 🔥 Вспомогательный метод для проверки существующего пользователя
//    */
//   async findExistingUserWithLock(transaction, email, phone) {
//     if (!email && !phone) {
//       return null;
//     }

//     try {
//       let query;
//       let params;

//       if (email && phone) {
//         // Ищем по email ИЛИ phone
//         query = `
//         SELECT * FROM users 
//         WHERE (
//           LOWER(email) = LOWER($1) 
//           OR phone = $2
//           OR (phone IS NOT NULL AND REPLACE(REPLACE(phone, '+', ''), ' ', '') = REPLACE(REPLACE($2, '+', ''), ' ', ''))
//         )
//         FOR UPDATE SKIP LOCKED
//         LIMIT 1
//       `;
//         params = [email.toLowerCase(), phone];
//       } else if (email) {
//         // Ищем только по email
//         query = `
//         SELECT * FROM users 
//         WHERE LOWER(email) = LOWER($1)
//         FOR UPDATE SKIP LOCKED
//         LIMIT 1
//       `;
//         params = [email.toLowerCase()];
//       } else {
//         // Ищем только по phone
//         query = `
//         SELECT * FROM users 
//         WHERE phone = $1
//         OR (phone IS NOT NULL AND REPLACE(REPLACE(phone, '+', ''), ' ', '') = REPLACE(REPLACE($1, '+', ''), ' ', ''))
//         FOR UPDATE SKIP LOCKED
//         LIMIT 1
//       `;
//         params = [phone];
//       }

//       const user = await transaction.oneOrNone(query, params);
//       return user;

//     } catch (error) {
//       console.error('❌ Ошибка поиска пользователя с блокировкой:', error);
//       return null;
//     }
//   }

//   /**
//    * 🔥 Исправленная генерация ID для advisory lock
//    */
//   generateAdvisoryLockId(key) {
//     if (!key || key === '_') {
//       // Если нет email и phone, используем случайный ID
//       return Math.floor(Math.random() * 1000000);
//     }

//     // Создаем стабильный хэш из ключа
//     const hash = crypto.createHash('md5').update(key).digest('hex');
//     // Берем первые 6 символов и конвертируем в число
//     return parseInt(hash.substring(0, 6), 16);
//   }

//   /**
//    * 🔥 Исправленное логирование обработки вебхука
//    */
//   async logWebhookProcessing(transaction, userId, memberNumber, isNewUser) {
//     try {
//       // Используем oneOrNone для INSERT...RETURNING или none для простого INSERT
//       await transaction.none(
//         `INSERT INTO webhook_logs 
//        (user_id, member_number, action_type, processed_at) 
//        VALUES ($1, $2, $3, $4)`,
//         [
//           userId,
//           memberNumber,
//           isNewUser ? 'user_created' : 'user_updated',
//           new Date()
//         ]
//       );
//     } catch (error) {
//       console.error('❌ Ошибка логирования вебхука:', error.message);
//       // Не прерываем основную транзакцию
//     }
//   }

//   /**
//    * 🔥 ИСПРАВЛЕНИЕ: Генерация ID для advisory lock
//    */
//   generateAdvisoryLockId(key) {
//     // Создаем стабильный хэш из ключа
//     const hash = crypto.createHash('md5').update(key).digest('hex');
//     // Берем первые 8 символов и конвертируем в число
//     return parseInt(hash.substring(0, 8), 16);
//   }

//   /**
//    * 🔥 ИСПРАВЛЕНИЕ: Асинхронная отправка email (не блокирует транзакцию)
//    */
//   async sendWelcomeEmailAsync(user, memberNumber) {
//     // Запускаем в фоне, не ждем завершения
//     setImmediate(async () => {
//       try {
//         console.log(`📧 Асинхронная отправка письма для: ${user.email}`);

//         const userData = {
//           name: user.name || user.fullname,
//           email: user.email,
//           phone: user.phone,
//           city: user.city,
//           memberNumber: memberNumber
//         };

//         const emailResult = await EmailService.sendWelcomeEmail(userData, memberNumber);

//         if (emailResult.success) {
//           console.log('✅ Приветственное письмо отправлено успешно');
//           console.log(`   Номер члена клуба: ${memberNumber}`);
//           console.log(`   Email: ${user.email}`);
//         } else {
//           console.warn('⚠️ Не удалось отправить приветственное письмо:', emailResult.error);
//         }
//       } catch (error) {
//         console.error('❌ Ошибка асинхронной отправки письма:', error);
//       }
//     });
//   }

//   /**
//    * 🔥 ИСПРАВЛЕНИЕ: Логирование обработки вебхука
//    */
//   async logWebhookProcessing(transaction, userId, memberNumber, isNewUser) {
//     try {
//       await transaction.none(
//         `INSERT INTO webhook_logs 
//          (user_id, member_number, action_type, processed_at, created_at) 
//          VALUES ($1, $2, $3, $4, $5)`,
//         [
//           userId,
//           memberNumber,
//           isNewUser ? 'user_created' : 'user_updated',
//           new Date(),
//           new Date()
//         ]
//       );
//     } catch (error) {
//       console.error('❌ Ошибка логирования вебхука:', error);
//       // Не прерываем основную транзакцию
//     }
//   }

//   async createPayment(req, res) {
//     try {
//       const { memberNumber } = req.body;

//       console.log(`💳 Создание платежа для:`, memberNumber);

//       if (!memberNumber) {
//         return res.status(400).json({
//           success: false,
//           error: 'Номер члена клуба обязателен'
//         });
//       }

//       // Поиск пользователя
//       const user = await db.oneOrNone(
//         'SELECT * FROM users WHERE membership_number = $1',
//         [memberNumber]
//       );

//       if (!user) {
//         return res.status(404).json({
//           success: false,
//           error: 'Член клуба не найден'
//         });
//       }

//       // Проверяем успешные платежи
//       const successfulPayments = await db.any(
//         'SELECT * FROM payments WHERE user_id = $1 AND status IN ($2:csv)',
//         [user.id, ['success', 'confirmed', 'paid']]
//       );

//       if (successfulPayments.length > 0) {
//         return res.json({
//           success: false,
//           error: 'Вы уже оплатили вступительный взнос. На почту отправлено письмо для авторизации.'
//         });
//       }

//       // Создаем платеж в Тинькофф
//       const orderId = TokenGenerator.generateOrderId();
//       const amount = 1000; // 10 рублей

//       console.log('🚀 Создаем новый платеж в Тинькофф...');

//       let paymentResult;
//       if (this.createTinkoffPayment) {
//         paymentResult = await this.createTinkoffPayment(user, memberNumber, orderId, amount);
//       } else {
//         // Тестовые данные для разработки
//         paymentResult = {
//           tinkoffPaymentId: `test_${Date.now()}`,
//           paymentUrl: 'https://pay.tbank.ru/test-payment',
//           tinkoffResponse: {
//             Success: true,
//             PaymentId: `test_${Date.now()}`,
//             PaymentURL: 'https://pay.tbank.ru/test-payment',
//             OrderId: orderId,
//             Amount: amount,
//             Status: 'NEW'
//           }
//         };
//       }

//       // 🔥 СОХРАНЯЕМ ТОЛЬКО 6 ПОЛЕЙ как в вашем запросе
//       const payment = await db.one(
//         `INSERT INTO payments (
//           order_id, user_id, amount, tinkoff_payment_id, 
//           description, tinkoff_response
//         ) VALUES ($1, $2, $3, $4, $5, $6)
//         RETURNING *`,
//         [
//           orderId,                           // $1 - order_id
//           user.id,                           // $2 - user_id
//           amount,                            // $3 - amount
//           paymentResult.tinkoffPaymentId,    // $4 - tinkoff_payment_id
//           `Внесение минимального паевого взноса в паевой фонд (Индивидуальный № пайщика: ${memberNumber})`, // $5 - description
//           paymentResult.tinkoffResponse      // $6 - tinkoff_response (JSON)
//         ]
//       );

//       console.log('✅ Платеж создан и сохранен в БД:', payment.id);

//       return res.json({
//         success: true,
//         paymentUrl: paymentResult.paymentUrl,
//         orderId: orderId,
//         paymentId: paymentResult.tinkoffPaymentId,
//         message: 'Платеж успешно создан'
//       });

//     } catch (error) {
//       console.error('❌ Ошибка создания платежа:', error);

//       // Если ошибка из-за отсутствия колонок в таблице
//       if (error.message.includes('column') && error.message.includes('does not exist')) {
//         console.log('🔄 Создаем таблицу payments с нужной структурой...');

//         try {
//           // Создаем/обновляем таблицу
//           await db.none(`
//             DROP TABLE IF EXISTS payments;

//             CREATE TABLE payments (
//               id SERIAL PRIMARY KEY,
//               order_id VARCHAR(100) NOT NULL UNIQUE,
//               user_id INTEGER REFERENCES users(id),
//               amount INTEGER NOT NULL,
//               tinkoff_payment_id VARCHAR(100),
//               description TEXT,
//               tinkoff_response JSONB,
//               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//             );

//             CREATE INDEX idx_payments_user_id ON payments(user_id);
//             CREATE INDEX idx_payments_order_id ON payments(order_id);
//           `);

//           console.log('✅ Таблица payments создана с правильной структурой');

//           // Пробуем снова создать платеж
//           return await this.createPayment(req, res);

//         } catch (dbError) {
//           console.error('❌ Ошибка создания таблицы:', dbError);
//         }
//       }

//       const errorMessage = error.message.includes('не найден')
//         ? 'Член клуба не найден'
//         : error.message.includes('уже оплатили')
//           ? 'Вы уже оплатили вступительный взнос. На почту отправлено письмо для авторизации.'
//           : 'Ошибка создания платежа. Попробуйте позже.';

//       return res.status(400).json({
//         success: false,
//         error: errorMessage
//       });
//     }
//   }

//   /**
//    * 🔥 ИСПРАВЛЕНИЕ: Создание платежа в Тинькофф с retry логикой
//    */
//   async createTinkoffPayment(user, memberNumber, orderId, amount) {
//     const maxRetries = 3;
//     let lastError;

//     for (let attempt = 1; attempt <= maxRetries; attempt++) {
//       try {
//         console.log(`🔄 Попытка ${attempt}/${maxRetries} создания платежа в Тинькофф`);

//         const paymentData = {
//           TerminalKey: CONFIG.TINKOFF.TERMINAL_KEY,
//           Amount: amount,
//           OrderId: orderId,
//           Description: `Внесение минимального паевого взноса в паевой фонд (Индивидуальный № пайщика: ${memberNumber})`,
//           NotificationURL: `${CONFIG.APP.BASE_URL}/tinkoff-callback`,
//           DATA: {
//             Email: user.email,
//             Phone: user.phone,
//             MemberNumber: memberNumber
//           }
//         };

//         console.log('📤 Отправка в Tinkoff:', {
//           ...paymentData,
//           TerminalKey: '***' // Не логируем ключ
//         });

//         const tinkoffService = new TinkoffService();
//         const tinkoffResponse = await tinkoffService.initPayment(paymentData);

//         if (!tinkoffResponse.Success) {
//           throw new Error(tinkoffResponse.Message || tinkoffResponse.ErrorMessage || 'Ошибка создания платежа в Тинькофф');
//         }

//         console.log('✅ Платеж в Тинькофф создан успешно');

//         return {
//           orderId,
//           amount,
//           tinkoffPaymentId: tinkoffResponse.PaymentId,
//           paymentUrl: tinkoffResponse.PaymentURL,
//         };

//       } catch (error) {
//         lastError = error;
//         console.error(`❌ Попытка ${attempt} не удалась:`, error.message);

//         if (attempt < maxRetries) {
//           // Ждем перед следующей попыткой (экспоненциальная задержка)
//           const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
//           await new Promise(resolve => setTimeout(resolve, delay));
//         }
//       }
//     }

//     throw lastError || new Error('Не удалось создать платеж в Тинькофф после нескольких попыток');
//   }

//   async checkPaymentStatus(req, res) {
//     try {
//       const { memberNumber } = req.params;

//       console.log(`🔍 [${new Date().toISOString()}] Проверка статуса платежа для:`, memberNumber);

//       if (!memberNumber) {
//         return res.status(400).json({
//           success: false,
//           error: 'Номер члена клуба обязателен'
//         });
//       }

//       // 🔥 ИСПРАВЛЕНИЕ: Получаем все данные за один запрос
//       const result = await db.task(async t => {
//         const user = await t.oneOrNone(
//           'SELECT * FROM users WHERE membership_number = $1',
//           [memberNumber]
//         );

//         if (!user) {
//           throw new Error('Член клуба не найден');
//         }

//         const latestPayment = await t.oneOrNone(
//           `SELECT * FROM payments 
//            WHERE user_id = $1 
//            ORDER BY created_at DESC 
//            LIMIT 1`,
//           [user.id]
//         );

//         const successfulPayments = await t.any(
//           'SELECT * FROM payments WHERE user_id = $1 AND status IN ($2:csv)',
//           [user.id, ['success', 'confirmed', 'paid']]
//         );

//         return { user, latestPayment, successfulPayments };
//       });

//       const { user, latestPayment, successfulPayments } = result;

//       const paymentStatus = {
//         memberNumber: memberNumber,
//         userStatus: user.payment_status,
//         membershipStatus: user.membership_status,
//         hasPaid: user.payment_status === 'paid' || successfulPayments.length > 0,
//         successfulPaymentsCount: successfulPayments.length
//       };

//       if (latestPayment) {
//         paymentStatus.payment = {
//           status: latestPayment.status,
//           amount: latestPayment.amount,
//           created_at: latestPayment.created_at,
//         };
//       }

//       console.log('📊 Статус платежа:', paymentStatus);

//       return res.json({
//         success: true,
//         ...paymentStatus
//       });

//     } catch (error) {
//       console.error('❌ Ошибка проверки статуса платежа:', error);
//       return res.status(500).json({
//         success: false,
//         error: 'Ошибка проверки статуса'
//       });
//     }
//   }

//   async checkExistingUserAndPayments(formData) {
//     try {
//       const { Email, Phone } = formData;

//       // 🔥 ИСПРАВЛЕНИЕ: Используем один запрос вместо нескольких
//       const user = await db.task(async t => {
//         return await t.oneOrNone(`
//           SELECT u.*, 
//             COUNT(p.id) FILTER (WHERE p.status IN ('success', 'confirmed', 'paid')) as successful_payments_count
//           FROM users u
//           LEFT JOIN payments p ON p.user_id = u.id
//           WHERE (
//             LOWER(u.email) = LOWER($1) 
//             OR u.phone = $2
//             OR (u.phone IS NOT NULL AND REPLACE(u.phone, '+', '') = REPLACE($2, '+', ''))
//           )
//           GROUP BY u.id
//           LIMIT 1
//         `, [Email?.toLowerCase() || '', Phone || '']);
//       });

//       if (!user) {
//         return { user: null, hasActivePayment: false };
//       }

//       const hasActivePayment = user.payment_status === 'paid' || user.successful_payments_count > 0;

//       console.log(`🔍 Проверка пользователя ${user.email}:`, {
//         hasActivePayment,
//         payment_status: user.payment_status,
//         successful_payments: user.successful_payments_count
//       });

//       return {
//         user: {
//           ...user,
//           successful_payments_count: user.successful_payments_count
//         },
//         hasActivePayment
//       };

//     } catch (error) {
//       console.error('❌ Ошибка проверки пользователя:', error);
//       return { user: null, hasActivePayment: false };
//     }
//   }

//   async checkUserSuccessfulPayments(userId) {
//     try {
//       const result = await db.oneOrNone(
//         `SELECT 
//           COUNT(*) as count,
//           MAX(payment_status) as user_payment_status
//          FROM (
//            SELECT payment_status FROM users WHERE id = $1
//            UNION ALL
//            SELECT status FROM payments WHERE user_id = $1 AND status IN ('success', 'confirmed', 'paid')
//          ) as statuses`,
//         [userId]
//       );

//       const hasPayments = result && (
//         result.user_payment_status === 'paid' ||
//         parseInt(result.count) > (result.user_payment_status === 'paid' ? 1 : 0)
//       );

//       console.log(`💰 Проверка платежей пользователя ${userId}:`, {
//         hasPayments,
//         count: result?.count,
//         user_payment_status: result?.user_payment_status
//       });

//       return hasPayments;

//     } catch (error) {
//       console.error('❌ Ошибка проверки платежей:', error);
//       return false;
//     }
//   }

//   normalizeTildaData(tildaData) {
//     const formData = {};
//     const technicalFields = ['formid', 'pageid', 'tranid', 'projectid', 'X-Tilda-Api-Key'];

//     Object.keys(tildaData).forEach(key => {
//       if (!technicalFields.includes(key) && tildaData[key] !== undefined && tildaData[key] !== '') {
//         if (key === 'Conditions' || key === 'Checkbox') {
//           formData[key] = this.normalizeCheckbox(tildaData[key]);
//         } else {
//           formData[key] = tildaData[key];
//         }
//       }
//     });

//     const tildaMeta = {
//       formid: tildaData.formid || '',
//       pageid: tildaData.pageid || '',
//       tranid: tildaData.tranid || '',
//       projectid: tildaData.projectid || ''
//     };

//     return { formData, tildaData: tildaMeta };
//   }

//   normalizeCheckbox(value) {
//     if (value === 'on' || value === 'yes' || value === true || value === 'true') {
//       return 'yes';
//     }
//     return 'no';
//   }
// }

// export default TildaController;


import TildaFormService from '../services/TildaFormService.js';
import TinkoffService from '../services/TinkoffService.js';
import TokenGenerator from '../utils/tokenGenerator.js';
import CONFIG from '../config/index.js';
import User from '../models/Users.js';
import Payment from '../models/Payment.js';
import EmailService from '../services/EmailServices.js';
import db from '../database/index.js';
import crypto from 'crypto';
import Helpers from '../utils/Helpers.js';

class TildaController {
  async handleWebhook(req, res) {
    try {
      console.log('🎯 === TILDA WEBHOOK ПОЛУЧЕН ===');
      console.log('📥 Raw body:', JSON.stringify(req.body, null, 2));

      // Нормализуем данные
      const { formData, tildaData } = this.normalizeTildaData(req.body);
      console.log('🔄 Нормализованные данные:', { formData, tildaData });

      // 🔥 УЛУЧШЕННАЯ обработка регистрации
      console.log('🚀 Начинаю processUserRegistration...');
      const startTime = Date.now();

      const result = await this.processUserRegistration(formData, tildaData);

      const endTime = Date.now();
      console.log(`✅ processUserRegistration выполнен за ${endTime - startTime}ms`);
      console.log('📊 Результат:', JSON.stringify(result, null, 2));

      if (result.error || result.success === false) {
        console.log('❌ Ошибка регистрации:', result.error);
        return res.json({
          "formid": req.body.formid || tildaData.formid || "tilda-form",
          "type": "error",
          "ErrorCode": result.errorCode || "REGISTRATION_ERROR",
          "Message": result.error
        });
      }

      // 🔥 ПРАВИЛЬНЫЙ ОТВЕТ ДЛЯ TILDA
      console.log('✅ Регистрация успешна, формирую ответ...');
      const response = {
        "formid": req.body.formid || tildaData.formid || "tilda-form",
        "type": "success",
        "paymenturl": `https://npkvdv.ru/paymentfee?memberNumber=${result.memberNumber}`,
        "paymentid": result.memberNumber,
        "message": "Регистрация успешна. Переход к оплате."
      };

      console.log('🎯 Ответ для Tilda:', response);
      return res.json(response);

    } catch (error) {
      console.error('❌ Критическая ошибка обработки вебхука:', error.message);
      console.error('💥 Stack:', error.stack);
      return res.json({
        "formid": req.body.formid || "tilda-form",
        "type": "error",
        "Message": "Внутренняя ошибка сервера. Попробуйте позже."
      });
    }
  }

  /**
   * 🔥 УЛУЧШЕННЫЙ метод регистрации с поддержкой конкурентности
   */
  async processUserRegistration(formData, tildaData) {
    console.log('🔥 === НАЧАЛО processUserRegistration ===');
    console.log('📥 Данные формы:', JSON.stringify(formData, null, 2));
    console.log('🔥 === ДЕТАЛЬНЫЙ DEBUG processUserRegistration ===');
    console.log('📥 formData:', JSON.stringify(formData, null, 2));
    console.log('📥 tildaData:', JSON.stringify(tildaData, null, 2));

    const { Email, Phone } = formData;

    // 🔴 КРИТИЧЕСКИ ВАЖНО: Проверка Email
    if (!Email || Email.trim() === '') {
      console.error('❌ ОШИБКА: Email пустой или не указан');
      return {
        success: false,
        error: 'Email обязателен для регистрации',
        errorCode: 'EMAIL_REQUIRED'
      };
    }

    // 🔒 Используем блокировку по email для предотвращения race condition
    const normalizedEmail = Email.toLowerCase().trim();

    return await db.tx(async t => {
      try {
        // 🔒 Блокируем операции по этому email
        await t.one(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          [`user_reg_${normalizedEmail}`]
        );

        // 1. Проверяем существует ли пользователь (в транзакции)
        console.log('🔍 Шаг 1: Проверка существующего пользователя...');
        const existingUser = await User.findUserByEmailOrPhone(Email, Phone);

        if (existingUser) {
          console.log('⚠️ Пользователь уже существует:', existingUser.email);
          console.log('📊 Данные пользователя:', {
            id: existingUser.id,
            payment_status: existingUser.payment_status,
            membership_number: existingUser.membership_number
          });

          // Проверяем статус оплаты
          if (existingUser.payment_status === 'paid') {
            return {
              success: false,
              error: 'Вы уже оплатили вступительный взнос. Проверьте вашу почту для данных входа.',
              errorCode: 'ALREADY_PAID'
            };
          }

          // Возвращаем существующего пользователя с номером
          const memberNumber = existingUser.membership_number || await this.generateMemberNumber(existingUser.id);

          if (!existingUser.membership_number) {
            console.log(`🔄 Обновляю номер участника для ${existingUser.id}`);
            await User.updateMemberNumber(existingUser.id, memberNumber);
            console.log(`✅ Номер обновлен: ${memberNumber}`);
          }

          return {
            success: true,
            user: existingUser,
            memberNumber: memberNumber,
            isNewUser: false
          };
        }

        // 2. Создаем нового пользователя в транзакции
        console.log('🆕 Шаг 2: Создание нового пользователя через createFromTildaData...');

        // 🔴 ВАЖНО: Проверяем структуру возвращаемого значения
        let createResult;
        try {
          createResult = await User.createFromTildaData(formData, tildaData);
          console.log('📊 Результат createFromTildaData:', createResult);
        } catch (createError) {
          console.error('❌ ОШИБКА в createFromTildaData:', createError.message);

          // Проверяем, не создан ли пользователь другим запросом
          console.log('🔄 Проверяю, не создан ли пользователь другим запросом...');
          const foundUser = await User.findByEmail(Email);

          if (foundUser) {
            console.log('✅ Пользователь найден после ошибки создания');
            const memberNumber = foundUser.membership_number || await this.generateMemberNumber(foundUser.id);

            if (!foundUser.membership_number) {
              await User.updateMemberNumber(foundUser.id, memberNumber);
            }

            return {
              success: true,
              user: foundUser,
              memberNumber: memberNumber,
              isNewUser: false
            };
          }

          throw createError;
        }

        // 🔴 АНАЛИЗИРУЕМ структуру результата
        let user;

        // Вариант 1: createResult уже содержит success и user
        if (createResult && createResult.success !== undefined) {
          if (!createResult.success) {
            console.log('❌ createFromTildaData вернул success: false');

            // Проверяем, не создан ли пользователь другим запросом
            const foundUser = await User.findByEmail(Email);

            if (foundUser) {
              const memberNumber = foundUser.membership_number || await this.generateMemberNumber(foundUser.id);
              return {
                success: true,
                user: foundUser,
                memberNumber: memberNumber,
                isNewUser: false
              };
            }

            return {
              success: false,
              error: createResult.error || 'Ошибка создания пользователя',
              errorCode: createResult.errorCode || 'USER_CREATION_FAILED'
            };
          }

          user = createResult.user;
        }
        // Вариант 2: createResult возвращает объект пользователя напрямую
        else if (createResult && createResult.id) {
          user = createResult;
        }
        // Вариант 3: createResult.user содержит пользователя
        else if (createResult && createResult.user && createResult.user.id) {
          user = createResult.user;
        }

        // 🔴 ПРОВЕРКА: user должен существовать
        if (!user || !user.id) {
          console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось получить объект пользователя');
          console.error('📊 Структура createResult:', createResult);

          // Последняя попытка найти пользователя
          const foundUser = await User.findByEmail(Email);
          if (foundUser) {
            const memberNumber = foundUser.membership_number || await this.generateMemberNumber(foundUser.id);
            return {
              success: true,
              user: foundUser,
              memberNumber: memberNumber,
              isNewUser: false
            };
          }

          throw new Error('Не удалось создать пользователя: отсутствует объект пользователя');
        }

        console.log(`✅ Пользователь создан: ID=${user.id}, Email=${user.email}`);

        // 3. Генерируем номер участника
        console.log('🔢 Шаг 3: Генерация номера участника...');
        const memberNumber = await this.generateMemberNumber(user.id);
        console.log(`✅ Сгенерирован номер: ${memberNumber}`);

        // 4. Обновляем пользователя с номером в той же транзакции
        console.log('🔄 Шаг 4: Обновление номера участника...');

        // Проверяем, есть ли уже номер (на случай если он был создан в методе create)
        if (!user.membership_number) {
          await User.updateMemberNumber(user.id, memberNumber);
          console.log(`✅ Номер участника сохранен в БД`);
        } else {
          memberNumber = user.membership_number;
          console.log(`✅ Номер уже был создан ранее: ${memberNumber}`);
        }

        // 5. Отправляем приветственное письмо (асинхронно, вне транзакции)
        console.log('📧 Шаг 5: Запланирована отправка приветственного письма...');

        // Отправляем асинхронно, но ловим ошибки
        setTimeout(async () => {
          try {
            await this.sendWelcomeEmailAsync(user, memberNumber);
          } catch (emailError) {
            console.error('❌ Ошибка отправки письма (не критично):', emailError.message);
          }
        }, 0);

        console.log('🎉 Регистрация успешно завершена!');

        return {
          success: true,
          user: user,
          memberNumber: memberNumber,
          isNewUser: true
        };

      } catch (error) {
        console.error('💥 КРИТИЧЕСКАЯ ОШИБКА в processUserRegistration:', error.message);
        console.error('💥 Stack:', error.stack);

        // Анализируем ошибку
        if (error.code === '23505' || (error.constraint && error.constraint.includes('email'))) {
          console.log('🔄 Обнаружено дублирование email, ищу существующего пользователя...');

          try {
            const foundUser = await User.findByEmail(Email);
            if (foundUser) {
              const memberNumber = foundUser.membership_number || await this.generateMemberNumber(foundUser.id);
              return {
                success: true,
                user: foundUser,
                memberNumber: memberNumber,
                isNewUser: false
              };
            }
          } catch (e) {
            console.error('❌ Ошибка при поиске дублирующего пользователя:', e);
          }
        }

        // Пробрасываем ошибку дальше с понятным сообщением
        throw new Error(`Ошибка регистрации: ${error.message}`);
      }
    });
  }

  /**
   * 📧 Асинхронная отправка приветственного письма
   */
  async sendWelcomeEmailAsync(user, memberNumber) {
    setImmediate(async () => {
      try {
        console.log(`📧 Отправка письма для: ${user.email}`);

        const userData = {
          name: user.fullname || user.name,
          email: user.email,
          phone: user.phone,
          city: user.city,
          memberNumber: memberNumber
        };

        const emailResult = await EmailService.sendWelcomeEmail(userData, memberNumber);

        if (emailResult.success) {
          console.log('✅ Приветственное письмо отправлено');
        } else {
          console.warn('⚠️ Не удалось отправить письмо:', emailResult.error);
        }
      } catch (error) {
        console.error('❌ Ошибка отправки письма:', error);
      }
    });
  }

  /**
   * 🔢 Генерация номера участника
   */
  async generateMemberNumber(userId) {
    try {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const memberNumber = `MBR${timestamp}${random}`;

      // Проверяем уникальность
      const exists = await User.isMemberNumberExists(memberNumber);

      if (!exists) {
        return memberNumber;
      }

      // Если номер занят, генерируем другой
      console.log(`⚠️ Номер ${memberNumber} занят, генерируем новый...`);
      return `MBR${Date.now()}${Math.floor(Math.random() * 10000)}`;

    } catch (error) {
      console.error('❌ Ошибка генерации номера:', error);
      return `MBR${Date.now()}${userId}`;
    }
  }

  /**
   * 💳 Создание платежа (упрощенная версия)
   */
  async createPayment(req, res) {
    try {
      const { memberNumber } = req.body;

      console.log(`💳 Создание платежа для:`, memberNumber);

      if (!memberNumber) {
        return res.status(400).json({
          success: false,
          error: 'Номер члена клуба обязателен'
        });
      }

      // Поиск пользователя
      const user = await User.findByMembershipNumber(memberNumber);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Член клуба не найден'
        });
      }

      // Проверяем успешные платежи
      const successfulPayments = await Payment.findSuccessfulPaymentsByUserId(user.id);

      if (successfulPayments.length > 0) {
        return res.json({
          success: false,
          error: 'Вы уже оплатили вступительный взнос.'
        });
      }

      // Создаем платеж
      const orderId = TokenGenerator.generateOrderId();
      const amount = 1000;

      console.log('🚀 Создаем новый платеж...');

      // Создаем запись платежа
      const payment = await Payment.create({
        order_id: orderId,
        user_id: user.id,
        amount: amount,
        description: `Внесение минимального паевого взноса (№ пайщика: ${memberNumber})`
      });

      console.log('✅ Платеж создан:', payment.id);

      // Здесь должна быть интеграция с Тинькофф
      const paymentUrl = await this.createTinkoffPayment(user, memberNumber, orderId, amount);

      // Для теста возвращаем тестовый URL
      // const paymentUrl = `https://pay.tbank.ru/test-payment?orderId=${orderId}`;

      return res.json({
        success: true,
        paymentUrl: paymentUrl,
        orderId: orderId,
        paymentId: payment.id,
        message: 'Платеж успешно создан'
      });

    } catch (error) {
      console.error('❌ Ошибка создания платежа:', error);
      return res.status(500).json({
        success: false,
        error: 'Ошибка создания платежа'
      });
    }
  }

  /**
   * 🔍 Проверка статуса платежа
   */
  async checkPaymentStatus(req, res) {
    try {
      const { memberNumber } = req.params;

      console.log(`🔍 Проверка статуса платежа для:`, memberNumber);

      if (!memberNumber) {
        return res.status(400).json({
          success: false,
          error: 'Номер члена клуба обязателен'
        });
      }

      const user = await User.findByMembershipNumber(memberNumber);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Член клуба не найден'
        });
      }

      const successfulPayments = await Payment.findSuccessfulPaymentsByUserId(user.id);

      return res.json({
        success: true,
        memberNumber: memberNumber,
        hasPaid: successfulPayments.length > 0 || user.payment_status === 'paid',
        userStatus: user.membership_status,
        successfulPaymentsCount: successfulPayments.length
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
   * 🔄 Нормализация данных Тильды (оставляем без изменений)
   */
  normalizeTildaData(tildaData) {
    const formData = {};
    const technicalFields = ['formid', 'pageid', 'tranid', 'projectid', 'X-Tilda-Api-Key'];

    Object.keys(tildaData).forEach(key => {
      if (!technicalFields.includes(key) && tildaData[key] !== undefined && tildaData[key] !== '') {
        if (key === 'Conditions' || key === 'Checkbox') {
          formData[key] = Helpers.normalizeCheckbox(tildaData[key]);
        } else if (key === 'Phone') {
          // Нормализуем телефон
          formData[key] = Helpers.normalizePhone(tildaData[key]);
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

  // Остальные методы оставляем без изменений
  // (createTinkoffPayment, checkExistingUserAndPayments, etc.)
}

export default TildaController;