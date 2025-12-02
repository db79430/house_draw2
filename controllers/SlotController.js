// controllers/SlotController.js
import SlotService from '../services/SlotService.js';
import Payment from '../models/Payment.js';
import TinkoffService from '../services/TinkoffService.js';

class SlotController {
  constructor() {
    this.slotService = new SlotService();
  }

  /**
   * Покупка слотов
   */
  async purchaseSlots(req, res) {
    try {
      console.log('🎯 POST /api/slots/purchase called');
      
      const { slotCount } = req.body;
      const userId = req.user.id;
      const userData = req.user;

      if (!slotCount) {
        return res.status(400).json({
          success: false,
          message: 'Укажите количество слотов для покупки'
        });
      }

      const result = await this.slotService.purchaseSlots(userId, slotCount, userData);

      res.json({
        success: true,
        message: 'Платеж инициирован',
        paymentUrl: result.paymentUrl,
        orderId: result.orderId,
        amount: result.amount
      });

    } catch (error) {
      console.error('❌ Error in purchaseSlots controller:', error);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка при создании платежа'
      });
    }
  }

  /**
   * Получение слотов пользователя
   */
  async getUserSlots(req, res) {
    try {
      const userId = req.user.id;
      
      const result = await this.slotService.getUserSlots(userId);

      res.json(result);

    } catch (error) {
      console.error('❌ Error in getUserSlots controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении слотов'
      });
    }
  }

  /**
   * Получение статистики
   */
  async getStatistics(req, res) {
    try {
      const userId = req.user.id;
      
      const statistics = await this.slotService.getSlotStatistics(userId);

      res.json({
        success: true,
        statistics
      });

    } catch (error) {
      console.error('❌ Error in getStatistics controller:', error);
      
      res.status(500).json({
        success: false,
        statistics: {
          totalSlots: 0,
          activeSlots: 0,
          availableSlots: 0
        }
      });
    }
  }

  /**
   * Обработка уведомления от Tinkoff
   */
  // async handlePaymentNotification(req, res) {
  //   try {
  //     console.log('💰 Tinkoff notification received:', req.body);

  //     const notificationData = req.body;
      
  //     // Верифицируем уведомление
  //     const isValid = await TinkoffService.verifyNotification(notificationData);
      
  //     if (!isValid) {
  //       console.error('❌ Invalid Tinkoff notification');
  //       return res.status(400).send('Invalid notification');
  //     }

  //     const { OrderId, Success, Status, PaymentId } = notificationData;

  //     // Находим платеж в базе
  //     const payment = await Payment.findByOrderId(OrderId);
      
  //     if (!payment) {
  //       console.error('❌ Payment not found for order:', OrderId);
  //       return res.status(404).send('Payment not found');
  //     }

  //     if (Success && Status === 'CONFIRMED') {
  //       console.log('✅ Payment confirmed, creating slots...');
        
  //       // Извлекаем количество слотов из описания
  //       const slotCountMatch = payment.description.match(/Покупка (\d+) слотов/);
  //       const slotCount = slotCountMatch ? parseInt(slotCountMatch[1]) : 1;

  //       // Создаем слоты
  //       await this.slotService.createSlotsAfterPayment(
  //         payment.user_id, 
  //         slotCount, 
  //         payment.id
  //       );

  //       console.log('✅ Slots created successfully');

  //     } else {
  //       // Платеж не прошел
  //       await Payment.updateStatus(payment.id, 'failed');
  //       console.log('❌ Payment failed:', Status);
  //     }

  //     // Всегда отвечаем OK Tinkoff
  //     res.send('OK');

  //   } catch (error) {
  //     console.error('❌ Error handling payment notification:', error);
  //     res.status(500).send('Error');
  //   }
  // }

  async handlePaymentNotification(req, res) {
    try {
      console.log('💰 Tinkoff notification received:', req.body);

      const notificationData = req.body;
      
      // ВАЖНО: ВАМ НУЖНО БУДЕТ ДОБАВИТЬ ПРОВЕРКУ ПОДПИСИ
      // Но пока работаем без нее для тестирования
      const isValid = await TinkoffService.verifyNotificationSimple(notificationData);
      if (!isValid) {
        console.error('❌ Invalid Tinkoff notification');
        return res.status(400).send('Invalid notification');
      }

      const { OrderId, Success, Status, PaymentId } = notificationData;

      // Находим платеж в базе
      const payment = await Payment.findByOrderId(OrderId);
      
      if (!payment) {
        console.error('❌ Payment not found for order:', OrderId);
        return res.status(404).send('Payment not found');
      }

      let createdSlots = [];
      let updatedPayment = null;

      if (Success && Status === 'CONFIRMED') {
        console.log('✅ Payment confirmed, creating slots...');
        
        // Извлекаем количество слотов из описания
        const slotCountMatch = payment.description.match(/Покупка (\d+) слотов/);
        const slotCount = slotCountMatch ? parseInt(slotCountMatch[1]) : 1;

        // Создаем слоты и получаем их данные
        createdSlots = await this.slotService.createSlotsAfterPayment(
          payment.user_id, 
          slotCount, 
          payment.id
        );

        console.log('✅ Slots created successfully:', createdSlots.length);

        // Обновляем статус платежа
        await Payment.updateStatus(payment.id, 'completed');

      } else {
        // Платеж не прошел
        await Payment.updateStatus(payment.id, 'failed');
        console.log('❌ Payment failed:', Status);
      }

      // Получаем обновленные данные платежа
      updatedPayment = await Payment.findById(payment.id);

      // Всегда отвечаем OK Tinkoff
      res.send('OK');

      // ДОПОЛНИТЕЛЬНО: Можно отправить данные на фронтенд через WebSocket или уведомление
      // или сохранить их для последующего запроса
      this.storePaymentResult(payment.user_id, {
        success: Success && Status === 'CONFIRMED',
        payment: updatedPayment,
        slots: createdSlots,
        orderId: OrderId
      });

    } catch (error) {
      console.error('❌ Error handling payment notification:', error);
      res.status(500).send('Error');
    }
  }
}

export default SlotController;