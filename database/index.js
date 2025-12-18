// database/index.js
import pgp from 'pg-promise';
import CONFIG from '../config/index.js';

// Initialize pg-promise без дополнительных опций
const pgpInstance = pgp({
  // Опции pg-promise
  capSQL: true,
  noWarnings: false,
  
  // Обработчики событий
  error: (err, e) => {
    console.error('❌ Database error:', err.message);
    
    if (e.cn) {
      console.error('🔌 Connection error context:', {
        host: e.cn.host,
        database: e.cn.database,
        user: e.cn.user
      });
    }
  },
  
  // Логирование запросов в development
  query: (e) => {
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_SQL === 'true') {
      console.log(`📝 SQL [${e.client.connection.processID}]:`, e.query);
    }
  },
  
  // Обработка таймаутов
  receive: (data, result, e) => {
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`📊 Received ${result?.rows?.length || 0} rows`);
    }
  }
});

// Конфигурация подключения для pg-promise
let connectionConfig;

if (CONFIG.DATABASE.URL) {
  // Используем DATABASE_URL
  connectionConfig = CONFIG.DATABASE.URL;
} else {
  // Создаем объект конфигурации для pg-promise
  connectionConfig = {
    host: CONFIG.DATABASE.HOST || 'localhost',
    port: CONFIG.DATABASE.PORT || 5432,
    database: CONFIG.DATABASE.NAME,
    user: CONFIG.DATABASE.USER,
    password: CONFIG.DATABASE.PASSWORD,
    ssl: CONFIG.DATABASE.SSL ? { rejectUnauthorized: false } : false,
    
    // ⚠️ Обратите внимание: настройки пула указываются здесь
    max: CONFIG.DATABASE.MAX_CONNECTIONS || 20,
    idleTimeoutMillis: CONFIG.DATABASE.IDLE_TIMEOUT || 30000,
    connectionTimeoutMillis: CONFIG.DATABASE.CONNECTION_TIMEOUT || 5000,
    allowExitOnIdle: false
  };
}

console.log('🔧 Database configuration:', {
  host: connectionConfig.host || 'from URL',
  database: connectionConfig.database || 'from URL',
  user: connectionConfig.user || 'from URL',
  maxConnections: connectionConfig.max,
  ssl: connectionConfig.ssl ? 'enabled' : 'disabled'
});

// Создаем экземпляр базы данных
const db = pgpInstance(connectionConfig);

// Функция тестирования подключения
async function testConnection() {
  try {
    const result = await db.one('SELECT version() as version');
    console.log('✅ PostgreSQL connected successfully');
    console.log('🐘 Version:', result.version.split(',')[0]);
    
    // Проверяем доступность таблицы users
    try {
      const usersCount = await db.one('SELECT COUNT(*) as count FROM users');
      console.log(`📊 Total users in database: ${usersCount.count}`);
    } catch (tableError) {
      console.log('📋 Table "users" not found yet - migrations will create it');
    }
    
    // Проверяем сессионную таблицу
    try {
      await db.one('SELECT 1 FROM session LIMIT 1');
      console.log('✅ Session table exists');
    } catch (sessionError) {
      console.log('📝 Session table will be created automatically');
    }
    
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error.message);
    console.error('🔧 Connection details:', {
      host: CONFIG.DATABASE.HOST,
      port: CONFIG.DATABASE.PORT,
      database: CONFIG.DATABASE.NAME,
      user: CONFIG.DATABASE.USER,
      hasURL: !!CONFIG.DATABASE.URL,
      errorCode: error.code
    });
    
    // Более подробная диагностика
    if (error.code === '28P01') {
      console.error('🔐 Authentication failed - check username/password');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 Host not found - check DB_HOST');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🚫 Connection refused - check DB_PORT and if PostgreSQL is running');
    }
    
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