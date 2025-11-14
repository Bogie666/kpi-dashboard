# Competition ServiceTitan Setup

## UV Light Sales Integration ✅

I've created the integration for UV light sales based on your report!

### Report Details

- **Report ID**: 394027220
- **Category**: Marketing
- **URL**: `https://go.servicetitan.com/#/new/reports/394027220?DateType=0&From=2025-11-01&To=2025-11-13&AggregatesOnly=false&TimeZone=America%2FChicago`

### Report Fields (in order)
1. Invoice date
2. Item code
3. Item quantity
4. Sold by technician
5. Invoice number
6. Job business unit
7. Job type

### What It Does

The `competition_sync.py` module:
1. Fetches the report data via ServiceTitan API
2. Filters for SKU: **MUV-7-50DR-12**
3. Aggregates quantity by technician name
4. Returns: `{"Mike Johnson": 15, "Sarah Williams": 12, ...}`

## Quick Setup

### 1. Add Credentials

Edit `.env`:
```bash
SERVICETITAN_TENANT_ID=your_tenant_id
SERVICETITAN_CLIENT_ID=your_client_id
SERVICETITAN_CLIENT_SECRET=your_client_secret
```

### 2. Test It

```bash
cd servicetitan-sync
python competition_sync.py
```

This will test the UV light data fetch and show results!

### 3. Integrate with Competition API

The competition API will call this function:

```python
from competition_sync import CompetitionServiceTitanAPI

api = CompetitionServiceTitanAPI()
uv_sales = api.get_uv_light_sales('2025-11-01', '2025-11-30')
# Returns: {"Tech Name": count, ...}
```

## Next Steps

### For Sold Flips

When you have the sold flips report, provide:
1. Report ID
2. Report URL
3. Field names/order
4. How to identify a "sold flip" (status field? boolean? calculation?)

I'll add it in the same way!

## API Response Handling

The code handles multiple response formats from ServiceTitan:

**Dict format:**
```json
{
  "data": [
    {
      "itemCode": "MUV-7-50DR-12",
      "itemQuantity": 2,
      "soldByTechnician": "Mike Johnson"
    }
  ]
}
```

**Array format:**
```json
{
  "data": [
    ["2025-11-05", "MUV-7-50DR-12", 2, "Mike Johnson", "INV-123", "HVAC", "Service"]
  ]
}
```

Both formats are supported!

## Testing Tips

1. **Use a short date range** first (1-2 days) to verify it works
2. **Check the field names** - the code tries multiple variations
3. **Verify the SKU filter** - make sure MUV-7-50DR-12 is correct
4. **Review technician names** - they must match your photo database

## Troubleshooting

### "No sales found"
- Check date range has actual sales
- Verify SKU is exactly "MUV-7-50DR-12"
- Check report ID is accessible

### "Field not found" errors
- The API response structure might be different
- Run the test to see the actual response
- We can adjust field mapping

### Authentication errors
- Verify credentials in .env
- Check API permissions in ServiceTitan

## Integration Flow

```
Competition Admin
       ↓
   Click "Sync"
       ↓
Competition API
       ↓
ServiceTitan Sync (competition_sync.py)
       ↓
Fetch UV Light Report (394027220)
       ↓
Filter by SKU (MUV-7-50DR-12)
       ↓
Aggregate by Technician
       ↓
Update Leaderboard in Firestore
```

Ready to test when you have the credentials!
