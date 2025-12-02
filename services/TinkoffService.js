// services/TinkoffService.js
import axios from 'axios';
import CONFIG from '../config/index.js';
import TokenGenerator from '../utils/tokenGenerator.js';

class TinkoffService {
  constructor() {

    console.log('🔧 [TinkoffService] Initializing...');
    
    // Проверяем что конфигурация загружена
    if (!CONFIG.TINKOFF) {
      throw new Error('Tinkoff configuration is missing - CONFIG.TINKOFF is undefined');
    }
    
    // Убедимся что URL правильный
    this.baseURL = CONFIG.TINKOFF.BASE_URL;
    this.terminalKey = CONFIG.TINKOFF.TERMINAL_KEY;
    
    console.log('🔧 [TinkoffService] Initialized with:');
    console.log('   BaseURL:', this.baseURL);
    console.log('   TerminalKey:', this.terminalKey);
  }

  async initPayment(paymentData) {
    console.log('🚀 [TinkoffService] initPayment called');
    
    try {
      if (!paymentData.TerminalKey || !paymentData.Amount || !paymentData.OrderId) {
        throw new Error('Missing required fields: TerminalKey, Amount, or OrderId');
      }
  
      // Полные данные для запроса (включая DATA, Description и URL)
      const requestData = {
        TerminalKey: this.terminalKey,
        Amount: Number(paymentData.Amount),
        OrderId: paymentData.OrderId.toString(),
        NotificationURL: `${CONFIG.APP.BASE_URL}/tinkoff-callback`,
        Description: (paymentData.Description || 'Payment').substring(0, 240),
      };

      console.log('📋 Request data with NotificationURL:', {
        OrderId: requestData.OrderId,
        NotificationURL: requestData.NotificationURL
      });
  
      // Добавляем опциональные поля в ЗАПРОС (но не в токен!)
      if (paymentData.DATA && Object.keys(paymentData.DATA).length > 0) {
        requestData.DATA = paymentData.DATA;
        console.log('✅ Added DATA to request');
      }
      
      if (paymentData.SuccessURL && !paymentData.SuccessURL.includes('undefined')) {
        requestData.SuccessURL = paymentData.SuccessURL;
        console.log('✅ Added SuccessURL to request');
      }
      if (paymentData.FailURL && !paymentData.FailURL.includes('undefined')) {
        requestData.FailURL = paymentData.FailURL;
        console.log('✅ Added FailURL to request');
      }
      if (paymentData.NotificationURL && !paymentData.NotificationURL.includes('undefined')) {
        requestData.NotificationURL = paymentData.NotificationURL;
        console.log('✅ Added NotificationURL to request');
      }
  
      console.log('📋 [TinkoffService] Full request data:', requestData);
  
      // Генерация токена - ТОЛЬКО из 4 полей (независимо от того, что в запросе)
      console.log('🔐 [TinkoffService] Generating token (4 FIELDS ONLY)...');
      requestData.Token = TokenGenerator.generateTokenTinkoff(requestData);
  
      const url = `${this.baseURL}/Init`;
      console.log('📤 [TinkoffService] Sending POST request to:', url);
  
      const response = await axios({
        method: 'POST',
        url: url,
        data: requestData,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
  
      console.log('✅ [TinkoffService] Response received:', response.data);
  
      if (!response.data.Success) {
        throw new Error(`Tinkoff Error ${response.data.ErrorCode}: ${response.data.Message}`);
      }
  
      return response.data;
  
    } catch (error) {
      console.error('❌ [TinkoffService] Request failed:', error.message);
      throw error;
    }
  }

  verifyNotificationSimple(notificationData) {
    try {
      const { Token, TerminalKey, OrderId, Success, Status, PaymentId } = notificationData;
      
      // Проверяем обязательные поля
      if (!Token || !TerminalKey || !OrderId || Success === undefined || !Status) {
        console.error('❌ Missing required fields in notification');
        return false;
      }
      
      // В реальном приложении здесь должна быть проверка подписи
      // Пока просто проверяем, что TerminalKey совпадает с нашим
      if (TerminalKey !== CONFIG.TINKOFF.TERMINAL_KEY) {
        console.error('❌ TerminalKey mismatch');
        return false;
      }
      
      console.log('✅ Notification verified (basic check)');
      return true;
      
    } catch (error) {
      console.error('❌ Error in notification verification:', error);
      return false;
    }
  }
  
  async testConnection() {
    try {
      const testData = {
        TerminalKey: this.terminalKey,
        Amount: 1000,
        OrderId: 'TEST' + Date.now(),
        Description: 'Connection test'
      };

      testData.Token = TokenGenerator.generateTokenExample(testData);

      const response = await axios({
        method: 'POST',
        url: `${this.baseURL}/Init`,
        data: testData,
        timeout: 10000
      });

      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      };
    }
  }
}

export default TinkoffService;