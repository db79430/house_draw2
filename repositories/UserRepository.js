import Payment from '../models/Payment.js';
import User from '../models/Users.js';
import Helpers from '../utils/Helpers.js';

class UserRepository {
  async createUserWithPayment(formData) {
    const { fullname, email, phone, product, price } = formData;
    
    // Валидация
    if (!name || !email) {
      throw new Error('Имя и email обязательны для заполнения');
    }

    if (!Helpers.validateEmail(email)) {
      throw new Error('Некорректный формат email');
    }

    // Генерируем данные
    const orderId = Helpers.generateOrderId();
    const credentials = Helpers.generateCredentials();
    const amount = parseInt(price) || 1000;

    // Создаем пользователя в базе
    const user = await User.create({
      orderId,
      fullname: Helpers.sanitizeString(fullname),
      email: email.toLowerCase().trim(),
      phone: phone || '+79999999999',
      product: Helpers.sanitizeString(product),
      amount,
      credentials
    });

    // Создаем запись о платеже
    const payment = await Payment.create({
      orderId,
      userId: user.id,
      amount,
      description: product
    });

    return {
      user,
      payment,
      credentials
    };
  }

  async completeUserPayment(orderId, tinkoffPaymentId, tinkoffStatus) {
    const user = await User.findByOrderId(orderId);
    
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Обновляем статус пользователя
    const updatedUser = await User.updateStatus(
      orderId, 
      'completed', 
      tinkoffStatus, 
      tinkoffPaymentId
    );

    // Обновляем статус платежа
    await Payment.updateStatus(orderId, 'confirmed');

    // Отмечаем email как отправленный
    await User.markEmailSent(orderId);

    return updatedUser;
  }

  async getUserByOrderId(orderId) {
    const user = await User.findByOrderId(orderId);
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    return user;
  }

  async getUserPaymentHistory(email) {
    const users = await User.findByEmail(email);
    if (!users || users.length === 0) {
      return [];
    }

    const paymentHistory = [];
    for (const user of users) {
      const payments = await Payment.getPaymentHistory(user.id);
      paymentHistory.push({
        user,
        payments
      });
    }

    return paymentHistory;
  }

  async getSystemStatistics() {
    return await User.getStatistics();
  }

  static async findByLoginOrEmail(login) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE login = ? OR email = ?',
        [login, login]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('❌ Error finding user by login/email:', error);
      throw error;
    }
  }

  static async updateLastLogin(userId) {
    try {
      await pool.execute(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [userId]
      );
    } catch (error) {
      console.error('❌ Error updating last login:', error);
      throw error;
    }
  }

  static async updatePassword(userId, newPassword) {
    try {
      // ВРЕМЕННО: Сохраняем пароль как есть (без хэширования)
      await pool.execute(
        'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
        [newPassword, userId]
      );
      console.log('✅ Password updated for user:', userId);
    } catch (error) {
      console.error('❌ Error updating password:', error);
      throw error;
    }
  }
}

export default UserRepository;