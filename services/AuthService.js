import UserRepository from '../repositories/UserRepository.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/Users.js';

class AuthService {
  async loginUser(login, password) {
    try {
      console.log('🔐 Attempting login for:', login);
      
      // Поиск пользователя по логину или email
      const user = await UserRepository.findByLoginOrEmail(login);
      if (!user) {
        console.log('❌ User not found:', login);
        throw new Error('Пользователь не найден');
      }

      // Проверка статуса пользователя
      if (user.status !== 'active') {
        console.log('❌ User not active:', user.status);
        throw new Error('Аккаунт не активирован. Дождитесь данных для входа после оплаты.');
      }

      // Проверка пароля
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log('❌ Invalid password for user:', login);
        throw new Error('Неверный пароль');
      }

      // Генерация JWT токена
      const token = jwt.sign(
        { 
          userId: user.id,
          email: user.email,
          login: user.login 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );

      // Обновляем последний вход
      await UserRepository.updateLastLogin(user.id);

      console.log('✅ Successful login for user:', user.email);

      return {
        success: true,
        token: token,
        user: {
          id: user.id,
          email: user.email,
          login: user.login,
          fullname: user.fullname,
          status: user.status
        }
      };

    } catch (error) {
      console.error('❌ Error in loginUser service:', error.message);
      throw error;
    }
  }

  async validateToken(token) {
    try {
      if (!token) {
        throw new Error('Токен отсутствует');
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId);
      
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
          status: user.status
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
          status: user.status,
          created_at: user.created_at,
          last_login: user.last_login
        }
      };

    } catch (error) {
      console.error('❌ Error getting user profile:', error.message);
      throw error;
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      // Проверка текущего пароля
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Неверный текущий пароль');
      }

      // Хэширование нового пароля
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Обновление пароля
      await UserRepository.updatePassword(userId, hashedPassword);

      console.log('✅ Password changed for user:', user.email);

      return {
        success: true,
        message: 'Пароль успешно изменен'
      };

    } catch (error) {
      console.error('❌ Error changing password:', error.message);
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
        status: user.status,
        message: user.status === 'active' 
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