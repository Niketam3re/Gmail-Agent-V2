import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createClient } from '@supabase/supabase-js';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL || '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const googleId = profile.id;
      const email = profile.emails[0].value;
      const name = profile.displayName;
      const picture = profile.photos[0]?.value;

      // Check if user exists
      let { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('google_id', googleId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!user) {
        // Create new user
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([
            { google_id: googleId, email, name, picture }
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        user = newUser;
      } else {
        // Update last login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id);
      }

      return done(null, user);
    } catch (error) {
      console.error('OAuth error:', error);
      return done(error, null);
    }
  }
));

// Middleware
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
};

// Routes
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sign In</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          background: white;
          padding: 3rem;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center;
          max-width: 400px;
          width: 90%;
        }
        h1 { color: #333; margin-bottom: 0.5rem; font-size: 2rem; }
        p { color: #666; margin-bottom: 2rem; }
        .google-btn {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: white;
          color: #333;
          padding: 14px 28px;
          border: 2px solid #ddd;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s;
          cursor: pointer;
        }
        .google-btn:hover {
          border-color: #4285f4;
          box-shadow: 0 6px 20px rgba(66,133,244,0.3);
          transform: translateY(-2px);
        }
        .google-icon { width: 20px; height: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Welcome!</h1>
        <p>Sign in with your Google account to continue</p>
        <a href="/auth/google" class="google-btn">
          <svg class="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </a>
      </div>
    </body>
    </html>
  `);
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect('/dashboard')
);

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dashboard</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
          background: #f5f7fa;
        }
        .card {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 1.5rem;
        }
        .profile {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .profile img {
          width: 80px;
          height: 80px;
          border-radius: 50%;
        }
        h1 { margin: 0 0 0.25rem 0; color: #333; }
        .email { color: #666; font-size: 0.9rem; }
        .logout-btn {
          background: #dc3545;
          color: white;
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          font-weight: 600;
        }
        .logout-btn:hover { background: #c82333; }
        pre {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 6px;
          overflow-x: auto;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="profile">
          <img src="${req.user.picture}" alt="Profile">
          <div>
            <h1>${req.user.name}</h1>
            <p class="email">${req.user.email}</p>
          </div>
        </div>
        <a href="/logout" class="logout-btn">Logout</a>
      </div>
      <div class="card">
        <h2>Account Information</h2>
        <pre>${JSON.stringify(req.user, null, 2)}</pre>
      </div>
    </body>
    </html>
  `);
});

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).send('Error logging out');
    res.redirect('/');
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});
