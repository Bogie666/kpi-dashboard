#!/bin/bash

# Deploy Competition Tables Migration

echo "Deploying Competition Tables Migration..."

# Temporarily copy requirements for migration
cp requirements_migration.txt requirements.txt.bak
mv requirements.txt requirements_main.txt.bak 2>/dev/null || true
cp requirements_migration.txt requirements.txt

gcloud functions deploy migrate-competition-tables \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=migrate_competition_tables \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars DB_PASSWORD="${DB_PASSWORD:-LexHVAC2025}" \
  --max-instances=1 \
  --memory=512MB \
  --timeout=180s

# Restore original requirements
mv requirements_main.txt.bak requirements.txt 2>/dev/null || true
rm requirements.txt.bak 2>/dev/null || true

echo ""
echo "Deployment complete!"
echo ""
echo "To run the migration, visit:"
echo "https://us-central1-new-dashboard-2025.cloudfunctions.net/migrate-competition-tables"
echo ""
echo "Or use curl:"
echo "curl https://us-central1-new-dashboard-2025.cloudfunctions.net/migrate-competition-tables"
