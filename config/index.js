import dotenv from 'dotenv';
dotenv.config();

const CONFIG = {
  // Database settings
  DATABASE: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: process.env.DB_PORT || 5432,
    NAME: process.env.DB_NAME,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    SSL: process.env.DB_SSL === 'true' || false,
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