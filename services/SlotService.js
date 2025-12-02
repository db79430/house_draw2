// services/SlotService.js
import Slot from '../models/Slots.js';
import Payment from '../models/Payment.js';
import TinkoffService from '../services/TinkoffService.js';
import CONFIG from '../config/index.js';
import User from '../models/Users.js';

class SlotService {
  /**
   * Покупка слотов
   */
  async purchaseSlots(userId, slotCount) { 
    try {
      console.log('🎯 Starting slot purchase:', { userId, slotCount });

      // Валидация
      if (!userId || !slotCount || slotCount <= 0) {
        throw new Error('Некорректные данные для покупки слотов');
      }

      // Находим пользователя по ID
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      console.log('👤 Found user:', {
        id: user.id,
        memberNumber: user.memberNumber,
        email: user.email,
        phone: user.phone
      });

      // Расчет суммы
      const amount = this.calculateAmount(slotCount);
      console.log('💰 Calculated amount:', amount);

      // Создаем заказ в Tinkoff
      const orderId = `slot_${userId}_${Date.now()}`;
      
      const paymentData = {
        TerminalKey: CONFIG.TINKOFF.TERMINAL_KEY,
        Amount: amount,
        OrderId: orderId,
        Description: `Покупка ${slotCount} слотов. Член клуба: ${user.memberNumber || 'Не указан'}`,
        NotificationURL: `${CONFIG.APP.BASE_URL}/tinkoff-callback`,
        DATA: {
          Email: user.email || '',
          Phone: user.phone || '',
          MemberNumber: user.memberNumber || '',
          SlotCount: slotCount
        },
      };

      console.log('📋 Payment data prepared:', {
        OrderId: paymentData.OrderId,
        Amount: paymentData.Amount,
        Description: paymentData.Description
      });

      // Создаем платеж в базе
      const payment = await Payment.create({
        user_id: userId,
        order_id: orderId,
        amount: amount,
        description: paymentData.Description,
        status: 'pending',
        metadata: {
          slot_count: slotCount,
          member_number: user.memberNumber
        }
      });
      
      console.log('✅ Payment record created:', payment.id);

      // Инициируем платеж в Tinkoff
      const tinkoffService = new TinkoffService();
      const tinkoffResult = await tinkoffService.initPayment(paymentData);

      console.log('✅ Tinkoff payment initiated:', {
        PaymentId: tinkoffResult.PaymentId,
        PaymentURL: tinkoffResult.PaymentURL,
      });

      // Обновляем платеж с PaymentId от Tinkoff
      if (tinkoffResult.PaymentId) {
        await Payment.update(payment.id, {
          external_id: tinkoffResult.PaymentId,
          metadata: {
            ...payment.metadata,
            tinkoff_payment_id: tinkoffResult.PaymentId
          }
        });
      }

      return {
        success: true,
        paymentId: payment.id,
        paymentUrl: tinkoffResult.PaymentURL,
        orderId: orderId,
        amount: amount,
        tinkoffPaymentId: tinkoffResult.PaymentId
      };

    } catch (error) {
      console.error('❌ Error in purchaseSlots:', error);
      throw error;
    }
  }

  /**
   * Расчет стоимости слотов
   */
  calculateAmount(slotCount) {
    const prices = {
      1: 100000,  // 1000 руб в копейках
      3: 300000,  // 3000 руб
      5: 500000,  // 5000 руб
      15: 1500000 // 15000 руб
    };

    if (!prices[slotCount]) {
      throw new Error(`Некорректное количество слотов: ${slotCount}`);
    }

    return prices[slotCount];
  }

  /**
   * Генерация чека для Tinkoff
   */
  generateReceipt(amount, slotCount, email) {
    return {
      Email: email,
      Taxation: 'osn',
      Items: [
        {
          Name: `Покупка ${slotCount} слотов участия`,
          Price: amount,
          Quantity: 1,
          Amount: amount,
          Tax: 'none',
          PaymentMethod: 'full_payment',
          PaymentObject: 'service'
        }
      ]
    };
  }

  /**
   * Получение слотов пользователя
   */
  async getUserSlots(userId) {
    try {
      console.log('🔍 Getting user slots for:', userId);
      
      const slots = await Slot.findByUserIdSlots(userId);
      
      return {
        success: true,
        slots: slots,
        totalCount: slots.length,
        activeCount: slots.filter(slot => slot.status === 'active').length
      };

    } catch (error) {
      console.error('❌ Error getting user slots:', error);
      throw error;
    }
  }

  /**
   * Создание слотов после успешной оплаты
   */
  async createSlotsAfterPayment(userId, slotCount, paymentId) {
    try {
      console.log('🎰 Creating slots after payment:', { userId, slotCount, paymentId });

      // Создаем слоты
      const slots = await Slot.createMultipleSlots(userId, slotCount);
      
      // Обновляем статус платежа
      await Payment.updateStatus(paymentId, 'completed');

      console.log(`✅ Successfully created ${slots.length} slots for user ${userId}`);

      return {
        success: true,
        slots: slots,
        slotCount: slots.length
      };

    } catch (error) {
      console.error('❌ Error creating slots after payment:', error);
      
      // Отмечаем платеж как ошибочный
      await Payment.updateStatus(paymentId, 'failed');
      
      throw error;
    }
  }

  /**
   * Получение статистики по слотам
   */
  async getSlotStatistics(userId) {
    try {
      const slots = await Slot.findByUserIdSlots(userId);
      const activeSlots = slots.filter(slot => slot.status === 'active');
      
      return {
        totalSlots: slots.length,
        activeSlots: activeSlots.length,
        availableSlots: await Slot.getAvailableSlotsCount()
      };

    } catch (error) {
      console.error('❌ Error getting slot statistics:', error);
      return {
        totalSlots: 0,
        activeSlots: 0,
        availableSlots: 0
      };
    }
  }
}

export default SlotService;