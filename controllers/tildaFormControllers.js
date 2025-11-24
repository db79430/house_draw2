// // controllers/TildaController.js
// import TildaFormService from '../services/TildaFormService.js';
// import TinkoffService from '../services/TinkoffService.js';
// import TokenGenerator from '../utils/tokenGenerator.js';
// import CONFIG from '../config/index.js';
// import User from '../models/Users.js';
// import Payment from '../models/Payment.js';

// class TildaController {
//   /**
//    * Основной метод для обработки вебхука от Tilda
//    */
//   // async handleTildaWebhook(req, res) {
//   //   console.log('🔍 Получен вебхук от Tilda...');
    
//   //   try {
//   //     console.log('📥 Raw данные от Tilda:', req.body);
//   //     if (!this.verifyTildaSignature(req)) {
//   //       console.warn('❌ Неверная подпись запроса от Tilda');
//   //       return res.status(401).json({
//   //         Success: false,
//   //         Message: 'Invalid signature'
//   //       });
//   //     }

//   //     // Нормализуем данные из Tilda (разные форматы)
//   //     const { formData, tildaData } = this.normalizeTildaData(req.body);
      
//   //     console.log('🔄 Нормализованные данные:', { formData, tildaData });

//   //     // Валидация формы
//   //     const validationErrors = TildaFormService.validateFormData(formData);
//   //     if (validationErrors.length > 0) {
//   //       return res.json({
//   //         Success: false,
//   //         ErrorCode: 'VALIDATION_ERROR',
//   //         Message: validationErrors.join(', '),
//   //         Details: validationErrors
//   //       });
//   //     }

//   //     // 🔧 ПРОВЕРКА СУЩЕСТВУЮЩЕГО ПОЛЬЗОВАТЕЛЯ И ЕГО ПЛАТЕЖЕЙ
//   //     const existingUserCheck = await this.checkExistingUserAndPayments(formData);
//   //     if (existingUserCheck.hasActivePayment) {
//   //       console.log('⚠️ Пользователь уже оплатил взнос:', existingUserCheck.user.email);
        
//   //       return res.json({
//   //         Success: false,
//   //         ErrorCode: 'ALREADY_PAID', 
//   //         Message: 'Вы уже оплатили вступительный взнос. Проверьте вашу почту для данных входа.'
//   //       });
//   //     }

//   //     // Если пользователь существует но не оплатил - создаем новый платеж
//   //     if (existingUserCheck.user) {
//   //       console.log('🔄 Пользователь существует, но не оплатил. Создаем платеж...');
//   //       return await this.handleExistingUser(existingUserCheck.user, res);
//   //     }

//   //     // Создаем нового пользователя
//   //     const userResult = await TildaFormService.createUserFromForm(formData, tildaData);
      
//   //     // Создаем платеж в Тинькофф
//   //     const paymentResult = await this.createTinkoffPayment(userResult.user, formData);
      
//   //     // Обновляем пользователя с payment_id
//   //     await User.updateTinkoffPaymentId(userResult.user.id, paymentResult.tinkoffPaymentId);

//   //     // Сохраняем платеж в БД
//   //     await Payment.create({
//   //       orderId: paymentResult.orderId,
//   //       userId: userResult.user.id,
//   //       amount: paymentResult.amount,
//   //       tinkoffPaymentId: paymentResult.tinkoffPaymentId,
//   //       description: 'Вступительный взнос в клуб',
//   //       status: 'pending'
//   //     });

//   //     // Успешный ответ для Tilda
//   //     console.log('✅ Платеж создан для Tilda');
//   //     return res.json({
//   //       Success: true,
//   //       PaymentURL: paymentResult.paymentUrl,
//   //       RedirectUrl: paymentResult.paymentUrl,
//   //       Status: 'redirect',
//   //       PaymentId: paymentResult.tinkoffPaymentId,
//   //       OrderId: paymentResult.orderId,
//   //       Message: 'Платеж успешно создан'
//   //     });

//   //   } catch (error) {
//   //     console.error('❌ Ошибка обработки вебхука:', error);
//   //     return res.json({
//   //       Success: false,
//   //       ErrorCode: 'PROCESSING_ERROR',
//   //       Message: error.message
//   //     });
//   //   }
//   // }
//   async handleTildaWebhook(req, res) {
//     console.log('🔍 Получен вебхук от Tilda...');
    
    
//     try {
//       console.log('📥 Raw данные от Tilda:', req.body);
//       if (!this.verifyTildaSignature(req)) {
//         console.warn('❌ Неверная подпись запроса от Tilda');
//         return res.status(401).json({
//           Success: false,
//           Message: 'Invalid signature'
//         });
//       }
  
