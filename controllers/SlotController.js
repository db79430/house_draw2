// controllers/SlotController.js
import SlotService from '../services/SlotService.js';
import Payment from '../models/Payment.js';
import TinkoffService from '../services/TinkoffService.js';
import EmailService from '../services/EmailServices.js';
import User from '../models/Users.js';
import Slot from '../models/Slots.js';

class SlotController {
  constructor() {
    this.slotService = new SlotService();
  }

  /**
   * Покупка слотов
   */
  async purchase(req, res) {
    try {
      const { slotCount } = req.body;
      const userId = req.user?.id;

      console.log('🛒 Purchase request:', {
        userId,
        slotCount,
        userFromReq: req.user
      });

      if (!slotCount || slotCount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Укажите количество слотов'
        });
      }

      const slotService = new SlotService();
      const result = await slotService.purchaseSlots(userId, slotCount);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Controller error:', error);
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

  // controllers/PaymentController.js
  async handlePaymentNotification(req, res) {
    try {
      console.log('💰 Tinkoff notification received:', JSON.stringify(req.body, null, 2));

      const notificationData = req.body;
      const { OrderId, Success, Status, PaymentId, Amount } = notificationData;

      console.log('🔍 Processing notification:', {
        OrderId,
        Success,
        Status,
        PaymentId,
        Amount
      });

      // Находим платеж
      const payment = await Payment.findByOrderId(OrderId);

      if (!payment) {
        console.error('❌ Payment not found for order:', OrderId);
        return res.status(404).send('Payment not found');
      }

      // Определяем userId
      const userId = payment.user_id;

      console.log('✅ Found payment:', {
        id: payment.id,
        user_id: userId,
        order_id: payment.order_id,
        amount: payment.amount,
        status: payment.status
      });

      let createdSlots = [];

      if (Success && Status === 'CONFIRMED') {
        console.log('✅ Payment confirmed, processing...');

        // Обновляем статус платежа
        await Payment.updateStatus(payment.id, 'completed', notificationData);
        console.log('✅ Payment status updated to "completed"');

        // 🔥 ИСПРАВЛЕНО: УБРАЛИ ДУБЛИРОВАНИЕ ОБЪЯВЛЕНИЯ slotCount
        // Используем amount из уведомления или из платежа
        const paymentAmount = Amount || payment.amount;

        // 🔥 ФОРМУЛА: 1000 рублей = 1 слот
        // Amount в копейках, поэтому 1000 руб = 100000 копеек
        // Пример: 100000 копеек / 100000 = 1 слот
        const slotCount = Math.floor(paymentAmount / 100000); // 🔥 ТОЛЬКО ОДИН РАЗ ОБЪЯВЛЯЕМ

        console.log(`📊 Payment details:`, {
          amountInKop: paymentAmount,
          amountInRub: paymentAmount / 100,
          slotCount: slotCount,
          formula: `${paymentAmount} kop / 100000 = ${slotCount} slots`
        });

        if (slotCount <= 0) {
          console.error('❌ Invalid slot count calculated:', slotCount);
          throw new Error(`Invalid payment amount: ${paymentAmount} kop is not enough for any slots`);
        }

        // Создаем слоты если есть userId
        if (userId) {
          try {
            // 🔥 ПРАВИЛЬНЫЙ ВЫЗОВ: передаем slotCount, а не paymentAmount
            const result = await this.slotService.createSlotsAfterPayment(
              userId,
              slotCount, // 🔥 количество слотов
              payment.id
            );

            if (result.success) {
              createdSlots = result.slots;
              console.log(`✅ Successfully created ${createdSlots.length} slots`);

              // Обновляем статус пользователя
              await User.updateMembershipStatus(userId, 'active');
              console.log('✅ User membership status updated to "active"');

            } else {
              console.error('❌ Slot creation failed:', result.error);
              throw new Error(`Slot creation failed: ${result.error}`);
            }

          } catch (slotError) {
            console.error('❌ Error creating slots:', slotError);
            throw slotError;
          }
        } else {
          console.error('❌ Cannot create slots: payment has no user_id');
          throw new Error('Payment has no associated user');
        }

      } else if (Status === 'AUTHORIZED') {
        await Payment.updateStatus(paymentIdForUpdate, 'authorized', notificationData);
        console.log('🔄 Payment authorized:', Status);

      } else {
        await Payment.updateStatus(paymentIdForUpdate, 'failed', notificationData);
        console.log('❌ Payment failed:', Status);
      }

      // Отвечаем OK Tinkoff
      res.send('OK');

      // Отправляем уведомление
      if (Success && Status === 'CONFIRMED' && createdSlots.length > 0 && userId) {
        try {
          const updatedPayment = await Payment.findByOrderId(OrderId);
          await this.notifyUserAboutPurchase(userId, createdSlots, updatedPayment);
          console.log('📧 Notification sent to user');
        } catch (notifyError) {
          console.error('❌ Error sending notification:', notifyError);
        }
      }

    } catch (error) {
      console.error('❌ Error handling payment notification:', error);
      // Tinkoff требует всегда отвечать OK
      res.send('OK');
    }
  }

  async notifyUserAboutPurchase(userId, slots, payment = null) {
    try {
      console.log('📧 Уведомление пользователя о покупке:', {
        userId,
        slotCount: slots.length
      });

      // Получаем данные пользователя
      const user = await User.findById(userId);

      if (!user) {
        console.error('❌ Пользователь не найден для уведомления:', userId);
        return { success: false, error: 'Пользователь не найден' };
      }

      if (!user.email) {
        console.warn('⚠️ У пользователя нет email для уведомления');
        return { success: false, error: 'У пользователя нет email' };
      }

      console.log('👤 Пользователь найден для уведомления:', {
        email: user.email,
        name: user.fullname || user.name,
        memberNumber: user.membership_number
      });

      // Подготовка данных для email
      const emailData = {
        userName: user.fullname || user.name || 'Клиент',
        userEmail: user.email,
        memberNumber: user.membership_number || 'Не указан',
        slotCount: slots.length,
        amount: payment ? payment.amount : slots.length * 1000, // Цена за слот
        orderId: payment ? payment.order_id : `SLOT-${Date.now()}`,
        purchaseDate: new Date().toLocaleDateString('ru-RU'),
        slotNumbers: slots.map(s => s.slot_number || s.id),
        phone: user.phone || '',
        city: user.city || ''
      };

      // Отправляем email
      const emailResult = await EmailService.sendEmailNotification(emailData);

      if (emailResult.success) {
        console.log('✅ Email уведомление отправлено успешно');
        console.log(`   Получатель: ${user.email}`);
        console.log(`   Номер заказа: ${emailData.orderId}`);
        console.log(`   Количество слотов: ${slots.length}`);
      } else {
        console.warn('⚠️ Не удалось отправить email уведомление:', emailResult.error);
      }

      return {
        success: emailResult.success,
        emailSent: emailResult.success,
        data: emailData,
        error: emailResult.error
      };

    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
export default SlotController;