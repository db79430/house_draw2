// import pgp from 'pg-promise';
// import CONFIG from '../config/index.js';

// // Initialize pg-promise
// const pgpInstance = pgp();

// // Connection configuration
// let dbConfig;

// if (CONFIG.DATABASE.URL) {
//   // Используем DATABASE_URL если доступен (Railway, Heroku, etc.)
//   dbConfig = CONFIG.DATABASE.URL;
// } else {
//   // Используем отдельные параметры
//   dbConfig = {
//     host: CONFIG.DATABASE.HOST,
//     port: CONFIG.DATABASE.PORT,
//     database: CONFIG.DATABASE.NAME,
//     user: CONFIG.DATABASE.USER,
//     password: CONFIG.DATABASE.PASSWORD,
//     ssl: CONFIG.DATABASE.SSL ? { rejectUnauthorized: false } : false,
//     max: 20,
//     idleTimeoutMillis: 30000,
//     connectionTimeoutMillis: 2000
//   };
// }

// // Create database instance
// const db = pgpInstance(dbConfig);

// // Test connection
// db.connect()
//   .then(obj => {
//     console.log('✅ PostgreSQL connected successfully');
//     console.log('📍 Connected to:', CONFIG.DATABASE.NAME || 'database');
//     obj.done();
//   })
//   .catch(error => {
//     console.error('❌ PostgreSQL connection error:', error.message);
//     console.error('🔧 Connection details:', {
//       host: CONFIG.DATABASE.HOST,
//       port: CONFIG.DATABASE.PORT,
//       database: CONFIG.DATABASE.NAME,
//       user: CONFIG.DATABASE.USER,
//       hasURL: !!CONFIG.DATABASE.URL
//     });
    
//     // В production не выходим сразу, чтобы приложение могло переподключаться
//     if (process.env.NODE_ENV === 'production') {
//       console.log('🔄 Will retry connection...');
//     } else {
//       process.exit(1);
//     }
//   });

// export { db, pgpInstance as pgp };
// export default { db, pgp: pgpInstance };

// database/index.js
import pgp from 'pg-promise';
import CONFIG from '../config/index.js';

// Initialize pg-promise
const pgpInstance = pgp();

// Connection configuration
let dbConfig;

if (CONFIG.DATABASE.URL) {
  dbConfig = CONFIG.DATABASE.URL;
} else {
  // Используем отдельные параметры
  dbConfig = {
    host: CONFIG.DATABASE.HOST,
    port: CONFIG.DATABASE.PORT,
    database: CONFIG.DATABASE.NAME,
    user: CONFIG.DATABASE.USER,
    password: CONFIG.DATABASE.PASSWORD,
    ssl: CONFIG.DATABASE.SSL ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  };
}

// Create database instance
const db = pgpInstance(dbConfig);

// Test connection
db.connect()
  .then(obj => {
    console.log('✅ PostgreSQL connected successfully');
    console.log('📍 Connected to:', CONFIG.DATABASE.NAME || 'database');
    obj.done();
  })
  .catch(error => {
    console.error('❌ PostgreSQL connection error:', error.message);
    console.error('🔧 Connection details:', {
      host: CONFIG.DATABASE.HOST,
      port: CONFIG.DATABASE.PORT,
      database: CONFIG.DATABASE.NAME,
      user: CONFIG.DATABASE.USER,
      hasURL: !!CONFIG.DATABASE.URL
    });
    
    // В production не выходим сразу, чтобы приложение могло переподключаться
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Will retry connection...');
    } else {
      process.exit(1);
    }
  });

// Экспортируем db как default
export default db;

// Именованные экспорты для специальных случаев
export { pgpInstance as pgp };