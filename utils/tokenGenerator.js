// // import { createHash } from 'crypto';
// // import CONFIG from '../config/index.js';

// // class TokenGenerator {
// //   /**
// //    * Безопасная генерация токена с полной защитой от ошибок
// //    */
// //   static generateToken(paymentData) {
// //     console.log('🔐 [TokenGenerator] Starting token generation...');
    
// //     try {
// //       // 1. Валидация входных данных
// //       this._validateInput(paymentData);
      
// //       // 2. Подготовка данных для токена
// //       const tokenData = this._prepareTokenData(paymentData);
      
// //       // 3. Создание массива объектов
// //       const tokenArray = this._createTokenArray(tokenData);
      
// //       // 4. Сортировка массива
// //       const sortedArray = this._sortTokenArray(tokenArray);
      
// //       // 5. Конкатенация значений
// //       const concatenatedString = this._concatenateValues(sortedArray);
      
// //       // 6. Генерация хеша
// //       const token = this._generateHash(concatenatedString);
      
// //       console.log('✅ [TokenGenerator] Token generated successfully');
// //       return token;
      
// //     } catch (error) {
// //       console.error('❌ [TokenGenerator] Token generation failed:', error.message);
// //       throw new Error(`Token generation error: ${error.message}`);
// //     }
// //   }

// //   /**
// //    * Валидация входных данных
// //    */
// //   static _validateInput(paymentData) {
// //     console.log('🔍 [TokenGenerator] Validating input data...');
    
// //     if (!paymentData) {
// //       throw new Error('Payment data is null or undefined');
// //     }

// //     if (typeof paymentData !== 'object') {
// //       throw new Error('Payment data must be an object');
// //     }

// //     const requiredFields = ['TerminalKey', 'Amount', 'OrderId'];
// //     const missingFields = requiredFields.filter(field => !paymentData[field]);

// //     if (missingFields.length > 0) {
// //       throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
// //     }

// //     // Проверяем SECRET_KEY
// //     if (!CONFIG.TINKOFF.SECRET_KEY) {
// //       throw new Error('SECRET_KEY is not configured in the application');
// //     }

// //     console.log('✅ [TokenGenerator] Input validation passed');
// //   }

// //   /**
// //    * Подготовка данных для токена
// //    */
// //   static _prepareTokenData(paymentData) {
// //     console.log('📋 [TokenGenerator] Preparing token data...');
    
// //     const tokenData = {
// //       TerminalKey: paymentData.TerminalKey,
// //       Amount: paymentData.Amount.toString(),
// //       OrderId: paymentData.OrderId
// //     };

// //     // Добавляем опциональные поля если они есть
// //     const optionalFields = ['Description', 'SuccessURL', 'FailURL', 'NotificationURL'];
// //     optionalFields.forEach(field => {
// //       if (paymentData[field]) {
// //         tokenData[field] = paymentData[field].toString();
// //       }
// //     });

// //     // Добавляем DATA если есть (преобразуем в JSON строку)
// //     if (paymentData.DATA) {
// //       tokenData.DATA = JSON.stringify(paymentData.DATA);
// //     }

// //     console.log('📋 [TokenGenerator] Token data prepared:', Object.keys(tokenData));
// //     return tokenData;
// //   }

// //   /**
// //    * Создание массива объектов для токена
// //    */
// //   static _createTokenArray(tokenData) {
// //     console.log('📦 [TokenGenerator] Creating token array...');
    
// //     const tokenArray = [];

// //     // Добавляем все поля из tokenData
// //     Object.keys(tokenData).forEach(key => {
// //       const value = tokenData[key];
// //       if (value !== undefined && value !== null && value !== '') {
// //         tokenArray.push({ [key]: value.toString() });
// //       }
// //     });

// //     // Добавляем пароль
// //     tokenArray.push({ Password: CONFIG.TINKOFF.SECRET_KEY });

// //     console.log(`📦 [TokenGenerator] Token array created with ${tokenArray.length} items`);
// //     return tokenArray;
// //   }

// //   /**
// //    * Сортировка массива по алфавиту
// //    */
// //   static _sortTokenArray(tokenArray) {
// //     console.log('🔠 [TokenGenerator] Sorting token array...');
    
// //     const sortedArray = [...tokenArray].sort((a, b) => {
// //       const keyA = Object.keys(a)[0];
// //       const keyB = Object.keys(b)[0];
// //       return keyA.localeCompare(keyB);
// //     });