//       // Нормализуем данные из Tilda (разные форматы)
//       const { formData, tildaData } = this.normalizeTildaData(req.body);

//       // Создаем нового пользователя
//       const userResult = await TildaFormService.createUserFromForm(formData, tildaData);
      
//       // Создаем платеж в Тинькофф
//       const paymentResult = await this.createTinkoffPayment(userResult.user, formData);
      
//       // Обновляем пользователя с payment_id
//       await User.updateTinkoffPaymentId(userResult.user.id, paymentResult.tinkoffPaymentId);

//       const memberNumber = User.generateUniqueMemberNumber();
//       console.log('🔢 Сгенерирован номер:', memberNumber);
//       await User.updateMemberNumber(userResult.user.id, memberNumber);
  
//       // Сохраняем платеж в БД
//       await Payment.create({
//         orderId: paymentResult.orderId,
//         userId: userResult.user.id,
//         amount: paymentResult.amount,
//         tinkoffPaymentId: paymentResult.tinkoffPaymentId,
//         description: `Вступительный взнос в клуб (Член клуба: ${memberNumber})`,
//         status: 'pending',
//         memberNumber: memberNumber
//       });

//        // Генерируем номер члена клуба если его нет - ИСПРАВЛЕННАЯ ОШИБКА
     
//       console.log('🔄 Нормализованные данные:', { formData, tildaData });
//       console.log ('Номер членства клуба', memberNumber )
  
//       // Валидация формы
//       const validationErrors = TildaFormService.validateFormData(formData);
//       if (validationErrors.length > 0) {
//         return res.json({
//           Success: false,
//           ErrorCode: 'VALIDATION_ERROR',
//           Message: validationErrors.join(', '),
//           Details: validationErrors
//         });
//       }
  
//       // 🔧 ПРОВЕРКА СУЩЕСТВУЮЩЕГО ПОЛЬЗОВАТЕЛЯ И ЕГО ПЛАТЕЖЕЙ
//       const existingUserCheck = await this.checkExistingUserAndPayments(formData);
//       if (existingUserCheck.hasActivePayment) {
//         console.log('⚠️ Пользователь уже оплатил взнос:', existingUserCheck.user.email);
      
//         return res.json({
//           Success: false,
//           ErrorCode: 'ALREADY_PAID', 
//           Message: 'Вы уже оплатили вступительный взнос. Проверьте вашу почту для данных входа.',
//           MemberNumber: memberNumber,
//           RedirectUrl: `http://npk-vdv.ru/paymentfee?memberNumber=${memberNumber}` 
//         });
//       }
  
//       // Если пользователь существует но не оплатил - создаем новый платеж
//       if (existingUserCheck.user) {
//         console.log('🔄 Пользователь существует, но не оплатил. Создаем платеж...');
//         return await this.handleExistingUser(existingUserCheck.user, formData, res);
//       }

  
//       // Успешный ответ для Tilda
//       console.log('✅ Платеж создан для Tilda. Номер члена клуба:', memberNumber);

//       return res.json({
//         Success: true,
//         PaymentURL: paymentResult.paymentUrl,
//         RedirectUrl: `http://npk-vdv.ru/auth?memberNumber=${memberNumber}`,
//         Status: 'redirect',
//         PaymentId: paymentResult.tinkoffPaymentId,
//         OrderId: paymentResult.orderId,
//         MemberNumber: memberNumber,
//       });
  
//     } catch (error) {
//       console.error('❌ Ошибка обработки вебхука:', error);
//       return res.json({
//         Success: false,
//         ErrorCode: 'PROCESSING_ERROR',
//         Message: error.message
//       });
//     }
//   }
  
//   // Новые вспомогательные методы для работы с номерами членов клуба
//   // generateMemberNumber() {
//   //   const timestamp = Date.now().toString().slice(-6);
//   //   const random = Math.random().toString(36).substr(2, 3).toUpperCase();
//   //   return `CLUB-${timestamp}-${random}`;
//   // }
  
