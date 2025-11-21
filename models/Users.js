import db from '../database/index.js';
import Helpers from '../utils/Helpers.js';

class User {
  static async create(userData) {
    const {
      fullname,
      phone,
      email,
      login,
      password,
      yeardate,
      city,
      conditions,
      checkbox,
      documents,
      payment_status,
      slot_number,
      payment_id,
      purchased_numbers,
      membership_status,
      tilda_transaction_id,
      tilda_form_id,
      tilda_project_id,
      tilda_page_id
    } = userData;

    const query = `
      INSERT INTO users (
        fullname, phone, email, login, password_hash, yeardate, city, 
        conditions, checkbox, documents, payment_status, slot_number,
        payment_id, purchased_numbers, membership_status,
        tilda_transaction_id, tilda_form_id, tilda_project_id, tilda_page_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const values = [
      this.sanitizeString(fullname),
      phone,
      email,
      login,
      password,
      yeardate,
      city,
      conditions,
      checkbox,
      documents,
      payment_status,
      slot_number,
      payment_id,
      purchased_numbers,
      membership_status,
      tilda_transaction_id,
      tilda_form_id,
      tilda_project_id,
      tilda_page_id
    ];

    try {
      const result = await db.one(query, values);
      console.log('✅ User created in database:', result.email);
      return result;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  static async findByOrderId(orderId) {
    try {
      const query = 'SELECT * FROM users WHERE payment_id = $1';
      return await db.oneOrNone(query, [orderId]);
    } catch (error) {
      console.error('❌ Error finding user by orderId:', error);
      throw error;
    }
  }

   /**
   * Поиск пользователя по ID
   */
   static async findById(userId) {
    try {
      const query = `
        SELECT 
          id,
          fullname,
          email,
          phone,
          login,
          membership_status,
          created_at
        FROM users 
        WHERE id = $1
      `;
      
      const user = await db.oneOrNone(query, [userId]);
      
      if (user) {
        console.log('✅ User found by ID:', { id: user.id, email: user.email });
      } else {
        console.log('❌ User not found with ID:', userId);
      }
      
      return user;
    } catch (error) {
      console.error('❌ Error finding user by ID:', error);
      throw error;
    }
  }

  static async updateMembershipStatus(userId, status) {
    try {
      const query = `
        UPDATE users 
        SET membership_status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, email, membership_status
      `;
      
      const result = await db.one(query, [status, userId]);
      console.log('✅ User membership status updated:', { 
        userId, 
        status,
        email: result.email 
      });
      return result;
    } catch (error) {
      console.error('❌ Error updating user membership status:', error);
      throw error;
    }
  }



  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1 ORDER BY created_at DESC';
      return await db.any(query, [email]);
    } catch (error) {
      console.error('❌ Error finding user by email:', error);
      throw error;
    }
  }

  static async findByPhone(phone) {
    try {
      const normalizedPhone = Helpers.normalizePhone(phone);
      const query = 'SELECT * FROM users WHERE phone = $1 ORDER BY created_at DESC';
      return await db.any(query, [normalizedPhone]);
    } catch (error) {
      console.error('❌ Error finding user by phone:', error);
      throw error;
    }
  }

  static async updatePaymentStatus(paymentId, status, tinkoffStatus = null) {
    try {
      const query = `
        UPDATE users 
        SET payment_status = $1, membership_status = $2, updated_at = CURRENT_TIMESTAMP
        WHERE payment_id = $3
        RETURNING *
      `;
      
      const membershipStatus = status === 'completed' ? 'active' : 'pending_payment';
      const result = await db.one(query, [status, membershipStatus, paymentId]);
      console.log('✅ User payment status updated:', paymentId, '->', status);
      return result;
    } catch (error) {
      console.error('❌ Error updating user payment status:', error);
      throw error;
    }
  }

  static async updateTinkoffPaymentId(userId, paymentId) {
    try {
      const query = `
        UPDATE users 
        SET payment_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      return await db.one(query, [paymentId, userId]);
    } catch (error) {
      console.error('❌ Error updating Tinkoff payment ID:', error);
      throw error;
    }
  }

  static async markEmailSent(userId) {
    try {
      const query = `
        UPDATE users 
        SET email_sent = true, email_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      
      return await db.one(query, [userId]);
    } catch (error) {
      console.error('❌ Error marking email as sent:', error);
      throw error;
    }
  }

  static async getPendingPayments() {
    try {
      const query = `
        SELECT * FROM users 
        WHERE payment_status = 'pending' 
        AND membership_status = 'pending_payment'
        AND created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at ASC
      `;
      
      return await db.any(query);
    } catch (error) {
      console.error('❌ Error getting pending payments:', error);
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as completed_payments,
          COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
          COUNT(CASE WHEN membership_status = 'active' THEN 1 END) as active_members,
          COUNT(CASE WHEN email_sent = true THEN 1 END) as emails_sent
        FROM users
      `;
      
      return await db.one(query);
    } catch (error) {
      console.error('❌ Error getting statistics:', error);
      throw error;
    }
  }

  // Добавьте недостающие методы
  static async update(userId, updateData) {
    try {
      const fields = Object.keys(updateData).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const values = Object.values(updateData);
      const query = `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
      
      return await db.one(query, [userId, ...values]);
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  static async findByLogin(login) {
    try {
      const query = 'SELECT * FROM users WHERE login = $1';
      return await db.oneOrNone(query, [login]);
    } catch (error) {
      console.error('❌ Error finding user by login:', error);
      throw error;
    }
  }

  static getUserId(user) {
    return user.user_id || user.id;
  }

  static sanitizeString(str) {
    if (!str) return '';
    return str.toString().trim();
  }
}

export default User;