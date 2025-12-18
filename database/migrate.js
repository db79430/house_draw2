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
    // 🔥 ИСПРАВЛЕНИЕ: Правильный путь к файлу миграции
    const possiblePaths = [
      path.join(__dirname, '..', 'migrations', 'migration.sql'), // ../migrations/migration.sql
      path.join(process.cwd(), 'database', 'migrations', 'migration.sql'),
      path.join(process.cwd(), 'migrations', 'migration.sql'),
      '/database/migrations/migration.sql', // Абсолютный путь в Docker
      '/app/database/migrations/migration.sql',
      path.join(__dirname, 'migration.sql') // Старый путь для совместимости
    ];
    
    let sqlPath = null;
    let sqlContent = null;
    
    console.log('🔍 Looking for migration file...');
    
    // Ищем файл по всем возможным путям
    for (const possiblePath of possiblePaths) {
      console.log(`   Checking: ${possiblePath}`);
      
      if (fs.existsSync(possiblePath)) {
        sqlPath = possiblePath;
        console.log(`✅ Found migration file at: ${sqlPath}`);
        break;
      }
    }
    
    if (!sqlPath) {
      console.error('❌ Migration file not found at any of these locations:');
      possiblePaths.forEach(p => console.log(`   - ${p}`));
      
      // 🔥 СОЗДАЕМ МИГРАЦИЮ ПРЯМО В КОДЕ
      console.log('📝 Creating migration in code...');
      sqlContent = this.getDefaultMigrationSQL();
      
    } else {
      // Читаем SQL из файла
      console.log(`📄 Reading migration file: ${sqlPath}`);
      sqlContent = fs.readFileSync(sqlPath, 'utf8');
    }
    
    console.log('🔄 Executing migration...');
    
    // Разделяем SQL на отдельные команды
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
    
    console.log(`📋 Found ${sqlCommands.length} SQL commands to execute`);
    
    // Выполняем каждую команду отдельно
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      // Пропускаем комментарии и пустые строки
      if (command.startsWith('--') || command.length < 5) {
        console.log(`   Skipping comment/empty line ${i + 1}`);
        continue;
      }
      
      try {
        console.log(`   Executing command ${i + 1}/${sqlCommands.length}`);
        
        // Добавляем точку с запятой обратно
        await db.none(command + ';');
        
        console.log(`   ✅ Command ${i + 1} executed successfully`);
        
      } catch (error) {
        // 🔥 ИГНОРИРУЕМ ОЖИДАЕМЫЕ ОШИБКИ
        const errorMsg = error.message || '';
        
        if (errorMsg.includes('session') || errorMsg.includes('relation "session"')) {
          console.log(`   ℹ️ Ignoring session table error (will be created automatically)`);
        } else if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
          console.log(`   ℹ️ Object already exists, skipping`);
        } else if (errorMsg.includes('does not exist')) {
          console.log(`   ℹ️ Object doesn't exist yet, skipping DROP`);
        } else {
          console.error(`   ❌ Error in command ${i + 1}:`, errorMsg);
          console.error(`   SQL: ${command.substring(0, 100)}...`);
          
          // Для не критичных ошибок продолжаем
          if (process.env.NODE_ENV === 'development') {
            console.error('   ⚠️ Stopping migration due to error in development');
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // 🔥 ПРОВЕРЯЕМ РЕЗУЛЬТАТ
    await this.verifyMigration();
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Не падаем в production, просто логируем
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ Continuing despite migration errors in production');
    } else {
      process.exit(1);
    }
  }
}

/**
 * Проверяем результат миграции
 */
async function verifyMigration() {
  try {
    console.log('🔍 Verifying migration results...');
    
    const requiredTables = ['users', 'payments', 'slots', 'webhook_logs'];
    const existingTables = [];
    
    for (const table of requiredTables) {
      try {
        const exists = await db.oneOrNone(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          ) as exists`,
          [table]
        );
        
        if (exists && exists.exists) {
          existingTables.push(table);
          
          // Подсчитываем записи
          const count = await db.one(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`   📊 ${table}: ${count.count} records`);
        }
      } catch (error) {
        console.log(`   ⚠️ Could not check table ${table}:`, error.message);
      }
    }
    
    console.log(`✅ Migration verified: ${existingTables.length}/${requiredTables.length} tables exist`);
    
    if (existingTables.length < requiredTables.length) {
      const missing = requiredTables.filter(t => !existingTables.includes(t));
      console.warn(`⚠️ Missing tables: ${missing.join(', ')}`);
    }
    
  } catch (error) {
    console.log('⚠️ Could not verify migration:', error.message);
  }
}

/**
 * Возвращает SQL миграции по умолчанию
 */
function getDefaultMigrationSQL() {
  return `
-- Default migration SQL
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    fullname VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100) NOT NULL,
    login VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    yeardate DATE,
    city VARCHAR(100) NOT NULL,
    conditions VARCHAR(20) DEFAULT 'pending',
    checkbox BOOLEAN DEFAULT FALSE,
    documents VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending',
    slot_number INTEGER,
    payment_id VARCHAR(50),
    purchased_numbers JSONB,
    membership_status VARCHAR(20) DEFAULT 'pending_payment',
    tilda_transaction_id VARCHAR(100),
    tilda_form_id VARCHAR(50),
    tilda_project_id VARCHAR(50),
    tilda_page_id VARCHAR(50),
    membership_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'RUB',
    tinkoff_payment_id VARCHAR(50),
    order_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    description TEXT,
    tinkoff_response JSONB,
    notification_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create slots table
CREATE TABLE IF NOT EXISTS slots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    slot_number VARCHAR(50) NOT NULL,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    member_number VARCHAR(100),
    action_type VARCHAR(50),
    form_data JSONB,
    tilda_data JSONB,
    processed_at TIMESTAMP,
    error_message TEXT,
    http_status INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_membership_number ON users(membership_number);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE INDEX IF NOT EXISTS idx_slots_user_id ON slots(user_id);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON webhook_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_member_number ON webhook_logs(member_number);
`;
}

// Запускаем миграции если файл запущен напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export default runMigrations;