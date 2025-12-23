// import db from '../database/index.js';
// import Helpers from '../utils/Helpers.js';


// class User {
//   static async create(userData) {
//     const {
//       fullname,
//       phone,
//       email,
//       login,
//       password,
//       yeardate,
//       city,
//       conditions,
//       checkbox,
//       documents,
//       payment_status,
//       slot_number,
//       payment_id,
//       purchased_numbers,
//       membership_status,
//       tilda_transaction_id,
//       tilda_form_id,
//       tilda_project_id,
//       tilda_page_id
//     } = userData;

//     const query = `
//       INSERT INTO users (
//         fullname, phone, email, login, password, yeardate, city, 
//         conditions, checkbox, documents, payment_status, slot_number,
//         payment_id, purchased_numbers, membership_status,
//         tilda_transaction_id, tilda_form_id, tilda_project_id, tilda_page_id
//       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
//       RETURNING *
//     `;

//     const values = [
//       this.sanitizeString(fullname),
//       phone,
//       email,
//       login,
//       password,
//       yeardate,
//       city,
//       conditions,
//       checkbox,
//       documents,
//       payment_status,
//       slot_number,
//       payment_id,
//       purchased_numbers,
//       membership_status,
//       tilda_transaction_id,
//       tilda_form_id,
//       tilda_project_id,
//       tilda_page_id
//     ];

//     try {
//       const result = await db.one(query, values);
//       console.log('✅ User created in database:', result.email);
//       return result;
//     } catch (error) {
//       console.error('❌ Error creating user:', error);
//       throw error;
//     }
//   }

//   static async isUserActive(email, phone) {
//     try {
//       let query = '';
//       let params = [];

//       if (email) {
//         query = `SELECT * FROM users WHERE email = $1 AND membership_status = 'active' LIMIT 1`;
//         params = [email];
//       } else if (phone) {
//         query = `SELECT * FROM users WHERE phone = $1 AND membership_status = 'active' LIMIT 1`;
//         params = [phone];
//       }

//       const user = await db.oneOrNone(query, params);
//       return !!user;
//     } catch (error) {
//       console.error('❌ Error checking if user is active:', error);
//       return false;
//     }
//   }

//   static async findByOrderId(orderId) {
//     try {
//       const query = 'SELECT * FROM users WHERE payment_id = $1';
//       return await db.oneOrNone(query, [orderId]);
//     } catch (error) {
//       console.error('❌ Error finding user by orderId:', error);
//       throw error;
//     }
//   }

//   static async findUserByEmailOrPhone(email, phone) {
//     try {
//       console.log('Поиск пользователя:', { email, phone });

//       // Поиск по email
//       if (email) {
//         const cleanEmail = email.toLowerCase().trim();
//         console.log('Поиск по email:', cleanEmail);

//         try {
//           return await db.oneOrNone('SELECT * FROM users WHERE email = $1', [cleanEmail]);
//         } catch (error) {
//           // Если таблица не существует
//           if (error.message && error.message.includes('relation "users" does not exist')) {
//             console.log('Таблица users не существует');
//             return null;
//           }
//           throw error;
//         }
//       }

//       // Поиск по телефону
//       if (phone) {
//         console.log('Поиск по телефону:', phone);

//         const normalizedPhone = Helpers.normalizePhone(phone);
//         const digitsOnly = phone.replace(/\D/g, '');
//         const with8 = '8' + normalizedPhone.slice(1);
//         const withoutCode = normalizedPhone.slice(1);

//         console.log('Форматы для поиска телефона:', {
//           normalizedPhone,
//           digitsOnly,
//           with8,
//           withoutCode
//         });

//         const query = `
//           SELECT * FROM users 
//           WHERE 
//             phone = $1 OR 
//             phone = $2 OR 
//             phone = $3 OR 
//             phone = $4 OR
//             REPLACE(phone, ' ', '') = $5 OR
//             REPLACE(phone, '+', '') = $6 OR
//             REPLACE(phone, '-', '') = $7 OR
//             REPLACE(phone, '(', '') = $8 OR
//             REPLACE(phone, ')', '') = $9 OR
//             phone LIKE $10
//           LIMIT 1
//         `;

//         const params = [
//           normalizedPhone,
//           digitsOnly,
//           with8,
//           withoutCode,
//           digitsOnly,
//           digitsOnly,
//           digitsOnly,
//           digitsOnly,
//           digitsOnly,
//           `%${digitsOnly.slice(-10)}%`
//         ];

//         console.log('SQL запрос (упрощенный):', query.substring(0, 200) + '...');
//         console.log('Параметры (первые 5):', params.slice(0, 5));

//         try {
//           return await db.oneOrNone(query, params);
//         } catch (error) {
//           // Если таблица не существует
//           if (error.message && error.message.includes('relation "users" does not exist')) {
//             console.log('Таблица users не существует');
//             return null;
//           }
//           throw error;
//         }
//       }

