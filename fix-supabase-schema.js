import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const sql = `
-- Drop existing tables
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
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

-- Create sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
`;

// Extract project ref from URL
const projectRef = process.env.SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)[1];

const options = {
  hostname: `${projectRef}.supabase.co`,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);

    if (res.statusCode === 404) {
      console.log('\n❌ The exec_sql function is not available in your Supabase project.');
      console.log('\nYou need to manually run the SQL in the Supabase dashboard.');
      console.log('\n📋 Here\'s the SQL to copy and paste:');
      console.log('='.repeat(70));
      console.log(sql);
      console.log('='.repeat(70));
      console.log('\n📝 Instructions:');
      console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef);
      console.log('2. Click "SQL Editor" in the left sidebar');
      console.log('3. Click "New Query"');
      console.log('4. Paste the SQL above');
      console.log('5. Click "Run" (or press Ctrl+Enter)');
    } else if (res.statusCode === 200) {
      console.log('\n✅ Tables created successfully!');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
  console.log('\n❌ Unable to connect to Supabase API.');
  console.log('\nPlease run this SQL manually in the Supabase SQL Editor:');
  console.log('='.repeat(70));
  console.log(sql);
  console.log('='.repeat(70));
});

req.write(JSON.stringify({ query: sql }));
req.end();
