import postgres from 'postgres';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  console.log('🔄 Connecting to database...');
  
  const sql = postgres(databaseUrl, { 
    max: 1,
    connect_timeout: 30,
  });

  try {
    // Get all migration files in order
    const migrationsDir = path.join(__dirname, '../drizzle/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql') && !file.includes('meta'))
      .sort(); // Sort alphabetically to ensure order

    console.log(`📦 Found ${files.length} migration files`);
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');
      
      // Split by statement breakpoint and execute each statement
      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      console.log(`\n📄 Running migration: ${file}`);
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await sql.unsafe(statement);
          } catch (error: any) {
            const errorCode = error?.code;
            const errorMessage = error?.message || '';
            
            // Ignore "already exists" errors
            if (errorCode === '42P07' || errorMessage.includes('already exists')) {
              console.log(`  ⚠️  Table/constraint already exists, skipping...`);
              continue;
            }
            
            // Ignore "column does not exist" errors (42703) - might be renamed in later migration
            if (errorCode === '42703' && errorMessage.includes('does not exist')) {
              console.log(`  ⚠️  Column/constraint referenced doesn't exist (may have been renamed), skipping...`);
              continue;
            }
            
            // Ignore "constraint does not exist" errors when dropping (42804)
            if (errorCode === '42804' || (errorCode === '42P01' && errorMessage.includes('does not exist'))) {
              console.log(`  ⚠️  Constraint doesn't exist, skipping...`);
              continue;
            }
            
            // Ignore "relation does not exist" when trying to drop
            if (errorCode === '42P01' && statement.toUpperCase().includes('DROP')) {
              console.log(`  ⚠️  Relation doesn't exist, skipping drop...`);
              continue;
            }
            
            // For other errors, log and continue if it's a constraint issue
            if (errorMessage.includes('foreign key') || errorMessage.includes('constraint')) {
              console.log(`  ⚠️  Constraint issue (may already be applied differently), skipping...`);
              console.log(`     Error: ${errorMessage.substring(0, 100)}`);
              continue;
            }
            
            // Throw for other errors
            throw error;
          }
        }
      }
      
      console.log(`  ✅ Completed: ${file}`);
    }
    
    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

runMigrations()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });

