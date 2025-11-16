import { createHash } from 'crypto';
import CONFIG from '../config/index.js';

class TokenGenerator {
  /**
   * Генерация токена согласно документации Tinkoff
   * https://developer.tbank.ru/eacq/intro/developer/token
   */
  static generateToken(paymentData) {
    console.log('🔐 Начало генерации токена по документации Tinkoff...');
    
    try {
      // 1. Создаем массив объектов {ключ: значение} для всех полей кроме Token, Receipt, DATA
      const tokenArray = [];
      
      // Добавляем все основные поля кроме Token
      Object.keys(paymentData).forEach(key => {
        if (key !== 'Token' && key !== 'Receipt' && key !== 'DATA' && 
            paymentData[key] !== undefined && paymentData[key] !== null) {
          
          // Для всех полей кроме объектов используем строковое представление
          if (typeof paymentData[key] === 'object') {
            tokenArray.push({ [key]: JSON.stringify(paymentData[key]) });
          } else {
            tokenArray.push({ [key]: paymentData[key].toString() });
          }
        }
      });

      // 2. Добавляем пароль (SecretKey) как отдельный объект
      tokenArray.push({ Password: CONFIG.TINKOFF.SECRET_KEY });

      console.log('📋 Массив для токена до сортировки:');
      tokenArray.forEach(item => {
        const key = Object.keys(item)[0];
        const value = key === 'Password' ? '***' + item[key].slice(-4) : item[key];
        console.log(`   ${key}: ${value}`);
      });

      // 3. Сортируем массив по ключу в алфавитном порядке
      tokenArray.sort((a, b) => {
        const keyA = Object.keys(a)[0];
        const keyB = Object.keys(b)[0];
        return keyA.localeCompare(keyB);
      });

      console.log('📋 Массив для токена после сортировки:');
      tokenArray.forEach(item => {
        const key = Object.keys(item)[0];
        const value = key === 'Password' ? '***' + item[key].slice(-4) : item[key];
        console.log(`   ${key}: ${value}`);
      });

      // 4. Конкатенируем ТОЛЬКО ЗНАЧЕНИЯ в одну строку
      let values = '';
      tokenArray.forEach(item => {
        const key = Object.keys(item)[0];
        const value = item[key];
        values += value.toString();
      });

      console.log('🔡 Конкатенированная строка для хеширования:');
      console.log('   ', values.replace(CONFIG.TINKOFF.SECRET_KEY, '***' + TINKOFF.SECRET_KEY.slice(-4)));

      // 5. Применяем SHA-256 к полученной строке
      const token = createHash('sha256')
        .update(values)
        .digest('hex');

      console.log('✅ Сгенерированный токен:', token);
      return token;

    } catch (error) {
      console.error('❌ Ошибка генерации токена:', error);
      throw new Error('Ошибка генерации токена: ' + error.message);
    }
  }

  /**
   * Альтернативный метод - простой и надежный согласно примерам документации
   */
  static generateTokenSimple(paymentData) {
    console.log('🔐 Генерация токена упрощенным методом...');
    
    // Используем только основные поля как в документации
    const tokenData = {
      TerminalKey: paymentData.TerminalKey,
      Amount: paymentData.Amount.toString(),
      OrderId: paymentData.OrderId,
      Password: CONFIG.TINKOFF.SECRET_KEY
    };

    // Сортируем ключи в алфавитном порядке
    const sortedKeys = Object.keys(tokenData).sort();
    
    // Конкатенируем значения
    let values = '';
    sortedKeys.forEach(key => {
      values += tokenData[key].toString();
    });

    console.log('🔡 Упрощенная строка для хеширования:');
    console.log('   ', values.replace(CONFIG.TINKOFF.SECRET_KEY, '***' + CONFIG.TINKOFF.SECRET_KEY.slice(-4)));

    const token = createHash('sha256')
      .update(values)
      .digest('hex');

    console.log('✅ Упрощенный токен:', token);
    return token;
  }

  /**
   * Метод для отладки - сравнивает оба метода генерации
   */
  static debugTokenGeneration(paymentData) {
    console.log('🐛 === ОТЛАДКА ГЕНЕРАЦИИ ТОКЕНА ===');
    
    const token1 = this.generateToken(paymentData);
    const token2 = this.generateTokenSimple(paymentData);
    
    console.log('🔍 Сравнение токенов:');
    console.log('   Полный метод: ', token1);
    console.log('   Упрощенный:   ', token2);
    console.log('   Совпадают:    ', token1 === token2);
    console.log('🔚 === КОНЕЦ ОТЛАДКИ ===');
    
    return { full: token1, simple: token2, match: token1 === token2 };
  }

  static generateOrderId() {
    return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }
}

export default TokenGenerator;