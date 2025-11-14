# Competition Database Tables ✅

## Tables Added to Your PostgreSQL Database

I've created 3 new tables in your existing `kpi_dashboard` database:

### 1. `competitions`
Stores competition configurations:
- name, start_date, end_date, status
- Metric targets (sold_flips_target, uv_lights_target, reviews_target)
- Prize amounts ($500, $300, $150)

### 2. `competition_leaderboard`
Tracks technician performance:
- technician_name, competition_id
- Metrics: sold_flips, uv_lights, reviews
- total_points, rank, previous_rank
- streak_days, badges

### 3. `competition_sync_log`
Tracks data sync operations:
- When syncs happen
- What was synced (UV lights, sold flips, reviews)
- Success/error status

## Helper Functions Created

1. **calculate_competition_points(sold_flips, uv_lights, reviews)**
   - Returns: (flips × 10) + (lights × 5) + (reviews × 8)

2. **update_competition_ranks(competition_id)**
   - Automatically updates rankings based on points

3. **update_competition_updated_at()**
   - Trigger to track when records are modified

## How to Deploy

### Option 1: Deploy via Cloud Function (Recommended)

```bash
cd servicetitan-sync
./deploy_competition_migration.sh
```

Then visit:
```
https://us-central1-new-dashboard-2025.cloudfunctions.net/migrate-competition-tables
```

### Option 2: Run SQL Directly

Connect to your database and run:
```bash
psql -h /cloudsql/new-dashboard-2025:us-central1:kpi-dashboard \
     -U postgres -d kpi_dashboard \
     -f migrations/003_add_competition_tables.sql
```

### Option 3: Use Google Cloud Console

1. Go to Cloud SQL in Google Cloud Console
2. Connect to your database: `kpi-dashboard`
3. Run the SQL from `migrations/003_add_competition_tables.sql`

## Verify It Worked

After running the migration, you should see:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'competition%';
```

Expected output:
```
       table_name
------------------------
 competitions
 competition_leaderboard
 competition_sync_log
```

## Database Schema

```sql
-- Quick reference
competitions:
  - id (PRIMARY KEY)
  - name (UNIQUE)
  - start_date, end_date
  - status (draft/active/completed/archived)
  - sold_flips_target, uv_lights_target, reviews_target
  - first_prize, second_prize, third_prize
  - created_at, updated_at

competition_leaderboard:
  - id (PRIMARY KEY)
  - competition_id (FOREIGN KEY → competitions)
  - technician_name (UNIQUE per competition)
  - sold_flips, uv_lights, reviews
  - total_points, rank, previous_rank
  - streak_days, badges (JSONB)
  - last_synced_at, updated_at

competition_sync_log:
  - id (PRIMARY KEY)
  - competition_id (FOREIGN KEY)
  - sync_timestamp
  - techs_updated
  - uv_lights_synced, sold_flips_synced, reviews_synced
  - status, error_message
  - data_snapshot (JSONB)
```

## Integration with Existing System

Your existing database also has:
- `hvac_tech_performance` - Can link to technician_name
- `financial_performance` - Already tracking revenue
- Other performance tables

The competition system integrates nicely:
```sql
-- Example: Get tech's current performance + competition standing
SELECT
    h.technician_name,
    h.total_job_average_cents as current_avg_ticket,
    c.total_points as competition_points,
    c.rank as competition_rank
FROM hvac_tech_performance h
LEFT JOIN competition_leaderboard c ON c.technician_name = h.technician_name
WHERE c.competition_id = 1;  -- Your active competition
```

## Next Steps

1. **Run the migration** (choose one option above)
2. **Verify tables exist** (run the SELECT query)
3. **Create your first competition** (via admin panel or API)
4. **Configure ServiceTitan sync** (UV lights ready, waiting on sold flips)

## Files Created

```
migrations/
  └── 003_add_competition_tables.sql      ← The SQL migration

servicetitan-sync/
  ├── migrate_competition_tables.py       ← Python migration script
  ├── deploy_competition_migration.sh     ← Deployment script
  └── competition_sync.py                 ← UV light data fetcher
```

Ready to deploy! 🚀
