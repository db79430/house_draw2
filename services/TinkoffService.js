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

  // async initPayment(paymentData) {
  //   console.log('🚀 [TinkoffService] initPayment called');
    
  //   try {
  //     // Базовые обязательные поля
  //     const requestData = {
  //       TerminalKey: this.terminalKey,
  //       Amount: Number(paymentData.Amount),
  //       OrderId: paymentData.OrderId,
  //       Description: (paymentData.Description || 'Payment').substring(0, 250),
  //     };

  //     console.log('📋 [TinkoffService] Request data:', requestData);

  //     // Генерируем токен
  //     console.log('🔐 [TinkoffService] Generating token...');
  //     requestData.Token = TokenGenerator.generateTokenSimple(requestData);

  //     // Формируем полный URL
  //     const url = `${this.baseURL}`;
  //     console.log('📤 [TinkoffService] Sending POST request to:', url);

  //     // const response = await axios({
  //     //   method: 'POST',
  //     //   url: url,
  //     //   data: requestData,
  //     //   timeout: 15000,
  //     //   maxRedirects: 5,
  //     //   validateStatus: null,
  //     //   headers: {
  //     //     'Content-Type': 'application/json'
  //     //   }
  //     // });
  //     const response = await axios.post(`${url}`, paymentData, {
  //       timeout: 10000,
  //       headers: {
  //         'Content-Type': 'application/json'
  //       }
  //     });

  //     console.log('✅ [TinkoffService] Request successful');
  //     console.log('📥 [TinkoffService] Response:', response.data);
      
  //     return response.data;

  //   } catch (error) {
  //     console.error('❌ [TinkoffService] Request failed:');
      
  //     if (error.response) {
  //       console.error('   Status:', error.response.status);
  //       console.error('   Status Text:', error.response.statusText);
  //       console.error('   Headers:', error.response.headers);
  //       console.error('   Data:', error.response.data);
        
  //       if (error.response.status === 405) {
  //         throw new Error('Method Not Allowed - check if URL and HTTP method are correct');
  //       }
        
  //       const tinkoffError = error.response.data;
  //       throw new Error(tinkoffError.Message || `Tinkoff API Error: ${error.response.status}`);
        
  //     } else if (error.request) {
  //       console.error('   No response received');
  //       console.error('   Request config:', error.request);
  //       throw new Error('No response from Tinkoff API');
        
  //     } else {
  //       console.error('   Setup error:', error.message);
  //       throw error;
  //     }
  //   }
  // }


  // async initPayment(paymentData) {
  //   console.log('🚀 [TinkoffService] initPayment called');
    
  //   try {
  //     // Правильные обязательные поля для Init
  //     const requestData = {
  //       TerminalKey: this.terminalKey,
  //       Amount: Number(paymentData.Amount),
  //       OrderId: paymentData.OrderId,
  //       Description: (paymentData.Description || 'Payment').substring(0, 250),
  //       // SuccessURL: paymentData.SuccessURL,
  //       // FailURL: paymentData.FailURL,
  //       // NotificationURL: paymentData.NotificationURL,
  //       DATA: paymentData.DATA || {}
  //     };
  
  //     console.log('📋 [TinkoffService] Request data:', JSON.stringify(requestData, null, 2));
  
  //     // Генерируем токен
  //     console.log('🔐 [TinkoffService] Generating token...');
  //     requestData.Token = TokenGenerator.generateTokenSimple(requestData);
  
  //     // Формируем полный URL для Init
  //     const url = `${this.baseURL}`;
  //     console.log('📤 [TinkoffService] Sending POST request to:', url);
  
  //     const response = await axios.post(url, requestData, { // ← Отправляем requestData!
  //       timeout: 15000,
  //       headers: {
  //         'Content-Type': 'application/json'
  //       }
  //     });
  
  //     console.log('✅ [TinkoffService] Request successful');
  //     console.log('📥 [TinkoffService] Response:', response.data);
      
  //     return response.data;
  
  //   } catch (error) {
  //     console.error('❌ [TinkoffService] Request failed:');
      
  //     if (error.response) {
  //       console.error('   Status:', error.response.status);
  //       console.error('   Data:', error.response.data);
        
  //       const tinkoffError = error.response.data;
  //       throw new Error(tinkoffError.Message || tinkoffError.ErrorMessage || `Tinkoff API Error: ${error.response.status}`);
        
  //     } else if (error.request) {
  //       console.error('   No response received');
  //       throw new Error('No response from Tinkoff API');
        
  //     } else {
  //       console.error('   Setup error:', error.message);
  //       throw error;
  //     }
  //   }
  // }

  // async initPayment(paymentData) {
  //   console.log('🚀 [TinkoffService] initPayment called');
    
  //   try {
  //     const requestData = {
  //       TerminalKey: this.terminalKey,
  //       Amount: Number(paymentData.Amount),
  //       OrderId: paymentData.OrderId.toString(),
  //       Description: (paymentData.Description || 'Payment').substring(0, 240),
  //       // SuccessURL: paymentData.SuccessURL,
  //       // FailURL: paymentData.FailURL,
  //       // NotificationURL: paymentData.NotificationURL,
  //       DATA: paymentData.DATA || {}
  //     };

  //     console.log('📋 [TinkoffService] Final request data (BEFORE token):', JSON.stringify(requestData, null, 2));
  
  //     console.log('📋 [TinkoffService] Request data:', {
  //       TerminalKey: requestData.TerminalKey,
  //       Amount: requestData.Amount,
  //       OrderId: requestData.OrderId,
  //       Description: requestData.Description
  //     });
  
  //     // ИСПРАВЛЕНИЕ: Используем Tinkoff-specific метод
  //     console.log('🔐 [TinkoffService] Generating Tinkoff token...');
  //     requestData.Token = TokenGenerator.generateTokenTinkoff(requestData);
  
  //     const url = `${this.baseURL}/Init`;
  //     console.log('📤 [TinkoffService] Sending POST request to:', url);
  
  //     const response = await axios({
  //       method: 'POST',
  //       url: url,
  //       data: requestData,
  //       timeout: 10000,
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Accept': 'application/json'
  //       }
  //     });
  
  //     console.log('✅ [TinkoffService] Response received:', {
  //       Success: response.data.Success,
  //       ErrorCode: response.data.ErrorCode,
  //       Message: response.data.Message
  //     });
  
  //     if (!response.data.Success) {
  //       throw new Error(`Tinkoff Error ${response.data.ErrorCode}: ${response.data.Message}`);
  //     }
  
  //     return response.data;
  
  //   } catch (error) {
  //     console.error('❌ [TinkoffService] Request failed:', error.message);
  //     throw error;
  //   }
  // }

  // services/TinkoffService.js
