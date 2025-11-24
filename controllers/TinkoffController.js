// controllers/TinkoffController.js
import User from '../models/Users.js';
import Payment from '../models/Payment.js';
import EmailService from '../services/EmailServices.js'
import Helpers from '../utils/Helpers.js';

class TinkoffController {
  /**
   * Обработка уведомлений от Тинькофф
   */
  async handleNotification(req, res) {
    try {
      const { OrderId, Success, Status, PaymentId } = req.body;
      
      if (Success && Status === 'CONFIRMED') {
        // Находим пользователя по OrderId
        const user = await User.findByOrderId(OrderId);
        
        if (!user) {
          console.error('❌ Пользователь не найден для платежа:', OrderId);
          return res.status(200).send('OK');
        }

        // 🔧 ПРОВЕРЯЕМ, НЕ БЫЛ ЛИ УЖЕ ОТПРАВЛЕН EMAIL
        if (user.membership_status === 'active') {
          console.log('⚠️ Пользователь уже активен, email не отправляем:', user.email);
          
          // Просто обновляем статус платежа
          await Payment.updateStatus(OrderId, 'completed');
          return res.status(200).send('OK');
        }

        // Обновляем статус пользователя на активный
        await User.updateMembershipStatus(user.id, 'active');
        
        // Обновляем статус платежа
        await Payment.updateStatus(OrderId, 'completed');

        console.log('✅ Payment processed, sending email to:', user.email);

        // 🔧 ПРОВЕРЯЕМ, ЕСТЬ ЛИ УЖЕ ПАРОЛЬ У ПОЛЬЗОВАТЕЛЯ
        let password = user.password_hash;
        if (!password) {
          // Генерируем пароль только если его нет
          password = Helpers.generatePassword();
          await User.updatePassword(user.id, password);
        }

        // Отправляем email с данными для входа
        const emailResult = await EmailService.sendCredentialsEmail(
          user.email,
          user.login || user.email,
          password,
          user.fullname || 'Пользователь'
        );

        if (emailResult.success) {
          console.log('✅ Email отправлен пользователю:', user.email);
        } else {
          console.error('❌ Ошибка отправки email:', emailResult.error);
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Ошибка обработки уведомления:', error);
      res.status(200).send('OK');
    }
  }


// async processSuccessfulPayment(orderId) {
//   try {
//     console.log('💰 Processing successful payment for order:', orderId);
    
//     const payment = await Payment.findByOrderId(orderId);
//     if (!payment) {
//       console.error('❌ Платеж не найден:', orderId);
//       return;
//     }

//     const user = await User.findById(payment.user_id);
//     if (!user) {
//       console.error('❌ Пользователь не найден для платежа:', orderId);
//       return;
//     }

//     // ✅ ИСПОЛЬЗУЕМ СУЩЕСТВУЮЩИЙ МЕТОД ИЗ HELPERS
//     const newPassword = Helpers.generatePassword(10); // длина 10 символов
//     console.log('🔐 Generated password for user:', user.email, 'Password:', newPassword);

//     // ✅ ОБНОВЛЯЕМ ПАРОЛЬ В БАЗЕ ДАННЫХ
//     await User.updatePassword(payment.user_id, newPassword);

//     // Обновляем статус платежа
//     await Payment.updateStatus(orderId, 'completed');

//     // Обновляем статус пользователя
//     await User.updateMembershipStatus(payment.user_id, 'active');

//     console.log('✅ Payment processed, sending email to:', user.email);

//     // ✅ ПЕРЕДАЕМ СГЕНЕРИРОВАННЫЙ ПАРОЛЬ В EMAIL
//     const emailResult = await EmailService.sendCredentialsEmail(
//       user.email,
//       user.login || user.email, // используем email как логин если login нет
//       newPassword, // ← ПЕРЕДАЕМ НОВЫЙ ПАРОЛЬ
//       user.fullname || 'Пользователь'
//     );

//     if (emailResult.success) {
//       console.log('✅ Email отправлен пользователю:', user.email);
//       console.log('🔐 Пароль для входа:', newPassword);
//     } else {
//       console.error('❌ Ошибка отправки email:', emailResult.error);
//     }

//   } catch (error) {
//     console.error('❌ Ошибка обработки успешного платежа:', error);
//   }
// }


  /**
   * Обработка неудачного платежа
   */
  async processFailedPayment(orderId, paymentId) {
    try {
      console.log('❌ Платеж отклонен для OrderId:', orderId);

      // Обновляем статус платежа
      await Payment.updateStatus(orderId, 'failed');

      // Можно отправить уведомление пользователю
      const payment = await Payment.findByOrderId(orderId);
      if (payment) {
        const user = await User.findById(payment.userId);
        if (user) {
          console.log('ℹ️ Платеж отклонен для пользователя:', user.email);
          // await EmailServices.sendPaymentFailedEmail(user.email, user.fullname);
        }
      }

    } catch (error) {
      console.error('❌ Ошибка обработки неудачного платежа:', error);
    }
  }
}

export default TinkoffController;