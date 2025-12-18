// database/migrate.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  try {
    // Читаем SQL файл
    const sqlPath = path.join(__dirname, 'migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing migration...');
    
    // Выполняем SQL
    await db.none(sql);
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Более подробная информация об ошибке
    if (error.message.includes('session')) {
      console.log('ℹ️ This is expected - session table will be created by connect-pg-simple');
    } else {
      console.error('🔧 Error details:', {
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position
      });
    }
    
    // В development выходим с ошибкой
    if (process.env.NODE_ENV === 'development') {
      process.exit(1);
    }
  }
}

// Запускаем миграции если файл запущен напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export default runMigrations;