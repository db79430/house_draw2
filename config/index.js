import dotenv from 'dotenv';

// Загружаем .env только в development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const CONFIG = {
  DATABASE: {
    // В production используем Railway переменные
    URL: process.env.DATABASE_URL,
    
    // Резервные значения для production
    HOST: process.env.DB_HOST,
    PORT: process.env.DB_PORT || 5432,
    NAME: process.env.DB_NAME,
    USER: process.env.DB_USER ,
    PASSWORD: process.env.DB_PASSWORD || 'secure_password_123',
    SSL: true
  },

  
  // Tinkoff API settings
  TINKOFF: {
    TERMINAL_KEY: process.env.TERMINAL_KEY || '1761129018508DEMO',
    PASSWORD: process.env.SECRET_KEY || 'jDkIojG12VaVNopw',
    BASE_URL: 'https://securepay.tinkoff.ru/v2',
  },
  
  // Email settings
  EMAIL: {
    HOST: process.env.EMAIL_HOST || 'smtp.yandex.ru',
    PORT: process.env.EMAIL_PORT || 465,
    USER: process.env.EMAIL_USER,
    PASS: process.env.YANDEX_APP_PASSWORD,
    FROM: process.env.YANDEX_EMAIL
  },
  
  // Application settings
  APP: {
    PORT: process.env.PORT || 3000,
    BASE_URL: process.env.BASE_URL,
    SUCCESS_URL: process.env.SUCCESS_URL,
    FAIL_URL: process.env.FAIL_URL
  },
  
  // Tilda settings
  TILDA: {
    API_KEY: process.env.TILDA_API_KEY || '770a56b6d1fdada08b15',
    FORM_ID: process.env.TILDA_FORM_ID || 'bf403',
    PROJECT_ID: process.env.TILDA_PROJECT_ID || '14245141',
    VERIFY_SIGNATURE: process.env.TILDA_VERIFY_SIGNATURE === 'true'

  }
  
};

// Валидация конфигурации
// function validateConfig() {
//   console.log('🔧 Tinkoff Configuration:');
//   console.log('   TerminalKey:', CONFIG.TINKOFF.TERMINAL_KEY);
//   console.log('   SecretKey: ***' + (CONFIG.TINKOFF.SECRET_KEY ? CONFIG.TINKOFF.SECRET_KEY.slice(-4) : 'NOT SET'));
//   console.log('   BaseURL:', CONFIG.TINKOFF.BASE_URL);
//   console.log('   Mode: TEST (DEMO terminal) → PRODUCTION environment');
  
//   if (!CONFIG.TINKOFF.TERMINAL_KEY) {
//     throw new Error('TERMINAL_KEY is required');
//   }
  
//   if (!CONFIG.TINKOFF.SECRET_KEY) {
//     throw new Error('SECRET_KEY is required');
//   }
  
//   console.log('✅ Configuration validated - using DEMO terminal on PRODUCTION environment');
// }

// validateConfig();

console.log('🚀 Environment:', process.env.NODE_ENV);
console.log('🔧 Database Configuration:');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'not set');
console.log('- PGHOST:', process.env.PGHOST);
console.log('- Using host:', CONFIG.DATABASE.HOST);
console.log('- Using port:', CONFIG.DATABASE.PORT);
console.log('Tinkov', process.env.SECRET_KEY);
console.log('   TerminalKey:', CONFIG.TINKOFF.TERMINAL_KEY);

export default CONFIG;