//       return null;

//     } catch (error) {
//       console.error('Ошибка при поиске пользователя:', error);
//       throw error;
//     }
//   }

//   static async normalizePhoneForSearch(phone) {
//     if (!phone) return '';

//     // Убираем все нецифровые символы
//     let digits = phone.replace(/\D/g, '');

//     // Если 10 цифр - добавляем 7
//     if (digits.length === 10) {
//       return '7' + digits;
//     }

//     // Если 11 цифр и начинается с 8 - меняем на 7
//     if (digits.length === 11 && digits.startsWith('8')) {
//       return '7' + digits.substring(1);
//     }

//     // Если 11 цифр и начинается с 7 - оставляем
//     if (digits.length === 11 && digits.startsWith('7')) {
//       return digits;
//     }

//     // Возвращаем как есть
//     return digits;
//   }


//   static async findOne(credentials) {
//     try {
//       const { email, phone, membership_number } = credentials;

//       // Проверяем что передан хотя бы один идентификатор
//       if (!email && !phone && !membership_number) {
//         throw new Error('Email, phone or membership_number is required');
//       }

//       let query;
//       let params;

//       // Поиск по membership_number (приоритет)
//       if (membership_number) {
//         query = `
//           SELECT 
//             id,
//             fullname,
//             email,
//             phone,
//             membership_number,
//             membership_status,
//             created_at
//           FROM users 
//           WHERE membership_number = $1
//         `;
//         params = [membership_number];
//       }
//       // Поиск по email ИЛИ phone
//       else if (email && phone) {
//         query = `
//           SELECT 
//             id,
//             fullname,
//             email,
//             phone,
//             membership_number,
//             membership_status,
//             created_at
//           FROM users 
//           WHERE email = $1 OR phone = $2
//           LIMIT 1
//         `;
//         params = [email, phone];
//       }
//       // Поиск только по email
//       else if (email) {
//         query = `
//           SELECT 
//             id,
//             fullname,
//             email,
//             phone,
//             membership_number,
//             membership_status,
//             created_at
//           FROM users 
//           WHERE email = $1
//         `;
//         params = [email];
//       }
//       // Поиск только по phone
//       else if (phone) {
//         query = `
//           SELECT 
//             id,
//             fullname,
//             email,
//             phone,
//             membership_number,
//             membership_status,
//             created_at
//           FROM users 
//           WHERE phone = $1
//         `;
//         params = [phone];
//       }

//       const user = await db.oneOrNone(query, params);

//       if (user) {
//         console.log('✅ User found:', {
//           id: user.id,
//           email: user.email,
//           phone: user.phone,
//           membership_number: user.membership_number,
//           foundBy: membership_number ? 'membership_number' : (email ? 'email' : 'phone')
//         });
//       } else {
//         console.log('❌ User not found with credentials:', credentials);
//       }

//       return user;
//     } catch (error) {
//       console.error('❌ Error finding user:', error);
//       throw error;
//     }
//   }

//   /**
//   * Поиск пользователя по ID
//   */
//   static async findById(userId) {
//     try {
//       const query = `
//         SELECT 
//           id,
//           fullname,
//           email,
//           phone,
//           city,
//           yeardate,
//           login,
//           membership_number,
//           membership_status,
//           created_at
//         FROM users 
//         WHERE id = $1
//       `;

//       const user = await db.oneOrNone(query, [userId]);

//       if (user) {
//         console.log('✅ User found by ID:', { id: user.id, email: user.email, city: user.city, yeardate: user.yeardate });
//       } else {
//         console.log('❌ User not found with ID:', userId);
//       }

//       return user;
//     } catch (error) {
//       console.error('❌ Error finding user by ID:', error);
//       throw error;
//     }
//   }

//   static async findAnyUser() {
//     try {
//       const query = `SELECT * FROM users LIMIT 1`;
//       const result = await db.oneOrNone(query);

//       if (result) {
//         console.log('✅ Found user for testing:', { id: result.id, email: result.email });
//       } else {
//         console.log('❌ No users found in database');
//       }

//       return result;
//     } catch (error) {
//       console.error('❌ Error finding any user:', error);
//       return null;
//     }
//   }

//   static async findByMembershipNumber(membershipNumber) {
//     try {
//       console.log('🔍 Поиск пользователя по membership_number:', membershipNumber);

//       const user = await db.oneOrNone(
//         `SELECT * FROM users WHERE membership_number = $1`,
//         [membershipNumber]
//       );

//       if (user) {
//         console.log('✅ Пользователь найден по membership_number:', {
//           id: user.id,
//           email: user.email,
//           membership_number: user.membership_number
//         });
//       } else {
//         console.log('❌ Пользователь не найден по membership_number:', membershipNumber);
//       }

//       return user;
//     } catch (error) {
//       console.error('❌ Ошибка поиска по membership_number:', error);
//       throw error;
//     }
//   }

