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
        await Payment.updateStatus(payment.order_id, 'completed', notificationData);
        console.log('✅ Payment status updated to "completed"');
  
        // РАССЧИТЫВАЕМ количество слотов из суммы платежа
        let slotCount = 0;
        
        // Используем amount из уведомления или из платежа
        const paymentAmount = Amount || payment.amount;
        
        // Формула: 1000 рублей = 1 слот
        // Amount в копейках, поэтому 1000 руб = 100000 копеек
        slotCount = paymentAmount / 100000;
        
        console.log(`📊 Payment amount: ${paymentAmount} kop = ${paymentAmount/100} руб`);
        console.log(`📊 Creating ${slotCount} slots (${paymentAmount/100} руб / 1000 руб per slot)`);
  
        // Создаем слоты если есть userId
        if (userId) {
          try {
            // Создаем слоты
            const result = await Slot.createSlotsFromPaymentAmount(userId, paymentAmount, payment.id);
            
            if (result.success) {
              createdSlots = result.slots;
              console.log(`✅ Successfully created ${createdSlots.length} slots`);
              
              // Обновляем статус пользователя
              await User.updateMembershipStatus(userId, 'active');
              console.log('✅ User membership status updated to "active"');
              
            } else {
              console.error('❌ Slot creation failed:', result.error);
            }
            
          } catch (slotError) {
            console.error('❌ Error creating slots:', slotError);
          }
        } else {
          console.error('❌ Cannot create slots: payment has no user_id');
        }
  
      } else if (Status === 'AUTHORIZED') {
        await Payment.updateStatus(payment.order_id, 'authorized', notificationData);
        console.log('🔄 Payment authorized:', Status);
        
      } else {
        await Payment.updateStatus(payment.order_id, 'failed', notificationData);
        console.log('❌ Payment failed:', Status);
      }
  
      // Отвечаем OK Tinkoff
      res.send('OK');
  
      // Отправляем уведомление
      if (Success && Status === 'CONFIRMED' && createdSlots.length > 0 && userId) {
        const updatedPayment = await Payment.findByOrderId(OrderId);
        await this.notifyUserAboutPurchase(userId, createdSlots, updatedPayment);
      }
  
    } catch (error) {
      console.error('❌ Error handling payment notification:', error);
      res.send('OK');
    }
  }

  static async notifyUserAboutPurchase(userId, slots, payment = null) {
    try {
      console.log('📧 Notifying user about purchase:', { userId, slotCount: slots.length });

      // Получаем данные пользователя
      const user = await User.findById(userId);

      if (!user) {
        console.error('❌ User not found for notification:', userId);
        return;
      }

      console.log('👤 User found for notification:', {
        userId: user.id,
        email: user.email,
        name: user.fullname
      });

      // Данные для уведомления
      const notificationData = {
        user: {
          id: user.id,
          email: user.email,
          fullname: user.fullname,
          phone: user.phone,
          membership_number: user.membership_number
        },
        slots: slots.map(slot => ({
          id: slot.id,
          slot_number: slot.slot_number,
          purchase_date: slot.purchase_date,
          status: slot.status
        })),
        purchase_summary: {
          total_slots: slots.length,
          purchase_date: new Date(),
          first_slot: slots[0]?.slot_number,
          last_slot: slots[slots.length - 1]?.slot_number,
          slot_numbers: slots.map(s => s.slot_number)
        },
        payment: payment ? {
          id: payment.id,
          order_id: payment.order_id,
          amount: payment.amount,
          status: payment.status
        } : null
      };

      // Отправляем уведомления разными способами (параллельно)
      const promises = [];

      // 1. Email уведомление
      if (user.email) {
        promises.push(EmailService.sendEmailNotification(user, slots, notificationData));
      } else {
        console.warn('⚠️  User has no email for notification');
      }

      // 2. Сохраняем уведомление в базе
      promises.push(EmailService.saveNotificationToDB(userId, notificationData));

      // Выполняем все уведомления параллельно
      await Promise.allSettled(promises);

      console.log('✅ Purchase notifications sent successfully to user:', userId);

    } catch (error) {
      console.error('❌ Error notifying user about purchase:', error);
      // Не прерываем основной поток из-за ошибки уведомления
    }
  }

}

export default SlotController;