// //     console.log('🔠 [TokenGenerator] Token array sorted');
// //     return sortedArray;
// //   }

// //   /**
// //    * Конкатенация значений в строку
// //    */
// //   static _concatenateValues(sortedArray) {
// //     console.log('🔗 [TokenGenerator] Concatenating values...');
    
// //     let result = '';
    
// //     sortedArray.forEach((item, index) => {
// //       const key = Object.keys(item)[0];
// //       const value = item[key];
// //       result += value;
      
// //       console.log(`   [${index}] ${key}: ${this._maskValue(key, value)}`);
// //     });

// //     console.log('🔗 [TokenGenerator] Concatenated string length:', result.length);
// //     console.log('🔗 [TokenGenerator] Full string (masked):', this._maskValue('full', result));
    
// //     return result;
// //   }

// //   /**
// //    * Генерация SHA-256 хеша
// //    */
// //   static _generateHash(data) {
// //     console.log('⚡ [TokenGenerator] Generating SHA-256 hash...');
    
// //     const hash = createHash('sha256')
// //       .update(data)
// //       .digest('hex');

// //     console.log('⚡ [TokenGenerator] Hash generated:', hash);
// //     return hash;
// //   }

// //   /**
// //    * Маскировка чувствительных данных для логов
// //    */
// //   static _maskValue(key, value) {
// //     if (!value) return value;
    
// //     const stringValue = value.toString();
    
// //     if (key === 'Password') {
// //       return '***' + stringValue.slice(-4);
// //     }
    
// //     if (key === 'full' && CONFIG.TINKOFF.SECRET_KEY) {
// //       return stringValue.replace(
// //         CONFIG.TINKOFF.SECRET_KEY, 
// //         '***' + CONFIG.TINKOFF.SECRET_KEY.slice(-4)
// //       );
// //     }
    
// //     return stringValue;
// //   }

// //   /**
// //    * Простой метод для быстрой генерации токена
// //    */
// //   static generateTokenSimple(paymentData) {
// //     console.log('🔐 [TokenGenerator] Using simple token generation...');
    
// //     try {
// //       // Используем только основные поля
// //       const simpleData = {
// //         Amount: paymentData.Amount.toString(),
// //         OrderId: paymentData.OrderId,
// //         Password: CONFIG.TINKOFF.PASSWORD,
// //         TerminalKey: paymentData.TerminalKey
// //       };

// //       // Сортируем ключи
// //       const sortedKeys = Object.keys(simpleData).sort();
      
// //       // Конкатенируем значения
// //       let values = '';
// //       sortedKeys.forEach(key => {
// //         values += simpleData[key];
// //       });

// //       console.log('🔗 [TokenGenerator] Simple concatenated string:', this._maskValue('full', values));

// //       const token = createHash('sha256')
// //         .update(values)
// //         .digest('hex');

// //       console.log('✅ [TokenGenerator] Simple token generated:', token);
// //       return token;

// //     } catch (error) {
// //       console.error('❌ [TokenGenerator] Simple token generation failed:', error.message);
// //       throw error;
// //     }
// //   }

// //   static generateOrderId() {
// //     return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
// //   }
// // }

// // export default TokenGenerator;


// import { createHash } from 'crypto';
// import CONFIG from '../config/index.js';

// class TokenGenerator {
//   /**
//    * Безопасная генерация токена с полной защитой от ошибок
//    */
//   static generateToken(paymentData) {
//     console.log('🔐 [TokenGenerator] Starting token generation...');
    
//     try {
//       // 1. Валидация входных данных
//       this._validateInput(paymentData);
      
//       // 2. Подготовка данных для токена
//       const tokenData = this._prepareTokenData(paymentData);
      
//       // 3. Создание массива объектов
//       const tokenArray = this._createTokenArray(tokenData);
      
//       // 4. Сортировка массива
//       const sortedArray = this._sortTokenArray(tokenArray);
      
//       // 5. Конкатенация значений
//       const concatenatedString = this._concatenateValues(sortedArray);
      
//       // 6. Генерация хеша
//       const token = this._generateHash(concatenatedString);
      
//       console.log('✅ [TokenGenerator] Token generated successfully');
//       return token;
      
//     } catch (error) {
//       console.error('❌ [TokenGenerator] Token generation failed:', error.message);
//       throw new Error(`Token generation error: ${error.message}`);
//     }
//   }