//   // Обработка существующего пользователя (без оплаты)
//   async handleExistingUser(user, formData, res) {
//     try {
//       // Генерируем номер члена клуба если его нет
//       let memberNumber = user.membership_number;
//       if (!memberNumber) {
//         memberNumber = this.generateMemberNumber();
//         await User.updateMemberNumber(user.id, memberNumber);
//       }
  
//       // Создаем платеж в Тинькофф
//       const paymentResult = await this.createTinkoffPayment(user, formData);
      
//       // Обновляем пользователя с payment_id
//       await User.updateTinkoffPaymentId(user.id, paymentResult.tinkoffPaymentId);
  
//       // Сохраняем платеж в БД
//       await Payment.create({
//         orderId: paymentResult.orderId,
//         userId: user.id,
//         amount: paymentResult.amount,
//         tinkoffPaymentId: paymentResult.tinkoffPaymentId,
//         description: `Вступительный взнос в клуб (Член клуба: ${memberNumber})`,
//         status: 'pending',
//       });
  
//       console.log('✅ Новый платеж создан для существующего пользователя:', memberNumber);
//       const redirectUrl = `http://npk-vdv.ru/paymentfee?memberNumber=${memberNumber}`;
      
//       res.json({
//         Success: true,
//         PaymentURL: paymentResult.paymentUrl,
//         RedirectUrl: redirectUrl,
//         Status: 'redirect',
//         PaymentId: paymentResult.tinkoffPaymentId,
//         OrderId: paymentResult.orderId,
//       });
  
//     } catch (error) {
//       console.error('❌ Ошибка обработки существующего пользователя:', error);
//       throw error;
//     }
//   }
  
//   // Обновленный метод создания платежа в Тинькофф
//   // async createTinkoffPayment(user, formData, memberNumber) {
//   //   try {
//   //     const amount = 1000; // 10 рублей в копейках
//   //     const orderId = `club_${Date.now()}_${user.id}`;
      
//   //     const paymentData = {
//   //       OrderId: orderId,
//   //       Amount: amount,
//   //       Description: `Вступительный взнос в клуб. Член клуба: ${memberNumber}`,
//   //       CustomerKey: user.id.toString(),
//   //       Receipt: {
//   //         Email: user.email,
//   //         Phone: user.phone,
//   //         Taxation: 'osn',
//   //         Items: [
//   //           {
//   //             Name: 'Вступительный взнос в клуб',
//   //             Price: amount,
//   //             Quantity: 1,
//   //             Amount: amount,
//   //             PaymentMethod: 'full_payment',
//   //             PaymentObject: 'service',
//   //             Tax: 'vat20'
//   //           }
//   //         ]
//   //       },
//   //       DATA: {
//   //         MemberNumber: memberNumber,
//   //         Email: user.email,
//   //         Phone: user.phone
//   //       }
//   //     };
  
//   //     console.log('💳 Создание платежа в Тинькофф:', paymentData);
  
//   //     const tinkoffResponse = await this.tinkoffApi.init(paymentData);
      
//   //     if (tinkoffResponse.Success) {
//   //       return {
//   //         success: true,
//   //         paymentUrl: tinkoffResponse.PaymentURL,
//   //         orderId: orderId,
//   //         amount: amount,
//   //         tinkoffPaymentId: tinkoffResponse.PaymentId,
//   //         memberNumber: memberNumber
//   //       };
//   //     } else {
//   //       throw new Error(tinkoffResponse.Message || 'Ошибка создания платежа в Тинькофф');
//   //     }
//   //   } catch (error) {
//   //     console.error('❌ Ошибка создания платежа в Тинькофф:', error);
//   //     throw error;
//   //   }
//   // }
  
//   // Добавьте метод для получения данных члена клуба
//   async getMemberData(req, res) {
//     try {
//       const { memberNumber } = req.params;
      
//       console.log('🔍 Получение данных члена клуба:', memberNumber);
  
//       if (!memberNumber) {
//         return res.status(400).json({
//           success: false,
//           error: 'Номер члена клуба обязателен'
//         });
//       }
  
//       // Ищем пользователя по номеру члена клуба - ИСПРАВЛЕННЫЙ ВЫЗОВ
//       const user = await User.findByMemberNumber(memberNumber);
  
//       if (!user) {
//         console.log('❌ Член клуба не найден:', memberNumber);
//         return res.status(404).json({
//           success: false,
//           error: 'Член клуба не найден'
//         });
//       }
  
