import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function setupTables() {
  console.log('Setting up Supabase tables...\n');

  // First, let's check what tables exist
  const { data: tables, error: tableError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');

  console.log('Existing tables:', tables);

  // Drop existing users table if it exists
  console.log('\nDropping existing tables (if any)...');

  try {
    // We'll use Supabase's REST API to execute raw SQL via a custom function
    // But since we can't execute raw DDL directly, we'll use the admin API

    // Alternative: Use Supabase's management API
    const adminApiUrl = `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`;

    const response = await fetch(adminApiUrl, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: `
          DROP TABLE IF EXISTS sessions CASCADE;
          DROP TABLE IF EXISTS users CASCADE;

          CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            google_id TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            picture TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            last_login TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
          );

          CREATE TABLE sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            token TEXT UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          );

          CREATE INDEX idx_users_google_id ON users(google_id);
          CREATE INDEX idx_users_email ON users(email);
          CREATE INDEX idx_sessions_user_id ON sessions(user_id);
        `
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('✓ Tables created successfully!');

  } catch (error) {
    console.error('Error with admin API:', error.message);
    console.log('\nTrying alternative method using direct table operations...');

    // Alternative approach: Try to create the table by inserting and catching errors
    // This won't work for DDL, but let's verify the connection

    const { data: userData, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (verifyError) {
      console.error('Table verification error:', verifyError);
      console.log('\n❌ Unable to automatically create tables.');
      console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
      console.log('='.repeat(60));
      console.log(`
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
      `);
      console.log('='.repeat(60));
    } else {
      console.log('✓ Users table already exists and is accessible!');
    }
  }
}

setupTables().catch(console.error);
