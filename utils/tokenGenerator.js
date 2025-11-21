// utils/TokenGenerator.js
// import { createHash } from 'crypto';
// import CONFIG from '../config/index.js';

// class TokenGenerator {
//   /**
//    * Генерация токена строго по документации Tinkoff
//    */
//   static generateTokenTinkoff(paymentData) {
//     console.log('🔐 [TokenGenerator] Generating token for Tinkoff API...');
    
//     try {
//       // ИСПРАВЛЕНИЕ: Используем PASSWORD, а не SECRET_KEY
//       if (!CONFIG.TINKOFF.PASSWORD) {
//         throw new Error('TINKOFF.PASSWORD is not configured in the application');
//       }

//       console.log('🔑 [TokenGenerator] Using password:', CONFIG.TINKOFF.PASSWORD ? 'SET' : 'MISSING');

//       // ВАЖНО: Порядок полей ДОЛЖЕН БЫТЬ ИМЕННО ТАКИМ
//       const tokenObject = {};
      
//       // 1. Обязательные поля в ПРАВИЛЬНОМ порядке
//       tokenObject.Amount = paymentData.Amount.toString();
//       tokenObject.OrderId = paymentData.OrderId;
//       tokenObject.Password = CONFIG.TINKOFF.PASSWORD; // ← ИСПРАВЛЕНИЕ: PASSWORD
//       tokenObject.TerminalKey = paymentData.TerminalKey;
      
//       // 2. Опциональные поля (если присутствуют в запросе и не undefined)
//       if (paymentData.Description && this._isValidValue(paymentData.Description)) {
//         tokenObject.Description = paymentData.Description;
//       }
      
//       // 3. DATA должен быть строкой JSON (если есть)
//       if (paymentData.DATA && this._isValidValue(paymentData.DATA)) {
//         // Убедимся что DATA это объект
//         const dataObj = typeof paymentData.DATA === 'string' 
//           ? JSON.parse(paymentData.DATA) 
//           : paymentData.DATA;
//         tokenObject.DATA = JSON.stringify(dataObj);
//       }
      
//       // 4. URL поля (если есть и не undefined)
//       if (paymentData.SuccessURL && this._isValidValue(paymentData.SuccessURL)) {
//         tokenObject.SuccessURL = paymentData.SuccessURL;
//       }
//       if (paymentData.FailURL && this._isValidValue(paymentData.FailURL)) {
//         tokenObject.FailURL = paymentData.FailURL;
//       }
//       if (paymentData.NotificationURL && this._isValidValue(paymentData.NotificationURL)) {
//         tokenObject.NotificationURL = paymentData.NotificationURL;
//       }

//       // ОТЛАДКА: Выведем что именно идет в токен
//       console.log('📋 [TokenGenerator] All fields for token generation:');
//       Object.keys(tokenObject).forEach(key => {
//         if (key === 'Password') {
//           console.log(`   ${key}: ***${tokenObject[key].slice(-4)}`);
//         } else {
//           console.log(`   ${key}: ${tokenObject[key]}`);
//         }
//       });

//       // СОРТИРОВКА ключей по алфавиту (ВАЖНО!)
//       const sortedKeys = Object.keys(tokenObject).sort();
//       console.log('🔠 [TokenGenerator] Sorted keys:', sortedKeys);
      
//       // Формирование строки токена из ОТСОРТИРОВАННЫХ значений
//       let tokenString = '';
//       sortedKeys.forEach(key => {
//         const value = tokenObject[key];
//         // Пропускаем undefined, null и пустые строки
//         if (this._isValidValue(value)) {
//           tokenString += value.toString();
//           console.log(`   ➕ [${key}]: ${key === 'Password' ? '***' + value.slice(-4) : value}`);
//         }
//       });

//       console.log('🔗 [TokenGenerator] Final token string length:', tokenString.length);
      