//       // Получаем информацию о платежах - ИСПРАВЛЕННЫЙ ВЫЗОВ
//       const latestPayment = await Payment.findLatestByUserId(user.id);
  
//       // Форматируем данные для фронтенда
//       const memberData = {
//         success: true,
//         memberNumber: user.membership_number,
//         formData: {
//           FullName: user.fullname,
//           Phone: user.phone,
//           Email: user.email,
//           Yeardate: user.yeardate ? new Date(user.yeardate).toLocaleDateString('ru-RU') : '',
//           City: user.city || '',
//           Conditions: user.conditions === 'accepted' ? 'yes' : 'no',
//           Checkbox: user.checkbox === 'accepted' ? 'yes' : 'no'
//         },
//         tildaData: {
//           formid: user.tilda_form_id,
//           pageid: user.tilda_page_id,
//           tranid: user.tilda_transaction_id
//         },
//         userData: {
//           membership_status: user.membership_status,
//           payment_status: user.payment_status,
//           slot_number: user.slot_number,
//           created_at: user.created_at
//         },
//         paymentData: latestPayment ? {
//           status: latestPayment.status,
//           amount: latestPayment.amount,
//           created_at: latestPayment.created_at,
//           description: latestPayment.description
//         } : null
//       };
  
//       console.log('✅ Данные члена клуба получены:', user.email);
//       res.json(memberData);
  
//     } catch (error) {
//       console.error('❌ Ошибка получения данных члена клуба:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Внутренняя ошибка сервера'
//       });
//     }
//   }
  
//   // Метод для проверки статуса платежа
//   async checkPaymentStatus(req, res) {
//     try {
//       const { memberNumber } = req.params;
      
//       console.log('🔍 Проверка статуса платежа для:', memberNumber);
  
//       const user = await User.findOne({ membership_number: memberNumber });
//       if (!user) {
//         return res.status(404).json({
//           success: false,
//           error: 'Член клуба не найден'
//         });
//       }
  
//       const payment = await Payment.findOne({ 
//         userId: user.id 
//       }).sort({ createdAt: -1 });
  
//       if (!payment) {
//         return res.json({
//           success: true,
//           paymentStatus: 'not_found',
//           memberNumber: memberNumber
//         });
//       }
  
//       // Если платеж в ожидании, проверяем статус в Тинькофф
//       if (payment.status === 'pending' && payment.tinkoffPaymentId) {
//         try {
//           const tinkoffStatus = await this.tinkoffApi.getState({
//             PaymentId: payment.tinkoffPaymentId
//           });
  
//           if (tinkoffStatus.Success) {
//             // Обновляем статус платежа если он изменился
//             if (tinkoffStatus.Status !== payment.status) {
//               await Payment.findByIdAndUpdate(payment._id, {
//                 status: tinkoffStatus.Status
//               });
  
//               // Если платеж успешен, обновляем статус пользователя
//               if (tinkoffStatus.Status === 'CONFIRMED') {
//                 await User.findByIdAndUpdate(user.id, {
//                   payment_status: 'paid',
//                   membership_status: 'active'
//                 });
//               }
//             }
//           }
//         } catch (error) {
//           console.error('Ошибка проверки статуса в Тинькофф:', error);
//         }
//       }
  
//       // Получаем обновленные данные
//       const updatedPayment = await Payment.findById(payment._id);
//       const updatedUser = await User.findById(user.id);
  
//       res.json({
//         success: true,
//         paymentStatus: updatedPayment.status,
//         membershipStatus: updatedUser.membership_status,
//         memberNumber: memberNumber,
//         needsPayment: updatedPayment.status !== 'CONFIRMED'
//       });
  
//     } catch (error) {
//       console.error('❌ Ошибка проверки статуса платежа:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Внутренняя ошибка сервера'
//       });
//     }
//   }


//   /**
//    * Проверка существующего пользователя и его платежей
//    */
//   async checkExistingUserAndPayments(formData) {
//     try {
//       const { Email, Phone } = formData;
      
//       // Проверяем по email
//       if (Email) {
//         const usersByEmail = await User.findByEmail(Email);
//         if (usersByEmail && usersByEmail.length > 0) {
//           const user = usersByEmail[0];
          
//           // 🔧 ПРОВЕРЯЕМ ЕСТЬ ЛИ УСПЕШНЫЕ ПЛАТЕЖИ У ЭТОГО ПОЛЬЗОВАТЕЛЯ
//           const hasSuccessfulPayment = await this.checkUserSuccessfulPayments(user.id);
          
