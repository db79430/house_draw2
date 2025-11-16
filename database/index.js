import pgp from 'pg-promise';
import CONFIG from '../config/index.js';

// Initialize pg-promise
const pgpInstance = pgp();

// Connection configuration - ИСПРАВЛЕНО согласно структуре CONFIG
const dbConfig = {
  host: CONFIG.DATABASE.HOST,        // ← исправлено
  port: CONFIG.DATABASE.PORT,        // ← исправлено
  database: CONFIG.DATABASE.NAME,    // ← исправлено
  user: CONFIG.DATABASE.USER,        // ← исправлено
  password: CONFIG.DATABASE.PASSWORD // ← исправлено
};

// Create database instance
const db = pgpInstance(dbConfig);

// Test connection
db.connect()
  .then(obj => {
    console.log('✅ PostgreSQL connected successfully');
    obj.done();
  })
  .catch(error => {
    console.error('❌ PostgreSQL connection error:', error.message);
    console.error('Connection details:', {
      host: CONFIG.DATABASE.HOST,
      port: CONFIG.DATABASE.PORT,
      database: CONFIG.DATABASE.NAME,
      user: CONFIG.DATABASE.USER
    });
    process.exit(1);
  });

export { db, pgpInstance as pgp };
export default { db, pgp: pgpInstance };