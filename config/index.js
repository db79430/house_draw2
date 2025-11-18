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
    HOST: process.env.PGHOST || process.env.DB_HOST || 'postgres.railway.internal',
    PORT: process.env.PGPORT || process.env.DB_PORT || 5432,
    NAME: process.env.PGDATABASE || process.env.DB_NAME || 'railway',
    USER: process.env.PGUSER || process.env.DB_USER || 'postgres',
    PASSWORD: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'atqtzfUrVcTuGUReKaHBvrUmVXmuUHVV',
    SSL: true
  },

  
  // Tinkoff API settings
  TINKOFF: {
    TERMINAL_KEY: process.env.TERMINAL_KEY || '1761129018508DEMO',
    SECRET_KEY: process.env.SECRET_KEY || 'jDkIojG12VaVNopw',
    BASE_URL: 'https://securepay.tinkoff.ru/v2/Init',
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
    FORM_ID: process.env.TILDA_FORM_ID
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