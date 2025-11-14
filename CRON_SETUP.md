# Vercel Cron Job Setup

## What It Does

The cron job runs **every hour** and:

1. ✅ Finds all active competitions
2. ✅ Fetches UV Light sales from ServiceTitan (Report 394027220)
3. ⏳ Fetches Sold Flips from ServiceTitan (when configured)
4. ⏳ Fetches Google Reviews (needs implementation)
5. ✅ Combines all metrics by technician
6. ✅ Updates leaderboard in database
7. ✅ Recalculates rankings
8. ✅ Logs sync results

## Files Created

```
vercel.json                                    ← Cron job config
src/app/api/cron/sync-competition/route.ts    ← API endpoint
.env.example                                   ← Environment variables template
```

## Setup Steps

### 1. Add Environment Variables to Vercel

Go to your Vercel project settings and add:

```bash
# Database (you probably have these)
INSTANCE_CONNECTION_NAME=new-dashboard-2025:us-central1:kpi-dashboard
DB_USER=postgres
DB_PASSWORD=LexHVAC2025
DB_NAME=kpi_dashboard

# NEW: Cron job security
CRON_SECRET=<generate a random string>

# ServiceTitan (you have these in Vercel already)
SERVICETITAN_TENANT_ID=your_tenant_id
SERVICETITAN_CLIENT_ID=your_client_id
SERVICETITAN_CLIENT_SECRET=your_client_secret

# NEW: Point to your ServiceTitan sync function
SERVICETITAN_SYNC_URL=https://us-central1-new-dashboard-2025.cloudfunctions.net/servicetitan-sync
```

**Generate CRON_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Deploy to Vercel

```bash
git add .
git commit -m "Add competition cron job"
git push
```

Vercel will automatically:
- Detect `vercel.json`
- Set up the cron job
- Run it every hour at :00

### 3. Verify It's Running

**Check Vercel Dashboard:**
1. Go to your project in Vercel
2. Click "Cron Jobs" tab
3. You should see: `/api/cron/sync-competition` scheduled for `0 * * * *`

**Manual Test:**
```bash
curl -X GET "https://your-app.vercel.app/api/cron/sync-competition" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "message": "Competition sync completed",
  "results": [
    {
      "competition": "November Hustle",
      "techniciansUpdated": 12,
      "success": true
    }
  ],
  "timestamp": "2025-11-13T23:00:00.000Z"
}
```

## Cron Schedule

`"0 * * * *"` = Every hour at minute 0

**Want different timing?**
- Every 30 min: `"*/30 * * * *"`
- Every 2 hours: `"0 */2 * * *"`
- Once per day (midnight): `"0 0 * * *"`

Edit `vercel.json` to change.

## Monitoring

### View Sync Logs in Database

```sql
SELECT
  c.name as competition,
  cs.sync_timestamp,
  cs.techs_updated,
  cs.status,
  cs.error_message
FROM competition_sync_log cs
JOIN competitions c ON c.id = cs.competition_id
ORDER BY cs.sync_timestamp DESC
LIMIT 20;
```

### Check Vercel Logs

1. Go to Vercel Dashboard
2. Click your project
3. Click "Logs" tab
4. Filter by `/api/cron/sync-competition`

## What's Working Now

✅ **Cron job configured** - Runs every hour
✅ **Database schema** - Tables created
✅ **UV Lights integration** - Code ready (needs ServiceTitan creds)
✅ **Leaderboard updates** - Automatic ranking
✅ **Sync logging** - Track all syncs

## What Needs Setup

⏳ **ServiceTitan UV Lights API** - Add credentials to Vercel env
⏳ **Sold Flips Report** - Provide report ID
⏳ **Google Reviews** - Link to /sosh API or implement attribution

## Testing Locally

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Test the endpoint
curl http://localhost:3000/api/cron/sync-competition \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Next Steps

1. **Add CRON_SECRET to Vercel** environment variables
2. **Deploy to Vercel** (`git push`)
3. **Create your first competition** in the admin panel
4. **Wait for the next hour** or trigger manually
5. **Check the leaderboard** - it should update automatically!

The system is ready to go live! 🚀
