// database/index.js
import pgp from 'pg-promise';
import CONFIG from '../config/index.js';

// Минимальная инициализация pg-promise
const initOptions = {
  // Отключаем предупреждения для development
  noWarnings: process.env.NODE_ENV === 'production',
  
  // Обработка ошибок
  error: (err, e) => {
    // Игнорируем ошибку отсутствия таблицы session - она создастся автоматически
    if (err.message && err.message.includes('relation "session" does not exist')) {
      console.log('ℹ️ Session table does not exist yet - will be created automatically');
      return;
    }
    
    console.error('❌ Database error:', err.message);
    
    // Логируем только в development
    if (process.env.NODE_ENV === 'development' && e.cn) {
      console.log('🔌 Connection:', {
        host: e.cn.host,
        database: e.cn.database,
        user: e.cn.user
      });
    }
  }
};

const pgpInstance = pgp(initOptions);

// Конфигурация подключения
let connectionConfig;

if (CONFIG.DATABASE.URL) {
  connectionConfig = CONFIG.DATABASE.URL;
} else {
  connectionConfig = {
    host: CONFIG.DATABASE.HOST || 'localhost',
    port: CONFIG.DATABASE.PORT || 5432,
    database: CONFIG.DATABASE.NAME,
    user: CONFIG.DATABASE.USER,
    password: CONFIG.DATABASE.PASSWORD,
    ssl: CONFIG.DATABASE.SSL ? { rejectUnauthorized: false } : false,
    max: CONFIG.DATABASE.MAX_CONNECTIONS || 20,
    idleTimeoutMillis: CONFIG.DATABASE.IDLE_TIMEOUT || 30000,
    connectionTimeoutMillis: CONFIG.DATABASE.CONNECTION_TIMEOUT || 2000
  };
}

console.log('🔧 Database configuration:', {
  host: connectionConfig.host || 'from URL',
  database: connectionConfig.database || 'from URL',
  maxConnections: connectionConfig.max
});

// Создаем экземпляр базы данных
const db = pgpInstance(connectionConfig);

// 🔥 ИСПРАВЛЕНИЕ: Улучшенная функция тестирования подключения
async function testConnection() {
  try {
    // Простая проверка подключения
    const result = await db.one('SELECT version() as version, current_timestamp as time');
    
    console.log('✅ PostgreSQL connected successfully');
    console.log('🐘 Version:', result.version.split(',')[0]);
    console.log('🕒 Server time:', result.time);
    
    try {
      // Проверяем основные таблицы
      const tables = await db.manyOrNone(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'payments', 'slots', 'webhook_logs')
      `);
      
      console.log('📋 Found tables:', tables.map(t => t.table_name).join(', ') || 'none');
      
      if (tables.length > 0) {
        // Проверяем количество записей в users
        const usersCount = await db.one('SELECT COUNT(*) as count FROM users');
        console.log(`👥 Total users: ${usersCount.count}`);
      }
      
    } catch (tableError) {
      // Игнорируем ошибки таблиц - миграции создадут их
      console.log('📝 Tables not found yet - migrations will create them');
    }
    
  } catch (error) {
    // 🔥 ОСОБЕННОСТЬ: Игнорируем ошибку таблицы session
    if (error.message && error.message.includes('relation "session" does not exist')) {
      console.log('ℹ️ Session table does not exist - this is expected');
      console.log('✅ PostgreSQL connection is working');
      return;
    }
    
    console.error('❌ PostgreSQL connection error:', error.message);
    
    // Подробная диагностика
    if (error.code === '28P01') {
      console.error('🔐 Authentication failed - check DB_USER/DB_PASSWORD');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 Host not found - check DB_HOST');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🚫 Connection refused - check DB_PORT and if PostgreSQL is running');
      console.error('   Run: sudo service postgresql start (Linux/Mac)');
    } else if (error.code === '3D000') {
      console.error('📁 Database does not exist - check DB_NAME');
    }
    
    console.error('🔧 Connection details:', {
      host: CONFIG.DATABASE.HOST,
      port: CONFIG.DATABASE.PORT,
      database: CONFIG.DATABASE.NAME,
      user: CONFIG.DATABASE.USER,
      hasURL: !!CONFIG.DATABASE.URL
    });
    
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

// Запускаем тест подключения
testConnection();

// Экспортируем db как default
export default db;

// Именованные экспорты
export { 
  pgpInstance as pgp,
  testConnection
};