# HVAC Technician Competition System

## Overview
Competition tracking system for HVAC technicians with three key metrics:
- **Sold Flips**: Number of service calls converted to sales
- **UV Lights**: Count of UV lights sold (specifically P/N: MUV-7-50DR-12)
- **Google Reviews**: Number of Google Business reviews received

## Prizes
- 🥇 **1st Place**: $500
- 🥈 **2nd Place**: $300
- 🥉 **3rd Place**: $150

## Components

### Frontend (React)
1. **CompetitionAdmin.jsx** - Admin interface for managing competitions
   - Create/edit/delete competitions
   - Set targets and date ranges
   - View live statistics

2. **CompetitionLeaderboard.jsx** - Engaging leaderboard display
   - Podium-style top 3
   - Prize displays
   - Rank change indicators
   - Achievement badges
   - Streak tracking
   - Uses existing technician photos from photo API

### Backend (Python/Flask)
Located in `/competition-api/`

**Endpoints:**
- `GET /competitions` - List all competitions
- `POST /competitions` - Create competition
- `GET /competitions/<id>` - Get competition details
- `PUT /competitions/<id>` - Update competition
- `DELETE /competitions/<id>` - Delete competition
- `GET /competitions/<id>/leaderboard` - Get leaderboard
- `PUT /competitions/<id>/leaderboard/<tech_id>` - Update tech stats
- `POST /competitions/<id>/sync` - Sync data from ServiceTitan/Google

## Data Sources

### 1. Google Reviews ✅ (Ready)
Uses existing Google Business API integration from `/sosh` project:
- API route: `/google/reviews/route.ts`
- Manager: `google-business-api-manager.ts`
- Fetches reviews from all 9 locations
- Filters by date range

### 2. ServiceTitan (Pending)
Needs integration for:
- Sold Flips count
- UV Light sales (filter by P/N: MUV-7-50DR-12)

**Required from you:**
- ServiceTitan API credentials
- Report structure for:
  - Sold opportunities/jobs per technician
  - Material/product sales by SKU per technician

### 3. Technician Photos ✅ (Ready)
Uses existing photo API:
- Endpoint: `photo-api/photos`
- Automatically fetches photos by technician name

## Deployment

### Backend API
```bash
cd competition-api
./deploy.sh
```

This deploys to Google Cloud Functions at:
`https://us-central1-new-dashboard-2025.cloudfunctions.net/competition-api`

### Frontend
Already integrated into AdminDashboard under "Competitions" tab

## Integration with AdminDashboard

The Competition tab has been added to your existing admin panel:
```jsx
// In AdminDashboard.jsx
import CompetitionAdmin from './CompetitionAdmin';

const tabs = [
  { id: 'targets', label: 'Performance Targets', icon: Target },
  { id: 'competitions', label: 'Competitions', icon: Trophy }, // NEW!
  { id: 'photos', label: 'Tech Photos', icon: Camera },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'system', label: 'System Settings', icon: Database }
];
```

## Points System

Current calculation (configurable):
- Sold Flips: 10 points each
- UV Lights: 5 points each
- Google Reviews: 8 points each

## Next Steps

1. **Deploy the backend API:**
   ```bash
   cd competition-api
   ./deploy.sh
   ```

2. **Set up ServiceTitan integration:**
   - Provide API credentials
   - Share report structure for sold flips
   - Share report structure for material sales (UV lights)

3. **Configure environment variables:**
   ```bash
   cp competition-api/.env.example competition-api/.env
   # Fill in your credentials
   ```

4. **Test the system:**
   - Open the demo: `competition-demo.html`
   - Access admin panel: `/admin` → Competitions tab
   - Create a test competition

## Demo

Open `competition-demo.html` in your browser to see the leaderboard UI with prizes!

## Database Schema (Firestore)

### competitions
```javascript
{
  name: string,
  startDate: string (ISO),
  endDate: string (ISO),
  status: 'draft' | 'active' | 'completed' | 'archived',
  metrics: [
    { name: string, target: number, current: number }
  ],
  participants: array,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### competition_leaderboard
```javascript
{
  competitionId: string,
  technicianId: string,
  name: string,
  metrics: {
    soldFlips: number,
    uvLights: number,
    reviews: number
  },
  totalPoints: number,
  rank: number,
  previousRank: number,
  streak: number,
  badges: array,
  updatedAt: timestamp
}
```

## Questions?

Ready to deploy! Just need:
1. ServiceTitan API access details
2. Report structure for tracking metrics