//   static async updateMembershipStatus(userId, status) {
//     try {
//       const query = `
//         UPDATE users 
//         SET membership_status = $1, updated_at = NOW()
//         WHERE id = $2
//         RETURNING id, email, membership_status
//       `;

//       const result = await db.one(query, [status, userId]);
//       console.log('✅ User membership status updated:', {
//         userId,
//         status,
//         email: result.email
//       });
//       return result;
//     } catch (error) {
//       console.error('❌ Error updating user membership status:', error);
//       throw error;
//     }
//   }

//   static async updatePassword(userId, newPassword) {
//     try {
//       // ВРЕМЕННО: Сохраняем пароль как есть (без хэширования)
//       const query = `
//         UPDATE users 
//         SET password = $1, updated_at = NOW()
//         WHERE id = $2
//         RETURNING id, email
//       `;

//       const result = await db.one(query, [newPassword, userId]);
//       console.log('✅ Password updated for user:', result.email);
//       return result;
//     } catch (error) {
//       console.error('❌ Error updating password:', error);
//       throw error;
//     }
//   }


//   static async findByEmail(email) {
//     try {
//       const query = 'SELECT * FROM users WHERE email = $1 ORDER BY created_at DESC';
//       return await db.any(query, [email]);
//     } catch (error) {
//       console.error('❌ Error finding user by email:', error);
//       throw error;
//     }
//   }

//   static async findByPhone(phone) {
//     try {
//       const normalizedPhone = Helpers.normalizePhone(phone);
//       const query = 'SELECT * FROM users WHERE phone = $1 ORDER BY created_at DESC';
//       return await db.any(query, [normalizedPhone]);
//     } catch (error) {
//       console.error('❌ Error finding user by phone:', error);
//       throw error;
//     }
//   }

//   static async findByLoginOrEmail(login) {
//     try {
//       console.log('🔍 Searching user by login/email:', login);

//       if (!login || login.trim() === '') {
//         console.log('❌ Login parameter is empty');
//         return null;
//       }

//       const cleanLogin = login.trim().toLowerCase();

//       // Ищем по email
//       const emailQuery = 'SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1';
//       let user = await db.oneOrNone(emailQuery, [cleanLogin]);

//       if (user) {
//         console.log('✅ User found by email:', {
//           email: user.email,
//           password: user.password ? `"${user.password}"` : 'NULL/EMPTY',
//           passwordLength: user.password?.length,
//           passwordExists: !!user.password,
//           membership_status: user.membership_status,
//           id: user.id
//         });
//         return user;
//       }

//       // Если не нашли по email, ищем по login
//       const loginQuery = 'SELECT * FROM users WHERE LOWER(login) = $1 LIMIT 1';
//       user = await db.oneOrNone(loginQuery, [cleanLogin]);

//       if (user) {
//         console.log('✅ User found by login:', {
//           login: user.login,
//           password: user.password ? `"${user.password}"` : 'NULL/EMPTY',
//           passwordLength: user.password?.length,
//           passwordExists: !!user.password,
//           membership_status: user.membership_status,
//           id: user.id
//         });
//         return user;
//       }

//       console.log('❌ User not found by email or login:', cleanLogin);
//       return null;

//     } catch (error) {
//       console.error('❌ Error in findByLoginOrEmail:', error);
//       throw error;
//     }
//   }

//   static async updateLastLogin(userId) {
//     try {
//       const query = `
//         UPDATE users 
//         SET last_login = NOW(), updated_at = NOW()
//         WHERE id = $1
//         RETURNING id, email, last_login
//       `;

//       const result = await db.one(query, [userId]);
//       console.log('✅ Last login updated for user:', {
//         userId,
//         email: result.email,
//         last_login: result.last_login
//       });
//       return result;
//     } catch (error) {
//       console.error('❌ Error updating last login:', error);
//       throw error;
//     }
//   }



//   static async updatePaymentStatus(paymentId, status, tinkoffStatus = null) {
//     try {
//       const query = `
//         UPDATE users 
//         SET payment_status = $1, membership_status = $2, updated_at = CURRENT_TIMESTAMP
//         WHERE payment_id = $3
//         RETURNING *
//       `;

//       const membershipStatus = status === 'completed' ? 'active' : 'pending_payment';
//       const result = await db.one(query, [status, membershipStatus, paymentId]);
//       console.log('✅ User payment status updated:', paymentId, '->', status);
//       return result;
//     } catch (error) {
//       console.error('❌ Error updating user payment status:', error);
//       throw error;
//     }
//   }

//   static async updateTinkoffPaymentId(userId, paymentId) {
//     try {
//       const query = `
//         UPDATE users 
//         SET payment_id = $1, updated_at = CURRENT_TIMESTAMP
//         WHERE id = $2
//         RETURNING *
//       `;

