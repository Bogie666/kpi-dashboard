# Widget System Updates - Dark Theme & Data Sources Fix

## Changes Made

### Frontend Fixes
1. ✅ **Dark Theme Applied** - All widget components now use dark styling to match dashboard
   - WidgetContainer: Gray-800 background, white text
   - WidgetConfigModal: Dark theme with gray-800 background
   - WidgetLibrary: Dark theme modal
   - WidgetManager: Dark theme headers and controls

2. ✅ **Data Source Loading Fixed** - Backend now returns proper field names
   - Added `display_name` field for compatibility
   - Added `available_fields` placeholder
   - Fixed JSONB parsing for filters and config

### Backend Fixes
- Updated `get_widget_types()` to return both `name` and `display_name`
- Updated `get_dashboard_views()` to return both `name` and `display_name`
- Updated `get_widget_data_sources()` to return proper fields with `available_fields`

## Deployment Steps

### 1. Redeploy Admin API

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

### 2. Test the Updates

```bash
# Test data sources endpoint
curl "https://us-central1-new-dashboard-2025.cloudfunctions.net/admin-api/widgets/datasources" | jq

# Test widget types
curl "https://us-central1-new-dashboard-2025.cloudfunctions.net/admin-api/widgets/types" | jq

# Test dashboard views
curl "https://us-central1-new-dashboard-2025.cloudfunctions.net/admin-api/widgets/views" | jq
```

### 3. Refresh Frontend

Your Next.js frontend will automatically pick up the changes. Just refresh your browser!

## What's Fixed

✅ **Dark Theme** - All modals and widgets now match the dashboard theme
✅ **Data Sources** - Widget config modal now shows available data sources
✅ **Field Names** - Backend returns consistent `name` and `display_name` fields
✅ **Error Handling** - Added fallbacks for missing/undefined fields

## Known Limitations

⚠️ **Drag and Drop** - Not yet implemented (future enhancement)
⚠️ **Available Fields** - Currently returns empty array (needs database schema update)

### To Add Drag and Drop (Future)

Would require installing `react-grid-layout` or similar:

```bash
npm install react-grid-layout
npm install --save-dev @types/react-grid-layout
```

Then update DashboardGrid component to use GridLayout instead of static grid.

## Troubleshooting

### Data Sources Still Empty

1. Check that migration ran successfully:
   ```bash
   psql "host=127.0.0.1 dbname=kpi_data user=postgres password=LexHVAC2025" \
     -c "SELECT * FROM widget_data_sources;"
   ```

2. If empty, re-run the data source inserts from migration:
   ```bash
   psql "host=127.0.0.1 dbname=kpi_data user=postgres password=LexHVAC2025" \
     -f migrations/001_add_widget_system.sql
   ```

### Widgets Still White

- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser dev tools for CSS errors
- Verify Next.js dev server restarted

---

**Updated**: $(date)
**Status**: Ready to deploy
