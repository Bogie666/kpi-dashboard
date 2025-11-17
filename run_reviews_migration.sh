#!/bin/bash

echo "=========================================="
echo "Google Reviews Cache Migration"
echo "=========================================="
echo ""
echo "This will create the google_reviews_cache tables in your database."
echo ""
echo "Instance: new-dashboard-2025:us-central1:kpi-dashboard"
echo "Database: kpi_dashboard"
echo "User: postgres"
echo ""
echo "You will be prompted for the postgres password."
echo ""
echo "Running migration..."
echo ""

cat migrations/add_google_reviews_cache.sql | gcloud sql connect kpi-dashboard \
  --user=postgres \
  --project=new-dashboard-2025 \
  --database=kpi_dashboard

echo ""
echo "Migration complete!"
echo ""
echo "Next steps:"
echo "1. Go to Admin Dashboard → System Settings"
echo "2. Scroll to 'Google Reviews Cache' section"
echo "3. Click 'Refresh Reviews Cache' button"
echo "4. Wait 30-60 seconds for initial sync"
echo "5. Navigate to Reviews page - it should load instantly!"