//       return await db.one(query, [paymentId, userId]);
//     } catch (error) {
//       console.error('❌ Error updating Tinkoff payment ID:', error);
//       throw error;
//     }
//   }

//   static async markEmailSent(userId) {
//     try {
//       const query = `
//         UPDATE users 
//         SET email_sent = true, email_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
//         WHERE id = $1
//         RETURNING *
//       `;

//       return await db.one(query, [userId]);
//     } catch (error) {
//       console.error('❌ Error marking email as sent:', error);
//       throw error;
//     }
//   }

//   static async getPendingPayments() {
//     try {
//       const query = `
//         SELECT * FROM users 
//         WHERE payment_status = 'pending' 
//         AND membership_status = 'pending_payment'
//         AND created_at > NOW() - INTERVAL '24 hours'
//         ORDER BY created_at ASC
//       `;

//       return await db.any(query);
//     } catch (error) {
//       console.error('❌ Error getting pending payments:', error);
//       throw error;
//     }
//   }

//   static async getStatistics() {
//     try {
//       const query = `
//         SELECT 
//           COUNT(*) as total_users,
//           COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as completed_payments,
//           COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
//           COUNT(CASE WHEN membership_status = 'active' THEN 1 END) as active_members,
//           COUNT(CASE WHEN email_sent = true THEN 1 END) as emails_sent
//         FROM users
//       `;

//       return await db.one(query);
//     } catch (error) {
//       console.error('❌ Error getting statistics:', error);
//       throw error;
//     }
//   }

//   static async updateMemberNumber(userId, memberNumber) {
//     try {
//       // 🔥 ВАЖНО: "распакуйте" Promise если это необходимо
//       const actualMemberNumber = typeof memberNumber === 'object' && typeof memberNumber.then === 'function'
//         ? await memberNumber
//         : memberNumber;

//       console.log('🔄 Обновление номера члена клуба:', {
//         userId,
//         memberNumber: actualMemberNumber
//       });

//       const query = `
//         UPDATE users 
//         SET membership_number = $1, updated_at = NOW()
//         WHERE id = $2
//         RETURNING id, email, membership_number, membership_status
//       `;

//       const result = await db.one(query, [actualMemberNumber, userId]);

//       console.log('✅ Номер члена клуба обновлен:', {
//         userId,
//         memberNumber: actualMemberNumber,
//         email: result.email
//       });

//       return result;

//     } catch (error) {
//       console.error('❌ Ошибка обновления номера члена клуба:', error);

//       // Если ошибка длины поля - значит поле все еще character(1)
//       if (error.message && error.message.includes('value too long for type character')) {
//         console.error('⚠️ ОШИБКА: поле membership_number все еще имеет тип character(1)!');
//         console.error('⚠️ Выполните в БД: ALTER TABLE users ALTER COLUMN membership_number TYPE VARCHAR(50);');
//       }

//       throw error;
//     }
//   }

//   // Также добавьте метод для поиска по номеру члена клуба
//   static async findByMemberNumber(memberNumber) {
//     try {
//       console.log('🔍 Поиск пользователя по номеру члена клуба:', memberNumber);

//       const query = `
//         SELECT * FROM users 
//         WHERE membership_number = $1
//       `;

//       const user = await db.oneOrNone(query, [memberNumber]);

//       if (user) {
//         console.log('✅ Пользователь найден:', user.email);
//       } else {
//         console.log('❌ Пользователь не найден по номеру члена клуба:', memberNumber);
//       }

//       return user;

//     } catch (error) {
//       console.error('❌ Ошибка поиска по номеру члена клуба:', error);
//       throw error;
//     }
//   }

//   // static async generateSlotNumber() {
//   //   // Генерация уникального номера слота
//   //   const timestamp = Date.now().toString().slice(-6);
//   //   const random = Math.random().toString(36).substr(2, 4).toUpperCase();
//   //   return `SLOT-${timestamp}-${random}`;
//   // }

//   // static async createMultipleSlots(userId, count) {
//   //   try {
//   //     const slots = [];

//   //     for (let i = 0; i < count; i++) {
//   //       const slotNumber = await this.generateSlotNumber();
//   //       const slot = await this.create({
//   //         userId,
//   //         slotNumber,
//   //         purchaseDate: new Date()
//   //       });
//   //       slots.push(slot);
//   //     }

//   //     console.log(`✅ Created ${slots.length} slots for user: ${userId}`);
//   //     return slots;

//   //   } catch (error) {
//   //     console.error('❌ Error creating multiple slots:', error);
//   //     throw error;
//   //   }
//   // }

//   // static async findByUserIdSlots(userId) {
//   //   try {
//   //     const query = `
//   //       SELECT * FROM slots 
//   //       WHERE user_id = $1 
//   //       ORDER BY purchase_date DESC
//   //     `;
//   //     return await db.any(query, [userId]);
//   //   } catch (error) {
//   //     console.error('❌ Error finding slots by user ID:', error);
//   //     throw error;
//   //   }
//   // }

