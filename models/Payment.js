// models/Payment.js
import db from '../database/index.js';

class Payment {
  static async create(paymentData) {
    const {
      orderId,
      userId,
      amount,
      tinkoffPaymentId,
      description,
      tinkoffResponse
    } = paymentData;

    const query = `
      INSERT INTO payments (order_id, user_id, amount, tinkoff_payment_id, description, tinkoff_response)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      orderId,
      userId,
      amount,
      tinkoffPaymentId,
      description,
      tinkoffResponse
    ];

    try {
      const result = await db.one(query, values);
      console.log('✅ Payment created in database:', result.order_id);
      return result;
    } catch (error) {
      console.error('❌ Error creating payment:', error);
      throw error;
    }
  }

  static async findByOrderId(orderId) {
    try {
      const query = `
        SELECT 
          p.*, 
          u.id as user_id,
          u.email,
          u.fullname,
          u.login,
          u.membership_status
        FROM payments p 
        LEFT JOIN users u ON p.user_id = u.id 
        WHERE p.order_id = $1
      `;
      const result = await db.oneOrNone(query, [orderId]);

      if (result) {
        console.log('✅ Payment found by orderId:', {
          id: result.id,
          order_id: result.order_id,
          user_id: result.user_id, // Из таблицы payments
          userId: result.user_id,  // Алиас для удобства
          amount: result.amount,
          status: result.status
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Error finding payment by orderId:', error);
      throw error;
    }
  }

  /**
   * Обновить статус платежа по order_id (строковому)
   */
  static async updateStatus(orderId, status, notificationData = null) {
    try {
      console.log('🔄 Updating payment status by order_id:', { orderId, status });

      // Убедимся что orderId - строка
      const orderIdStr = String(orderId);

      const query = `
        UPDATE payments 
        SET status = $1, notification_data = $2, updated_at = CURRENT_TIMESTAMP
        WHERE order_id = $3
        RETURNING *
      `;

      const result = await db.one(query, [status, notificationData, orderIdStr]);
      console.log('✅ Payment status updated:', orderIdStr, '->', status);
      return result;
    } catch (error) {
      console.error('❌ Error updating payment status by order_id:', error);
      throw error;
    }
  }

  /**
   * Обновить статус платежа по ID (числовому)
   */
  static async updateStatusById(id, status, notificationData = null) {
    try {
      console.log('🔄 Updating payment status by id:', { id, status });

      // Убедимся что id - число
      const idNum = parseInt(id);
      if (isNaN(idNum)) {
        throw new Error(`Invalid payment id: ${id}`);
      }

      const query = `
        UPDATE payments 
        SET status = $1, notification_data = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const result = await db.one(query, [status, notificationData, idNum]);
      console.log('✅ Payment status updated by id:', idNum, '->', status);
      return result;
    } catch (error) {
      console.error('❌ Error updating payment status by id:', error);
      throw error;
    }
  }

  // models/Payment.js
  static async updateUserId(paymentId, userId) {
    try {
      console.log('🔄 Updating payment userId:', { paymentId, userId });

      const query = `
      UPDATE payments 
      SET user_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

      const result = await db.one(query, [userId, paymentId]);
      console.log('✅ Payment userId updated:', { paymentId, userId });
      return result;
    } catch (error) {
      console.error('❌ Error updating payment userId:', error);
      throw error;
    }
  }

  /**
   * Универсальный метод обновления статуса
   */
  static async updatePaymentStatus(identifier, status, notificationData = null) {
    try {
      // Определяем тип идентификатора
      const isNumeric = /^\d+$/.test(String(identifier));

      if (isNumeric) {
        // Если идентификатор выглядит как число, используем id
        return await this.updateStatusById(identifier, status, notificationData);
      } else {
        // Иначе используем order_id
        return await this.updateStatus(identifier, status, notificationData);
      }
    } catch (error) {
      console.error('❌ Error in updatePaymentStatus:', error);
      throw error;
    }
  }

  static async getPaymentHistory(userId, limit = 10) {
    try {
      const query = `
        SELECT * FROM payments 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;

      return await db.any(query, [userId, limit]);
    } catch (error) {
      console.error('❌ Error getting payment history:', error);
      throw error;
    }
  }

  static async getPaymentHistory(userId, limit = 10) {
    try {
      const query = `
          SELECT * FROM payments 
          WHERE user_id = $1 
          ORDER BY created_at DESC 
          LIMIT $2
      `;

      return await db.any(query, [userId, limit]);
    } catch (error) {
      console.error('❌ Error getting payment history:', error);
      return [];
    }
  }

  static async findSuccessfulPaymentsByUserId(userId) {
    try {
      console.log('🔍 Поиск успешных платежей пользователя:', userId);

      const query = `
        SELECT * FROM payments 
        WHERE user_id = $1 
        AND status IN ('CONFIRMED', 'success', 'paid', 'completed')
        ORDER BY created_at DESC
      `;

      const payments = await db.any(query, [userId]);
      console.log(`✅ Найдено ${payments.length} успешных платежей для пользователя:`, userId);

      return payments;

    } catch (error) {
      console.error('❌ Ошибка поиска успешных платежей:', error);
      throw error;
    }
  }

  /**
   * Проверка наличия успешного платежа пользователя
   */
  static async hasSuccessfulPayment(userId) {
    try {
      const query = `
        SELECT COUNT(*) as count FROM payments 
        WHERE user_id = $1 
        AND status = 'completed'
        AND amount = 1000
      `;

      const result = await db.one(query, [userId]);
      return result.count > 0;
    } catch (error) {
      console.error('❌ Error checking if user has successful payment:', error);
      return false;
    }
  }

  static async findLatestByUserId(userId) {
    try {
      console.log('🔍 Поиск последнего платежа пользователя:', userId);

      const query = `
        SELECT * FROM payments 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      const payment = await db.oneOrNone(query, [userId]);

      if (payment) {
        console.log('✅ Последний платеж найден:', {
          userId,
          paymentId: payment.id,
          status: payment.status
        });
      } else {
        console.log('ℹ️ Платежи не найдены для пользователя:', userId);
      }

      return payment;

    } catch (error) {
      console.error('❌ Ошибка поиска последнего платежа:', error);
      throw error;
    }
  }

  static async getDailyStats(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const query = `
        SELECT 
          COUNT(*) as total_payments,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as successful_payments,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as failed_payments,
          SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as daily_revenue,
          AVG(CASE WHEN status = 'confirmed' THEN amount ELSE NULL END) as average_payment
        FROM payments 
        WHERE DATE(created_at) = $1
      `;

      return await db.one(query, [targetDate]);
    } catch (error) {
      console.error('❌ Error getting daily stats:', error);
      throw error;
    }
  }
}

export default Payment;