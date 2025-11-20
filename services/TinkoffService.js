// services/TinkoffService.js
import axios from 'axios';
import CONFIG from '../config/index.js';
import TokenGenerator from '../utils/tokenGenerator.js';

class TinkoffService {
  constructor() {
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
      // Базовые обязательные поля
      const requestData = {
        TerminalKey: this.terminalKey,
        Amount: Number(paymentData.Amount),
        OrderId: paymentData.OrderId,
        Description: (paymentData.Description || 'Payment').substring(0, 250),
      };

      console.log('📋 [TinkoffService] Request data:', requestData);

      // Генерируем токен
      console.log('🔐 [TinkoffService] Generating token...');
      requestData.Token = TokenGenerator.generateTokenSimple(requestData);

      // Формируем полный URL
      const url = `${this.baseURL}`;
      console.log('📤 [TinkoffService] Sending POST request to:', url);

      // const response = await axios({
      //   method: 'POST',
      //   url: url,
      //   data: requestData,
      //   timeout: 15000,
      //   maxRedirects: 5,
      //   validateStatus: null,
      //   headers: {
      //     'Content-Type': 'application/json'
      //   }
      // });
      const response = await axios.post(`${url}`, paymentData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ [TinkoffService] Request successful');
      console.log('📥 [TinkoffService] Response:', response.data);
      
      return response.data;

    } catch (error) {
      console.error('❌ [TinkoffService] Request failed:');
      
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Status Text:', error.response.statusText);
        console.error('   Headers:', error.response.headers);
        console.error('   Data:', error.response.data);
        
        if (error.response.status === 405) {
          throw new Error('Method Not Allowed - check if URL and HTTP method are correct');
        }
        
        const tinkoffError = error.response.data;
        throw new Error(tinkoffError.Message || `Tinkoff API Error: ${error.response.status}`);
        
      } else if (error.request) {
        console.error('   No response received');
        console.error('   Request config:', error.request);
        throw new Error('No response from Tinkoff API');
        
      } else {
        console.error('   Setup error:', error.message);
        throw error;
      }
    }
  }

  // Тестовый метод для проверки соединения
  async testConnection() {
    try {
      const testData = {
        TerminalKey: this.terminalKey,
        Amount: 1000,
        OrderId: 'TEST' + Date.now(),
        Description: 'Connection test'
      };

      testData.Token = TokenGenerator.generateTokenSimple(testData);

      const response = await axios({
        method: 'POST',
        url: `${this.baseURL}`,
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