//   // static async getAvailableSlotsCount() {
//   //   try {
//   //     const query = `
//   //       SELECT COUNT(*) as available_slots 
//   //       FROM slots 
//   //       WHERE status = 'available'
//   //     `;
//   //     const result = await db.one(query);
//   //     return parseInt(result.available_slots);
//   //   } catch (error) {
//   //     console.error('❌ Error getting available slots count:', error);
//   //     return 0;
//   //   }
//   // }

//   // Метод для проверки существования номера члена клуба
//   static async isMemberNumberExists(memberNumber) {
//     try {
//       const query = `
//         SELECT COUNT(*) as count FROM users 
//         WHERE membership_number = $1
//       `;

//       const result = await db.one(query, [memberNumber]);
//       return result.count > 0;

//     } catch (error) {
//       console.error('❌ Ошибка проверки номера члена клуба:', error);
//       throw error;
//     }
//   }

//   // Метод для генерации уникального номера члена клуба
//   static async generateUniqueMemberNumber() {
//     try {
//       // Получаем количество пользователей для следующего номера
//       const countResult = await db.oneOrNone(
//         'SELECT COUNT(*) as count FROM users WHERE membership_number IS NOT NULL'
//       );

//       const userCount = parseInt(countResult?.count || 0);
//       const nextNumber = 100000 + userCount + 1; // Начинаем с 100001

//       const memberNumber = `MBR${nextNumber}`;

//       // Проверяем уникальность (на случай удаленных пользователей)
//       const existing = await db.oneOrNone(
//         'SELECT id FROM users WHERE membership_number = $1',
//         [memberNumber]
//       );

//       if (!existing) {
//         return memberNumber;
//       }

//       // Если номер занят, ищем следующий свободный
//       let attemptNumber = nextNumber + 1;
//       while (true) {
//         const candidate = `MBR${attemptNumber}`;
//         const check = await db.oneOrNone(
//           'SELECT id FROM users WHERE membership_number = $1',
//           [candidate]
//         );

//         if (!check) {
//           return candidate;
//         }

//         attemptNumber++;

//         // Защита от бесконечного цикла
//         if (attemptNumber > nextNumber + 1000) {
//           throw new Error('Не удалось сгенерировать уникальный номер');
//         }
//       }

//     } catch (error) {
//       console.error('❌ Ошибка генерации номера:', error);
//       throw error;
//     }
//     // let attempts = 0;
//     // const maxAttempts = 5;

//     // while (attempts < maxAttempts) {
//     //   const memberNumber = `CLUB-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;

//     //   const exists = await this.isMemberNumberExists(memberNumber);
//     //   if (!exists) {
//     //     return memberNumber;
//     //   }

//     //   attempts++;
//     //   console.log(`⚠️ Номер ${memberNumber} уже существует, попытка ${attempts}/${maxAttempts}`);
//     // }

//     // throw new Error('Не удалось сгенерировать уникальный номер члена клуба');
//   }

//   // Добавьте недостающие методы
//   static async update(userId, updateData) {
//     try {
//       const fields = Object.keys(updateData).map((key, index) => `${key} = $${index + 2}`).join(', ');
//       const values = Object.values(updateData);
//       const query = `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;

//       return await db.one(query, [userId, ...values]);
//     } catch (error) {
//       console.error('❌ Error updating user:', error);
//       throw error;
//     }
//   }

//   static async updateInTransaction(transaction, userId, updateData) {
//     try {
//       console.log('🔄 Обновление пользователя внутри транзакции:', { userId, updateData });

//       // Для JSON данных (tilda_data) обрабатываем отдельно
//       const processedData = { ...updateData };

//       if (processedData.tilda_data && typeof processedData.tilda_data === 'object') {
//         processedData.tilda_data = JSON.stringify(processedData.tilda_data);
//       }

//       const fields = Object.keys(processedData).map((key, index) => `${key} = $${index + 2}`).join(', ');
//       const values = Object.values(processedData);
//       const query = `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;

//       console.log('📝 Выполнение UPDATE запроса:', { query, values });

//       const updatedUser = await transaction.one(query, [userId, ...values]);
//       console.log('✅ Пользователь обновлен в транзакции:', updatedUser.id);

//       return updatedUser;

//     } catch (error) {
//       console.error('❌ Ошибка обновления пользователя в транзакции:', error);
//       throw error;
//     }
//   }

//   /**
//  * 🔥 ИСПРАВЛЕННЫЙ: Создание пользователя с правильными boolean значениями
//  */
//   static async createUserFromFormInTransaction(transaction, formData, tildaData) {
//     const {
//       FullName: fullname,
//       Phone: phone,
//       Email: email,
//       City: city,
//       Checkbox: checkbox,
//       Conditions: conditions,
//       Yeardate: yeardate
//     } = formData;

