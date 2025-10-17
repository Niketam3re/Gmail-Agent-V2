import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createClient } from '@supabase/supabase-js';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { generateAdminDashboard } from './admin-dashboard.html.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Railway proxy
app.set('trust proxy', 1);

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
  proxy: true, // Trust Railway proxy
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax' // Important for OAuth redirects
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

      let isNewUser = false;

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
        isNewUser = true;
      } else {
        // Update last login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id);
      }

      // Add isNewUser flag to user object
      user.isNewUser = isNewUser;

      return done(null, user);
    } catch (error) {
      console.error('OAuth error:', error);
      return done(error, null);
    }
  }
));

// Admin email - add your email here
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your-email@gmail.com';

// Middleware
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
};

const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.email === ADMIN_EMAIL) {
    return next();
  }
  res.status(403).send('Access denied. Admin only.');
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
  (req, res) => {
    // Redirect to dashboard with welcome flag if new user
    if (req.user.isNewUser) {
      return res.redirect('/dashboard?welcome=true');
    }
    res.redirect('/dashboard');
  }
);

app.get('/dashboard', isAuthenticated, (req, res) => {
  // Check if this is first visit (new registration)
  const isNewUser = req.query.welcome === 'true';
  const joinDate = new Date(req.user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dashboard - ${req.user.name}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 2rem;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          color: white;
        }
        .header h1 {
          font-size: 1.75rem;
          font-weight: 600;
        }
        .logout-btn {
          background: rgba(255,255,255,0.2);
          color: white;
          padding: 10px 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          cursor: pointer;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s;
        }
        .logout-btn:hover {
          background: rgba(255,255,255,0.3);
          border-color: rgba(255,255,255,0.5);
        }
        .success-banner {
          background: white;
          color: #10b981;
          padding: 1.5rem;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          animation: slideIn 0.5s ease-out;
          border-left: 4px solid #10b981;
        }
        .success-banner h2 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .card {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        }
        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.15);
        }
        .profile-card {
          grid-column: span 2;
        }
        .profile {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        .profile img {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 4px solid #667eea;
        }
        .profile-info h2 {
          font-size: 1.75rem;
          color: #333;
          margin-bottom: 0.5rem;
        }
        .profile-info .email {
          color: #666;
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        .badge {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .stat-card {
          text-align: center;
        }
        .stat-card .icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
        .stat-card h3 {
          color: #666;
          font-size: 0.9rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stat-card .value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #333;
        }
        .info-section {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .info-row:last-child { border-bottom: none; }
        .info-label {
          color: #666;
          font-weight: 500;
        }
        .info-value {
          color: #333;
          font-weight: 600;
        }
        @media (max-width: 768px) {
          .profile-card { grid-column: span 1; }
          .profile { flex-direction: column; text-align: center; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👋 Welcome back!</h1>
          <div style="display: flex; gap: 1rem;">
            ${req.user.email === ADMIN_EMAIL ? '<a href="/admin" class="logout-btn" style="background: rgba(255,255,255,0.3);">Admin Panel</a>' : ''}
            <a href="/logout" class="logout-btn">Logout</a>
          </div>
        </div>

        ${isNewUser ? `
        <div class="success-banner">
          <h2>✓ Registration Successful!</h2>
          <p>Your account has been created successfully. Welcome aboard!</p>
        </div>
        ` : ''}

        <div class="grid">
          <div class="card profile-card">
            <div class="profile">
              <img src="${req.user.picture}" alt="Profile">
              <div class="profile-info">
                <h2>${req.user.name}</h2>
                <p class="email">${req.user.email}</p>
                <span class="badge">${req.user.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Member Since</span>
                <span class="info-value">${joinDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Account ID</span>
                <span class="info-value">${req.user.id.substring(0, 8)}...</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status</span>
                <span class="info-value" style="color: #10b981;">Active</span>
              </div>
            </div>
          </div>

          <div class="card stat-card">
            <div class="icon">🔐</div>
            <h3>Authentication</h3>
            <div class="value">Google OAuth</div>
          </div>

          <div class="card stat-card">
            <div class="icon">✅</div>
            <h3>Account Status</h3>
            <div class="value">Verified</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Admin dashboard
app.get('/admin', isAdmin, async (req, res) => {
  try {
    // Fetch all users
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.is_active).length,
      newToday: users.filter(u => new Date(u.created_at) >= today).length,
      newThisWeek: users.filter(u => new Date(u.created_at) >= weekAgo).length
    };

    res.send(generateAdminDashboard(users, stats));
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).send('Error loading admin dashboard');
  }
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
