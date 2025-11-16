import { createHash } from 'crypto';
import CONFIG from '../config/index.js';

class TokenGenerator {
  static generateToken(paymentData) {
    console.log('🔐 Начало генерации токена...');
    
    try {
      // Создаем массив объектов ключ:значение (только корневые поля)
      const tokenArray = [
        { TerminalKey: paymentData.TerminalKey },
        { Amount: paymentData.Amount.toString() },
        { OrderId: paymentData.OrderId },
        { Description: paymentData.Description }
      ];

      // Добавляем SuccessURL и FailURL если они есть
      if (paymentData.SuccessURL) {
        tokenArray.push({ SuccessURL: paymentData.SuccessURL });
      }
      
      if (paymentData.FailURL) {
        tokenArray.push({ FailURL: paymentData.FailURL });
      }

      // Добавляем DATA если есть
      if (paymentData.DATA) {
        tokenArray.push({ DATA: JSON.stringify(paymentData.DATA) });
      }

      // Добавляем пароль в массив
      tokenArray.push({ Password: CONFIG.TINKOFF.SECRET_KEY });

      console.log('📋 Массив для токена до сортировки:', tokenArray.map(item => Object.keys(item)[0]));

      // Сортируем массив по ключу в алфавитном порядке
      tokenArray.sort((a, b) => {
        const keyA = Object.keys(a)[0];
        const keyB = Object.keys(b)[0];
        return keyA.localeCompare(keyB);
      });

      console.log('📋 Массив для токена после сортировки:', tokenArray.map(item => Object.keys(item)[0]));

      // Конкатенируем значения в одну строку
      let values = '';
      tokenArray.forEach(item => {
        const key = Object.keys(item)[0];
        const value = item[key];
        values += value.toString();
      });

      console.log('🔡 Конкатенированная строка (без пароля):', values.replace(CONFIG.TINKOFF.SECRET_KEY, '***' + CONFIG.TINKOFF.SECRET_KEY.slice(-4)));

      // Применяем SHA-256
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

  static generateOrderId() {
    return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }
}

export default TokenGenerator;