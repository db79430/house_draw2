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
    // Правильный путь к файлу миграции
    const migrationPath = path.join(__dirname, '..', 'migrations', 'migration.sql');
    
    let sqlContent;
    
    if (fs.existsSync(migrationPath)) {
      console.log(`📄 Reading migration file: ${migrationPath}`);
      sqlContent = fs.readFileSync(migrationPath, 'utf8');
    } else {
      console.log('📝 Using built-in migration SQL');
      sqlContent = getDefaultMigrationSQL();
    }
    
    console.log('🔄 Executing migration...');
    
    // 🔥 ИСПРАВЛЕНИЕ: Правильное разделение SQL команд
    // Разделяем по точке с запятой, но сохраняем конструкции с $$
    const sqlCommands = [];
    let currentCommand = '';
    let inDollarQuote = false;
    let dollarTag = '';
    
    for (let i = 0; i < sqlContent.length; i++) {
      const char = sqlContent[i];
      const nextChar = sqlContent[i + 1] || '';
      
      // Проверяем начало или конец блока $$
      if (char === '$' && nextChar === '$') {
        if (!inDollarQuote) {
          inDollarQuote = true;
          // Получаем тег после $$
          let tag = '';
          let j = i + 2;
          while (j < sqlContent.length && sqlContent[j] !== '$') {
            tag += sqlContent[j];
            j++;
          }
          dollarTag = tag;
        } else if (sqlContent.substring(i + 2, i + 2 + dollarTag.length) === dollarTag) {
          // Нашли закрывающий тег
          i += dollarTag.length + 1; // Пропускаем тег и $
          inDollarQuote = false;
          dollarTag = '';
        }
      }
      
      currentCommand += char;
      
      // Если не внутри блока $$ и нашли точку с запятой - завершаем команду
      if (!inDollarQuote && char === ';') {
        const trimmed = currentCommand.trim();
        if (trimmed.length > 0 && !trimmed.startsWith('--')) {
          sqlCommands.push(trimmed);
        }
        currentCommand = '';
      }
    }
    
    // Добавляем последнюю команду если есть
    if (currentCommand.trim().length > 0) {
      sqlCommands.push(currentCommand.trim());
    }
    
    console.log(`📋 Found ${sqlCommands.length} SQL commands to execute`);
    
    // Выполняем команды
    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      // Пропускаем комментарии
      if (command.startsWith('--') || command.length < 10) {
        console.log(`   [${i + 1}] Skipping comment/empty line`);
        skipCount++;
        continue;
      }
      
      try {
        console.log(`   [${i + 1}] Executing...`);
        
        // Выполняем команду
        await db.none(command);
        
        console.log(`   [${i + 1}] ✅ Success`);
        successCount++;
        
      } catch (error) {
        const errorMsg = error.message || '';
        
        // 🔥 ИГНОРИРУЕМ ОЖИДАЕМЫЕ ОШИБКИ
        if (errorMsg.includes('session') || 
            errorMsg.includes('relation "session"') ||
            errorMsg.includes('does not exist') ||
            errorMsg.includes('already exists') ||
            errorMsg.includes('duplicate')) {
          
          console.log(`   [${i + 1}] ℹ️ ${errorMsg.substring(0, 80)}...`);
          skipCount++;
          
        } else {
          console.error(`   [${i + 1}] ❌ Error: ${errorMsg}`);
          console.error(`       SQL: ${command.substring(0, 100)}...`);
          errorCount++;
          
          // В development останавливаемся на первой реальной ошибке
          if (process.env.NODE_ENV === 'development') {
            throw error;
          }
        }
      }
    }
    
    console.log(`\n📊 Migration summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📋 Total: ${sqlCommands.length}`);
    
    if (errorCount === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log(`⚠️ Migration completed with ${errorCount} error(s)`);
    }
    
    // Проверяем результат миграции
    await verifyMigration();
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ Continuing in production mode');
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
    console.log('\n🔍 Verifying migration results...');
    
    const requiredTables = ['users', 'payments', 'slots', 'webhook_logs'];
    const results = [];
    
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
        
        const existsFlag = exists && exists.exists;
        results.push({ table, exists: existsFlag });
        
        if (existsFlag) {
          try {
            const count = await db.one(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`   📊 ${table}: ✅ exists (${count.count} records)`);
          } catch (countError) {
            console.log(`   📊 ${table}: ✅ exists (could not count)`);
          }
        } else {
          console.log(`   📊 ${table}: ❌ missing`);
        }
        
      } catch (error) {
        console.log(`   📊 ${table}: ⚠️ error checking`);
        results.push({ table, exists: false });
      }
    }
    
    const existingTables = results.filter(r => r.exists).length;
    console.log(`\n📋 Result: ${existingTables}/${requiredTables.length} tables created`);
    
    if (existingTables === requiredTables.length) {
      console.log('🎉 All tables created successfully!');
    } else {
      const missing = results.filter(r => !r.exists).map(r => r.table);
      console.warn(`⚠️ Missing tables: ${missing.join(', ')}`);
    }
    
  } catch (error) {
    console.log('⚠️ Could not verify migration:', error.message);
  }
}

/**
 * Возвращает SQL миграции по умолчанию (исправленный)
 */
function getDefaultMigrationSQL() {
  return `-- Default migration SQL
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
CREATE INDEX IF NOT EXISTS idx_users_payment_status ON users(payment_status);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

CREATE INDEX IF NOT EXISTS idx_slots_user_id ON slots(user_id);
CREATE INDEX IF NOT EXISTS idx_slots_slot_number ON slots(slot_number);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON webhook_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_member_number ON webhook_logs(member_number);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
BEFORE UPDATE ON payments
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slots_updated_at 
BEFORE UPDATE ON slots
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_logs_updated_at 
BEFORE UPDATE ON webhook_logs
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();`;
}

// Запускаем миграции если файл запущен напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export default runMigrations;