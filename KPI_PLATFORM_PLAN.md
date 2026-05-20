# KPI Platform — Implementation Plan

## What This Project Is

A white-label, configurable KPI dashboard for home services companies, forked from `Bogie666/kpi-dashboard`. Each deployment gets a setup wizard so new companies can configure everything through the UI — no code changes required.

## Current State

The `kpi-platform-files` branch on `Bogie666/kpi-dashboard` contains 11 new files that need to be included in this repo. The base code is a copy of `kpi-dashboard` main branch. The new files add the config system and setup wizard.

### New Files (already built, on `kpi-platform-files` branch)

```
migrations/011_add_company_config.sql    — Database schema for config system
src/lib/config-service.ts                — Server-side config CRUD layer
src/app/api/config/route.ts              — Public config endpoint (GET)
src/app/api/setup/route.ts               — Setup wizard API (GET/POST per step)
src/app/setup/page.tsx                   — Setup wizard route
src/components/setup/SetupWizard.tsx     — Main wizard shell (5-step progress)
src/components/setup/StepCompany.tsx     — Step 1: Company name, logo, timezone
src/components/setup/StepServiceTitan.tsx — Step 2: ST credentials + test connection
src/components/setup/StepDivisions.tsx   — Step 3: Divisions + business unit mapping
src/components/setup/StepReports.tsx     — Step 4: ServiceTitan report IDs
src/components/setup/StepGoogleReviews.tsx — Step 5: Google Business Profile (skippable)
```

### Key Terminology Change

"Department" → **"Division"** throughout the new code.

Mapping hierarchy: **Division → Business Units → Job Types**

This replaces the old hardcoded `BUSINESS_UNIT_DEPARTMENT_MAPPING` dict in `servicetitan-sync/main.py`.

---

## Tech Stack (same as kpi-dashboard)

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, Recharts, Lucide icons
- **Backend APIs:** Python 3 Cloud Functions (`dashboard-api`, `admin-api`, `competition-api`, `servicetitan-sync`)
- **Database:** PostgreSQL (Google Cloud SQL or Vercel Postgres)
- **Deployment:** Vercel (frontend) + Google Cloud Functions (Python APIs)
- **Auth:** JWT tokens, PBKDF2-SHA256 password hashing

---

## Database Config Schema (migration 011)

### Tables

**`company_config`** — Key-value store for settings
- `config_key` (unique), `config_value`, `config_type` (string/number/boolean/json), `is_sensitive`
- Pre-seeded keys: company_name, company_logo_url, timezone, servicetitan_tenant_id, servicetitan_client_id, servicetitan_client_secret, servicetitan_app_key, google_client_id, google_client_secret, google_refresh_token, setup_completed, setup_step

**`divisions`** — Replaces hardcoded departments
- name, slug (unique), icon, color, display_order, is_active, has_technicians, has_comfort_advisors

**`business_units`** — ServiceTitan BUs mapped to divisions
- division_id (FK → divisions), servicetitan_id (unique), name

**`job_types`** — ServiceTitan job types mapped to business units
- business_unit_id (FK → business_units), servicetitan_id (unique), name

**`report_config`** — ServiceTitan report IDs (13 pre-seeded defaults)
- report_key (unique), report_name, servicetitan_report_id, report_category, is_active, division_id, business_unit_ids

**`google_locations`** — Google Business Profile locations
- name, account_id, location_id, slug (unique), is_active

**`setup_log`** — Audit trail of wizard progress

### Default Report IDs (pre-seeded)

| report_key | report_id | category | purpose |
|---|---|---|---|
| comfort_advisor | 374338685 | technician | Sales consultant metrics |
| hvac_tech | 374367121 | technician | HVAC tech metrics |
| hvac_maintenance | 374418414 | technician | HVAC maintenance metrics |
| commercial_hvac | 398188829 | technician | Commercial HVAC metrics |
| plumbing | 392071756 | technician | Plumbing tech metrics |
| electrical | 392071757 | technician | Electrical tech metrics |
| call_center | 2665 | operations | Call center agent metrics |
| financial | 128062649 | accounting | Department revenue data |
| membership | 371386314 | marketing | Membership data |
| items_sold | 394027220 | marketing | Item sales for competitions |
| sold_flips | 394041816 | technician | Technician leads sold |
| unsold_estimates | 346111296 | operations | Open estimate pipeline |
| estimate_analysis | 399168856 | operations | All estimates |

