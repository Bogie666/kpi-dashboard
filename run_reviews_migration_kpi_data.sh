#!/bin/bash

echo "=========================================="
echo "Google Reviews Cache Migration"
echo "=========================================="
echo ""
echo "Running migration on kpi_data database..."
echo ""

cat migrations/add_google_reviews_cache.sql | gcloud sql connect kpi-dashboard \
  --user=postgres \
  --project=new-dashboard-2025 \
  --database=kpi_data

echo ""
echo "✅ Migration complete!"
echo ""
echo "Next step: Update DATABASE_URL in Vercel to:"
echo "postgresql://postgres:LexHVAC2025@34.10.166.80:5432/kpi_data"
