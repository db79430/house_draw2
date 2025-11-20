import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './index.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Read migration file
    const migrationPath = join(__dirname, 'migrations', '001_initial_tables.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Execute the entire migration as one block
    console.log('🚀 Executing migration...');
    await db.none(migrationSQL);
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Ignore "already exists" errors for tables and indexes
    if (error.code === '42P07' || error.message.includes('already exists')) {
      console.log('⚠️  Tables/indexes already exist, continuing...');
    } else {
      process.exit(1);
    }
  }
}

// ES6 equivalent of require.main === module
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export default runMigrations;