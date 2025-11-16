import dotenv from 'dotenv';
dotenv.config();
console.log('🔍 Environment variables check:');
console.log('PGHOST:', process.env.PGHOST);
console.log('PGDATABASE:', process.env.PGDATABASE);
console.log('PGUSER:', process.env.PGUSER);
console.log('PGPASSWORD:', process.env.PGPASSWORD ? '***' : 'not set');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'not set');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);

const CONFIG = {
  // Database settings
  DATABASE: {
    HOST: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    PORT: process.env.DB_PORT || process.env.PGPORT || 5432,
    NAME: process.env.DB_NAME || process.env.PGDATABASE,
    USER: process.env.DB_USER || process.env.PGUSER,
    PASSWORD: process.env.DB_PASSWORD || process.env.PGPASSWORD,
    SSL: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production',
    
    // Railway-specific
    URL: process.env.DATABASE_URL
  },
    // Tinkoff API settings
    TINKOFF: {
      TERMINAL_KEY: process.env.TERMINAL_KEY,
      SECRET_KEY: process.env.SECRET_KEY,
      BASE_URL: 'https://securepay.tinkoff.ru/v2/'
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
    }
  };
  
export default CONFIG;