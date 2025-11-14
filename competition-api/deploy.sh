#!/bin/bash

# Deploy Competition API to Google Cloud Functions

echo "Deploying Competition API to Google Cloud Functions..."

# Deploy main API (note: will deploy as Gen2 by default)
gcloud functions deploy competition-api \
  --runtime=python39 \
  --region=us-central1 \
  --project=new-dashboard-2025 \
  --source=. \
  --entry-point=competition_api \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars DB_SOCKET_DIR=/cloudsql,INSTANCE_CONNECTION_NAME=new-dashboard-2025:us-central1:kpi-dashboard \
  --max-instances=10 \
  --memory=512MB \
  --timeout=60s

echo ""
echo "Configuring Cloud SQL connection..."
gcloud run services update competition-api \
  --region=us-central1 \
  --project=new-dashboard-2025 \
  --set-cloudsql-instances=new-dashboard-2025:us-central1:kpi-dashboard

echo ""
echo "✅ Deployment complete!"
echo "API URL: https://us-central1-new-dashboard-2025.cloudfunctions.net/competition-api"
echo ""
echo "Test it with:"
echo "curl https://us-central1-new-dashboard-2025.cloudfunctions.net/competition-api/competitions"
