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
      console.log(`🔍 Поиск платежа по orderId: ${orderId}`);

      // 🔴 ИСПРАВЛЕНИЕ: Делаем JOIN с таблицей users
      const payment = await db.oneOrNone(`
            SELECT 
                p.*,
                u.id as user_id,
                u.email,
                u.fullname,
                u.login,
                u.membership_status,
                u.password
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.order_id = $1
            LIMIT 1
        `, [orderId]);

      if (payment) {
        console.log(`✅ Payment found by orderId:`, {
          id: payment.id,
          order_id: payment.order_id,
          user_id: payment.user_id,
          amount: payment.amount,
          status: payment.status
        });
      } else {
        console.log(`❌ Payment not found for orderId: ${orderId}`);
      }

      return payment;

    } catch (error) {
      console.error('❌ Error finding payment by orderId:', error);
      return null;
    }
  }

  static async findByOrderIdWithUser(orderId) {
    try {
      console.log(`🔍 Поиск платежа с данными пользователя по orderId: ${orderId}`);

      const payment = await db.oneOrNone(`
            SELECT 
                p.id as payment_id,
                p.order_id,
                p.user_id,
                p.amount,
                p.status,
                p.created_at as payment_created_at,
                u.id as user_id,
                u.email,
                u.fullname,
                u.phone,
                u.membership_number,
                u.membership_status,
                u.password,
                u.login
            FROM payments p
            INNER JOIN users u ON p.user_id = u.id
            WHERE p.order_id = $1
            LIMIT 1
        `, [orderId]);

      if (payment) {
        console.log(`✅ Payment with user found:`, {
          payment_id: payment.payment_id,
          order_id: payment.order_id,
          user_id: payment.user_id,
          user_email: payment.email,
          membership_status: payment.membership_status
        });
      } else {
        console.log(`❌ Payment with user not found for orderId: ${orderId}`);

        // Попробуем найти без JOIN для отладки
        const simplePayment = await db.oneOrNone(
          'SELECT * FROM payments WHERE order_id = $1',
          [orderId]
        );

        if (simplePayment) {
          console.log(`⚠️ Payment exists but user_id is null or invalid:`, simplePayment);
        }
      }

      return payment;

    } catch (error) {
      console.error('❌ Error finding payment with user:', error);
      return null;
    }
  }

  /**
   * Обновить статус платежа по order_id (строковому)
   */
  // В Payment.js обновите метод updateStatus
  static async updateStatus(paymentId, status, additionalData = null) {
    try {
      console.log(`🔄 Updating payment status:`, {
        paymentId,
        status,
        isNumeric: !isNaN(paymentId),
        type: typeof paymentId
      });

      // 🔥 ПРЕВРАЩАЕМ paymentId В СТРОКУ (order_id всегда строка)
      const orderId = paymentId.toString();

      // 🔥 ПРОВЕРЯЕМ СУЩЕСТВОВАНИЕ ПЛАТЕЖА
      const existingPayment = await db.oneOrNone(
        `SELECT id, order_id, status FROM payments WHERE order_id = $1`,
        [orderId]
      );

      if (!existingPayment) {
        console.error(`❌ Payment with order_id "${orderId}" not found in database`);
        console.log(`🔍 Available payments:`);

        try {
          const allPayments = await db.any(
            `SELECT id, order_id, status, amount FROM payments ORDER BY id DESC LIMIT 10`
          );
          console.log('Last 10 payments:', allPayments);
        } catch (e) {
          console.error('Error fetching payments:', e);
        }

        return null;
      }

      console.log(`✅ Found payment:`, {
        id: existingPayment.id,
        order_id: existingPayment.order_id,
        current_status: existingPayment.status
      });

      // 🔥 ОБНОВЛЯЕМ ПО ID (надежнее чем по order_id)
      const query = `
          UPDATE payments 
          SET status = $1, 
              notification_data = COALESCE(notification_data, '{}'::jsonb) || $2::jsonb,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING *
      `;

      const notificationJson = additionalData ? JSON.stringify(additionalData) : '{}';

      const result = await db.one(query, [
        status,
        notificationJson,
        existingPayment.id
      ]);

      console.log(`✅ Payment ${result.id} (order_id: ${result.order_id}) updated to ${status}`);
      return result;

    } catch (error) {
      console.error('❌ Error updating payment status:', error);

      // 🔥 ЕСЛИ ОШИБКА noData, ПРОБУЕМ ПО order_id как fallback
      if (error.code === 'noData') {
        console.log('🔄 Trying update by order_id as fallback...');

        try {
          const orderId = paymentId.toString();
          const query = `
                  UPDATE payments 
                  SET status = $1, 
                      notification_data = COALESCE(notification_data, '{}'::jsonb) || $2::jsonb,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE order_id = $3
                  RETURNING *
              `;

          const notificationJson = additionalData ? JSON.stringify(additionalData) : '{}';

          const result = await db.one(query, [
            status,
            notificationJson,
            orderId
          ]);

          console.log(`✅ Fallback successful: updated payment by order_id ${orderId}`);
          return result;

        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
        }
      }

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

  // static async getPaymentHistory(userId, limit = 10) {
  //   try {
  //     const query = `
  //         SELECT * FROM payments 
  //         WHERE user_id = $1 
  //         ORDER BY created_at DESC 
  //         LIMIT $2
  //     `;

  //     return await db.any(query, [userId, limit]);
  //   } catch (error) {
  //     console.error('❌ Error getting payment history:', error);
  //     return [];
  //   }
  // }

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