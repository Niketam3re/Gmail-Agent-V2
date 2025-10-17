# Railway Deployment Guide

## Quick Deployment Steps

### 1. Connect to Railway

1. Go to: https://railway.app/
2. Click "Login" and sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Connect your GitHub account and select this repository

### 2. Configure Environment Variables

Once the project is created, add these environment variables in Railway:

```
NODE_ENV=production
PORT=3000

GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
CALLBACK_URL=https://YOUR_RAILWAY_DOMAIN/auth/google/callback

SUPABASE_URL=https://hdpbksygdpnvsuoqyfzn.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcGJrc3lnZHBudnN1b3F5ZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTQ1ODgsImV4cCI6MjA3NjE3MDU4OH0.cPyQlYKj0Rze_9rd7GIIvvEGRNQkuHrKY9IrbanzrO8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcGJrc3lnZHBudnN1b3F5ZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU5NDU4OCwiZXhwIjoyMDc2MTcwNTg4fQ.8RRIog6HEyTdrAROBZYeAKWz9TogadscYwbS2OoegKs

SESSION_SECRET=3847ea860ae93b2a320d3c40c8bc5e9a2d28eeba8d32e1873a29375382679738

ALLOWED_ORIGINS=https://YOUR_RAILWAY_DOMAIN
```

**Important:** After deployment, you'll get a Railway domain (e.g., `my-app-production.up.railway.app`). You need to:
1. Replace `YOUR_RAILWAY_DOMAIN` in CALLBACK_URL with your actual Railway domain
2. Replace `YOUR_RAILWAY_DOMAIN` in ALLOWED_ORIGINS with your actual Railway domain

### 3. Deploy

Railway will automatically:
- Detect Node.js project
- Install dependencies
- Start the server using `node src/server.js`

### 4. Update Google OAuth Settings

Once deployed, update your Google OAuth redirect URIs:

1. Go to: https://console.cloud.google.com/apis/credentials/oauthclient/205922037487-a5t381peq88nljql09cjvvhf6glv5h8s.apps.googleusercontent.com
2. Under "Authorized redirect URIs", add:
   ```
   https://YOUR_RAILWAY_DOMAIN/auth/google/callback
   ```
3. Click "Save"

### 5. Test Your Deployment

Visit your Railway domain and test the Google login!

## Alternative: Manual CLI Deployment

If you prefer using the Railway CLI:

```bash
# Login to Railway (opens browser)
railway login

# Link to project
railway link

# Deploy
railway up
```

## Troubleshooting

### Issue: OAuth Error 400
- Make sure the Railway domain is added to Google OAuth redirect URIs
- Wait 30 seconds after updating Google settings

### Issue: Internal Server Error
- Check Railway logs: `railway logs`
- Verify all environment variables are set correctly

### Issue: Health Check Failing
- Railway uses `/health` endpoint
- Check if server is starting on PORT environment variable

## Files Configured for Railway

✅ `railway.json` - Railway configuration
✅ `package.json` - Dependencies and start script
✅ `.gitignore` - Excludes .env files
✅ `src/server.js` - Main application

## Security Notes

⚠️ Never commit `.env` files to git
⚠️ Use Railway's environment variables for secrets
⚠️ Enable secure cookies in production (already configured)
