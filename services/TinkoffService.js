import post from 'axios';
import CONFIG from '../config/index.js';
import TokenGenerator from '../utils/tokenGenerator.js';

class TinkoffService {
  constructor() {
    this.baseURL = CONFIG.TINKOFF.BASE_URL;
    this.terminalKey = CONFIG.TINKOFF.TERMINAL_KEY;
  }

  async initPayment(paymentData) {
    try {
      // Добавляем обязательные поля
      const requestData = {
        TerminalKey: this.terminalKey,
        ...paymentData
      };

      // Генерируем токен
      requestData.Token = TokenGenerator.generateToken(requestData);

      console.log('📤 Отправка запроса в Tinkoff:', JSON.stringify(requestData, null, 2));

      const response = await post(`${this.baseURL}Init`, requestData, {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('📥 Ответ от Tinkoff:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Ошибка Tinkoff API:', error.message);
      throw new Error(this.formatError(error));
    }
  }

  async getPaymentState(paymentId) {
    try {
      const requestData = {
        TerminalKey: this.terminalKey,
        PaymentId: paymentId
      };

      requestData.Token = TokenGenerator.generateToken(requestData);

      const response = await post(`${this.baseURL}GetState`, requestData);
      return response.data;

    } catch (error) {
      console.error('❌ Ошибка получения статуса платежа:', error.message);
      throw new Error(this.formatError(error));
    }
  }

  formatError(error) {
    if (error.response) {
      return `Tinkoff API Error: ${error.response.data.Message || error.response.statusText}`;
    } else if (error.request) {
      return 'Network error: Не удалось подключиться к Tinkoff API';
    } else {
      return error.message;
    }
  }

  validatePaymentData(paymentData) {
    const required = ['Amount', 'OrderId', 'Description'];
    const missing = required.filter(field => !paymentData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Отсутствуют обязательные поля: ${missing.join(', ')}`);
    }

    if (paymentData.Amount < 100) {
      throw new Error('Минимальная сумма платежа - 1 рубль (100 копеек)');
    }

    if (paymentData.OrderId.length > 36) {
      throw new Error('OrderId не должен превышать 36 символов');
    }
  }
}

export default new TinkoffService();