//     try {
//       // Подготавливаем данные в том же формате
//       const login = email;
//       const password = Helpers.generatePassword();
//       const checkboxBool = checkbox === 'yes' || checkbox === 'true' || checkbox === true;
//       const conditionsText = conditions === 'yes' ? 'accepted' : 'pending';

//       const userData = {
//         fullname,
//         phone: phone || null,
//         email: email.toLowerCase(),
//         login,
//         password,
//         yeardate: yeardate || null,
//         city: city || '',
//         conditions: conditionsText,
//         checkbox: checkboxBool,
//         documents: 'pending',
//         payment_status: 'pending',
//         slot_number: null,
//         payment_id: null,
//         purchased_numbers: null,
//         membership_status: 'pending_payment',
//         tilda_transaction_id: tildaData.tranid || null,
//         tilda_form_id: tildaData.formid || null,
//         tilda_project_id: tildaData.formid ? tildaData.formid.replace('form', '') : '14245141',
//         tilda_page_id: tildaData.pageid || null
//       };

//       // 🔥 ВЫЗЫВАЕМ User.create ЧЕРЕЗ ТРАНЗАКЦИЮ
//       const result = await transaction.one(
//         `INSERT INTO users (
//           fullname, phone, email, login, password, yeardate, city, 
//           conditions, checkbox, documents, payment_status, slot_number,
//           payment_id, purchased_numbers, membership_status,
//           tilda_transaction_id, tilda_form_id, tilda_project_id, tilda_page_id
//         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
//         RETURNING *`,
//         [
//           userData.fullname,
//           userData.phone,
//           userData.email,
//           userData.login,
//           userData.password,
//           userData.yeardate,
//           userData.city,
//           userData.conditions,
//           userData.checkbox,
//           userData.documents,
//           userData.payment_status,
//           userData.slot_number,
//           userData.payment_id,
//           userData.purchased_numbers,
//           userData.membership_status,
//           userData.tilda_transaction_id,
//           userData.tilda_form_id,
//           userData.tilda_project_id,
//           userData.tilda_page_id
//         ]
//       );

//       return result;

//     } catch (error) {
//       console.error('❌ Error in transaction:', error);
//       throw error;
//     }
//   }

//   static async findByLogin(login) {
//     try {
//       const query = 'SELECT * FROM users WHERE login = $1';
//       return await db.oneOrNone(query, [login]);
//     } catch (error) {
//       console.error('❌ Error finding user by login:', error);
//       throw error;
//     }
//   }

//   static getUserId(user) {
//     return user.user_id || user.id;
//   }

//   static sanitizeString(str) {
//     if (!str) return '';
//     return str.toString().trim();
//   }
// }

// export default User; 

import db from '../database/index.js';
import Helpers from '../utils/Helpers.js';
import crypto from 'crypto';

class User {
  /**
   * 🔒 ПОТОКОБЕЗОПАСНОЕ создание пользователя с advisory lock
   * Поддерживает несколько одновременных созданий
   */
  static async create(userData) {
    console.log('🔍 [User.create] Начало создания пользователя:', userData.email);

    const {
      fullname,
      phone,
      email,
      login = null,
      password = null,
      yeardate = '2001-01-01',
      city = 'Москва',
      conditions = 'yes',
      checkbox = 'yes',
      documents = null,
      payment_status = 'pending',
      slot_number = null,
      payment_id = null,
      purchased_numbers = null,
      membership_status = 'pending',
      tilda_transaction_id = null,
      tilda_form_id = null,
      tilda_project_id = null,
      tilda_page_id = null,
      membership_number = null
    } = userData;

    // Генерируем уникальный ключ блокировки по email
    const lockKey = `user_create_${email.toLowerCase()}`;
    const lockId = this.generateLockId(lockKey);

    return await db.task(async t => {
      try {
        // 🔒 1. Блокируем по email (предотвращаем дубли)
        console.log(`🔒 [User.create] Блокировка для ${email} (lockId: ${lockId})`);
        await t.one('SELECT pg_advisory_xact_lock($1)', [lockId]);

        // 🔍 2. Проверяем не создан ли уже пользователь (в рамках транзакции)
        const existing = await t.oneOrNone(
          'SELECT id, email, membership_number FROM users WHERE LOWER(email) = $1 FOR UPDATE SKIP LOCKED',
          [email.toLowerCase()]
        );

        if (existing) {
          console.log(`⚠️ [User.create] Пользователь ${email} уже существует, ID: ${existing.id}`);
          return {
            success: false,
            error: 'Пользователь уже существует',
            user: existing,
            isNew: false
          };
        }

        // 🆕 3. Создаем нового пользователя
        console.log(`🆕 [User.create] Создаю пользователя: ${email}`);

        const query = `
          INSERT INTO users (
            fullname, phone, email, login, password, yeardate, city, 
            conditions, checkbox, documents, payment_status, slot_number,
            payment_id, purchased_numbers, membership_status,
            tilda_transaction_id, tilda_form_id, tilda_project_id, 
            tilda_page_id, membership_number, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
                   $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
          RETURNING *
        `;

        const params = [
          this.sanitizeString(fullname),
          phone,
          email.toLowerCase(),
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
          tilda_page_id,
          membership_number
        ];

        const newUser = await t.one(query, params);

        console.log(`✅ [User.create] Пользователь создан успешно! ID: ${newUser.id}`);

        return {
          success: true,
          user: newUser,
          isNew: true
        };

      } catch (error) {
        console.error(`❌ [User.create] Ошибка создания пользователя ${email}:`, error.message);

        // Если ошибка дубликата, пытаемся найти существующего
        if (error.code === '23505' || error.message.includes('duplicate key')) {
          console.log(`🔄 [User.create] Найден дубликат, ищу существующего пользователя...`);
          const existing = await t.oneOrNone(
            'SELECT * FROM users WHERE LOWER(email) = $1',
            [email.toLowerCase()]
          );
          if (existing) {
            return {
              success: false,
              error: 'Пользователь уже существует',
              user: existing,
              isNew: false
            };
          }
        }

        throw error;
      }
    });
  }

