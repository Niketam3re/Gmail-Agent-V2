import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function addOAuthTokenColumns() {
  console.log('Adding OAuth token columns to users table...');

  try {
    // Add columns for storing OAuth tokens and Gmail watch info
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS access_token TEXT,
        ADD COLUMN IF NOT EXISTS refresh_token TEXT,
        ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMP,
        ADD COLUMN IF NOT EXISTS gmail_watch_enabled BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS gmail_watch_expiration BIGINT,
        ADD COLUMN IF NOT EXISTS gmail_history_id TEXT;
      `
    });

    if (error) {
      // If rpc doesn't work, try direct SQL
      console.log('Trying alternative method...');

      // We'll need to update the schema through Supabase dashboard or SQL editor
      console.log('\n⚠️  Please run the following SQL in your Supabase SQL Editor:\n');
      console.log(`
ALTER TABLE users
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMP,
ADD COLUMN IF NOT EXISTS gmail_watch_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gmail_watch_expiration BIGINT,
ADD COLUMN IF NOT EXISTS gmail_history_id TEXT;
      `);
      console.log('\nAfter running this, the application will be ready to use Gmail Watch.\n');
      return;
    }

    console.log('✓ OAuth token columns added successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n⚠️  Please run the following SQL in your Supabase SQL Editor:\n');
    console.log(`
ALTER TABLE users
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMP,
ADD COLUMN IF NOT EXISTS gmail_watch_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gmail_watch_expiration BIGINT,
ADD COLUMN IF NOT EXISTS gmail_history_id TEXT;
    `);
    console.log('\nAfter running this, the application will be ready to use Gmail Watch.\n');
  }
}

addOAuthTokenColumns();