//   /**
//    * Валидация входных данных
//    */
//   static _validateInput(paymentData) {
//     console.log('🔍 [TokenGenerator] Validating input data...');
    
//     if (!paymentData) {
//       throw new Error('Payment data is null or undefined');
//     }

//     if (typeof paymentData !== 'object') {
//       throw new Error('Payment data must be an object');
//     }

//     const requiredFields = ['TerminalKey', 'Amount', 'OrderId'];
//     const missingFields = requiredFields.filter(field => !paymentData[field]);

//     if (missingFields.length > 0) {
//       throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
//     }

//     // ИСПРАВЛЕНИЕ: Проверяем PASSWORD, а не SECRET_KEY
//     if (!CONFIG.TINKOFF.PASSWORD) {
//       throw new Error('PASSWORD is not configured in the application');
//     }

//     console.log('✅ [TokenGenerator] Input validation passed');
//   }

//   /**
//    * Подготовка данных для токена
//    */
//   static _prepareTokenData(paymentData) {
//     console.log('📋 [TokenGenerator] Preparing token data...');
    
//     const tokenData = {
//       TerminalKey: paymentData.TerminalKey,
//       Amount: paymentData.Amount.toString(),
//       OrderId: paymentData.OrderId
//     };

//     // Добавляем опциональные поля если они есть
//     const optionalFields = ['Description', 'SuccessURL', 'FailURL', 'NotificationURL'];
//     optionalFields.forEach(field => {
//       if (paymentData[field]) {
//         tokenData[field] = paymentData[field].toString();
//       }
//     });

//     // Добавляем DATA если есть (преобразуем в JSON строку)
//     if (paymentData.DATA) {
//       tokenData.DATA = JSON.stringify(paymentData.DATA);
//     }

//     console.log('📋 [TokenGenerator] Token data prepared:', Object.keys(tokenData));
//     return tokenData;
//   }

//   /**
//    * Создание массива объектов для токена
//    */
//   static _createTokenArray(tokenData) {
//     console.log('📦 [TokenGenerator] Creating token array...');
    
//     const tokenArray = [];

//     // Добавляем все поля из tokenData
//     Object.keys(tokenData).forEach(key => {
//       const value = tokenData[key];
//       if (value !== undefined && value !== null && value !== '') {
//         tokenArray.push({ [key]: value.toString() });
//       }
//     });

//     // ИСПРАВЛЕНИЕ: Используем PASSWORD, а не SECRET_KEY
//     tokenArray.push({ Password: CONFIG.TINKOFF.PASSWORD });

//     console.log(`📦 [TokenGenerator] Token array created with ${tokenArray.length} items`);
//     return tokenArray;
//   }

//   /**
//    * Сортировка массива по алфавиту
//    */
//   static _sortTokenArray(tokenArray) {
//     console.log('🔠 [TokenGenerator] Sorting token array...');
    
//     const sortedArray = [...tokenArray].sort((a, b) => {
//       const keyA = Object.keys(a)[0];
//       const keyB = Object.keys(b)[0];
//       return keyA.localeCompare(keyB);
//     });

//     console.log('🔠 [TokenGenerator] Token array sorted');
//     return sortedArray;
//   }

//   /**
//    * Конкатенация значений в строку
//    */
//   static _concatenateValues(sortedArray) {
//     console.log('🔗 [TokenGenerator] Concatenating values...');
    
//     let result = '';
    
//     sortedArray.forEach((item, index) => {
//       const key = Object.keys(item)[0];
//       const value = item[key];
//       result += value;
      
//       console.log(`   [${index}] ${key}: ${this._maskValue(key, value)}`);
//     });

//     console.log('🔗 [TokenGenerator] Concatenated string length:', result.length);
//     console.log('🔗 [TokenGenerator] Full string (masked):', this._maskValue('full', result));
    
//     return result;
//   }

//   /**
//    * Генерация SHA-256 хеша
//    */
//   static _generateHash(data) {
//     console.log('⚡ [TokenGenerator] Generating SHA-256 hash...');
    
//     const hash = createHash('sha256')
//       .update(data)
//       .digest('hex');

//     console.log('⚡ [TokenGenerator] Hash generated:', hash);
//     return hash;
//   }

//   /**
//    * Маскировка чувствительных данных для логов
//    */
//   static _maskValue(key, value) {
//     if (!value) return value;
    
//     const stringValue = value.toString();
    