//       // Безопасное маскирование пароля
//       const maskedString = tokenString.replace(
//         CONFIG.TINKOFF.PASSWORD, // ← ИСПРАВЛЕНИЕ: PASSWORD
//         '***' + CONFIG.TINKOFF.PASSWORD.slice(-4) // ← ИСПРАВЛЕНИЕ: PASSWORD
//       );
//       console.log('🔗 [TokenGenerator] Token string (masked):', maskedString);

//       // Генерация SHA-256 хеша
//       const token = createHash('sha256')
//         .update(tokenString)
//         .digest('hex');

//       console.log('✅ [TokenGenerator] Token generated:', token);
//       return token;

//     } catch (error) {
//       console.error('❌ [TokenGenerator] Error generating token:', error.message);
//       throw error;
//     }
//   }

//   /**
//    * Упрощенная генерация токена только с обязательными полями
//    */
//   static generateTokenSimple(paymentData) {
//     console.log('🔐 [TokenGenerator] Using simple token generation...');
    
//     // ИСПРАВЛЕНИЕ: Используем PASSWORD, а не SECRET_KEY
//     if (!CONFIG.TINKOFF.PASSWORD) {
//       throw new Error('TINKOFF.PASSWORD is not configured');
//     }

//     // ТОЛЬКО обязательные поля
//     const tokenData = {
//       Amount: paymentData.Amount.toString(),
//       OrderId: paymentData.OrderId,
//       Password: CONFIG.TINKOFF.PASSWORD, // ← ИСПРАВЛЕНИЕ: PASSWORD
//       TerminalKey: paymentData.TerminalKey
//     };

//     // Сортировка по алфавиту
//     const sortedKeys = Object.keys(tokenData).sort();
    
//     let tokenString = '';
//     sortedKeys.forEach(key => {
//       tokenString += tokenData[key];
//     });

//     console.log('🔗 [TokenGenerator] Simple token string length:', tokenString.length);

//     const token = createHash('sha256')
//       .update(tokenString)
//       .digest('hex');

//     console.log('✅ [TokenGenerator] Simple token generated:', token);
//     return token;
//   }

//   /**
//    * Проверка что значение валидно для токена
//    */
//   static _isValidValue(value) {
//     return value !== undefined && 
//            value !== null && 
//            value !== '' && 
//            value !== 'undefined' &&
//            !value.toString().includes('undefined');
//   }

//   static generateOrderId() {
//     return Date.now().toString();
//   }
// }

// export default TokenGenerator;


// utils/TokenGenerator.js
import { createHash } from 'crypto';
import CONFIG from '../config/index.js';