//           if (hasSuccessfulPayment) {
//             return {
//               user: user,
//               hasActivePayment: true
//             };
//           }
          
//           return {
//             user: user,
//             hasActivePayment: false
//           };
//         }
//       }
      
//       // Проверяем по телефону
//       if (Phone) {
//         const usersByPhone = await User.findByPhone(Phone);
//         if (usersByPhone && usersByPhone.length > 0) {
//           const user = usersByPhone[0];
          
//           // 🔧 ПРОВЕРЯЕМ ЕСТЬ ЛИ УСПЕШНЫЕ ПЛАТЕЖИ У ЭТОГО ПОЛЬЗОВАТЕЛЯ
//           const hasSuccessfulPayment = await this.checkUserSuccessfulPayments(user.id);
          
//           if (hasSuccessfulPayment) {
//             return {
//               user: user,
//               hasActivePayment: true
//             };
//           }
          
//           return {
//             user: user,
//             hasActivePayment: false
//           };
//         }
//       }
      
//       return {
//         user: null,
//         hasActivePayment: false
//       };
//     } catch (error) {
//       console.error('❌ Ошибка проверки существующего пользователя и платежей:', error);
//       return {
//         user: null,
//         hasActivePayment: false
//       };
//     }
//   }

//    // Найти заказ по email или телефону
//    async findOrder(req, res) {
//     try {
//       const { email, phone } = req.body;
      
//       console.log('🔍 Finding order by contact info:', { email, phone });

//       if (!email && !phone) {
//         return res.status(400).json({
//           success: false,
//           error: 'Email or phone is required'
//         });
//       }

//       let user = null;

//       // Ищем по email
//       if (email) {
//         user = await User.findByEmail(email);
//       }

//       // Если не нашли по email, ищем по телефону
//       if (!user && phone) {
//         const normalizedPhone = Helpers.normalizePhone(phone);
//         user = await User.findByPhone(normalizedPhone);
//       }

//       if (!user) {
//         return res.status(404).json({
//           success: false,
//           error: 'Order not found'
//         });
//       }

//       // Форматируем данные для фронтенда
//       const orderData = {
//         success: true,
//         formData: {
//           FullName: user.fullname,
//           Phone: user.phone,
//           Email: user.email,
//           Yeardate: user.yeardate ? new Date(user.yeardate).toLocaleDateString('ru-RU') : '',
//           City: user.city || '',
//           Conditions: user.conditions === 'accepted' ? 'yes' : 'no',
//           Checkbox: user.checkbox === 'accepted' ? 'yes' : 'no'
//         },
//         tildaData: {
//           formid: user.tilda_form_id,
//           pageid: user.tilda_page_id,
//           tranid: user.tilda_transaction_id
//         }
//       };

//       res.json(orderData);

//     } catch (error) {
//       console.error('❌ Error in findOrder:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Internal server error'
//       });
//     }
//   }

//   /**
//    * Проверка успешных платежей пользователя
//    */
//   async checkUserSuccessfulPayments(userId) {
//     try {
//       const successfulPayments = await Payment.findSuccessfulPaymentsByUserId(userId);
      
//       if (successfulPayments && successfulPayments.length > 0) {
//         console.log(`✅ Найдено ${successfulPayments.length} успешных платежей для пользователя:`, userId);
//         return true;
//       }
      
//       console.log('❌ У пользователя нет успешных платежей:', userId);
//       return false;
//     } catch (error) {
//       console.error('❌ Ошибка проверки платежей пользователя:', error);
//       return false;
//     }
//   }

//   /**
//    * Обработка существующего пользователя (без успешных платежей)
//    */
//   // async handleExistingUser(existingUser, res) {
//   //   try {
//   //     // Создаем новый платеж для существующего пользователя
//   //     const paymentResult = await this.createTinkoffPayment(existingUser, {});
      
//   //     // Обновляем пользователя с новым payment_id
//   //     await User.updateTinkoffPaymentId(existingUser.id, paymentResult.tinkoffPaymentId);

//   //     // Сохраняем новый платеж в БД
//   //     await Payment.create({
//   //       orderId: paymentResult.orderId,
//   //       userId: existingUser.id,
//   //       amount: paymentResult.amount,
//   //       tinkoffPaymentId: paymentResult.tinkoffPaymentId,
//   //       description: 'Вступительный взнос в клуб (повторная попытка оплаты)',
//   //       status: 'pending'
//   //     });

