#!/bin/bash

# Deploy ServiceTitan Sync to Google Cloud Functions

echo "Deploying ServiceTitan Sync to Google Cloud Functions..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please create .env from .env.example and fill in your credentials"
    exit 1
fi

# Load environment variables
source .env

# Deploy function
gcloud functions deploy servicetitan-sync \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=app \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT,SERVICETITAN_TENANT_ID=$SERVICETITAN_TENANT_ID,SERVICETITAN_CLIENT_ID=$SERVICETITAN_CLIENT_ID,SERVICETITAN_CLIENT_SECRET=$SERVICETITAN_CLIENT_SECRET,UV_LIGHT_SKU=$UV_LIGHT_SKU \
  --max-instances=10 \
  --memory=512MB \
  --timeout=120s

echo ""
echo "Deployment complete!"
echo ""
echo "API URL: https://us-central1-new-dashboard-2025.cloudfunctions.net/servicetitan-sync"
echo ""
echo "Test UV Lights:"
echo "curl 'https://us-central1-new-dashboard-2025.cloudfunctions.net/servicetitan-sync/test-uv-lights?from=2025-11-01&to=2025-11-13'"
echo ""
echo "Sync Competition:"
echo "curl -X POST 'https://us-central1-new-dashboard-2025.cloudfunctions.net/servicetitan-sync/sync-competition/COMPETITION_ID'"