//     if (key === 'Password') {
//       return '***' + stringValue.slice(-4);
//     }
    
//     // ИСПРАВЛЕНИЕ: Используем PASSWORD, а не SECRET_KEY
//     if (key === 'full' && CONFIG.TINKOFF.PASSWORD) {
//       return stringValue.replace(
//         CONFIG.TINKOFF.PASSWORD, 
//         '***' + CONFIG.TINKOFF.PASSWORD.slice(-4)
//       );
//     }
    
//     return stringValue;
//   }

//   /**
//    * Простой метод для быстрой генерации токена (ПРАВИЛЬНЫЙ ПОРЯДОК!)
//    */
//   static generateTokenSimple(paymentData) {
//     console.log('🔐 [TokenGenerator] Using simple token generation...');
    
//     try {
//       // ВАЖНО: Правильный порядок полей для Tinkoff API
//       const simpleData = {
//         Amount: paymentData.Amount.toString(),
//         OrderId: paymentData.OrderId,
//         Password: CONFIG.TINKOFF.PASSWORD, // ← Используем PASSWORD из конфига
//         TerminalKey: paymentData.TerminalKey
//       };

//       // Сортируем ключи по алфавиту
//       const sortedKeys = Object.keys(simpleData).sort();
      
//       // Конкатенируем значения в отсортированном порядке
//       let values = '';
//       sortedKeys.forEach(key => {
//         values += simpleData[key];
//       });

//       console.log('🔗 [TokenGenerator] Simple concatenated string:', this._maskValue('full', values));

//       const token = createHash('sha256')
//         .update(values)
//         .digest('hex');

//       console.log('✅ [TokenGenerator] Simple token generated:', token);
//       return token;

//     } catch (error) {
//       console.error('❌ [TokenGenerator] Simple token generation failed:', error.message);
//       throw error;
//     }
//   }

//   /**
//    * Генерация токена строго по документации Tinkoff
//    */
//   static generateTokenTinkoff(paymentData) {
//     console.log('🔐 [TokenGenerator] Using Tinkoff-specific generation...');
    
//     try {
//       // Согласно документации Tinkoff: https://www.tinkoff.ru/kassa/develop/api/request-sign/
//       const tokenData = {};
      
//       // Обязательные поля
//       tokenData.Amount = paymentData.Amount.toString();
//       tokenData.OrderId = paymentData.OrderId;
//       tokenData.Password = CONFIG.TINKOFF.PASSWORD;
//       tokenData.TerminalKey = paymentData.TerminalKey;
      
//       // Опциональные поля
//       if (paymentData.Description) tokenData.Description = paymentData.Description;
//       if (paymentData.Recurrent) tokenData.Recurrent = paymentData.Recurrent;
//       if (paymentData.CustomerKey) tokenData.CustomerKey = paymentData.CustomerKey;
//       if (paymentData.NotificationURL) tokenData.NotificationURL = paymentData.NotificationURL;
//       if (paymentData.SuccessURL) tokenData.SuccessURL = paymentData.SuccessURL;
//       if (paymentData.FailURL) tokenData.FailURL = paymentData.FailURL;
      
//       // DATA должен быть строкой JSON
//       if (paymentData.DATA) {
//         tokenData.DATA = JSON.stringify(paymentData.DATA);
//       }

//       // Сортировка ключей по алфавиту
//       const sortedKeys = Object.keys(tokenData).sort();
      
//       // Конкатенация значений
//       let tokenString = '';
//       sortedKeys.forEach(key => {
//         tokenString += tokenData[key];
//       });

//       console.log('🔗 [TokenGenerator] Tinkoff token string:', this._maskValue('full', tokenString));

//       const token = createHash('sha256')
//         .update(tokenString)
//         .digest('hex');

//       console.log('✅ [TokenGenerator] Tinkoff token generated:', token);
//       return token;

//     } catch (error) {
//       console.error('❌ [TokenGenerator] Tinkoff token generation failed:', error.message);
//       throw error;
//     }
//   }

//   static generateOrderId() {
//     return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
//   }
// }

// export default TokenGenerator;

// utils/TokenGenerator.js
import { createHash } from 'crypto';
import CONFIG from '../config/index.js';

