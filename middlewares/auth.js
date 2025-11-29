// middleware/auth.js
import AuthService from '../services/AuthService.js';

// Создайте экземпляр сервиса
const authService = new AuthService();

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Auth middleware:', { 
      hasToken: !!token,
      token: token ? `${token.substring(0, 10)}...` : 'none'
    });

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Токен доступа отсутствует'
      });
    }

    // Валидируем токен через AuthService
    const validationResult = await authService.validateToken(token);
    
    if (!validationResult.valid) {
      return res.status(401).json({
        success: false,
        message: validationResult.error || 'Недействительный токен'
      });
    }

    // Добавляем пользователя в запрос
    req.user = validationResult.user;
    console.log('✅ User authenticated:', { 
      id: req.user.id, 
      email: req.user.email 
    });
    
    next();
    
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Ошибка аутентификации'
    });
  }
};