# Competition System Navigation

## ✅ How to Access the Competition Features

### For Viewing the Leaderboard (All Users)

1. Go to your dashboard homepage
2. Click the **"Competition"** tab in the main navigation
3. You'll see the live leaderboard with:
   - Top 3 podium with prizes ($500, $300, $150)
   - All participant rankings
   - Individual metrics (Sold Flips, UV Lights, Reviews)
   - Rank changes (↑↓ indicators)
   - Achievement badges and streaks

### For Managing Competitions (Admin Only)

1. Go to your dashboard homepage
2. Click the **"Admin"** tab in the main navigation
3. Click the **"Competitions"** sub-tab (Trophy icon)
4. Here you can:
   - Create new competitions
   - Set targets for each metric
   - Configure start/end dates
   - Edit existing competitions
   - Delete competitions
   - View quick stats

## Navigation Structure

```
Dashboard Home
├── Financial
├── Comfort Advisor
├── HVAC Tech
├── HVAC Maint
├── Plumbing
├── Electrical
├── Call Center
├── Memberships
├── Revenue TTM
├── Top Performers
├── Competition ⭐ NEW! (Public Leaderboard)
└── Admin (Admin only)
    ├── Performance Targets
    ├── Competitions ⭐ NEW! (Management)
    ├── Tech Photos
    ├── User Management
    └── System Settings
```

## URLs (when routes are set up)

- **Leaderboard**: `/competition` or `/leaderboard`
- **Admin Panel**: `/admin` → Competitions tab

## What Each View Shows

### Competition Leaderboard (Main Tab)
- **Purpose**: Display live competition standings
- **Audience**: All technicians, managers, display screens
- **Features**:
  - Real-time rankings
  - Prize amounts displayed
  - Individual performance metrics
  - Rank change indicators
  - Achievement badges
  - Streak tracking
  - Days remaining countdown

### Competition Admin (Admin Tab)
- **Purpose**: Manage competitions
- **Audience**: Admin users only
- **Features**:
  - Create/edit/delete competitions
  - Set metric targets
  - Configure dates and status
  - View participation stats
  - Trigger data sync
  - Monitor competition progress

## Display Modes

The leaderboard can be shown in different contexts:

1. **Desktop View**: Full dashboard with navigation
2. **TV Display Mode**: Full-screen leaderboard for lobby/break room
3. **Mobile View**: Responsive design for phones/tablets

## Quick Setup Checklist

- [x] Competition tab added to main navigation
- [x] Competition admin panel in Admin section
- [x] Leaderboard component created
- [x] Admin management interface ready
- [ ] Database migration run (see RUN_MIGRATION.md)
- [ ] ServiceTitan sync configured
- [ ] First competition created

Once the database is set up, you're ready to create your first competition!
