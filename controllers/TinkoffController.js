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
      
      console.log('🔔 Получено уведомление от Тинькофф:', { OrderId, Success, Status, PaymentId });
      
      if (Success && Status === 'CONFIRMED') {
        // Находим платеж по OrderId (вместе с данными пользователя)
        const payment = await Payment.findByOrderId(OrderId);
        
        if (!payment) {
          console.error('❌ Платеж не найден:', OrderId);
          return res.status(200).send('OK');
        }

        // Получаем пользователя из данных платежа
        const user = {
          id: payment.user_id,
          email: payment.email,
          fullname: payment.fullname,
          login: payment.login,
          membership_status: payment.membership_status,
          password_hash: payment.password_hash
        };

        console.log('👤 Найден пользователь через платеж:', { 
          id: user.id, 
          email: user.email, 
          membership_status: user.membership_status 
        });

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
          console.log('🔐 Сгенерирован новый пароль для пользователя:', user.email);
        } else {
          console.log('🔐 Используется существующий пароль для пользователя:', user.email);
        }

        // Отправляем email с данными для входа
        const emailService = new EmailService();
        const emailResult = await emailService.sendCredentialsEmail(
          user.email,
          user.login || user.email,
          password,
          user.fullname || 'Пользователь',
          user.yeardate,
          user.city,
          user.membership_number,
          user.phone
        );

        if (emailResult.success) {
          console.log('✅ Email отправлен пользователю:', user.email);
        } else {
          console.error('❌ Ошибка отправки email:', emailResult.error);
        }
      } else {
        console.log('ℹ️ Платеж не подтвержден или неуспешен:', { OrderId, Success, Status });
        
        // Обработка неудачных платежей
        if (!Success) {
          await this.processFailedPayment(OrderId, PaymentId);
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Ошибка обработки уведомления:', error);
      res.status(200).send('OK');
    }
  }

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
        const user = await User.findById(payment.user_id); // Исправлено: payment.user_id
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