//   //     console.log('✅ Создан платеж для существующего пользователя:', existingUser.email);

//   //     return res.json({
//   //       Success: true,
//   //       PaymentURL: paymentResult.paymentUrl,
//   //       RedirectUrl: paymentResult.paymentUrl,
//   //       Status: 'redirect',
//   //       PaymentId: paymentResult.tinkoffPaymentId,
//   //       OrderId: paymentResult.orderId,
//   //       Message: 'Платеж успешно создан'
//   //     });

//   //   } catch (error) {
//   //     console.error('❌ Ошибка обработки существующего пользователя:', error);
//   //     throw error;
//   //   }
//   // }

//   verifyTildaSignature(req) {
//     // Если в Tilda настроена подпись запросов
//     const signature = req.headers['x-tilda-signature'];
//     const publicKey = req.headers['x-tilda-public-key'];
    
//     if (CONFIG.TILDA.VERIFY_SIGNATURE && signature) {
//       // Здесь должна быть логика проверки подписи
//       // Tilda использует HMAC-SHA256 для подписи
//       console.log('🔐 Проверка подписи Tilda:', { signature, publicKey });
      
//       // Временная заглушка - всегда возвращаем true для тестирования
//       // В продакшене нужно реализовать настоящую проверку
//       return true;
//     }
    
//     return true; // Если проверка подписи не настроена
//   }

//   /**
//    * Нормализация данных из Tilda (поддерживает разные форматы)
//    */
//   normalizeTildaData(tildaData) {
//     console.log('🔍 Все данные от Tilda:', JSON.stringify(tildaData, null, 2));
  
//     // 🔧 ПРОСТО КОПИРУЕМ ВСЕ ПОЛЯ КРОМЕ ТЕХНИЧЕСКИХ
//     const formData = {};
//     const technicalFields = ['formid', 'pageid', 'tranid', 'projectid', 'X-Tilda-Api-Key'];
  
//     Object.keys(tildaData).forEach(key => {
//       if (!technicalFields.includes(key) && tildaData[key] !== undefined && tildaData[key] !== '') {
//         // Обрабатываем чекбоксы
//         if (key === 'Conditions' || key === 'Checkbox') {
//           formData[key] = this.normalizeCheckbox(tildaData[key]);
//         } else {
//           formData[key] = tildaData[key];
//         }
//       }
//     });
  
//     console.log('📊 Извлеченные данные формы:', formData);
  
//     const tildaMeta = {
//       formid: tildaData.formid || CONFIG.TILDA?.FORM_ID || 'bf403',
//       pageid: tildaData.pageid || '',
//       tranid: tildaData.tranid || '',
//       projectid: tildaData.projectid || CONFIG.TILDA?.PROJECT_ID || '14245141'
//     };
  
//     return { formData, tildaData: tildaMeta };
//   }

//   /**
//    * Нормализация чекбоксов (Tilda отправляет 'on' для отмеченных)
//    */
//   normalizeCheckbox(value) {
//     if (value === 'on' || value === 'yes' || value === true || value === 'true') {
//       return 'yes';
//     }
//     if (value === 'off' || value === 'no' || value === false || value === 'false') {
//       return 'no';
//     }
//     return value || 'no'; // Если значение есть, но не распознано - оставляем как есть
//   }

//   /**
//    * Создание платежа в Тинькофф
//    */
//   // async createTinkoffPayment(user, formData) {
//   //   const orderId = TokenGenerator.generateOrderId();
//   //   const amount = 1000;

//   //   const paymentData = {
//   //     TerminalKey: CONFIG.TINKOFF.TERMINAL_KEY,
//   //     Amount: amount,
//   //     OrderId: orderId,
//   //     Description: 'Вступительный взнос в клуб',
//   //     // SuccessURL: CONFIG.APP.SUCCESS_URL,
//   //     // FailURL: CONFIG.APP.FAIL_URL,
//   //     // NotificationURL: `${CONFIG.APP.BASE_URL}/tinkoff-callback`,
//   //     DATA: {
//   //       Name: user.fullname,
//   //       Email: user.email,
//   //       Phone: user.phone,
//   //       UserId: user.id,
//   //     }
//   //   };

//   //   console.log('📤 Отправка в Tinkoff:', paymentData);

//   //   const tinkoffService = new TinkoffService();
    