class TokenGenerator {
  /**
   * Генерация токена строго по документации Tinkoff
   * Документация: https://www.tinkoff.ru/kassa/develop/api/request-sign/
   */
  static generateTokenTinkoff(paymentData) {
    console.log('🔐 [TokenGenerator] Generating token for Tinkoff API...');
    
    try {
      // ВАЖНО: Порядок полей ДОЛЖЕН БЫТЬ ИМЕННО ТАКИМ
      const tokenObject = {};
      
      // 1. Обязательные поля в ПРАВИЛЬНОМ порядке
      tokenObject.Amount = paymentData.Amount.toString();
      tokenObject.OrderId = paymentData.OrderId;
      tokenObject.Password = CONFIG.TINKOFF.PASSWORD; // Пароль из конфига
      tokenObject.TerminalKey = paymentData.TerminalKey;
      
      // 2. Опциональные поля (если присутствуют в запросе)
      if (paymentData.Description && paymentData.Description !== 'undefined') {
        tokenObject.Description = paymentData.Description;
      }
      
      // 3. DATA должен быть строкой JSON (если есть)
      if (paymentData.DATA && Object.keys(paymentData.DATA).length > 0) {
        // Убедимся что DATA это объект
        const dataObj = typeof paymentData.DATA === 'string' 
          ? JSON.parse(paymentData.DATA) 
          : paymentData.DATA;
        tokenObject.DATA = JSON.stringify(dataObj);
      }
      
      // 4. URL поля (если есть)
      if (paymentData.SuccessURL && paymentData.SuccessURL !== 'undefined') {
        tokenObject.SuccessURL = paymentData.SuccessURL;
      }
      if (paymentData.FailURL && paymentData.FailURL !== 'undefined') {
        tokenObject.FailURL = paymentData.FailURL;
      }
      if (paymentData.NotificationURL && paymentData.NotificationURL !== 'undefined') {
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
        if (value !== undefined && value !== null && value !== '' && value !== 'undefined') {
          tokenString += value.toString();
          console.log(`   ➕ ${key}: ${key === 'Password' ? '***' + value.slice(-4) : value}`);
        }
      });

      console.log('🔗 [TokenGenerator] Final token string length:', tokenString.length);
      console.log('🔗 [TokenGenerator] Token string (masked):', 
        tokenString.replace(CONFIG.TINKOFF.PASSWORD, '***' + CONFIG.TINKOFF.PASSWORD.slice(-4))
      );

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
   * Альтернативный метод - минимальный набор полей
   */
  static generateTokenMinimal(paymentData) {
    console.log('🔐 [TokenGenerator] Using minimal token generation...');
    
    // ТОЛЬКО обязательные поля в правильном порядке
    const tokenData = {
      Amount: paymentData.Amount.toString(),
      OrderId: paymentData.OrderId,
      Password: CONFIG.TINKOFF.PASSWORD,
      TerminalKey: paymentData.TerminalKey
    };

    // Сортировка по алфавиту
    const sortedKeys = Object.keys(tokenData).sort();
    
    let tokenString = '';
    sortedKeys.forEach(key => {
      tokenString += tokenData[key];
      console.log(`   ${key}: ${key === 'Password' ? '***' + tokenData[key].slice(-4) : tokenData[key]}`);
    });

    console.log('🔗 [TokenGenerator] Minimal token string:', tokenString.replace(CONFIG.TINKOFF.PASSWORD, '***'));

    const token = createHash('sha256')
      .update(tokenString)
      .digest('hex');

    console.log('✅ [TokenGenerator] Minimal token generated:', token);
    return token;
  }

  /**
   * Генерация OrderId в правильном формате
   */
  static generateOrderId() {
    // Tinkoff рекомендует числовой OrderId или строку не длиннее 36 символов
    return Date.now().toString();
  }

  /**
   * Валидация данных перед отправкой
   */
  static validatePaymentData(paymentData) {
    const errors = [];
    
    if (!paymentData.TerminalKey) {
      errors.push('TerminalKey is required');
    }
    
    if (!paymentData.Amount || paymentData.Amount <= 0) {
      errors.push('Valid Amount is required');
    }
    
    if (!paymentData.OrderId) {
      errors.push('OrderId is required');
    }
    
    // Проверяем что нет undefined значений
    Object.keys(paymentData).forEach(key => {
      if (paymentData[key] === undefined) {
        errors.push(`Field ${key} is undefined`);
      }
    });

    if (errors.length > 0) {
      throw new Error(`Payment data validation failed: ${errors.join(', ')}`);
    }
    
    return true;
  }
}

export default TokenGenerator;