  /**
   * 🔄 Создание с retry логикой (если много конкурентных запросов)
   */
  static async createWithRetry(userData, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [User.createWithRetry] Попытка ${attempt}/${maxRetries} для ${userData.email}`);

        const result = await this.create(userData);
        return result;

      } catch (error) {
        console.error(`❌ [User.createWithRetry] Попытка ${attempt} failed:`, error.message);

        if (attempt === maxRetries) {
          throw error;
        }

        // Экспоненциальная задержка перед следующей попыткой
        const delay = Math.min(100 * Math.pow(2, attempt), 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 🎯 Быстрое создание пользователя из данных Тильды
   */
  static async createFromTildaData(formData, tildaData) {
    const userData = {
      fullname: formData.FullName,
      phone: formData.Phone,
      email: formData.Email,
      login: formData.Email, // Используем email как логин
      password: Helpers.generatePassword(),
      yeardate: formData.Yeardate || '2001-01-01',
      city: formData.City || 'Москва',
      conditions: formData.Conditions === 'yes' ? 'accepted' : 'pending',
      checkbox: formData.Checkbox === 'yes',
      documents: 'pending',
      payment_status: 'pending',
      membership_status: 'pending_payment',
      tilda_transaction_id: tildaData.tranid,
      tilda_form_id: tildaData.formid,
      tilda_project_id: tildaData.projectid || '14245141',
      tilda_page_id: tildaData.pageid
    };

    return await this.createWithRetry(userData);
  }

  /**
   * 🔍 УЛУЧШЕННЫЙ поиск пользователя по email или телефону
   */
  static async findUserByEmailOrPhone(email, phone) {
    try {
      console.log('🔍 [User.findUserByEmailOrPhone] Поиск:', { email, phone });

      if (!email && !phone) {
        console.log('⚠️ Не указаны email или телефон для поиска');
        return null;
      }

      let query;
      let params;

      // 1. Сначала ищем по email (самый надежный)
      if (email) {
        const cleanEmail = email.toLowerCase().trim();
        console.log('📧 Поиск по email:', cleanEmail);

        query = 'SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1';
        params = [cleanEmail];

        const userByEmail = await db.oneOrNone(query, params);
        if (userByEmail) {
          console.log('✅ Найден по email:', userByEmail.id);
          return userByEmail;
        }
      }

      // 2. Если не нашли по email, ищем по телефону
      if (phone && !userByEmail) {
        console.log('📱 Поиск по телефону:', phone);

        const normalizedPhone = Helpers.normalizePhone(phone);
        const digitsOnly = phone.replace(/\D/g, '');
        const last10Digits = digitsOnly.slice(-10);

        console.log('🔢 Нормализованные варианты:', {
          normalizedPhone,
          digitsOnly,
          last10Digits
        });

        // Оптимизированный запрос для поиска по телефону
        query = `
          SELECT * FROM users 
          WHERE phone IS NOT NULL 
          AND (
            REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', ''), '(', '') = $1
            OR REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', ''), '(', '') LIKE $2
            OR phone = $3
            OR phone = $4
          )
          LIMIT 1
        `;

        params = [
          digitsOnly,
          `%${last10Digits}%`,
          normalizedPhone,
          `8${normalizedPhone.slice(1)}` // вариант с 8 вместо 7
        ];

        const userByPhone = await db.oneOrNone(query, params);
        if (userByPhone) {
          console.log('✅ Найден по телефону:', userByPhone.id);
          return userByPhone;
        }
      }

      console.log('❌ Пользователь не найден');
      return null;

    } catch (error) {
      console.error('❌ Ошибка при поиске пользователя:', error);

      // Если таблица не существует - возвращаем null
      if (error.message && error.message.includes('relation "users" does not exist')) {
        console.log('⚠️ Таблица users не существует');
        return null;
      }

      throw error;
    }
  }

  /**
   * 🔢 Генерация уникального номера участника
   */
  static async generateUniqueMemberNumber() {
    try {
      // Простая генерация на основе timestamp
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const memberNumber = `MBR${timestamp.slice(-8)}${random}`;

      // Проверяем уникальность
      const exists = await this.isMemberNumberExists(memberNumber);

      if (!exists) {
        return memberNumber;
      }

      // Если занят, генерируем другой
      console.log(`⚠️ Номер ${memberNumber} занят, генерируем новый...`);
      return `MBR${Date.now()}${Math.floor(Math.random() * 10000)}`;

    } catch (error) {
      console.error('❌ Ошибка генерации номера:', error);
      // Fallback номер
      return `MBR${Date.now()}${Math.floor(Math.random() * 1000)}`;
    }
  }

  /**
   * 🔄 Обновление номера участника с транзакцией
   */
  static async updateMemberNumber(userId, memberNumber) {
    try {
      console.log('🔄 [User.updateMemberNumber] Обновление:', { userId, memberNumber });

      // Проверяем что memberNumber строка, а не Promise
      const actualMemberNumber = typeof memberNumber === 'object' && typeof memberNumber.then === 'function'
        ? await memberNumber
        : memberNumber;

      const query = `
        UPDATE users 
        SET membership_number = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, email, membership_number
      `;

      const result = await db.one(query, [actualMemberNumber, userId]);

      console.log('✅ [User.updateMemberNumber] Номер обновлен:', {
        userId,
        memberNumber: actualMemberNumber,
        email: result.email
      });

      return result;

    } catch (error) {
      console.error('❌ [User.updateMemberNumber] Ошибка:', error);

      // Если ошибка длины поля
      if (error.message && error.message.includes('value too long for type character')) {
        console.error('⚠️ ОШИБКА: поле membership_number имеет неверный тип!');
        console.error('⚠️ Выполните: ALTER TABLE users ALTER COLUMN membership_number TYPE VARCHAR(50);');
      }

      throw error;
    }
  }

  /**
   * 🔑 Генерация ID для advisory lock
   */
  static generateLockId(key) {
    const hash = crypto.createHash('md5').update(key).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }

  // Сохраняем все существующие методы, добавляем только новые

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

  static async findOne(credentials) {
    try {
      const { email, phone, membership_number } = credentials;

      if (!email && !phone && !membership_number) {
        throw new Error('Email, phone or membership_number is required');
      }

      let query;
      let params;

      if (membership_number) {
        query = 'SELECT * FROM users WHERE membership_number = $1';
        params = [membership_number];
      } else if (email && phone) {
        query = 'SELECT * FROM users WHERE email = $1 OR phone = $2 LIMIT 1';
        params = [email, phone];
      } else if (email) {
        query = 'SELECT * FROM users WHERE email = $1';
        params = [email];
      } else if (phone) {
        query = 'SELECT * FROM users WHERE phone = $1';
        params = [phone];
      }

      return await db.oneOrNone(query, params);

    } catch (error) {
      console.error('❌ Error finding user:', error);
      throw error;
    }
  }

  static async findById(userId) {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      return await db.oneOrNone(query, [userId]);
    } catch (error) {
      console.error('❌ Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByMembershipNumber(membershipNumber) {
    try {
      console.log('🔍 Поиск по membership_number:', membershipNumber);
      return await db.oneOrNone(
        'SELECT * FROM users WHERE membership_number = $1',
        [membershipNumber]
      );
    } catch (error) {
      console.error('❌ Ошибка поиска по membership_number:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      return await db.oneOrNone(query, [email]);
    } catch (error) {
      console.error('❌ Error finding user by email:', error);
      throw error;
    }
  }

  static async findByPhone(phone) {
    try {
      const normalizedPhone = Helpers.normalizePhone(phone);
      const query = 'SELECT * FROM users WHERE phone = $1';
      return await db.oneOrNone(query, [normalizedPhone]);
    } catch (error) {
      console.error('❌ Error finding user by phone:', error);
      throw error;
    }
  }

  static async isMemberNumberExists(memberNumber) {
    try {
      const query = 'SELECT COUNT(*) as count FROM users WHERE membership_number = $1';
      const result = await db.one(query, [memberNumber]);
      return parseInt(result.count) > 0;
    } catch (error) {
      console.error('❌ Ошибка проверки номера члена клуба:', error);
      return false;
    }
  }

  static sanitizeString(str) {
    if (!str) return '';
    return str.toString().trim();
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


  // Остальные существующие методы остаются без изменений
  // (updateMembershipStatus, updatePassword, findByLoginOrEmail, etc.)
}

export default User;