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
      return await db.oneOrNone(query, [orderId]);
    } catch (error) {
      console.error('❌ Error finding payment by orderId:', error);
      throw error;
    }
  }

  static async updateStatus(orderId, status, notificationData = null) {
    try {
      const query = `
        UPDATE payments 
        SET status = $1, notification_data = $2, updated_at = CURRENT_TIMESTAMP
        WHERE order_id = $3
        RETURNING *
      `;
      
      const result = await db.one(query, [status, notificationData, orderId]);
      console.log('✅ Payment status updated:', orderId, '->', status);
      return result;
    } catch (error) {
      console.error('❌ Error updating payment status:', error);
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