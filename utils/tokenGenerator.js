import { createHash } from 'crypto';
import CONFIG from '../config/index.js';

class TokenGenerator {
  static generateToken(paymentData) {
    const tokenArray = [];
    
    // Добавляем все поля кроме Token
    Object.keys(paymentData).forEach(key => {
      if (key !== 'Token' && paymentData[key] !== undefined && paymentData[key] !== null) {
        if (typeof paymentData[key] === 'object') {
          tokenArray.push({ [key]: JSON.stringify(paymentData[key]) });
        } else {
          tokenArray.push({ [key]: paymentData[key].toString() });
        }
      }
    });

    // Добавляем пароль
    tokenArray.push({ Password: CONFIG.TINKOFF.SECRET_KEY });

    // Сортируем по алфавиту
    tokenArray.sort((a, b) => {
      const keyA = Object.keys(a)[0];
      const keyB = Object.keys(b)[0];
      return keyA.localeCompare(keyB);
    });

    // Конкатенируем значения
    let values = '';
    tokenArray.forEach(item => {
      values += item[Object.keys(item)[0]];
    });

    console.log('🔐 Token generation data:', values.replace(CONFIG.TINKOFF.SECRET_KEY, '***' + CONFIG.TINKOFF.SECRET_KEY.slice(-4)));

    return createHash('sha256').update(values).digest('hex');
  }

  static generateOrderId() {
    return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }
}

export default TokenGenerator;