//   //   const tinkoffResponse = await tinkoffService.initPayment(paymentData);
    
//   //   if (!tinkoffResponse.Success) {
//   //     throw new Error(tinkoffResponse.Message || 'Ошибка создания платежа в Тинькофф');
//   //   }

//   //   return {
//   //     orderId,
//   //     amount,
//   //     tinkoffPaymentId: tinkoffResponse.PaymentId,
//   //     paymentUrl: tinkoffResponse.PaymentURL
//   //   };
//   // }

//   /**
//  * Создание платежа в Тинькофф
//  */
// async createTinkoffPayment(user, formData) {
//   const orderId = TokenGenerator.generateOrderId();
//   const amount = 1000;

//   // if (!CONFIG.TINKOFF.TERMINAL_KEY || !CONFIG.TINKOFF.PASSWORD) {
//   //   throw new Error('Tinkoff terminal configuration is missing');
//   // }

//   // Правильные данные для Tinkoff API
//   const paymentData = {
//     TerminalKey: CONFIG.TINKOFF.TERMINAL_KEY,
//     Amount: amount,
//     OrderId: orderId,
//     Description: 'Вступительный взнос в клуб',
//     // SuccessURL: CONFIG.APP.SUCCESS_URL,
//     // FailURL: CONFIG.APP.FAIL_URL,
//     NotificationURL: `${CONFIG.APP.BASE_URL}/tinkoff-callback`,
//     DATA: {
//       // Name: user.fullname,
//       Email: user.email,
//       Phone: user.phone,
//       // UserId: user.id,
//     }
//   };
//   console.log('📤 Отправка в Tinkoff:', paymentData);

//   const tinkoffService = new TinkoffService();
  
//   // Передаем правильные данные
//   const tinkoffResponse = await tinkoffService.initPayment(paymentData) || await tinkoffService.testConnection(paymentData);
  
//   if (!tinkoffResponse.Success) {
//     console.error('❌ Tinkoff API Error:', tinkoffResponse);
//     throw new Error(tinkoffResponse.Message || tinkoffResponse.ErrorMessage || 'Ошибка создания платежа в Тинькофф');
//   }

//   return {
//     orderId,
//     amount,
//     tinkoffPaymentId: tinkoffResponse.PaymentId,
//     paymentUrl: tinkoffResponse.PaymentURL
//   };
// }

//   /**
//    * Валидация формы без создания платежа
//    */
//   async validateForm(req, res) {
//     try {
//       const { formData, tildaData } = this.normalizeTildaData(req.body);
      
//       const validationErrors = TildaFormService.validateFormData(formData);
      
//       if (validationErrors.length > 0) {
//         return res.json({
//           Success: false,
//           Valid: false,
//           Errors: validationErrors
//         });
//       }

//       const existingUser = await TildaFormService.findUserByFormData(formData);
//       if (existingUser) {
//         return res.json({
//           Success: false,
//           Valid: false,
//           Errors: ['Пользователь с таким email или телефоном уже зарегистрирован']
//         });
//       }

//       res.json({
//         Success: true,
//         Valid: true,
//         Message: 'Форма валидна'
//       });

//     } catch (error) {
//       res.json({
//         Success: false,
//         Valid: false,
//         Errors: [error.message]
//       });
//     }
//   }

//   /**
//    * Проверка статуса платежа
//    */
//   async checkPaymentStatus(req, res) {
//     try {
//       const { OrderId, Email, Phone } = req.body;
      
//       let user;
//       if (OrderId) {
//         user = await User.findByOrderId(OrderId);
//       } else if (Email) {
//         user = await User.findByEmail(Email);
//       } else if (Phone) {
//         user = await User.findByPhone(Phone);
//       }

//       if (!user) {
//         return res.json({ 
//           Success: false, 
//           Message: 'Пользователь не найден' 
//         });
//       }

//       if (user.payment_id) {
//         const state = await TinkoffService.getPaymentState(user.payment_id);
        
//         res.json({
//           Success: true,
//           TinkoffStatus: state.Status,
//           User: {
//             name: user.fullname,
//             email: user.email,
//             phone: user.phone,
//             payment_status: user.payment_status,
//             membership_status: user.membership_status
//           }
//         });
//       } else {
//         res.json({
//           Success: true,
//           TinkoffStatus: 'UNKNOWN',
//           User: user
//         });
//       }
      
