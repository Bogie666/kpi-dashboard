# Vercel Database Configuration for Reviews Caching

The Google Reviews caching feature requires a DATABASE_URL to be configured in Vercel.

## Option 1: Use Vercel Postgres (Easiest)

1. Go to your Vercel project dashboard
2. Click **Storage** tab
3. Click **Create Database** → **Postgres**
4. Follow the prompts to create a database
5. Vercel will automatically add `DATABASE_URL` to your environment variables
6. Run the migration SQL from `migrations/add_google_reviews_cache.sql`

## Option 2: Use Cloud SQL with Public IP (Current Setup)

### Step 1: Enable Public IP on Cloud SQL

```bash
gcloud sql instances patch kpi-dashboard \
  --assign-ip \
  --authorized-networks=0.0.0.0/0 \
  --project=new-dashboard-2025
```

⚠️ **Security Note:** This allows connections from anywhere. For production, restrict to Vercel's IP ranges.

### Step 2: Get Connection String

Your connection string format:
```
postgresql://postgres:LexHVAC2025@PUBLIC_IP:5432/kpi_dashboard
```

To get the public IP:
```bash
gcloud sql instances describe kpi-dashboard \
  --project=new-dashboard-2025 \
  --format="value(ipAddresses[0].ipAddress)"
```

### Step 3: Add to Vercel

1. Go to: https://vercel.com/your-team/kpi-dashboard/settings/environment-variables
2. Add new variable:
   - **Name:** `DATABASE_URL`
   - **Value:** `postgresql://postgres:LexHVAC2025@YOUR_PUBLIC_IP:5432/kpi_dashboard`
   - **Environment:** Production, Preview, Development

3. Redeploy your app

## Option 3: Use Connection Pooler (Recommended for Production)

Use a service like:
- **Supabase Pooler** (free tier available)
- **PgBouncer on Cloud Run**
- **Neon** (serverless Postgres)

## Verify It Works

After configuring DATABASE_URL:

1. Redeploy your Vercel app
2. Go to Admin Dashboard → System Settings
3. Click "Refresh Reviews Cache"
4. Reviews page should load instantly

## Current Fallback Behavior

**Without DATABASE_URL configured:**
- Reviews page falls back to direct Google API calls (slow, 15-30s)
- Admin Dashboard "Google Reviews Cache" section won't show
- Everything else works normally

**With DATABASE_URL configured:**
- Reviews cached in database (fast, <1s load time)
- Auto-sync every 2 hours via cron
- Manual refresh available in admin

## Troubleshooting

### Error: "connect ECONNREFUSED"
- DATABASE_URL is not set or incorrect
- Check environment variables in Vercel dashboard

### Error: "password authentication failed"
- Password in connection string is wrong
- Update connection string with correct password

### Error: "SSL required"
- Add `?sslmode=require` to the end of your connection string:
  ```
  postgresql://user:pass@host:5432/db?sslmode=require
  ```
