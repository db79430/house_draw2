// services/AuthService.js
import UserRepository from '../repositories/UserRepository.js';
import User from '../models/Users.js';

class AuthService {
  async loginUser(login, password) {
    try {
      console.log('🔐 Attempting login for:', login);
      console.log('🔐 Input password:', `"${password}"`, 'Length:', password?.length);
      
      // Поиск пользователя по логину или email
      const user = await User.findByLoginOrEmail(login);
      if (!user) {
        console.log('❌ User not found:', login);
        throw new Error('Пользователь не найден');
      }
  
      // 🔧 ДЕТАЛЬНАЯ ОТЛАДКА СРАВНЕНИЯ ПАРОЛЕЙ
      console.log('🔐 Password comparison details:', {
        inputPassword: `"${password}"`,
        storedPassword: `"${user.password}"`,
        inputLength: password?.length,
        storedLength: user.password?.length,
        exactCharacterMatch: password === user.password,
        inputCharCodes: password?.split('').map(c => `${c}(${c.charCodeAt(0)})`),
        storedCharCodes: user.password?.split('').map(c => `${c}(${c.charCodeAt(0)})`)
      });
  
      // Проверка статуса пользователя
      if (user.membership_status !== 'active') {
        console.log('❌ User not active:', user.membership_status);
        throw new Error('Аккаунт не активирован. Дождитесь данных для входа после оплаты.');
      }
  
      // Простая проверка пароля
      const isPasswordValid = password === user.password;
      
      if (!isPasswordValid) {
        console.log('❌ Invalid password for user:', login);
        console.log('🔐 Password debug - side by side:', {
          input: `|${password}|`,
          stored: `|${user.password}|`,
          inputHex: Buffer.from(password).toString('hex'),
          storedHex: Buffer.from(user.password || '').toString('hex')
        });
        throw new Error('Неверный пароль');
      }
  
      // Генерация простого токена
      const token = this.generateSimpleToken(user.id);
  
      // Обновляем последний вход
      await User.updateLastLogin(user.id);
  
      console.log('✅ Successful login for user:', user.email);
  
      return {
        success: true,
        token: token,
        user: {
          id: user.id,
          email: user.email,
          login: user.login,
          fullname: user.fullname,
          status: user.membership_status
        }
      };
  
    } catch (error) {
      console.error('❌ Error in loginUser service:', error.message);
      throw error;
    }
  }

  // Функция для генерации простого токена
  generateSimpleToken(userId) {
    return `simple-token-${userId}-${Date.now()}`;
  }

  async validateToken(token) {
    try {
      if (!token) {
        throw new Error('Токен отсутствует');
      }

      // Простая валидация токена
      const userId = this.parseSimpleToken(token);
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          login: user.login,
          fullname: user.fullname,
          status: user.membership_status
        }
      };

    } catch (error) {
      console.error('❌ Error validating token:', error.message);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // Функция для парсинга простого токена
  parseSimpleToken(token) {
    const match = token.match(/simple-token-(\d+)-/);
    return match ? parseInt(match[1]) : null;
  }

  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          login: user.login,
          fullname: user.fullname,
          status: user.membership_status,
          created_at: user.created_at,
        }
      };

    } catch (error) {
      console.error('❌ Error getting user profile:', error.message);
      throw error;
    }
  }

  async checkUserStatus(email) {
    try {
      const user = await User.findByEmail(email);
      
      if (!user) {
        return {
          exists: false,
          message: 'Пользователь не найден'
        };
      }

      return {
        exists: true,
        status: user.membership_status,
        message: user.membership_status === 'active' 
          ? 'Аккаунт активен' 
          : 'Аккаунт ожидает активации'
      };

    } catch (error) {
      console.error('❌ Error checking user status:', error.message);
      throw error;
    }
  }
}

export default AuthService;