---

## What Still Needs To Be Done

### Phase 1: Integration — Connect Config to Existing Code

These files contain LEX-specific hardcoded values that must be replaced with config-driven lookups:

#### 1. `servicetitan-sync/main.py` (~3600 lines)
**Current:** Hardcoded `BUSINESS_UNIT_DEPARTMENT_MAPPING` dict (lines ~20-52), hardcoded tenant ID `"1498628772"`, hardcoded report IDs in every `fetch_*` function, hardcoded business unit ID strings.

**Needed:**
- Read tenant ID from `company_config` table instead of hardcoded value
- Read report IDs from `report_config` table instead of hardcoded strings
- Read BU→Division mapping from `getDivisionBusinessUnitMapping()` (already built in config-service.ts) or equivalent Python query
- Read business unit IDs for each report from `report_config.business_unit_ids`
- The Python sync runs as a Cloud Function, so it needs its own DB connection to read config (can't use the TypeScript config-service)

**Approach:** Create a Python `config.py` module that queries `company_config`, `divisions`, `business_units`, and `report_config` tables. Replace all hardcoded values in `main.py` with calls to this module.

#### 2. `dashboard-api/main.py` (~1500 lines)
**Current:** Hardcoded database credentials, hardcoded department names in queries.

**Needed:**
- Read DB credentials from environment variables (already partially done)
- Department-specific endpoints (`/hvac-tech/`, `/plumbing/`, etc.) should be driven by the `divisions` table rather than hardcoded routes
- Financial aggregation should group by divisions from config

#### 3. `src/components/KpiDashboard.jsx` (~3000 lines, main frontend shell)
**Current:** Hardcoded tab arrays for technician sub-tabs (`hvac_tech`, `hvac_maintenance`, `commercial_hvac`, `plumbing`, `electrical`), hardcoded department names/icons/colors, hardcoded API URL.

**Needed:**
- Fetch divisions from `/api/config` on mount
- Dynamically generate technician sub-tabs from divisions where `has_technicians = true`
- Use division colors/icons from config instead of hardcoded values
- Company name in header from config

#### 4. `src/lib/google-business.ts`
**Current:** 3 hardcoded locations with Google account/location IDs.

**Needed:**
- Read locations from `google_locations` table via config-service
- OAuth credentials from `company_config` table

#### 5. `src/components/TopPerformersDashboard.jsx`
**Current:** Hardcoded department tabs (Comfort Advisors, HVAC Tech, etc.)

**Needed:**
- Dynamic tabs from divisions config

#### 6. `src/app/layout.tsx`
**Current:** Hardcoded "Lex KPI Dashboard" title.

**Needed:**
- Read company name from config for page title

### Phase 2: Setup Wizard Enhancements

#### ServiceTitan Connection Test (`/api/setup/test-st`)
- New API route that takes ST credentials, attempts OAuth token fetch
- Returns success/failure so the wizard Step 2 can validate before saving

#### Auto-Fetch Business Units from ServiceTitan
- Button in Step 3 that calls the ST API to list all business units
- User then drags/assigns them to divisions instead of typing names manually
- ST API endpoint: `GET /settings/v2/tenant/{tenantId}/business-units`

#### Auto-Redirect to Setup
- If `setup_completed = false`, redirect from `/` to `/setup`
- Can be done in middleware or in KpiDashboard.jsx

### Phase 3: Cleanup & Polish

#### Remove LEX-Specific Branding
- Remove references to "Lex", "LEX", "Lyons", "ServiceStar" from all files
- Remove hardcoded LEX logo, favicon
- Replace with config-driven company name/logo

#### Break Up KpiDashboard.jsx
- Extract each view (Financial, Technician, CallCenter, etc.) into separate component files
- Main shell just renders the active view based on tab state
- Makes each view independently testable

#### Update CLAUDE.md
- Replace kpi-dashboard CLAUDE.md content with kpi-platform specific notes

---

## File Structure Overview

```
kpi-platform/
├── CLAUDE.md                          — Project notes for Claude
├── KPI_PLATFORM_PLAN.md               — This file
├── migrations/
│   ├── 001-010                        — Existing migrations from kpi-dashboard
│   └── 011_add_company_config.sql     — NEW: Config system schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── config/route.ts        — NEW: Public config endpoint
│   │   │   ├── setup/route.ts         — NEW: Setup wizard API
│   │   │   ├── google/reviews/        — Existing: needs config integration
│   │   │   └── kpi/                   — Existing: widget APIs
│   │   ├── setup/page.tsx             — NEW: Setup wizard page
│   │   └── widgets/                   — Existing: SharePoint widgets
│   ├── components/
│   │   ├── setup/                     — NEW: 6 setup wizard components
│   │   ├── KpiDashboard.jsx           — MODIFY: config-driven tabs/departments
│   │   ├── TopPerformersDashboard.jsx — MODIFY: config-driven department tabs
│   │   ├── GoogleReviews.jsx          — MODIFY: config-driven locations
│   │   └── ...                        — Other existing components
│   └── lib/
│       ├── config-service.ts          — NEW: Config CRUD layer
│       ├── google-business.ts         — MODIFY: config-driven locations
│       └── ...                        — Other existing libs
├── servicetitan-sync/
│   └── main.py                        — MODIFY: config-driven BU mapping, report IDs, tenant ID
├── dashboard-api/
│   └── main.py                        — MODIFY: config-driven department queries
├── admin-api/
│   └── main.py                        — Existing: user/target management
├── competition-api/
│   └── main.py                        — Existing: competition system
└── photo-api/
    └── main.py                        — Existing: technician photos
```

---

## How the Config System Works

### Reading Config (TypeScript / Next.js)

```typescript
import { getDivisions, getConfig, getDivisionBusinessUnitMapping } from '@/lib/config-service';

// Get all active divisions
const divisions = await getDivisions(true);

// Get a single config value
const tenantId = await getConfig('servicetitan_tenant_id');

// Get BU→Division mapping (for sync engine)
const mapping = await getDivisionBusinessUnitMapping();
// Returns: { "Lex HVAC Service": "hvac_service", "Lex Plumbing": "plumbing", ... }
```

### Reading Config (Python / Cloud Functions)

Need to create equivalent Python module. Example:

```python
def get_config(key):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT config_value FROM company_config WHERE config_key = %s", (key,))
            row = cursor.fetchone()
            return row[0] if row else None

def get_division_bu_mapping():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT bu.name, d.slug
                FROM business_units bu
                JOIN divisions d ON d.id = bu.division_id
                WHERE bu.is_active = true AND d.is_active = true
            """)
            return {row[0]: row[1] for row in cursor.fetchall()}
```

### Frontend Config Loading

```typescript
// In KpiDashboard.jsx or a context provider
useEffect(() => {
  fetch('/api/config')
    .then(r => r.json())
    .then(config => {
      // config.divisions = [{ id, name, slug, icon, color, ... }]
      // config.company.name = "Company Name"
      // config.setupComplete = true/false
    });
}, []);
```

---

## Deployment Checklist (per company)

1. Fork/clone `kpi-platform` repo
2. Create Vercel project, connect to repo
3. Create Vercel Postgres database (or Cloud SQL)
4. Set `DATABASE_URL` environment variable
5. Run migration: `psql $DATABASE_URL -f migrations/011_add_company_config.sql`
6. Deploy to Vercel
7. Visit `/setup` and walk through the 5-step wizard
8. Deploy Python Cloud Functions (servicetitan-sync, dashboard-api, admin-api)
9. Set Cloud Function environment variables (DB connection, etc.)
10. Trigger initial data sync from Admin panel
11. Create user accounts
