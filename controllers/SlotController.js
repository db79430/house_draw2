// controllers/UserController.js
import User from '../models/Users.js';
import Payment from '../models/Payment.js';
import Slot from '../models/Slots.js';
import TinkoffService from '../services/TinkoffService.js';

class SlotController {
  /**
   * Получение данных пользователя для личного кабинета
   */
  static async getDashboard(req, res) {
    try {
      const userId = req.user.id;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }

      // Получаем слоты пользователя
      const userSlots = await Slot.findByUserId(userId);
      
      // Получаем историю платежей
      const paymentHistory = await Payment.getPaymentHistory(userId, 10);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            membership_number: user.membership_number,
            membership_status: user.membership_status,
            created_at: user.created_at
          },
          slots: userSlots,
          paymentHistory: paymentHistory,
          statistics: {
            totalSlots: userSlots.length,
            activeSlots: userSlots.filter(slot => slot.status === 'active').length
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting user dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения данных'
      });
    }
  }

  /**
   * Покупка слотов
   */
  static async purchaseSlots(req, res) {
    try {
      const userId = req.user.id;
      const { slotCount } = req.body;

      const validSlotCounts = [1, 3, 5, 15];
      if (!validSlotCounts.includes(slotCount)) {
        return res.status(400).json({
          success: false,
          message: 'Недопустимое количество слотов'
        });
      }

      const amount = slotCount * 1000; // 1000 рублей за слот

      // Создаем платеж в базе
      const orderId = `slot_${Date.now()}_${userId}`;
      
      const paymentData = {
        orderId,
        userId,
        amount,
        description: `Покупка ${slotCount} слотов`,
        slotCount
      };

      const payment = await Payment.create(paymentData);

      // Создаем платеж в Тинькофф
      const tinkoffPayment = await TinkoffService.initPayment({
        OrderId: orderId,
        Amount: amount,
        Description: `Покупка ${slotCount} слотов`,
        CustomerKey: userId.toString()
      });

      res.json({
        success: true,
        data: {
          paymentId: tinkoffPayment.PaymentId,
          paymentUrl: tinkoffPayment.PaymentURL,
          orderId: orderId,
          amount: amount,
          slotCount: slotCount
        }
      });

    } catch (error) {
      console.error('❌ Error purchasing slots:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка создания платежа'
      });
    }
  }

  /**
   * Получение истории покупок
   */
  static async getPurchaseHistory(req, res) {
    try {
      const userId = req.user.id;
      const payments = await Payment.getPaymentHistory(userId, 20);

      res.json({
        success: true,
        data: payments
      });

    } catch (error) {
      console.error('❌ Error getting purchase history:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения истории'
      });
    }
  }
}

export default SlotController;