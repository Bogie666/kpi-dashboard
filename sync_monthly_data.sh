#!/bin/bash

# Monthly Financial Data Sync Script
# Syncs financial data in 3-month chunks to avoid timeouts

FUNCTION_URL="https://us-central1-new-dashboard-2025.cloudfunctions.net/sync_servicetitan_data/yearly-financial"
YEAR=2025

echo "========================================"
echo "Monthly Financial Data Sync Script"
echo "Year: $YEAR"
echo "========================================"

# Function to sync specific months
sync_months() {
    local start_month=$1
    local end_month=$2
    local chunk_name=$3
    
    echo ""
    echo "Syncing $chunk_name (months $start_month-$end_month)..."
    echo "Started at: $(date)"
    
    # Make the API call
    response=$(curl -s "$FUNCTION_URL?year=$YEAR&start_month=$start_month&end_month=$end_month")
    
    # Check if curl was successful
    if [ $? -eq 0 ]; then
        echo "API call completed successfully"
        echo "Response: $response"
        
        # Check if the response contains success
        if echo "$response" | grep -q "success"; then
            echo "✅ $chunk_name sync completed successfully!"
        else
            echo "❌ $chunk_name sync may have failed - check response above"
        fi
    else
        echo "❌ API call failed for $chunk_name"
    fi
    
    echo "Completed at: $(date)"
    echo "----------------------------------------"
}

# Option 1: Sync all chunks automatically
sync_all() {
    echo "Starting automatic sync of all months in 3-month chunks..."
    
    sync_months 1 3 "Q1 2025 (Jan-Mar)"
    sleep 30  # Wait 30 seconds between chunks
    
    sync_months 4 6 "Q2 2025 (Apr-Jun)" 
    sleep 30
    
    sync_months 7 8 "Jul-Aug 2025"
    
    echo ""
    echo "🎉 All chunks completed! Check your database for monthly data."
}

# Option 2: Sync individual chunks
case $1 in
    "q1"|"1")
        sync_months 1 3 "Q1 2025 (Jan-Mar)"
        ;;
    "q2"|"2")
        sync_months 4 6 "Q2 2025 (Apr-Jun)"
        ;;
    "q3"|"3")
        sync_months 7 8 "Jul-Aug 2025"
        ;;
    "all"|"")
        sync_all
        ;;
    "test")
        echo "Testing connection to function..."
        curl -s "$FUNCTION_URL?year=$YEAR" | head -200
        ;;
    *)
        echo "Usage: $0 [q1|q2|q3|all|test]"
        echo ""
        echo "Options:"
        echo "  q1 or 1  - Sync Jan-Mar 2025"  
        echo "  q2 or 2  - Sync Apr-Jun 2025"
        echo "  q3 or 3  - Sync Jul-Aug 2025"
        echo "  all      - Sync all months (default)"
        echo "  test     - Test connection to function"
        echo ""
        echo "Examples:"
        echo "  $0 q1    # Sync just Q1"
        echo "  $0 all   # Sync everything"
        echo "  $0       # Same as 'all'"
        ;;
esac
