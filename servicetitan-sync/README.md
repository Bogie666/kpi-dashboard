# ServiceTitan Sync Integration

This service syncs competition data from ServiceTitan to the competition system.

## What It Does

1. **UV Light Sales** ✅ READY
   - Fetches report ID: 394027220
   - Filters for SKU: MUV-7-50DR-12
   - Aggregates by technician

2. **Sold Flips** ⏳ PENDING
   - Waiting for report ID and structure

3. **Google Reviews** ✅ READY
   - Uses existing integration from `/sosh` project

## Setup

### 1. Get ServiceTitan API Credentials

You need:
- Tenant ID
- Client ID
- Client Secret

These are available in your ServiceTitan developer portal.

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and fill in your credentials
```

### 3. Deploy

```bash
./deploy.sh
```

## API Endpoints

### Test UV Light Data
```bash
curl 'https://us-central1-new-dashboard-2025.cloudfunctions.net/servicetitan-sync/test-uv-lights?from=2025-11-01&to=2025-11-13'
```

Expected response:
```json
{
  "status": "success",
  "from": "2025-11-01",
  "to": "2025-11-13",
  "data": {
    "Mike Johnson": 15,
    "Sarah Williams": 12,
    "David Martinez": 10
  },
  "total_techs": 3,
  "total_units": 37
}
```

### Sync Competition
```bash
curl -X POST 'https://us-central1-new-dashboard-2025.cloudfunctions.net/servicetitan-sync/sync-competition/COMPETITION_ID'
```

This will:
1. Fetch UV light sales from ServiceTitan
2. Fetch sold flips (when configured)
3. Calculate points
4. Update Firestore leaderboard

## Report Configuration

### UV Lights Report (WORKING)

**Report ID:** 394027220

**URL:** `https://go.servicetitan.com/#/new/reports/394027220?DateType=0&From=2025-11-01&To=2025-11-13&AggregatesOnly=false&TimeZone=America%2FChicago`

**Fields:**
1. Invoice date
2. Item code
3. Item quantity
4. Sold by technician
5. Invoice number
6. Job business unit
7. Job type

**Filter:** Item code = "MUV-7-50DR-12"

### Sold Flips Report (NEEDED)

Please provide:
- Report ID
- Report URL
- Field structure
- How to identify a "sold flip"

## Integration with Competition API

The competition API (`competition-api/main.py`) will call this service to sync data:

```python
# In competition-api/main.py
@app.route('/competitions/<competition_id>/sync', methods=['POST'])
def sync_competition_data(competition_id):
    # Call ServiceTitan sync
    sync_url = f"https://us-central1-new-dashboard-2025.cloudfunctions.net/servicetitan-sync/sync-competition/{competition_id}"
    response = requests.post(sync_url)
    return response.json()
```

## Scheduled Syncs

To automatically sync data every hour, we can set up a Cloud Scheduler:

```bash
gcloud scheduler jobs create http sync-active-competitions \
  --schedule="0 * * * *" \
  --uri="https://us-central1-new-dashboard-2025.cloudfunctions.net/competition-api/sync-all" \
  --http-method=POST \
  --location=us-central1
```

## Testing Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
source .env

# Run locally
python main.py

# Test endpoints
curl 'http://localhost:8080/test-uv-lights?from=2025-11-01&to=2025-11-13'
```

## Troubleshooting

### Authentication Error
- Verify your ServiceTitan credentials in `.env`
- Check that your API app has the correct permissions

### Report Data Not Found
- Verify the report ID (394027220) is accessible
- Check date range parameters
- Ensure timezone is correct (America/Chicago)

### Field Mapping Issues
The code attempts to handle different field name formats:
- `itemCode` / `item_code` / `ItemCode`
- `soldByTechnician` / `sold_by_technician` / `SoldByTechnician`

If fields aren't matching, check the actual API response and update `servicetitan_api.py` accordingly.

## Next Steps

1. ✅ Deploy this service
2. ✅ Test UV light data fetch
3. ⏳ Get sold flips report details
4. ⏳ Integrate Google Reviews
5. ✅ Set up scheduled syncs
