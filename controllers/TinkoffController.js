// controllers/TinkoffController.js
import EmailServices from '../services/EmailServices.js';
import User from '../models/Users.js';
import Payment from '../models/Payment.js';

class TinkoffController {
  /**
   * Обработка уведомлений от Тинькофф
   */
  async handleNotification(req, res) {
    try {
      console.log('📨 Уведомление от Tinkoff:', req.body);

      const { OrderId, Status, Success, PaymentId } = req.body;

      // Всегда отвечаем OK Tinkoff
      res.json({ Success: true });

      // Обрабатываем асинхронно
      if (Status === 'CONFIRMED' && Success) {
        await this.processSuccessfulPayment(OrderId, PaymentId);
      } else if (Status === 'REJECTED' || Status === 'CANCELED') {
        await this.processFailedPayment(OrderId, PaymentId);
      }

    } catch (error) {
      console.error('❌ Ошибка обработки уведомления:', error);
      // Всегда OK для Tinkoff даже при ошибках
    }
  }

  /**
   * Обработка успешного платежа
   */
  async processSuccessfulPayment(orderId, paymentId) {
    try {
      console.log('✅ Оплата подтверждена для OrderId:', orderId);

      // Находим платеж в БД
      const payment = await Payment.findByOrderId(orderId);
      if (!payment) {
        console.error('❌ Платеж не найден:', orderId);
        return;
      }

      // Находим пользователя
      const user = await User.findById(payment.userId);
      if (!user) {
        console.error('❌ Пользователь не найден для платежа:', orderId);
        return;
      }

      // Обновляем статус платежа
      await Payment.updateStatus(orderId, 'completed');

      // Обновляем статус пользователя
      await User.updateMembershipStatus(user.id, 'active');

      // Отправляем email с данными доступа
      const emailResult = await EmailServices.sendCredentialsEmail(
        user.email,
        user.login,
        user.password, // Должен быть зашифрован в БД
        user.fullname
      );

      if (emailResult.success) {
        console.log('✅ Email отправлен пользователю:', user.email);
      } else {
        console.error('❌ Ошибка отправки email:', emailResult.error);
      }

    } catch (error) {
      console.error('❌ Ошибка обработки успешного платежа:', error);
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