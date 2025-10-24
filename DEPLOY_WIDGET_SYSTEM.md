# Widget Management System Deployment Guide

This guide will help you deploy the advanced widget management system to your KPI Dashboard.

## Overview

The widget system allows admin users to:
- Add, edit, and remove widgets from any dashboard
- Configure widget data sources and display settings
- Reorder widgets with drag-and-drop
- Save and apply layout presets
- Set role-based widget visibility

## Prerequisites

- Cloud SQL Proxy running
- Database credentials
- gcloud CLI configured
- Admin API function directory

## Step 1: Database Migration

First, apply the database migration to create the widget tables:

```bash
# Start Cloud SQL Proxy (if not running)
./cloud_sql_proxy -instances=new-dashboard-2025:us-central1:kpi-dashboard=tcp:5432

# In a new terminal, run the migration
cd /home/ryan/kpi-dashboard
psql "host=127.0.0.1 dbname=kpi_data user=postgres password=LexHVAC2025" -f migrations/001_add_widget_system.sql
```

### Verify Migration

Check that the tables were created:

```bash
psql "host=127.0.0.1 dbname=kpi_data user=postgres password=LexHVAC2025" -c "\dt widget*"
```

You should see:
- widget_types
- widget_instances
- widget_data_sources
- dashboard_views
- dashboard_layout_presets
- user_dashboard_preferences

## Step 2: Deploy Updated Admin API

Deploy the updated admin-api Cloud Function with the new widget endpoints:

```bash
cd /home/ryan/kpi-dashboard/admin-api

# Deploy admin-api function (Gen2)
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

### Verify Deployment

Check function status:

```bash
gcloud functions describe admin-api --region=us-central1 --gen2 --format="table(state,updateTime)"
```

Test the new widget endpoints:

```bash
# Test widget types endpoint
curl "https://us-central1-new-dashboard-2025.cloudfunctions.net/admin-api/widgets/types" | jq

# Test dashboard views endpoint
curl "https://us-central1-new-dashboard-2025.cloudfunctions.net/admin-api/widgets/views" | jq

# Test widget instances endpoint
curl "https://us-central1-new-dashboard-2025.cloudfunctions.net/admin-api/widgets/instances?dashboard=financial" | jq
```

## Step 3: Deploy Frontend (Optional)

If your Next.js app needs to be redeployed:

```bash
cd /home/ryan/kpi-dashboard

# Install dependencies (if needed)
npm install

# Build the app
npm run build

# Deploy to your hosting provider (Vercel, etc.)
# Or restart your local dev server
npm run dev
```

## Step 4: Test the Widget System

1. **Access Admin Panel**
   - Navigate to your dashboard
   - Login as admin user
   - Click "Admin Dashboard" in nav
   - Select "Widget Layout" tab

2. **Test Widget Management**
   - Select a dashboard view (e.g., "Financial")
   - Click "Add Widget" button
   - Choose a widget type
   - Configure the widget
   - Save and verify it appears

3. **Test Widget Operations**
   - Edit a widget's configuration
   - Toggle widget visibility
   - Delete a widget
   - Reorder widgets

## New API Endpoints

The following endpoints are now available:

### Widget Types & Views
- `GET /widgets/types` - List all widget types
- `GET /widgets/views` - List all dashboard views

### Widget Instances
- `GET /widgets/instances?dashboard=<key>` - Get widgets for dashboard
- `POST /widgets/instances` - Create new widget
- `PUT /widgets/instances/{key}` - Update widget
- `DELETE /widgets/instances/{key}` - Delete widget
- `POST /widgets/instances/reorder` - Reorder widgets

### Data Sources
- `GET /widgets/datasources` - List data sources
- `GET /widgets/data/{key}` - Fetch widget data

### Presets & Preferences
- `GET /widgets/presets?dashboard=<key>` - Get presets
- `POST /widgets/presets` - Save preset
- `POST /widgets/presets/{id}/apply` - Apply preset
- `GET /widgets/preferences?user=<email>&dashboard=<key>` - Get preferences
- `POST /widgets/preferences` - Save preferences

## Troubleshooting

### Database Connection Issues

```bash
# Check Cloud SQL instance status
gcloud sql instances describe kpi-dashboard --project=new-dashboard-2025

# Check proxy is running
ps aux | grep cloud_sql_proxy
```

### Function Deployment Issues

```bash
# View function logs
gcloud functions logs read admin-api --region=us-central1 --gen2 --limit=50

# Check function status
gcloud functions describe admin-api --region=us-central1 --gen2
```

### Widget System Not Loading

1. Check browser console for errors
2. Verify API endpoints are accessible:
   ```bash
   curl -I "https://us-central1-new-dashboard-2025.cloudfunctions.net/admin-api/widgets/types"
   ```
3. Check that migration completed successfully
4. Verify admin-api function deployed correctly

## Rollback (if needed)

If you need to rollback the changes:

### Rollback Database

```bash
# Drop widget tables
psql "host=127.0.0.1 dbname=kpi_data user=postgres password=LexHVAC2025" << EOF
DROP TABLE IF EXISTS user_dashboard_preferences CASCADE;
DROP TABLE IF EXISTS dashboard_layout_presets CASCADE;
DROP TABLE IF EXISTS widget_instances CASCADE;
DROP TABLE IF EXISTS widget_data_sources CASCADE;
DROP TABLE IF EXISTS dashboard_views CASCADE;
DROP TABLE IF EXISTS widget_types CASCADE;
EOF
```

### Rollback Function

Redeploy previous version of admin-api (if you have it backed up).

## Support

For issues or questions:
- Check function logs: `gcloud functions logs read admin-api --region=us-central1 --gen2 --limit=50`
- Verify database connection: Connect via psql and check tables exist
- Test API endpoints with curl

## Next Steps

After successful deployment:
1. Configure additional data sources
2. Create custom widget types
3. Set up layout presets for different user roles
4. Train admin users on widget management

---

**Deployment Date**: $(date)
**Version**: 1.0.0
**Status**: Production Ready