// async initPayment(paymentData) {
//   console.log('🚀 [TinkoffService] initPayment called');
  
//   try {
//     // ВАЛИДАЦИЯ данных перед отправкой
//     // await TokenGenerator.validatePaymentData(paymentData);
    
//     // Подготовка данных - УБЕРИТЕ ВСЕ undefined поля
//     const requestData = {
//       TerminalKey: this.terminalKey,
//       Amount: Number(paymentData.Amount),
//       OrderId: paymentData.OrderId.toString(),
//       Description: (paymentData.Description || 'Payment').substring(0, 240),
//     };

//     const optionalFields = ['DATA', 'SuccessURL', 'FailURL', 'NotificationURL'];
//     optionalFields.forEach(field => {
//       if (paymentData[field] !== undefined && paymentData[field] !== null && paymentData[field] !== '') {
//         requestData[field] = paymentData[field];
//         console.log(`✅ Added optional field: ${field}`);
//       } else {
//         console.log(`⏩ Skipped optional field: ${field} (undefined or empty)`);
//       }
//     });

//     console.log('📋 [TinkoffService] Clean request data:', JSON.stringify(requestData, null, 2));

//     // Генерация токена с очищенными данными
//     console.log('🔐 [TinkoffService] Generating token...');
//     requestData.Token = TokenGenerator.generateTokenTinkoff(requestData);

//     const url = `${this.baseURL}/Init`;
//     console.log('📤 [TinkoffService] Sending POST request to:', url);

//     const response = await axios({
//       method: 'POST',
//       url: url,
//       data: requestData,
//       timeout: 30000,
//       headers: {
//         'Content-Type': 'application/json',
//         'Accept': 'application/json'
//       }
//     });

//     console.log('✅ [TinkoffService] Response received:', response.data);

//     if (!response.data.Success) {
//       console.error('❌ [TinkoffService] Tinkoff API Error details:', response.data);
//       throw new Error(`Tinkoff Error ${response.data.ErrorCode}: ${response.data.Message}`);
//     }

//     return response.data;

//   } catch (error) {
//     console.error('❌ [TinkoffService] Request failed:', error.message);
//     throw error;
//   }
// }

  // Тестовый метод для проверки соединения
  async initPayment(paymentData) {
    console.log('🚀 [TinkoffService] initPayment called');
    
    try {
      // ПРОСТАЯ проверка
      if (!paymentData.TerminalKey || !paymentData.Amount || !paymentData.OrderId) {
        throw new Error('Missing required fields: TerminalKey, Amount, or OrderId');
      }
  
      // Очищаем данные - УБИРАЕМ ВСЕ URL С "undefined"
      const cleanData = {
        TerminalKey: this.terminalKey,
        Amount: Number(paymentData.Amount),
        OrderId: paymentData.OrderId.toString(),
        Description: (paymentData.Description || 'Payment').substring(0, 240),
      };
  
      // ТОЛЬКО DATA - временно исключаем все URL
      if (paymentData.DATA && Object.keys(paymentData.DATA).length > 0) {
        cleanData.DATA = paymentData.DATA;
      }
  
      // ВРЕМЕННО ЗАКОММЕНТИРУЕМ URL ПОЛЯ
      // if (paymentData.SuccessURL && !paymentData.SuccessURL.includes('undefined')) {
      //   cleanData.SuccessURL = paymentData.SuccessURL;
      //   console.log('✅ Added SuccessURL');
      // }
      // if (paymentData.FailURL && !paymentData.FailURL.includes('undefined')) {
      //   cleanData.FailURL = paymentData.FailURL;
      //   console.log('✅ Added FailURL');
      // }
      // if (paymentData.NotificationURL && !paymentData.NotificationURL.includes('undefined')) {
      //   cleanData.NotificationURL = paymentData.NotificationURL;
      //   console.log('✅ Added NotificationURL');
      // }
  
      console.log('📋 [TinkoffService] Clean data (NO URL):', cleanData);
  
      // Генерация токена
      console.log('🔐 [TinkoffService] Generating token...');
      cleanData.Token = TokenGenerator.generateTokenMinimal(cleanData);
  
      const url = `${this.baseURL}/Init`;
      console.log('📤 [TinkoffService] Sending POST request to:', url);
  
      const response = await axios({
        method: 'POST',
        url: url,
        data: cleanData,
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