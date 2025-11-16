import { createHash } from 'crypto';
import CONFIG from '../config/index.js';

class TokenGenerator {
  /**
   * Безопасная генерация токена с полной защитой от ошибок
   */
  static generateToken(paymentData) {
    console.log('🔐 [TokenGenerator] Starting token generation...');
    
    try {
      // 1. Валидация входных данных
      this._validateInput(paymentData);
      
      // 2. Подготовка данных для токена
      const tokenData = this._prepareTokenData(paymentData);
      
      // 3. Создание массива объектов
      const tokenArray = this._createTokenArray(tokenData);
      
      // 4. Сортировка массива
      const sortedArray = this._sortTokenArray(tokenArray);
      
      // 5. Конкатенация значений
      const concatenatedString = this._concatenateValues(sortedArray);
      
      // 6. Генерация хеша
      const token = this._generateHash(concatenatedString);
      
      console.log('✅ [TokenGenerator] Token generated successfully');
      return token;
      
    } catch (error) {
      console.error('❌ [TokenGenerator] Token generation failed:', error.message);
      throw new Error(`Token generation error: ${error.message}`);
    }
  }

  /**
   * Валидация входных данных
   */
  static _validateInput(paymentData) {
    console.log('🔍 [TokenGenerator] Validating input data...');
    
    if (!paymentData) {
      throw new Error('Payment data is null or undefined');
    }

    if (typeof paymentData !== 'object') {
      throw new Error('Payment data must be an object');
    }

    const requiredFields = ['TerminalKey', 'Amount', 'OrderId'];
    const missingFields = requiredFields.filter(field => !paymentData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Проверяем SECRET_KEY
    if (!CONFIG.TINKOFF.SECRET_KEY) {
      throw new Error('SECRET_KEY is not configured in the application');
    }

    console.log('✅ [TokenGenerator] Input validation passed');
  }

  /**
   * Подготовка данных для токена
   */
  static _prepareTokenData(paymentData) {
    console.log('📋 [TokenGenerator] Preparing token data...');
    
    const tokenData = {
      TerminalKey: paymentData.TerminalKey,
      Amount: paymentData.Amount.toString(),
      OrderId: paymentData.OrderId
    };

    // Добавляем опциональные поля если они есть
    const optionalFields = ['Description', 'SuccessURL', 'FailURL', 'NotificationURL'];
    optionalFields.forEach(field => {
      if (paymentData[field]) {
        tokenData[field] = paymentData[field].toString();
      }
    });

    // Добавляем DATA если есть (преобразуем в JSON строку)
    if (paymentData.DATA) {
      tokenData.DATA = JSON.stringify(paymentData.DATA);
    }

    console.log('📋 [TokenGenerator] Token data prepared:', Object.keys(tokenData));
    return tokenData;
  }

  /**
   * Создание массива объектов для токена
   */
  static _createTokenArray(tokenData) {
    console.log('📦 [TokenGenerator] Creating token array...');
    
    const tokenArray = [];

    // Добавляем все поля из tokenData
    Object.keys(tokenData).forEach(key => {
      const value = tokenData[key];
      if (value !== undefined && value !== null && value !== '') {
        tokenArray.push({ [key]: value.toString() });
      }
    });

    // Добавляем пароль
    tokenArray.push({ Password: CONFIG.TINKOFF.SECRET_KEY });

    console.log(`📦 [TokenGenerator] Token array created with ${tokenArray.length} items`);
    return tokenArray;
  }

  /**
   * Сортировка массива по алфавиту
   */
  static _sortTokenArray(tokenArray) {
    console.log('🔠 [TokenGenerator] Sorting token array...');
    
    const sortedArray = [...tokenArray].sort((a, b) => {
      const keyA = Object.keys(a)[0];
      const keyB = Object.keys(b)[0];
      return keyA.localeCompare(keyB);
    });

    console.log('🔠 [TokenGenerator] Token array sorted');
    return sortedArray;
  }

  /**
   * Конкатенация значений в строку
   */
  static _concatenateValues(sortedArray) {
    console.log('🔗 [TokenGenerator] Concatenating values...');
    
    let result = '';
    
    sortedArray.forEach((item, index) => {
      const key = Object.keys(item)[0];
      const value = item[key];
      result += value;
      
      console.log(`   [${index}] ${key}: ${this._maskValue(key, value)}`);
    });

    console.log('🔗 [TokenGenerator] Concatenated string length:', result.length);
    console.log('🔗 [TokenGenerator] Full string (masked):', this._maskValue('full', result));
    
    return result;
  }

  /**
   * Генерация SHA-256 хеша
   */
  static _generateHash(data) {
    console.log('⚡ [TokenGenerator] Generating SHA-256 hash...');
    
    const hash = createHash('sha256')
      .update(data)
      .digest('hex');

    console.log('⚡ [TokenGenerator] Hash generated:', hash);
    return hash;
  }

  /**
   * Маскировка чувствительных данных для логов
   */
  static _maskValue(key, value) {
    if (!value) return value;
    
    const stringValue = value.toString();
    
    if (key === 'Password') {
      return '***' + stringValue.slice(-4);
    }
    
    if (key === 'full' && CONFIG.TINKOFF.SECRET_KEY) {
      return stringValue.replace(
        CONFIG.TINKOFF.SECRET_KEY, 
        '***' + CONFIG.TINKOFF.SECRET_KEY.slice(-4)
      );
    }
    
    return stringValue;
  }

  /**
   * Простой метод для быстрой генерации токена
   */
  static generateTokenSimple(paymentData) {
    console.log('🔐 [TokenGenerator] Using simple token generation...');
    
    try {
      // Используем только основные поля
      const simpleData = {
        Amount: paymentData.Amount.toString(),
        OrderId: paymentData.OrderId,
        Password: CONFIG.TINKOFF.SECRET_KEY,
        TerminalKey: paymentData.TerminalKey
      };

      // Сортируем ключи
      const sortedKeys = Object.keys(simpleData).sort();
      
      // Конкатенируем значения
      let values = '';
      sortedKeys.forEach(key => {
        values += simpleData[key];
      });

      console.log('🔗 [TokenGenerator] Simple concatenated string:', this._maskValue('full', values));

      const token = createHash('sha256')
        .update(values)
        .digest('hex');

      console.log('✅ [TokenGenerator] Simple token generated:', token);
      return token;

    } catch (error) {
      console.error('❌ [TokenGenerator] Simple token generation failed:', error.message);
      throw error;
    }
  }

  static generateOrderId() {
    return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }
}

export default TokenGenerator;