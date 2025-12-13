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
        fullname, phone, email, login, password, yeardate, city, 
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

  static async isUserActive(email, phone) {
    try {
      let query = '';
      let params = [];

      if (email) {
        query = `SELECT * FROM users WHERE email = $1 AND membership_status = 'active' LIMIT 1`;
        params = [email];
      } else if (phone) {
        query = `SELECT * FROM users WHERE phone = $1 AND membership_status = 'active' LIMIT 1`;
        params = [phone];
      }

      const user = await db.oneOrNone(query, params);
      return !!user;
    } catch (error) {
      console.error('❌ Error checking if user is active:', error);
      return false;
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

  static async findUserByEmailOrPhone(email, phone) {
    // Пример для PostgreSQL
    const user = await db.oneOrNone(
      `SELECT * FROM users 
       WHERE email = $1 OR phone = $2 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [email, phone]
    );
    return user;
  }

  static async findOne(credentials) {
    try {
      const { email, phone, membership_number } = credentials;
  
      // Проверяем что передан хотя бы один идентификатор
      if (!email && !phone && !membership_number) {
        throw new Error('Email, phone or membership_number is required');
      }
  
      let query;
      let params;
  
      // Поиск по membership_number (приоритет)
      if (membership_number) {
        query = `
          SELECT 
            id,
            fullname,
            email,
            phone,
            membership_number,
            membership_status,
            created_at
          FROM users 
          WHERE membership_number = $1
        `;
        params = [membership_number];
      }
      // Поиск по email ИЛИ phone
      else if (email && phone) {
        query = `
          SELECT 
            id,
            fullname,
            email,
            phone,
            membership_number,
            membership_status,
            created_at
          FROM users 
          WHERE email = $1 OR phone = $2
          LIMIT 1
        `;
        params = [email, phone];
      }
      // Поиск только по email
      else if (email) {
        query = `
          SELECT 
            id,
            fullname,
            email,
            phone,
            membership_number,
            membership_status,
            created_at
          FROM users 
          WHERE email = $1
        `;
        params = [email];
      }
      // Поиск только по phone
      else if (phone) {
        query = `
          SELECT 
            id,
            fullname,
            email,
            phone,
            membership_number,
            membership_status,
            created_at
          FROM users 
          WHERE phone = $1
        `;
        params = [phone];
      }
  
      const user = await db.oneOrNone(query, params);
  
      if (user) {
        console.log('✅ User found:', {
          id: user.id,
          email: user.email,
          phone: user.phone,
          membership_number: user.membership_number,
          foundBy: membership_number ? 'membership_number' : (email ? 'email' : 'phone')
        });
      } else {
        console.log('❌ User not found with credentials:', credentials);
      }
  
      return user;
    } catch (error) {
      console.error('❌ Error finding user:', error);
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
          city,
          login,
          membership_number,
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

  static async findAnyUser() {
    try {
      const query = `SELECT * FROM users LIMIT 1`;
      const result = await db.oneOrNone(query);

      if (result) {
        console.log('✅ Found user for testing:', { id: result.id, email: result.email });
      } else {
        console.log('❌ No users found in database');
      }

      return result;
    } catch (error) {
      console.error('❌ Error finding any user:', error);
      return null;
    }
  }

  static async findByMembershipNumber(membershipNumber) {
    try {
      console.log('🔍 Поиск пользователя по membership_number:', membershipNumber);

      const user = await db.oneOrNone(
        `SELECT * FROM users WHERE membership_number = $1`,
        [membershipNumber]
      );

      if (user) {
        console.log('✅ Пользователь найден по membership_number:', {
          id: user.id,
          email: user.email,
          membership_number: user.membership_number
        });
      } else {
        console.log('❌ Пользователь не найден по membership_number:', membershipNumber);
      }

      return user;
    } catch (error) {
      console.error('❌ Ошибка поиска по membership_number:', error);
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

  static async updatePassword(userId, newPassword) {
    try {
      // ВРЕМЕННО: Сохраняем пароль как есть (без хэширования)
      const query = `
        UPDATE users 
        SET password = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, email
      `;

      const result = await db.one(query, [newPassword, userId]);
      console.log('✅ Password updated for user:', result.email);
      return result;
    } catch (error) {
      console.error('❌ Error updating password:', error);
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

  static async findByLoginOrEmail(login) {
    try {
      console.log('🔍 Searching user by login/email:', login);

      if (!login || login.trim() === '') {
        console.log('❌ Login parameter is empty');
        return null;
      }

      const cleanLogin = login.trim().toLowerCase();

      // Ищем по email
      const emailQuery = 'SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1';
      let user = await db.oneOrNone(emailQuery, [cleanLogin]);

      if (user) {
        console.log('✅ User found by email:', {
          email: user.email,
          password: user.password ? `"${user.password}"` : 'NULL/EMPTY',
          passwordLength: user.password?.length,
          passwordExists: !!user.password,
          membership_status: user.membership_status,
          id: user.id
        });
        return user;
      }

      // Если не нашли по email, ищем по login
      const loginQuery = 'SELECT * FROM users WHERE LOWER(login) = $1 LIMIT 1';
      user = await db.oneOrNone(loginQuery, [cleanLogin]);

      if (user) {
        console.log('✅ User found by login:', {
          login: user.login,
          password: user.password ? `"${user.password}"` : 'NULL/EMPTY',
          passwordLength: user.password?.length,
          passwordExists: !!user.password,
          membership_status: user.membership_status,
          id: user.id
        });
        return user;
      }

      console.log('❌ User not found by email or login:', cleanLogin);
      return null;

    } catch (error) {
      console.error('❌ Error in findByLoginOrEmail:', error);
      throw error;
    }
  }

  static async updateLastLogin(userId) {
    try {
      const query = `
        UPDATE users 
        SET last_login = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, last_login
      `;

      const result = await db.one(query, [userId]);
      console.log('✅ Last login updated for user:', {
        userId,
        email: result.email,
        last_login: result.last_login
      });
      return result;
    } catch (error) {
      console.error('❌ Error updating last login:', error);
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

  static async updateMemberNumber(userId, memberNumber) {
    try {
      // 🔥 ВАЖНО: "распакуйте" Promise если это необходимо
      const actualMemberNumber = typeof memberNumber === 'object' && typeof memberNumber.then === 'function'
        ? await memberNumber
        : memberNumber;

      console.log('🔄 Обновление номера члена клуба:', {
        userId,
        memberNumber: actualMemberNumber
      });

      const query = `
        UPDATE users 
        SET membership_number = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, email, membership_number, membership_status
      `;

      const result = await db.one(query, [actualMemberNumber, userId]);

      console.log('✅ Номер члена клуба обновлен:', {
        userId,
        memberNumber: actualMemberNumber,
        email: result.email
      });

      return result;

    } catch (error) {
      console.error('❌ Ошибка обновления номера члена клуба:', error);

      // Если ошибка длины поля - значит поле все еще character(1)
      if (error.message && error.message.includes('value too long for type character')) {
        console.error('⚠️ ОШИБКА: поле membership_number все еще имеет тип character(1)!');
        console.error('⚠️ Выполните в БД: ALTER TABLE users ALTER COLUMN membership_number TYPE VARCHAR(50);');
      }

      throw error;
    }
  }

  // Также добавьте метод для поиска по номеру члена клуба
  static async findByMemberNumber(memberNumber) {
    try {
      console.log('🔍 Поиск пользователя по номеру члена клуба:', memberNumber);

      const query = `
        SELECT * FROM users 
        WHERE membership_number = $1
      `;

      const user = await db.oneOrNone(query, [memberNumber]);

      if (user) {
        console.log('✅ Пользователь найден:', user.email);
      } else {
        console.log('❌ Пользователь не найден по номеру члена клуба:', memberNumber);
      }

      return user;

    } catch (error) {
      console.error('❌ Ошибка поиска по номеру члена клуба:', error);
      throw error;
    }
  }

  // static async generateSlotNumber() {
  //   // Генерация уникального номера слота
  //   const timestamp = Date.now().toString().slice(-6);
  //   const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  //   return `SLOT-${timestamp}-${random}`;
  // }

  // static async createMultipleSlots(userId, count) {
  //   try {
  //     const slots = [];

  //     for (let i = 0; i < count; i++) {
  //       const slotNumber = await this.generateSlotNumber();
  //       const slot = await this.create({
  //         userId,
  //         slotNumber,
  //         purchaseDate: new Date()
  //       });
  //       slots.push(slot);
  //     }

  //     console.log(`✅ Created ${slots.length} slots for user: ${userId}`);
  //     return slots;

  //   } catch (error) {
  //     console.error('❌ Error creating multiple slots:', error);
  //     throw error;
  //   }
  // }

  // static async findByUserIdSlots(userId) {
  //   try {
  //     const query = `
  //       SELECT * FROM slots 
  //       WHERE user_id = $1 
  //       ORDER BY purchase_date DESC
  //     `;
  //     return await db.any(query, [userId]);
  //   } catch (error) {
  //     console.error('❌ Error finding slots by user ID:', error);
  //     throw error;
  //   }
  // }

  // static async getAvailableSlotsCount() {
  //   try {
  //     const query = `
  //       SELECT COUNT(*) as available_slots 
  //       FROM slots 
  //       WHERE status = 'available'
  //     `;
  //     const result = await db.one(query);
  //     return parseInt(result.available_slots);
  //   } catch (error) {
  //     console.error('❌ Error getting available slots count:', error);
  //     return 0;
  //   }
  // }

  // Метод для проверки существования номера члена клуба
  static async isMemberNumberExists(memberNumber) {
    try {
      const query = `
        SELECT COUNT(*) as count FROM users 
        WHERE membership_number = $1
      `;

      const result = await db.one(query, [memberNumber]);
      return result.count > 0;

    } catch (error) {
      console.error('❌ Ошибка проверки номера члена клуба:', error);
      throw error;
    }
  }

  // Метод для генерации уникального номера члена клуба
  static async generateUniqueMemberNumber() {
    return `M${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    // let attempts = 0;
    // const maxAttempts = 5;

    // while (attempts < maxAttempts) {
    //   const memberNumber = `CLUB-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;

    //   const exists = await this.isMemberNumberExists(memberNumber);
    //   if (!exists) {
    //     return memberNumber;
    //   }

    //   attempts++;
    //   console.log(`⚠️ Номер ${memberNumber} уже существует, попытка ${attempts}/${maxAttempts}`);
    // }

    // throw new Error('Не удалось сгенерировать уникальный номер члена клуба');
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