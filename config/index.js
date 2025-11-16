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
    HOST: process.env.PGHOST || process.env.DB_HOST || 'nozomi.proxy.rlwy.net',
    PORT: process.env.PGPORT || process.env.DB_PORT || 17078,
    NAME: process.env.PGDATABASE || process.env.DB_NAME || 'railway',
    USER: process.env.PGUSER || process.env.DB_USER || 'postgres',
    PASSWORD: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'atqtzfUrVcTuGUReKaHBvrUmVXmuUHVV',
    
    SSL: true
  },
  
  // ... остальные настройки
};

console.log('🚀 Environment:', process.env.NODE_ENV);
console.log('🔧 Database Configuration:');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'not set');
console.log('- PGHOST:', process.env.PGHOST);
console.log('- Using host:', CONFIG.DATABASE.HOST);
console.log('- Using port:', CONFIG.DATABASE.PORT);

export default CONFIG;