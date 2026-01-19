# Claude Session Notes

## Project Overview
KPI Dashboard for ServiceStar Brands - displays financial metrics, technician performance, memberships, and other KPIs from ServiceTitan data.

## Future Work

### Unsold Estimates / Potential Revenue - Business Unit Breakdown
**Status:** Planned
**Date Added:** 2026-01-16

Currently, the potential revenue (unsold estimates) displays as a single aggregated total on the financial page. The raw data already stores `business_unit` for each estimate in the `unsold_estimates_raw` table.

**Goal:** Break down potential revenue by business unit to:
1. Display in the financial table alongside other department metrics
2. Show on individual department pages (HVAC, Plumbing, Electrical, etc.)

**Relevant Files:**
- `migrations/009_add_unsold_estimates.sql` - Schema (raw table has business_unit column)
- `servicetitan-sync/main.py` - `fetch_unsold_estimates_data()` (~line 3065), `aggregate_unsold_estimates()` (~line 3236)
- `dashboard-api/main.py` - `get_unsold_estimates_summary()` (~line 754)
- `src/components/KpiDashboard.jsx` - Potential Revenue card (~line 2209)

**Implementation Notes:**
- Summary table currently only stores totals, not per-department breakdown
- Will need to modify `aggregate_unsold_estimates()` to group by business unit
- May need new summary table or modify existing one to store per-department data
- Map ServiceTitan business unit IDs to department names (similar to financial data)

### Unsold Estimates Report - Reorder Columns
**Status:** Planned
**Date Added:** 2026-01-16

Reformat the column order in the Excel export from the Tools page (UnsoldEstimateProcessor).

**Current column order:**
1. Opportunity Number
2. Customer Name
3. Location Phone
4. Customer Email
5. Business Unit
6. Email Sent
7. Average Estimate
8. Average Discount
9. Number of Options
10. Estimate Created By
11. Creation Date
12. Follow Up Date
13. Number of Follow Ups
14. Estimate Age (Days)

**Relevant File:**
- `src/components/UnsoldEstimateProcessor.jsx` (~lines 117-132)

### Estimate Analysis Tab - Data Accuracy Issues
**Status:** In Progress - Data not displaying correctly
**Date Added:** 2026-01-19

New "Analyze" tab added to the dashboard for estimate analysis. The feature is built but data accuracy needs investigation.

**What was built:**
- New tab in main navigation (between Engagement and Tools)
- Fetches from ServiceTitan Report ID: 399168856 (copy of open estimates report)
- `/estimate-analysis` endpoint in servicetitan-sync (on-demand, not stored in DB)
- Client-side data processing for all metrics

**Features implemented:**
- KPI cards: Total Opportunities, Close Rate, Realistic Unsold Revenue (with tooltip), Avg Ticket
- Tier Selection pie chart (which price tier customers choose on multi-option estimates)
- Time to Close pie chart (same day, 1-7 days, 8+ days)
- Dual-axis seasonality chart (close rate bars + avg ticket line by month)
- Department comparison table
- Date range options: MTD, Last Month, Last 6 Months, Last 12 Months, YTD, Custom
- Loads Last 12 Months by default, filters client-side for shorter ranges (reduces API calls)
- Mobile responsive

**Data issues to investigate:**
- Values not looking 100% correct - need to verify calculations
- Check if ServiceTitan report columns match expected positions (0-22)
- Verify opportunity_status and estimate_status values from ServiceTitan
- Confirm sold_on date is being parsed correctly for time-to-close
- Check tier selection logic - finding the "sold" estimate among options

**Relevant Files:**
- `src/components/EstimateAnalysis.jsx` - Frontend component with all calculations
- `servicetitan-sync/main.py` - `fetch_estimate_analysis_data()` (~line 3271), endpoint (~line 3851)
- `src/components/KpiDashboard.jsx` - Tab integration (~line 63 for tabs, ~line 2830 for renderView)
- `estimate info/Estimate_Analysis_Technical_Specification.md` - Original spec
- `estimate info/Multiplier_Derivation_Methodology.md` - Methodology for realistic unsold revenue

**Department mapping used:**
```javascript
'Service Sales' / 'LYONS Sales' → 'sales'
'Service Residential' / 'LYONS Service' → 'demand' (displayed as "Service")
'Service Maintenance' / 'LYONS Maintenance' → 'maintenance'
'Plumbing*' → 'plumbing'
'Electrical*' → 'electrical'
'Tyler*' → 'tyler'
```

**Key calculations to verify:**
1. Close Rate = won opportunities / total opportunities (excluding dismissed)
2. Avg Ticket = average of (average estimate per opportunity)
3. Tier Selection = rank of sold estimate among sorted options (low=1st, high=last, mid=middle)
4. Time to Close = sold_on - creation_date in days
5. Realistic Unsold = weighted calculation per department (see tooltip/methodology doc)
