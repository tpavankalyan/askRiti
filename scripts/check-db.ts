import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

async function checkDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    process.exit(1);
  }

  console.log('🔍 Checking database connection...\n');
  console.log('DATABASE_URL:', databaseUrl.replace(/:[^:@]+@/, ':****@')); // Hide password
  
  // Check URL format
  if (databaseUrl.includes('neon.tech')) {
    console.error('\n⚠️  WARNING: DATABASE_URL appears to be pointing to Neon, not Supabase!');
    console.error('   Please update your DATABASE_URL to use Supabase.');
    console.error('   Get your Supabase connection string from:');
    console.error('   https://supabase.com/dashboard/project/_/settings/database\n');
  } else if (databaseUrl.includes('supabase')) {
    console.log('✅ DATABASE_URL appears to be a Supabase connection string');
  } else {
    console.log('⚠️  DATABASE_URL format is unclear - make sure it\'s a valid Postgres connection string');
  }

  console.log('\n🔌 Attempting to connect...\n');

  const sql = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 10,
    ssl: databaseUrl.includes('supabase') ? 'require' : undefined,
  });

  try {
    const result = await sql`SELECT version(), current_database(), current_user`;
    console.log('✅ Connection successful!\n');
    console.log('Database Info:');
    console.log('  Version:', result[0].version.split(',')[0]);
    console.log('  Database:', result[0].current_database);
    console.log('  User:', result[0].current_user);
    
    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('\n📊 Tables in database:');
    if (tables.length === 0) {
      console.log('  ⚠️  No tables found. You may need to run migrations.');
      console.log('  Run: pnpm db:push or execute supabase-migration.sql in Supabase SQL Editor');
    } else {
      tables.forEach((table: any) => {
        console.log(`  - ${table.table_name}`);
      });
    }
    
    await sql.end();
    console.log('\n✨ Database check completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Connection failed!\n');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 Troubleshooting:');
      console.error('  1. Check if your DATABASE_URL is correct');
      console.error('  2. Verify your network connection');
      console.error('  3. Check if Supabase project is active');
      console.error('  4. Ensure your IP is allowed (if IP restrictions are enabled)');
    } else if (error.code === '28P01') {
      console.error('\n💡 Authentication failed - check your username and password');
    } else if (error.code === '3D000') {
      console.error('\n💡 Database does not exist - check your database name');
    }
    
    await sql.end();
    process.exit(1);
  }
}

checkDatabase();

