#!/bin/bash

echo "=========================================="
echo "Google Reviews Auto-Sync Setup"
echo "=========================================="
echo ""
echo "This will create a Cloud Scheduler job that:"
echo "  - Runs every 2 hours"
echo "  - Calls the reviews sync API"
echo "  - Refreshes the reviews cache automatically"
echo ""

PROJECT_ID="new-dashboard-2025"
REGION="us-central1"
JOB_NAME="sync-google-reviews"
SCHEDULE="0 */2 * * *"  # Every 2 hours at minute 0
API_URL="https://kpi-dashboard-2025.web.app/api/google/reviews/sync"

echo "Creating Cloud Scheduler job..."
echo ""

# Enable Cloud Scheduler API if not already enabled
gcloud services enable cloudscheduler.googleapis.com --project=$PROJECT_ID

# Create the scheduler job
gcloud scheduler jobs create http $JOB_NAME \
  --location=$REGION \
  --schedule="$SCHEDULE" \
  --uri="$API_URL" \
  --http-method=POST \
  --description="Auto-sync Google Reviews cache every 2 hours" \
  --time-zone="America/Chicago" \
  --project=$PROJECT_ID \
  --attempt-deadline=300s

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Cloud Scheduler job created successfully!"
  echo ""
  echo "Job Details:"
  echo "  Name: $JOB_NAME"
  echo "  Schedule: Every 2 hours"
  echo "  Timezone: America/Chicago (Central Time)"
  echo "  API: $API_URL"
  echo ""
  echo "To view the job:"
  echo "  gcloud scheduler jobs describe $JOB_NAME --location=$REGION --project=$PROJECT_ID"
  echo ""
  echo "To run it manually (test):"
  echo "  gcloud scheduler jobs run $JOB_NAME --location=$REGION --project=$PROJECT_ID"
  echo ""
  echo "To pause it:"
  echo "  gcloud scheduler jobs pause $JOB_NAME --location=$REGION --project=$PROJECT_ID"
  echo ""
  echo "To resume it:"
  echo "  gcloud scheduler jobs resume $JOB_NAME --location=$REGION --project=$PROJECT_ID"
  echo ""
  echo "To delete it:"
  echo "  gcloud scheduler jobs delete $JOB_NAME --location=$REGION --project=$PROJECT_ID"
  echo ""
else
  echo ""
  echo "❌ Error creating scheduler job."
  echo "The job might already exist. To update it:"
  echo "  1. Delete the existing job:"
  echo "     gcloud scheduler jobs delete $JOB_NAME --location=$REGION --project=$PROJECT_ID"
  echo "  2. Run this script again"
  echo ""
fi
