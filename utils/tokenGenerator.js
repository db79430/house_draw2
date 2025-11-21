// utils/TokenGenerator.js
import { createHash } from 'crypto';
import CONFIG from '../config/index.js';

class TokenGenerator {
  /**
   * Генерация токена строго по документации Tinkoff
   * С защитой от undefined значений
   */
  static generateTokenTinkoff(paymentData) {
    console.log('🔐 [TokenGenerator] Generating token for Tinkoff API...');
    
    try {
      // ПРОВЕРКА КОНФИГУРАЦИИ ПЕРЕД ГЕНЕРАЦИЕЙ
      if (!CONFIG.TINKOFF.SECRET_KEY) {
        throw new Error('TINKOFF.PASSWORD is not configured in the application');
      }

      // ВАЖНО: Порядок полей ДОЛЖЕН БЫТЬ ИМЕННО ТАКИМ
      const tokenObject = {};
      
      // 1. Обязательные поля в ПРАВИЛЬНОМ порядке
      tokenObject.Amount = paymentData.Amount.toString();
      tokenObject.OrderId = paymentData.OrderId;
      tokenObject.Password = CONFIG.TINKOFF.SECRET_KEY; // Пароль из конфига
      tokenObject.TerminalKey = paymentData.TerminalKey;
      
      // 2. Опциональные поля (если присутствуют в запросе и не undefined)
      if (paymentData.Description && this._isValidValue(paymentData.Description)) {
        tokenObject.Description = paymentData.Description;
      }
      
      // 3. DATA должен быть строкой JSON (если есть)
      if (paymentData.DATA && this._isValidValue(paymentData.DATA)) {
        // Убедимся что DATA это объект
        const dataObj = typeof paymentData.DATA === 'string' 
          ? JSON.parse(paymentData.DATA) 
          : paymentData.DATA;
        tokenObject.DATA = JSON.stringify(dataObj);
      }
      
      // 4. URL поля (если есть и не undefined)
      if (paymentData.SuccessURL && this._isValidValue(paymentData.SuccessURL)) {
        tokenObject.SuccessURL = paymentData.SuccessURL;
      }
      if (paymentData.FailURL && this._isValidValue(paymentData.FailURL)) {
        tokenObject.FailURL = paymentData.FailURL;
      }
      if (paymentData.NotificationURL && this._isValidValue(paymentData.NotificationURL)) {
        tokenObject.NotificationURL = paymentData.NotificationURL;
      }

      // ОТЛАДКА: Выведем что именно идет в токен
      console.log('📋 [TokenGenerator] Fields for token:');
      Object.keys(tokenObject).forEach(key => {
        if (key === 'Password') {
          console.log(`   ${key}: ***${tokenObject[key].slice(-4)}`);
        } else {
          console.log(`   ${key}: ${tokenObject[key]}`);
        }
      });

      // СОРТИРОВКА ключей по алфавиту (ВАЖНО!)
      const sortedKeys = Object.keys(tokenObject).sort();
      console.log('🔠 [TokenGenerator] Sorted keys:', sortedKeys);
      
      // Формирование строки токена из ОТСОРТИРОВАННЫХ значений
      let tokenString = '';
      sortedKeys.forEach(key => {
        const value = tokenObject[key];
        // Пропускаем undefined, null и пустые строки
        if (this._isValidValue(value)) {
          tokenString += value.toString();
          console.log(`   ➕ ${key}: ${key === 'Password' ? '***' + value.slice(-4) : value}`);
        }
      });

      console.log('🔗 [TokenGenerator] Final token string length:', tokenString.length);
      
      // Безопасное маскирование пароля
      const maskedString = tokenString.replace(
        CONFIG.TINKOFF.SECRET_KEY, 
        '***' + CONFIG.TINKOFF.SECRET_KEY.slice(-4)
      );
      console.log('🔗 [TokenGenerator] Token string (masked):', maskedString);

      // Генерация SHA-256 хеша
      const token = createHash('sha256')
        .update(tokenString)
        .digest('hex');

      console.log('✅ [TokenGenerator] Token generated:', token);
      return token;

    } catch (error) {
      console.error('❌ [TokenGenerator] Error generating token:', error.message);
      throw error;
    }
  }

  /**
   * Проверка что значение валидно для токена
   */
  static _isValidValue(value) {
    return value !== undefined && 
           value !== null && 
           value !== '' && 
           value !== 'undefined' &&
           !value.toString().includes('undefined');
  }

  /**
   * Упрощенная генерация токена только с обязательными полями
   */
  static generateTokenSimple(paymentData) {
    console.log('🔐 [TokenGenerator] Using simple token generation...');
    
    // Проверка конфигурации
    if (!CONFIG.TINKOFF.SECRET_KEY) {
      throw new Error('TINKOFF.PASSWORD is not configured');
    }

    // ТОЛЬКО обязательные поля
    const tokenData = {
      Amount: paymentData.Amount.toString(),
      OrderId: paymentData.OrderId,
      Password: CONFIG.TINKOFF.SECRET_KEY,
      TerminalKey: paymentData.TerminalKey
    };

    // Сортировка по алфавиту
    const sortedKeys = Object.keys(tokenData).sort();
    
    let tokenString = '';
    sortedKeys.forEach(key => {
      tokenString += tokenData[key];
    });

    console.log('🔗 [TokenGenerator] Simple token string length:', tokenString.length);

    const token = createHash('sha256')
      .update(tokenString)
      .digest('hex');

    console.log('✅ [TokenGenerator] Simple token generated:', token);
    return token;
  }

  static generateOrderId() {
    return Date.now().toString();
  }
}

export default TokenGenerator;