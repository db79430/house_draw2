import AuthService from '../services/AuthService.js';

class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  async login(req, res) {
    try {
      console.log('🎯 POST /auth-login вызван!');
      console.log('📦 Тело запроса:', req.body);

      const { login, password } = req.body;

      if (!login || !password) {
        return res.status(400).json({
          success: false,
          message: 'Заполните все поля',
          redirectTo: '/auth'
        });
      }

      const result = await this.authService.loginUser(login, password);

      const {
        membership_number,
        memberNumber,
        id: userId
      } = result.user || {};

      const finalMembershipNumber = membership_number || memberNumber;

      console.log('📋 Извлеченные данные:', {
        userId,
        membership_number,
        memberNumber,
        finalMembershipNumber
      });

      // 🔥 ФОРМИРУЕМ URL С ПАРАМЕТРАМИ
      let redirectUrl = 'https://npkvdv.ru/dashboard';
      if (finalMembershipNumber && userId) {
        redirectUrl = `https://npkvdv.ru/dashboard?member=${encodeURIComponent(finalMembershipNumber)}&userId=${userId}`;
      } else if (userId) {
        redirectUrl = `https://npkvdv.ru/dashboard?userId=${userId}`;
      }

      res.json({
        success: true,
        message: 'Вход выполнен успешно',
        redirectTo: redirectUrl, // URL с параметрами
        ...result
      });

    } catch (error) {
      console.error('❌ Ошибка входа:', error.message);

      res.status(401).json({
        success: false,
        message: error.message,
        redirectTo: '/auth'
      });
    }
  }

  async validate(req, res) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      const result = await this.authService.validateToken(token);

      if (result.valid) {
        res.json({
          success: true,
          user: result.user
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.error
        });
      }

    } catch (error) {
      console.error('❌ Ошибка валидации токена:', error.message);
      res.status(401).json({
        success: false,
        message: 'Недействительный токен'
      });
    }
  }

  async getProfile(req, res) {
    try {
      const result = await this.authService.getUserProfile(req.user.userId);
      res.json(result);

    } catch (error) {
      console.error('❌ Ошибка получения профиля:', error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async logout(req, res) {
    try {
      res.json({
        success: true,
        message: 'Выход выполнен успешно'
      });
    } catch (error) {
      console.error('❌ Ошибка выхода:', error.message);
      res.status(500).json({
        success: false,
        message: 'Ошибка сервера'
      });
    }
  }
}

export default AuthController;