//     } catch (error) {
//       res.json({
//         Success: false,
//         Message: error.message
//       });
//     }
//   }
// }

// export default TildaController;

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

      // Нормализуем данные из Tilda
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

      // Проверка существующего пользователя
      const existingUserCheck = await this.checkExistingUserAndPayments(formData);
      if (existingUserCheck.hasActivePayment) {
        console.log('⚠️ Пользователь уже оплатил взнос:', existingUserCheck.user.email);
        
        return res.json({
          Success: false,
          ErrorCode: 'ALREADY_PAID', 
          Message: 'Вы уже оплатили вступительный взнос. Проверьте вашу почту для данных входа.',
          MemberNumber: existingUserCheck.user.membership_number,
          RedirectUrl: `http://npk-vdv.ru/paymentfee?memberNumber=${existingUserCheck.user.membership_number}`
        });
      }

      // Если пользователь существует но не оплатил - используем его
      if (existingUserCheck.user) {
        console.log('🔄 Пользователь существует, но не оплатил');
        let memberNumber = existingUserCheck.user.membership_number;
        if (!memberNumber) {
          memberNumber = await User.generateUniqueMemberNumber();
          await User.updateMemberNumber(existingUserCheck.user.id, memberNumber);
        }

        return res.json({
          Success: true,
          RedirectUrl: `http://npk-vdv.ru/paymentfee?memberNumber=${memberNumber}`,
          Status: 'redirect',
          MemberNumber: memberNumber,
          Message: 'Данные сохранены. Переход к оплате.'
        });
      }

      // СОЗДАЕМ НОВОГО ПОЛЬЗОВАТЕЛЯ
      const userResult = await TildaFormService.createUserFromForm(formData, tildaData);
      
      // ГЕНЕРИРУЕМ НОМЕР ЧЛЕНА КЛУБА
      const memberNumber = await User.generateUniqueMemberNumber();
      await User.updateMemberNumber(userResult.user.id, memberNumber);

      console.log('✅ Пользователь создан. Номер члена клуба:', memberNumber);

      // ПЕРЕНАПРАВЛЯЕМ НА СТРАНИЦУ С ДАННЫМИ
      return res.json({
        Success: true,
        RedirectUrl: `http://npk-vdv.ru/paymentfee?memberNumber=${memberNumber}`,
        Status: 'redirect',
        MemberNumber: memberNumber,
        Message: 'Регистрация успешна. Переход к оплате.'
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

      // Проверяем нет ли активных платежей
      const activePayment = await Payment.findActiveByUserId(user.id);
      if (activePayment) {
        return res.json({
          success: true,
          paymentUrl: activePayment.payment_url,
          message: 'Платеж уже создан'
        });
      }

      // СОЗДАЕМ ПЛАТЕЖ В ТИНЬКОФФ
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
      paymentUrl: tinkoffResponse.PaymentURL
    };
  }

  /**
   * Получение данных члена клуба для отображения
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

      const user = await User.findByMemberNumber(memberNumber);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Член клуба не найден'
        });
      }

      // Получаем информацию о платежах
      const latestPayment = await Payment.findLatestByUserId(user.id);

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
        paymentData: latestPayment ? {
          status: latestPayment.status,
          amount: latestPayment.amount,
          payment_url: latestPayment.payment_url
        } : null
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

  // Остальные методы остаются без изменений...
  // checkExistingUserAndPayments, verifyTildaSignature, normalizeTildaData, etc.

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
      
      return {
        user: user,
        hasActivePayment: hasSuccessfulPayment
      };

    } catch (error) {
      console.error('❌ Ошибка проверки пользователя:', error);
      return { user: null, hasActivePayment: false };
    }
  }

  async checkUserSuccessfulPayments(userId) {
    try {
      // Временное упрощение - проверяем только статус пользователя
      const user = await User.findById(userId);
      if (user && user.payment_status === 'paid') {
        console.log('✅ Пользователь уже оплатил (по статусу):', user.email);
        return true;
      }
      
      // Или просто возвращаем false для тестирования
      console.log('ℹ️ Пользователь не оплатил:', userId);
      return false;
      
    } catch (error) {
      console.error('❌ Ошибка проверки платежей:', error);
      return false;
    }
  }

  verifyTildaSignature(req) {
    // Ваша реализация проверки подписи
    return true;
  }

  normalizeTildaData(tildaData) {
    // Ваша реализация нормализации данных
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