-- Migration: Add company configuration system
-- This replaces all hardcoded business-specific values with configurable database entries.
-- Hierarchy: Division → Business Units → Job Types

BEGIN;

-- ============================================================
-- Company-level configuration (key-value store for settings)
-- ============================================================
CREATE TABLE IF NOT EXISTS company_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    config_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    is_sensitive BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);

-- Seed with required config keys (values left empty for setup wizard)
INSERT INTO company_config (config_key, config_value, config_type, description, is_sensitive) VALUES
    ('company_name', '', 'string', 'Company display name', false),
    ('company_logo_url', '', 'string', 'URL to company logo image', false),
    ('timezone', 'America/Chicago', 'string', 'Company timezone for date calculations', false),
    ('servicetitan_tenant_id', '', 'string', 'ServiceTitan tenant ID', true),
    ('servicetitan_client_id', '', 'string', 'ServiceTitan API client ID', true),
    ('servicetitan_client_secret', '', 'string', 'ServiceTitan API client secret', true),
    ('servicetitan_app_key', '', 'string', 'ServiceTitan API application key', true),
    ('google_client_id', '', 'string', 'Google OAuth client ID', true),
    ('google_client_secret', '', 'string', 'Google OAuth client secret', true),
    ('google_refresh_token', '', 'string', 'Google OAuth refresh token', true),
    ('setup_completed', 'false', 'boolean', 'Whether initial setup wizard has been completed', false),
    ('setup_step', '1', 'number', 'Current setup wizard step (1-5)', false)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- Divisions (replaces hardcoded "departments")
-- ============================================================
CREATE TABLE IF NOT EXISTS divisions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(50) DEFAULT 'building',
    color VARCHAR(7) DEFAULT '#3B82F6',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    has_technicians BOOLEAN DEFAULT true,
    has_comfort_advisors BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Business Units (ServiceTitan BUs mapped to Divisions)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_units (
    id SERIAL PRIMARY KEY,
    division_id INTEGER REFERENCES divisions(id) ON DELETE CASCADE,
    servicetitan_id VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(servicetitan_id)
);

CREATE INDEX IF NOT EXISTS idx_business_units_division ON business_units(division_id);
CREATE INDEX IF NOT EXISTS idx_business_units_st_id ON business_units(servicetitan_id);

-- ============================================================
-- Job Types (ServiceTitan job types mapped to Business Units)
-- ============================================================
CREATE TABLE IF NOT EXISTS job_types (
    id SERIAL PRIMARY KEY,
    business_unit_id INTEGER REFERENCES business_units(id) ON DELETE CASCADE,
    servicetitan_id VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(servicetitan_id)
);

CREATE INDEX IF NOT EXISTS idx_job_types_bu ON job_types(business_unit_id);

-- ============================================================
-- ServiceTitan Report Configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS report_config (
    id SERIAL PRIMARY KEY,
    report_key VARCHAR(50) UNIQUE NOT NULL,
    report_name VARCHAR(100) NOT NULL,
    servicetitan_report_id VARCHAR(50) NOT NULL,
    report_category VARCHAR(50) NOT NULL,
    description TEXT,
    division_id INTEGER REFERENCES divisions(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    business_unit_ids TEXT,
    column_mapping JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed with default report configurations (IDs can be overridden in wizard)
INSERT INTO report_config (report_key, report_name, servicetitan_report_id, report_category, description) VALUES
    ('comfort_advisor', 'Comfort Advisor Performance', '374338685', 'technician', 'Sales consultant performance metrics'),
    ('hvac_tech', 'HVAC Technician Performance', '374367121', 'technician', 'HVAC service technician metrics'),
    ('hvac_maintenance', 'HVAC Maintenance Performance', '374418414', 'technician', 'HVAC maintenance technician metrics'),
    ('commercial_hvac', 'Commercial HVAC Performance', '398188829', 'technician', 'Commercial HVAC technician metrics'),
    ('plumbing', 'Plumbing Performance', '392071756', 'technician', 'Plumbing technician metrics'),
    ('electrical', 'Electrical Performance', '392071757', 'technician', 'Electrical technician metrics'),
    ('call_center', 'Call Center Performance', '2665', 'operations', 'Call center agent metrics'),
    ('financial', 'Financial Performance', '128062649', 'accounting', 'Department revenue and financial data'),
    ('membership', 'Membership Data', '371386314', 'marketing', 'Membership enrollment and retention'),
    ('items_sold', 'Items Sold', '394027220', 'marketing', 'Individual item sales for competitions'),
    ('sold_flips', 'Technician Leads Sold', '394041816', 'technician', 'Technician lead generation metrics'),
    ('unsold_estimates', 'Unsold Estimates', '346111296', 'operations', 'Open estimate pipeline'),
    ('estimate_analysis', 'Estimate Analysis', '399168856', 'operations', 'All estimates including won/dismissed')
ON CONFLICT (report_key) DO NOTHING;

-- ============================================================
-- Google Business Profile Locations
-- ============================================================
CREATE TABLE IF NOT EXISTS google_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    account_id VARCHAR(100) NOT NULL,
    location_id VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Setup audit log (track wizard progress)
-- ============================================================
CREATE TABLE IF NOT EXISTS setup_log (
    id SERIAL PRIMARY KEY,
    step INTEGER NOT NULL,
    step_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'started', 'completed', 'skipped', 'failed'
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

COMMIT;
