import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function diagnoseGmailWatch() {
  console.log('\n=== Gmail Watch Diagnostic Tool ===\n');

  // Check environment variables
  console.log('1. Checking Environment Variables...');
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'CALLBACK_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'GMAIL_PUBSUB_TOPIC'
  ];

  let missingVars = [];
  for (const varName of requiredEnvVars) {
    if (process.env[varName]) {
      console.log(`   ✓ ${varName}: ${varName === 'GMAIL_PUBSUB_TOPIC' ? process.env[varName] : 'Set'}`);
    } else {
      console.log(`   ✗ ${varName}: MISSING`);
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.log(`\n❌ Missing environment variables: ${missingVars.join(', ')}`);
    console.log('   Please add these to your .env file\n');
    return;
  }

  // Check Supabase connection
  console.log('\n2. Checking Supabase Connection...');
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    console.log('   ✓ Supabase connection successful');
  } catch (error) {
    console.log(`   ✗ Supabase connection failed: ${error.message}\n`);
    return;
  }

  // Check database schema
  console.log('\n3. Checking Database Schema...');
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('users')
      .select('access_token, refresh_token, token_expiry, gmail_watch_enabled, gmail_watch_expiration, gmail_history_id')
      .limit(1);

    if (error) {
      console.log(`   ✗ Required columns missing: ${error.message}`);
      console.log('\n   Please run this SQL in your Supabase SQL Editor:');
      console.log(`
ALTER TABLE users
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMP,
ADD COLUMN IF NOT EXISTS gmail_watch_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gmail_watch_expiration BIGINT,
ADD COLUMN IF NOT EXISTS gmail_history_id TEXT;
      `);
      return;
    }
    console.log('   ✓ All required database columns exist');
  } catch (error) {
    console.log(`   ✗ Schema check failed: ${error.message}\n`);
    return;
  }

  // Check if any users have OAuth tokens
  console.log('\n4. Checking User OAuth Tokens...');
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, access_token, refresh_token, gmail_watch_enabled');

    if (error) throw error;

    const usersWithTokens = users.filter(u => u.access_token && u.refresh_token);
    const usersWithoutTokens = users.filter(u => !u.access_token || !u.refresh_token);

    console.log(`   Total users: ${users.length}`);
    console.log(`   ✓ Users with OAuth tokens: ${usersWithTokens.length}`);
    if (usersWithoutTokens.length > 0) {
      console.log(`   ⚠ Users without OAuth tokens: ${usersWithoutTokens.length}`);
      console.log('     These users need to re-authenticate to grant Gmail permissions');
    }

    if (usersWithTokens.length > 0) {
      console.log('\n   Users with tokens:');
      for (const user of usersWithTokens) {
        console.log(`     - ${user.email} (Watch: ${user.gmail_watch_enabled ? 'Enabled' : 'Disabled'})`);
      }
    }

    if (usersWithoutTokens.length > 0) {
      console.log('\n   Users needing re-authentication:');
      for (const user of usersWithoutTokens) {
        console.log(`     - ${user.email}`);
      }
    }
  } catch (error) {
    console.log(`   ✗ User check failed: ${error.message}\n`);
    return;
  }

  // Check Pub/Sub topic format
  console.log('\n5. Checking Pub/Sub Topic Format...');
  const topicPattern = /^projects\/[^/]+\/topics\/[^/]+$/;
  if (topicPattern.test(process.env.GMAIL_PUBSUB_TOPIC)) {
    console.log(`   ✓ Topic format is correct: ${process.env.GMAIL_PUBSUB_TOPIC}`);
  } else {
    console.log(`   ✗ Topic format is incorrect: ${process.env.GMAIL_PUBSUB_TOPIC}`);
    console.log('     Expected format: projects/YOUR_PROJECT_ID/topics/TOPIC_NAME');
  }

  console.log('\n=== Diagnostic Complete ===\n');
  console.log('Next steps:');
  console.log('1. Ensure all environment variables are set correctly');
  console.log('2. Run the database migration SQL if columns are missing');
  console.log('3. Users must LOG OUT and LOG IN AGAIN to grant Gmail permissions');
  console.log('4. Check browser console for JavaScript errors when clicking "Enable Gmail Watch"');
  console.log('5. Check server logs for API errors\n');
}

diagnoseGmailWatch().catch(console.error);
