#!/bin/bash

# Test script for Plumbing and Electrical endpoints
# Usage: ./test_plumbing_electrical.sh

API_BASE="https://us-central1-new-dashboard-2025.cloudfunctions.net/dashboard_api"

echo "======================================"
echo "Testing Plumbing & Electrical Endpoints"
echo "======================================"
echo ""

# Test Plumbing MTD
echo "1. Testing /plumbing/mtd..."
curl -s "${API_BASE}/plumbing/mtd" | jq '.status, .period, (.data | length)'
echo ""

# Test Plumbing YTD
echo "2. Testing /plumbing/ytd..."
curl -s "${API_BASE}/plumbing/ytd" | jq '.status, .period, (.data | length)'
echo ""

# Test Plumbing Last Month
echo "3. Testing /plumbing/last_month..."
curl -s "${API_BASE}/plumbing/last_month" | jq '.status, .period, (.data | length)'
echo ""

# Test Electrical MTD
echo "4. Testing /electrical/mtd..."
curl -s "${API_BASE}/electrical/mtd" | jq '.status, .period, (.data | length)'
echo ""

# Test Electrical YTD
echo "5. Testing /electrical/ytd..."
curl -s "${API_BASE}/electrical/ytd" | jq '.status, .period, (.data | length)'
echo ""

# Test Electrical Last Month
echo "6. Testing /electrical/last_month..."
curl -s "${API_BASE}/electrical/last_month" | jq '.status, .period, (.data | length)'
echo ""

echo "======================================"
echo "Sample Plumbing Data (MTD):"
echo "======================================"
curl -s "${API_BASE}/plumbing/mtd" | jq '.data[0]'
echo ""

echo "======================================"
echo "Sample Electrical Data (MTD):"
echo "======================================"
curl -s "${API_BASE}/electrical/mtd" | jq '.data[0]'
echo ""

echo "Tests complete!"