class TokenGenerator {
  /**
   * Генерация токена строго по документации Tinkoff
   * В токен включаются ТОЛЬКО параметры корневого объекта
   */
  static generateTokenTinkoff(paymentData) {
    console.log('🔐 [TokenGenerator] Generating token (ROOT FIELDS ONLY)...');
    
    try {
      if (!CONFIG.TINKOFF.PASSWORD) {
        throw new Error('TINKOFF.PASSWORD is not configured');
      }

      // Создаем объект ТОЛЬКО с корневыми полями (без вложенных объектов)
      const rootFields = {};
      
      // Обязательные корневые поля
      rootFields.Amount = paymentData.Amount.toString();
      rootFields.OrderId = paymentData.OrderId;
      rootFields.Password = CONFIG.TINKOFF.PASSWORD;
      rootFields.TerminalKey = paymentData.TerminalKey;
      
      // Опциональные корневые поля (если есть)
      if (paymentData.Description && this._isValidValue(paymentData.Description)) {
        rootFields.Description = paymentData.Description;
      }
      
      // URL поля (корневые)
      if (paymentData.SuccessURL && this._isValidValue(paymentData.SuccessURL)) {
        rootFields.SuccessURL = paymentData.SuccessURL;
      }
      if (paymentData.FailURL && this._isValidValue(paymentData.FailURL)) {
        rootFields.FailURL = paymentData.FailURL;
      }
      if (paymentData.NotificationURL && this._isValidValue(paymentData.NotificationURL)) {
        rootFields.NotificationURL = paymentData.NotificationURL;
      }

      // ВАЖНО: DATA, Receipt и другие вложенные объекты НЕ включаются в токен!
      console.log('📋 [TokenGenerator] ROOT fields for token (NO DATA/Receipt):');
      Object.keys(rootFields).forEach(key => {
        if (key === 'Password') {
          console.log(`   ${key}: ***${rootFields[key].slice(-4)}`);
        } else {
          console.log(`   ${key}: ${rootFields[key]}`);
        }
      });

      // СОРТИРОВКА ключей по алфавиту
      const sortedKeys = Object.keys(rootFields).sort();
      console.log('🔠 [TokenGenerator] Sorted ROOT keys:', sortedKeys);
      
      // Формирование строки токена ТОЛЬКО из корневых полей
      let tokenString = '';
      sortedKeys.forEach(key => {
        const value = rootFields[key];
        if (this._isValidValue(value)) {
          tokenString += value.toString();
          console.log(`   ➕ [${key}]: ${key === 'Password' ? '***' + value.slice(-4) : value}`);
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

      console.log('✅ [TokenGenerator] Token generated (root fields only):', token);
      return token;

    } catch (error) {
      console.error('❌ [TokenGenerator] Error generating token:', error.message);
      throw error;
    }
  }

  /**
   * Минимальная генерация токена - ТОЛЬКО 4 обязательных поля
   */
  static generateTokenMinimal(paymentData) {
    console.log('🔐 [TokenGenerator] Using MINIMAL token (4 fields only)...');
    
    if (!CONFIG.TINKOFF.PASSWORD) {
      throw new Error('TINKOFF.PASSWORD is not configured');
    }

    // ТОЛЬКО 4 обязательных корневых поля
    const tokenData = {
      Amount: paymentData.Amount.toString(),
      OrderId: paymentData.OrderId,
      Password: CONFIG.TINKOFF.PASSWORD,
      TerminalKey: paymentData.TerminalKey
    };

    // Сортировка по алфавиту
    const sortedKeys = Object.keys(tokenData).sort();
    
    console.log('🔠 [TokenGenerator] Minimal fields:', sortedKeys);
    
    let tokenString = '';
    sortedKeys.forEach(key => {
      tokenString += tokenData[key];
      console.log(`   ➕ ${key}: ${key === 'Password' ? '***' + tokenData[key].slice(-4) : tokenData[key]}`);
    });

    console.log('🔗 [TokenGenerator] Minimal token string:', tokenString.replace(CONFIG.TINKOFF.PASSWORD, '***'));

    const token = createHash('sha256')
      .update(tokenString)
      .digest('hex');

    console.log('✅ [TokenGenerator] Minimal token generated:', token);
    return token;
  }

  /**
   * Тестовая генерация как в документации Tinkoff
   */
  static generateTokenExample() {
    console.log('🔐 [TokenGenerator] Generating example token from documentation...');
    
    // Данные как в примере документации
    const exampleData = {
      TerminalKey: 'MerchantTerminalKey',
      Amount: '19200',
      OrderId: '00000',
      Description: 'Подарочная карта на 1000 рублей',
      // DATA и Receipt НЕ включаются!
    };

    const password = 'MerchantPassword'; // Пароль из примера

    const tokenData = {
      Amount: exampleData.Amount,
      OrderId: exampleData.OrderId,
      Password: password,
      TerminalKey: exampleData.TerminalKey,
      Description: exampleData.Description
    };

    const sortedKeys = Object.keys(tokenData).sort();
    
    let tokenString = '';
    sortedKeys.forEach(key => {
      tokenString += tokenData[key];
    });

    console.log('🔗 [TokenGenerator] Example token string:', tokenString.replace(password, '***'));
    
    const token = createHash('sha256')
      .update(tokenString)
      .digest('hex');

    console.log('✅ [TokenGenerator] Example token:', token);
    return token;
  }

  static _isValidValue(value) {
    return value !== undefined && value !== null && value !== '' && value !== 'undefined';
  }

  static generateOrderId() {
    return Date.now().toString();
  }
}

export default TokenGenerator;