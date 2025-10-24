# Plumbing & Electrical Tabs - Fix Status

## Current Issue Summary

### Problems Identified:
1. **Plumbing tab shows NO data** (0 records after filtering)
2. **Electrical tab shows NO data** (0 records after filtering)
3. **HVAC Maintenance tab shows plumbing techs** (wrong trade data)

## Root Cause (Discovered via Console Logs)

From the console output:
```
📊 Total records: 21
🏷️ Unique trades: ["HVAC"] only
📋 Sample record: { trade: "HVAC", businessUnit: "Tyler Service " }
```

**The Problem:**
- The `/hvac-tech/` endpoint only returns technicians with trade = "HVAC"
- It does NOT include Plumbing or Electrical trade technicians
- This is because the ServiceTitan report uses specific BusinessUnitIds that only contain HVAC techs

## Technical Details

### ServiceTitan Sync Configuration
File: `servicetitan-sync/main.py`

**HVAC Tech Report** (line 899):
- BusinessUnitIds: `6540,6534,154684495`
- Report ID: `374367121`
- Result: Only HVAC trade technicians ❌

**HVAC Maintenance Report** (line 1093):
- BusinessUnitIds: `124468396,7831,154681497`
- Report ID: `374418414`
- Result: Returns plumbing techs (wrong!) ❌

### Business Unit Mappings Available
From `BUSINESS_UNIT_DEPARTMENT_MAPPING` (lines 12-44):
- "Electrical Maintenance" → electrical
- "Electrical Service" → electrical
- "Plumbing Maintenance" → plumbing
- "Plumbing Service" → plumbing
- "Plumbing Sewer" → plumbing

## Solutions to Explore

### Option 1: Add Plumbing/Electrical Business Units to HVAC Tech Sync ✅ RECOMMENDED
- Find the BusinessUnitIds for Plumbing and Electrical departments
- Add them to the `fetch_technician_data()` function
- This will make all trades available in the `/hvac-tech/` endpoint

### Option 2: Create Separate Endpoints
- Create `/plumbing-tech/` endpoint
- Create `/electrical-tech/` endpoint
- Update frontend to use these new endpoints

### Option 3: Revert to Old System
- Re-enable the old `/technicians/` endpoint
- Make sure the sync populates the old `technician_performance` table
- But this defeats the purpose of the migration

## Next Steps

1. **Find correct BusinessUnitIds for Plumbing and Electrical**
   - Check ServiceTitan admin panel
   - Or query existing data to find business unit names

2. **Update `fetch_technician_data()` in servicetitan-sync/main.py**
   - Add plumbing/electrical BusinessUnitIds to line 899
   - Example: `"6540,6534,154684495,PLUMB_ID,ELEC_ID"`

3. **Run sync to populate data**
   - Execute ServiceTitan sync script
   - Verify hvac_tech_performance table now has all trades

4. **Test frontend**
   - Check plumbing tab shows data
   - Check electrical tab shows data
   - Verify HVAC Maintenance only shows HVAC maintenance techs

5. **Fix HVAC Maintenance Business Units**
   - Review why BusinessUnitIds `124468396,7831,154681497` return plumbing
   - Either correct the IDs or add filtering in the sync

## Files Modified So Far

1. **src/components/KpiDashboard.jsx**
   - Lines 333-334: Changed plumbing/electrical to use `/hvac-tech/` endpoint
   - Lines 1417-1443: Added debug logging

2. **src/components/TopPerformersDashboard.jsx**
   - Lines 62-79: Updated to use `/hvac-tech/` for all tech data
   - Lines 109-118: Updated plumbing/electrical filtering

## Questions to Answer Tonight

1. What are the BusinessUnitIds for:
   - Plumbing Service
   - Plumbing Maintenance
   - Electrical Service
   - Electrical Maintenance

2. Why does HVAC Maintenance report return plumbing techs?
   - Are the BusinessUnitIds wrong?
   - Does the report need filtering?

## Git Status

**Latest commits:**
- `ee72745` - Add debug logging to diagnose plumbing/electrical data issues
- `3ee4225` - Fix plumbing and electrical tabs to use current data

**Branch:** main
**Remote:** https://github.com/Bogie666/kpi-dashboard

## Quick Reference

**Console Debug Output Location:**
Browser DevTools → Console tab (F12)

**Key Log Messages:**
- 🔧 TechnicianView - Shows which view
- 📦 Using dataKey - Shows data source
- 📊 Total records - Record count before filtering
- 🏷️ Unique trades - All available trades
- ✅ After filter - Record count after filtering

---

**Status:** 🔴 **BLOCKED** - Need to find correct BusinessUnitIds for Plumbing/Electrical
**Owner:** Ryan
**Last Updated:** 2025-10-24
