import EmailServices from '../services/EmailServices.js';
import UserServices from '../services/UserServices.js';

class TinkoffController {
  async handleNotification(req, res) {
    try {
      console.log('📨 Уведомление от Tinkoff:', req.body);

      const { OrderId, Status, Success } = req.body;

      if (Status === 'CONFIRMED' && Success) {
        await this.processSuccessfulPayment(OrderId);
      } else if (Status === 'REJECTED' || Status === 'CANCELED') {
        await this.processFailedPayment(OrderId);
      }

      // Всегда отвечаем OK Tinkoff
      res.json({ Success: true });

    } catch (error) {
      console.error('❌ Ошибка обработки уведомления:', error);
      res.json({ Success: true }); // Всегда OK для Tinkoff
    }
  }

  async processSuccessfulPayment(orderId) {
    try {
      const session = UserServices.getUserSession(orderId);
      
      if (session && session.status === 'pending') {
        console.log('✅ Оплата подтверждена для OrderId:', orderId);
        
        // Отправляем email с данными доступа
        const emailResult = await EmailServices.sendCredentialsEmail(
          session.email,
          session.credentials.login,
          session.credentials.password,
          session.name
        );

        if (emailResult.success) {
          // Обновляем статус сессии
          UserService.completeUserSession(orderId);
          console.log('✅ Сессия завершена, email отправлен');
        } else {
          console.error('❌ Не удалось отправить email:', emailResult.error);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка обработки успешного платежа:', error);
    }
  }

  async processFailedPayment(orderId) {
    try {
      const session = UserService.getUserSession(orderId);
      if (session) {
        console.log('❌ Платеж отклонен для OrderId:', orderId);
        // Можно обновить статус сессии или отправить уведомление
      }
    } catch (error) {
      console.error('❌ Ошибка обработки неудачного платежа:', error);
    }
  }
}

export default TinkoffController;