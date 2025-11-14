# Quick Migration Guide

## Option 1: Google Cloud Console (EASIEST) ⭐

1. Go to https://console.cloud.google.com/sql/instances
2. Click on your instance: **kpi-dashboard**
3. Click **OPEN CLOUD SHELL EDITOR** or **CONNECT**
4. Run this command:

```bash
psql -d kpi_dashboard
```

5. Copy and paste the contents of `competition_tables_simple.sql`
6. Press Enter
7. Done! ✅

## Option 2: Using psql Command Line

```bash
psql -h /cloudsql/new-dashboard-2025:us-central1:kpi-dashboard \
     -U postgres \
     -d kpi_dashboard \
     -f competition_tables_simple.sql
```

## Option 3: Google Cloud SQL Studio

1. Go to https://console.cloud.google.com/sql/instances
2. Click **kpi-dashboard**
3. Click **Cloud SQL Studio** tab
4. Click **Open SQL Editor**
5. Paste contents of `competition_tables_simple.sql`
6. Click **Run**

## Verify It Worked

Run this query:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'competition%';
```

You should see:
```
       table_name
------------------------
 competition_leaderboard
 competition_sync_log
 competitions
```

## Test the Helper Function

```sql
SELECT calculate_competition_points(10, 20, 15);
-- Should return: 320
-- (10 flips × 10) + (20 lights × 5) + (15 reviews × 8) = 100 + 100 + 120 = 320
```

## Create a Test Competition

```sql
INSERT INTO competitions (name, start_date, end_date, status, sold_flips_target, uv_lights_target, reviews_target)
VALUES ('November Hustle', '2025-11-01', '2025-11-30', 'active', 25, 50, 40);

SELECT * FROM competitions;
```

Done! The competition system database is ready! 🎉
