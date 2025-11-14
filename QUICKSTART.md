# Quick Start Guide - Competition System

## See the UI Right Now! 🎉

Open the demo in your browser:
```bash
open competition-demo.html
# or just double-click the file
```

This shows the **leaderboard with prizes** - exactly what your techs will see!

## Deploy to Production

### 1. Deploy the Backend API (5 minutes)

```bash
cd competition-api

# Install gcloud CLI if you haven't already:
# https://cloud.google.com/sdk/docs/install

# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project new-dashboard-2025

# Deploy!
./deploy.sh
```

The API will be live at:
`https://us-central1-new-dashboard-2025.cloudfunctions.net/competition-api`

### 2. Access in Your Dashboard

Your admin panel already has the Competition tab integrated!

1. Go to your dashboard admin section
2. Click the **"Competitions"** tab (Trophy icon)
3. Click **"New Competition"**
4. Fill in:
   - Name: "November Hustle"
   - Start Date: 2025-11-01
   - End Date: 2025-11-30
   - Targets:
     - Sold Flips: 25
     - UV Lights: 50
     - Google Reviews: 40
5. Click **"Create Competition"**

Done! 🎉

## What's Already Working

✅ **Competition Management** - Create, edit, delete competitions
✅ **Prize Display** - $500, $300, $150 shown on leaderboard
✅ **Technician Photos** - Uses your existing photo API
✅ **Google Reviews** - Integration ready from `/sosh` project
✅ **Beautiful UI** - Gamified with badges, streaks, and animations

## What Needs Your Input

### ServiceTitan Integration

We need two pieces of data from ServiceTitan:

1. **Sold Flips** (conversions per technician)
2. **UV Light Sales** (specific SKU: MUV-7-50DR-12 per technician)

**What I need from you:**
- ServiceTitan API credentials
- Which reports/endpoints to use
- Sample data structure

Once you provide this, I'll integrate it within 30 minutes!

## File Structure

```
kpi-dashboard/
├── src/
│   ├── components/
│   │   ├── CompetitionAdmin.jsx      ← Admin interface
│   │   └── CompetitionLeaderboard.jsx ← Leaderboard display
│   └── utils/
│       └── competitionApi.js          ← API helper functions
│
├── competition-api/
│   ├── main.py                        ← Flask API
│   ├── requirements.txt
│   ├── deploy.sh                      ← Deployment script
│   └── .env.example
│
├── competition-demo.html              ← Preview (open in browser!)
├── COMPETITION_README.md              ← Full documentation
└── QUICKSTART.md                      ← This file
```

## Testing Without ServiceTitan

You can test everything right now with sample data:

1. Open the demo HTML to see the leaderboard
2. Access the admin panel to create competitions
3. The system will use sample data until ServiceTitan is connected

## Environment Variables

Create `competition-api/.env`:

```bash
# Google Cloud
GOOGLE_CLOUD_PROJECT=new-dashboard-2025

# ServiceTitan (add when ready)
SERVICETITAN_CLIENT_ID=your_id
SERVICETITAN_CLIENT_SECRET=your_secret
SERVICETITAN_TENANT_ID=your_tenant

# Google Business (from /sosh)
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
```

## Points Calculation

Current scoring:
- **Sold Flip**: 10 points
- **UV Light**: 5 points
- **Google Review**: 8 points

*These are configurable in the API*

## Next Steps

1. ✅ **Check out the demo** - `open competition-demo.html`
2. ✅ **Deploy the API** - Run `./deploy.sh`
3. ⏳ **Provide ServiceTitan details** - So I can integrate the data
4. ✅ **Create your first competition** - In the admin panel

## Need Help?

Questions? Let me know:
- ServiceTitan API structure?
- Different points calculation?
- Additional features?
- Customization needs?

The foundation is solid and ready to go! 🚀
