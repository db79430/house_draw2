import AuthService from '../services/AuthService.js';

class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  async login(req, res) {
    try {
      console.log('🎯 POST /auth-login вызван!');

      const { login, password } = req.body;

      if (!login || !password) {
        return res.status(400).json({
          success: false,
          message: 'Заполните все поля',
          redirectTo: '/auth'
        });
      }

      const result = await this.authService.loginUser(login, password);

      // 🔥 ДОБАВЬТЕ ОТЛАДКУ
      console.log('🔍 Результат из AuthService:', {
        hasResult: !!result,
        hasUser: !!result?.user,
        userKeys: result?.user ? Object.keys(result.user) : 'нет user',
        userData: result?.user,
        membership_number: result?.user?.membership_number,
        memberNumber: result?.user?.memberNumber,
        allFields: result?.user ? Object.entries(result.user).map(([k, v]) => `${k}: ${v}`) : []
      });

      // 🔥 Пробуем разные варианты имени поля
      const membershipNumber = result?.user?.membership_number ||
        result?.user?.memberNumber ||
        result?.user?.membershipNumber;

      console.log('🔍 Найденный membership number:', {
        membership_number: result?.user?.membership_number,
        memberNumber: result?.user?.memberNumber,
        membershipNumber: result?.user?.membershipNumber,
        final: membershipNumber
      });

      // 🔥 Формируем URL только с member (без userId)
      let redirectUrl = '/dashboard';

      if (membershipNumber) {
        redirectUrl = `/dashboard?member=${encodeURIComponent(membershipNumber)}`;
      } else {
        console.warn('⚠️ membership_number не найден в данных пользователя');
      }

      console.log('🎯 Redirect URL:', redirectUrl);

      res.json({
        success: true,
        message: 'Вход выполнен успешно',
        redirectTo: redirectUrl,
        ...result,
        // 🔥 Обеспечиваем обратную совместимость
        user: {
          ...result.user,
          // Добавляем все возможные варианты
          membership_number: membershipNumber,
          memberNumber: membershipNumber
        }
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