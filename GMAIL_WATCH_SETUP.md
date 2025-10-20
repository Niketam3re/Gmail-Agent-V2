# Gmail Watch Setup Guide

This guide will help you set up Gmail Watch functionality for your application. Gmail Watch allows your app to receive push notifications when emails arrive in users' inboxes.

## Prerequisites

- Google Cloud Project with OAuth 2.0 credentials configured
- Gmail API enabled in your Google Cloud project
- A publicly accessible webhook URL (for receiving notifications)

## Google Cloud Console Setup

### Step 1: Enable Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Library**
4. Search for "Gmail API"
5. Click on "Gmail API" and click **ENABLE**

### Step 2: Create a Pub/Sub Topic

Gmail Watch uses Google Cloud Pub/Sub to send push notifications. You need to create a topic for Gmail to publish to:

1. In Google Cloud Console, navigate to **Pub/Sub** > **Topics**
2. Click **CREATE TOPIC**
3. Enter a topic name (e.g., `gmail-notifications`)
4. **Important**: Topic name format should be: `projects/YOUR_PROJECT_ID/topics/gmail-notifications`
5. Click **CREATE**

### Step 3: Grant Gmail Permission to Publish

Gmail needs permission to publish messages to your Pub/Sub topic:

1. Go to your Pub/Sub topic
2. Click **PERMISSIONS** tab
3. Click **ADD PRINCIPAL**
4. Add the service account: `gmail-api-push@system.gserviceaccount.com`
5. Assign the role: **Pub/Sub Publisher**
6. Click **SAVE**

### Step 4: Create a Pub/Sub Subscription

Create a subscription to push notifications to your webhook:

1. Navigate to **Pub/Sub** > **Subscriptions**
2. Click **CREATE SUBSCRIPTION**
3. Enter a subscription name (e.g., `gmail-webhook-subscription`)
4. Select your topic from Step 2
5. For **Delivery type**, select **Push**
6. Enter your webhook URL: `https://your-domain.com/api/gmail/webhook`
   - Replace `your-domain.com` with your actual domain
   - If using Railway, it will be something like: `https://your-app-name.up.railway.app/api/gmail/webhook`
7. Leave other settings as default
8. Click **CREATE**

### Step 5: Update OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Scroll down to **Scopes**
3. Click **ADD OR REMOVE SCOPES**
4. Add these scopes:
   - `https://www.googleapis.com/auth/gmail.readonly` (View your email messages and settings)
   - `https://www.googleapis.com/auth/gmail.modify` (View and modify but not delete your email)
5. Click **UPDATE**
6. **Important**: If your app is in "Testing" status, add test users who can access the app

### Step 6: Update OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Find your OAuth 2.0 Client ID
3. Click the edit icon (pencil)
4. Under **Authorized redirect URIs**, make sure you have your callback URL:
   - For local development: `http://localhost:3000/auth/google/callback`
   - For production: `https://your-domain.com/auth/google/callback`
5. Click **SAVE**

## Environment Variables

Add the following environment variable to your `.env` file:

```env
# Gmail Pub/Sub Topic (format: projects/YOUR_PROJECT_ID/topics/TOPIC_NAME)
GMAIL_PUBSUB_TOPIC=projects/your-project-id/topics/gmail-notifications
```

Replace `your-project-id` with your actual Google Cloud Project ID and `gmail-notifications` with your topic name.

### Complete .env Example

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
CALLBACK_URL=https://your-domain.com/auth/google/callback

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Session
SESSION_SECRET=your-random-session-secret

# App Configuration
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-domain.com
ADMIN_EMAIL=your-email@gmail.com

# Gmail Watch
GMAIL_PUBSUB_TOPIC=projects/your-project-id/topics/gmail-notifications
```

## Database Setup

Run the database migration to add the required columns:

```bash
node add-oauth-tokens.js
```

If the script doesn't work, manually run this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMP,
ADD COLUMN IF NOT EXISTS gmail_watch_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gmail_watch_expiration BIGINT,
ADD COLUMN IF NOT EXISTS gmail_history_id TEXT;
```

## Testing

1. Start your application
2. Sign in with Google (make sure to re-authenticate to grant Gmail permissions)
3. Go to your dashboard
4. Click the "Enable Gmail Watch" button
5. Check your server logs - you should see notifications when new emails arrive

## How Gmail Watch Works

1. **User Enables Watch**: When a user clicks "Enable Gmail Watch", your app calls the Gmail API to start watching their mailbox
2. **Gmail Sends Notifications**: When emails arrive, Gmail publishes a notification to your Pub/Sub topic
3. **Pub/Sub Pushes to Your Webhook**: The Pub/Sub subscription pushes the notification to your `/api/gmail/webhook` endpoint
4. **Your App Processes**: Your app receives the notification and can fetch the new emails using the Gmail API

## Important Notes

- **Watch Expiration**: Gmail Watch expires after 7 days. You'll need to implement a renewal mechanism (see below)
- **Rate Limits**: Be mindful of Gmail API rate limits (250 quota units per user per second)
- **Security**: The webhook endpoint is public but validates the Pub/Sub message format
- **Token Refresh**: OAuth tokens are automatically refreshed when they expire

## Renewing Watch (Optional)

Gmail Watch expires after 7 days. You can set up a cron job to automatically renew watches:

```javascript
// Example: Run this daily
async function renewExpiredWatches() {
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('gmail_watch_enabled', true)
    .lt('gmail_watch_expiration', Date.now() + 24 * 60 * 60 * 1000); // Renew if expiring in < 24 hours

  for (const user of users) {
    // Call the enable endpoint for each user
    // This will renew their watch
  }
}
```

## Troubleshooting

### "Webhook returns 403"
- Check that the webhook URL is publicly accessible
- Verify the Pub/Sub subscription is configured correctly

### "No notifications received"
- Check your Pub/Sub subscription is active
- Verify Gmail has permission to publish to your topic
- Check server logs for any errors at `/api/gmail/webhook`

### "Access token invalid"
- Users need to re-authenticate to grant Gmail permissions
- Make sure OAuth scopes include Gmail API scopes
- Check that tokens are being stored in the database

## API Endpoints

Your app now has these Gmail Watch endpoints:

- `POST /api/gmail/watch/enable` - Enable Gmail Watch for authenticated user
- `POST /api/gmail/watch/disable` - Disable Gmail Watch for authenticated user
- `GET /api/gmail/watch/status` - Get current watch status
- `POST /api/gmail/webhook` - Webhook for receiving Gmail push notifications (called by Google)

## Next Steps

After setting up Gmail Watch, you can:

1. Customize the webhook handler in `src/server.js` (line 680+) to process emails as needed
2. Add email filtering logic based on labels, subjects, senders, etc.
3. Integrate with other services (send notifications, store emails, trigger workflows, etc.)
4. Implement automatic watch renewal before the 7-day expiration

## Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify all Google Cloud Console settings
3. Ensure your environment variables are correctly set
4. Test with the Gmail API Explorer to verify your credentials work
