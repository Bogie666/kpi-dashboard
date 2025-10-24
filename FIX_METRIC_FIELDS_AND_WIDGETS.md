# Fix Metric Fields & Widget Display Issues

## Problem 1: Metric Field Has No Options

**Root Cause**: The `widget_data_sources` table is missing the `available_fields` column.

### Solution

1. **Run the migration to add available_fields column**:

```bash
# Start Cloud SQL Proxy (if not running)
./cloud_sql_proxy -instances=new-dashboard-2025:us-central1:kpi-dashboard=tcp:5432

# In a new terminal, run the migration
cd /home/ryan/kpi-dashboard
psql "host=127.0.0.1 dbname=kpi_data user=postgres password=LexHVAC2025" \
  -f migrations/002_add_available_fields.sql
```

2. **Redeploy the admin-api** (now includes available_fields in query):

```bash
cd /home/ryan/kpi-dashboard/admin-api

gcloud functions deploy admin-api \
  --gen2 \
  --runtime=python311 \
  --region=us-central1 \
  --source=. \
  --entry-point=admin_api \
  --trigger-http \
  --allow-unauthenticated \
  --memory=512MB \
  --timeout=540s \
  --set-env-vars="DB_PASSWORD=LexHVAC2025,INSTANCE_CONNECTION_NAME=new-dashboard-2025:us-central1:kpi-dashboard"
```

3. **Test the fix**:

```bash
curl "https://us-central1-new-dashboard-2025.cloudfunctions.net/admin-api/widgets/datasources" | jq '.'
```

You should now see `available_fields` array in each data source with field definitions.

---

## Problem 2: Sample Widgets Don't Match Real Dashboards

**Root Cause**: The migration creates generic sample widgets that don't match your actual dashboard structure.

### Understanding Widget vs Real Dashboard

The widget system is a **NEW feature** that sits **alongside** your existing dashboard code. They are two separate things:

1. **Existing Dashboard Code** - Your current dashboard views are hardcoded in React components
2. **New Widget System** - A flexible system to manage widgets dynamically from the database

### Options to Align Them

#### Option A: Delete Sample Widgets (Recommended for now)

Keep your existing dashboard code and remove the sample widgets:

```bash
psql "host=127.0.0.1 dbname=kpi_data user=postgres password=LexHVAC2025" << 'EOF'
-- Delete all sample widget instances
DELETE FROM widget_instances;

-- Verify they're gone
SELECT count(*) FROM widget_instances;
EOF
```

Now you can manually add widgets through the admin UI that match your real dashboards.

#### Option B: Replace Existing Dashboards with Widget System (Long-term)

This is a bigger project where you:
1. Identify all existing widgets/cards in your current dashboard code
2. Delete the sample widgets
3. Create widget instances via the admin UI that match your actual data
4. Update your dashboard components to use the widget system instead of hardcoded components

### To Add Real Widgets That Match Your Dashboards

1. **Go to Admin Dashboard → Widget Layout tab**
2. **Select a dashboard view** (e.g., "Comfort Advisor")
3. **Click "Edit Mode"**
4. **Click "Add Widget"**
5. **Choose widget type** (KPI Card, Bar Chart, etc.)
6. **Configure it**:
   - Title: What shows in your real dashboard
   - Data Source: Select from dropdown
   - Metric Field: Now you'll see options!
   - Aggregation: Sum, Average, etc.
   - Format: Currency, Percentage, Number

7. **Save and repeat** for each widget you want

---

## What Your Current Tables Look Like

### Dashboard Views (10 views created)
- Financial
- Comfort Advisor
- HVAC Tech
- HVAC Maintenance
- Plumbing
- Electrical
- Call Center
- Memberships
- Revenue TTM
- Top Performers

### Data Sources (3 created)
- `comfort_advisor_perf` - Comfort Advisor Performance data
- `call_center_perf` - Call Center metrics
- `department_financial` - Financial performance by department

### Sample Widgets (11 created)
- 4 widgets for Financial dashboard
- 4 widgets for Comfort Advisor dashboard
- 3 widgets for Call Center dashboard

**These are just examples!** They won't show real data unless your database tables match the query templates.

---

## Next Steps

### Step 1: Fix Metric Fields ✅
```bash
# Run migration
psql "host=127.0.0.1 dbname=kpi_data user=postgres password=LexHVAC2025" \
  -f migrations/002_add_available_fields.sql

# Redeploy admin-api
cd /home/ryan/kpi-dashboard/admin-api
gcloud functions deploy admin-api --gen2 --runtime=python311 --region=us-central1 \
  --source=. --entry-point=admin_api --trigger-http --allow-unauthenticated \
  --memory=512MB --timeout=540s \
  --set-env-vars="DB_PASSWORD=LexHVAC2025,INSTANCE_CONNECTION_NAME=new-dashboard-2025:us-central1:kpi-dashboard"
```

### Step 2: Understand Your Data Structure

Check what tables you actually have:

```bash
psql "host=127.0.0.1 dbname=kpi_data user=postgres password=LexHVAC2025" << 'EOF'
-- List all tables
\dt

-- Check if performance tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%performance%';

-- Check comfort_advisor_performance structure (if exists)
\d comfort_advisor_performance

-- Check call_center_performance structure (if exists)
\d call_center_performance
EOF
```

### Step 3: Create Matching Data Sources

Based on your actual tables, you may need to create new data sources or update existing ones:

```sql
-- Example: If your table has different columns
INSERT INTO widget_data_sources (data_source_key, name, description, query_template, available_fields, is_active) VALUES
('your_actual_data', 'Your Actual Data Source', 'Description here',
 'SELECT * FROM your_actual_table WHERE condition = true ORDER BY some_field DESC',
 '[
   {"field": "actual_column_1", "label": "Display Name 1", "type": "string"},
   {"field": "actual_column_2", "label": "Display Name 2", "type": "currency"},
   {"field": "actual_column_3", "label": "Display Name 3", "type": "number"}
 ]'::jsonb,
 true);
```

### Step 4: Create Real Widgets via Admin UI

1. Delete sample widgets (Option A above)
2. Use the Admin UI to add widgets that match your real data
3. Point them to the correct data sources
4. Configure with the correct field names from your actual database

---

## Quick Test

After running migration and redeploying:

1. Refresh your browser
2. Go to Admin Dashboard → Widget Layout
3. Click "Add Widget"
4. Select a widget type
5. Choose "Comfort Advisor Performance" data source
6. **The Metric Field dropdown should now show:**
   - Employee
   - Total Sales
   - Close Rate
   - Completed Jobs
   - Avg Sale

If you see these options, the fix worked! ✅

---

**Status**: Ready to deploy
**Time to fix**: ~5 minutes (migration + deploy)
