import Payment from '../models/Payment.js';

class PaymentRepository {
  async createPaymentRecord(paymentData) {
    return await Payment.create(paymentData);
  }

  async updatePaymentStatus(orderId, status, notificationData = null) {
    return await Payment.updateStatus(orderId, status, notificationData);
  }

  async getPaymentDetails(orderId) {
    return await Payment.findByOrderId(orderId);
  }

  async getDailyStatistics(date = null) {
    return await Payment.getDailyStats(date);
  }

  async getPendingPayments() {
    // Получаем платежи, которые ожидают подтверждения более 30 минут
    const query = `
      SELECT p.*, u.name, u.email, u.phone 
      FROM payments p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.status = 'pending' 
      AND p.created_at < NOW() - INTERVAL '30 minutes'
      ORDER BY p.created_at ASC
    `;
    
    const { db } = require('../database');
    return await db.any(query);
  }
}

export default PaymentRepository;