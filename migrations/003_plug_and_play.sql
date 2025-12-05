-- ============================================
-- PLUG & PLAY MULTI-TENANT MIGRATION
-- ============================================
-- This migration adds multi-tenant support for the plug-and-play version
-- of the KPI dashboard where users can self-configure their ServiceTitan connection

-- ============================================
-- CORE TENANT TABLES
-- ============================================

-- Tenants (Organizations)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#3b82f6',
    secondary_color VARCHAR(7) DEFAULT '#1e40af',
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, starter, pro, enterprise
    subscription_status VARCHAR(50) DEFAULT 'active', -- active, trial, suspended, cancelled
    trial_ends_at TIMESTAMP,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users with tenant association
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255), -- NULL for OAuth users
    name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'viewer', -- owner, admin, editor, viewer
    auth_provider VARCHAR(50) DEFAULT 'email', -- email, google
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

-- Pending invitations
CREATE TABLE IF NOT EXISTS tenant_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer',
    invited_by UUID REFERENCES tenant_users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- API CREDENTIALS & CONNECTIONS
-- ============================================

-- Encrypted API credentials storage
CREATE TABLE IF NOT EXISTS api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'servicetitan',

    -- ServiceTitan specific fields
    st_tenant_id VARCHAR(100), -- ServiceTitan Tenant ID
    encrypted_client_id TEXT NOT NULL,
    encrypted_client_secret TEXT NOT NULL,

    -- Connection status
    connection_status VARCHAR(50) DEFAULT 'pending', -- pending, connected, error, expired
    last_verified_at TIMESTAMP,
    last_error TEXT,

    -- Token caching (encrypted)
    encrypted_access_token TEXT,
    token_expires_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, provider)
);

-- ============================================
-- REPORT DISCOVERY & CONFIGURATION
-- ============================================

-- Standard report templates (system-defined)
CREATE TABLE IF NOT EXISTS report_templates (
    id SERIAL PRIMARY KEY,
    template_key VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- hvac, plumbing, electrical, financial, call_center
    provider VARCHAR(50) DEFAULT 'servicetitan',

    -- Default ServiceTitan report configuration
    default_report_id VARCHAR(100),
    required_fields JSONB, -- Fields that must be present
    optional_fields JSONB, -- Additional fields user can enable

    -- Data mapping configuration
    field_mappings JSONB, -- Maps report fields to standardized names
    aggregation_rules JSONB, -- How to aggregate the data

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenant-specific report configurations
CREATE TABLE IF NOT EXISTS tenant_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES report_templates(id),

    -- Custom report ID (discovered or user-specified)
    custom_report_id VARCHAR(100),
    custom_name VARCHAR(255),

    -- Configuration
    is_enabled BOOLEAN DEFAULT false,
    sync_frequency VARCHAR(50) DEFAULT 'hourly', -- realtime, hourly, daily, manual
    sync_schedule JSONB, -- Cron-like schedule configuration

    -- Field selection
    enabled_fields JSONB, -- Which fields to sync
    custom_field_mappings JSONB, -- Tenant-specific field mappings

    -- Sync status
    last_synced_at TIMESTAMP,
    last_sync_status VARCHAR(50),
    last_sync_error TEXT,
    records_last_sync INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, template_id)
);

-- Discovered reports (from API scanning)
CREATE TABLE IF NOT EXISTS discovered_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

    report_id VARCHAR(100) NOT NULL,
    report_name VARCHAR(255),
    category VARCHAR(100),

    -- Discovered metadata
    discovered_fields JSONB,
    sample_data JSONB,
    row_count INTEGER,

    -- Matching
    matched_template_id INTEGER REFERENCES report_templates(id),
    match_confidence DECIMAL(5,2), -- 0-100%

    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, report_id)
);

-- ============================================
-- TENANT-SPECIFIC DATA STORAGE
-- ============================================

-- Unified performance data table (multi-tenant)
CREATE TABLE IF NOT EXISTS tenant_performance_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

    -- Data categorization
    report_type VARCHAR(100) NOT NULL, -- comfort_advisor, technician, call_center, financial
    period_type VARCHAR(50) NOT NULL, -- today, wtd, mtd, ytd, last_month, custom
    period_date DATE NOT NULL,

    -- Flexible data storage
    employee_name VARCHAR(255),
    department VARCHAR(100),
    category VARCHAR(100),

    -- The actual data (JSONB for flexibility)
    metrics JSONB NOT NULL, -- All metric values

    -- Metadata
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_report_id VARCHAR(100),

    -- Prevent duplicates
    UNIQUE(tenant_id, report_type, period_type, period_date, employee_name, department)
);

-- Historical data for trends
CREATE TABLE IF NOT EXISTS tenant_historical_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

    metric_key VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2),
    dimension VARCHAR(255), -- e.g., employee name, department
    period_date DATE NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, metric_key, dimension, period_date)
);

-- ============================================
-- DASHBOARD BUILDER TABLES
-- ============================================

-- User-created dashboards
CREATE TABLE IF NOT EXISTS tenant_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(100),

    -- Layout configuration (react-grid-layout format)
    layout JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Settings
    is_default BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false, -- Viewable without login
    refresh_interval INTEGER DEFAULT 300, -- Seconds, 0 = manual

    -- Access control
    created_by UUID REFERENCES tenant_users(id),
    visibility VARCHAR(50) DEFAULT 'private', -- private, team, public

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, slug)
);

-- Dashboard widgets
CREATE TABLE IF NOT EXISTS tenant_dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID REFERENCES tenant_dashboards(id) ON DELETE CASCADE,

    -- Widget type
    widget_type VARCHAR(50) NOT NULL, -- kpi_card, bar_chart, line_chart, table, leaderboard, gauge

    -- Display
    title VARCHAR(255),
    subtitle VARCHAR(255),

    -- Position (react-grid-layout)
    grid_position JSONB NOT NULL, -- {i, x, y, w, h, minW, minH}

    -- Data configuration
    data_source VARCHAR(100), -- report_type to pull from
    metric VARCHAR(100), -- specific metric field
    filters JSONB DEFAULT '{}'::jsonb, -- {period_type, department, employee, etc.}

    -- Aggregation
    aggregation VARCHAR(50) DEFAULT 'sum', -- sum, avg, min, max, count, last
    group_by VARCHAR(100), -- Field to group by for charts
    sort_by VARCHAR(100),
    sort_order VARCHAR(10) DEFAULT 'desc',
    limit_rows INTEGER,

    -- Display options
    display_options JSONB DEFAULT '{}'::jsonb, -- colors, format, thresholds, etc.

    -- Targets
    show_target BOOLEAN DEFAULT false,
    target_value DECIMAL(15,2),
    target_type VARCHAR(50), -- fixed, percentage, previous_period

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard templates (shareable)
CREATE TABLE IF NOT EXISTS dashboard_templates_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- hvac, plumbing, call_center, financial, general
    thumbnail_url TEXT,

    -- Template configuration
    layout JSONB NOT NULL,
    widgets JSONB NOT NULL, -- Array of widget configurations

    -- Requirements
    required_reports JSONB, -- Which report types must be enabled

    -- Metadata
    is_system BOOLEAN DEFAULT false, -- System-provided templates
    is_public BOOLEAN DEFAULT false,
    created_by_tenant UUID REFERENCES tenants(id),

    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- WIDGET TYPE DEFINITIONS
-- ============================================

-- Available widget types
INSERT INTO widget_types (widget_type_key, display_name, description, category, icon, default_config, is_active) VALUES
('kpi_card', 'KPI Card', 'Single metric with trend indicator', 'metric', 'TrendingUp',
 '{"showTrend": true, "showTarget": true, "size": "medium"}'::jsonb, true),
('stat_card', 'Stat Card', 'Simple statistic display', 'metric', 'Hash',
 '{"showIcon": true}'::jsonb, true),
('bar_chart', 'Bar Chart', 'Vertical or horizontal bar chart', 'chart', 'BarChart3',
 '{"orientation": "vertical", "showGrid": true, "showLegend": false}'::jsonb, true),
('line_chart', 'Line Chart', 'Time series trend line', 'chart', 'LineChart',
 '{"smooth": true, "showDots": true, "showGrid": true}'::jsonb, true),
('area_chart', 'Area Chart', 'Filled area chart', 'chart', 'AreaChart',
 '{"gradient": true, "showGrid": true}'::jsonb, true),
('pie_chart', 'Pie Chart', 'Proportional pie chart', 'chart', 'PieChart',
 '{"showLabels": true, "showLegend": true}'::jsonb, true),
('donut_chart', 'Donut Chart', 'Donut chart with center label', 'chart', 'Circle',
 '{"showCenter": true, "showLegend": true}'::jsonb, true),
('gauge', 'Gauge', 'Progress gauge towards target', 'metric', 'Gauge',
 '{"min": 0, "max": 100, "thresholds": {"warning": 70, "success": 90}}'::jsonb, true),
('leaderboard', 'Leaderboard', 'Ranked list with photos', 'table', 'Trophy',
 '{"showRank": true, "showPhoto": true, "limit": 10}'::jsonb, true),
('data_table', 'Data Table', 'Sortable data table', 'table', 'Table',
 '{"sortable": true, "pageSize": 10}'::jsonb, true),
('sparkline', 'Sparkline Card', 'Compact metric with inline chart', 'metric', 'Activity',
 '{"showValue": true, "period": 7}'::jsonb, true),
('comparison', 'Comparison', 'Compare two values', 'metric', 'ArrowLeftRight',
 '{"showPercentage": true}'::jsonb, true),
('progress', 'Progress Bar', 'Progress towards goal', 'metric', 'Target',
 '{"showPercentage": true, "showValue": true}'::jsonb, true),
('text', 'Text Block', 'Custom text/markdown', 'content', 'FileText',
 '{"allowMarkdown": true}'::jsonb, true),
('image', 'Image', 'Custom image display', 'content', 'Image',
 '{"fit": "contain"}'::jsonb, true)
ON CONFLICT (widget_type_key) DO NOTHING;

-- ============================================
-- REPORT TEMPLATES (STANDARD CONFIGURATIONS)
-- ============================================

INSERT INTO report_templates (template_key, display_name, description, category, default_report_id, required_fields, optional_fields, field_mappings) VALUES
('comfort_advisor', 'Comfort Advisor Performance', 'Sales advisor performance metrics including close rates and TGL', 'sales', NULL,
 '["employee_name", "total_sales", "close_rate", "completed_jobs"]'::jsonb,
 '["tgl_sales", "tgl_close_rate", "marketing_sales", "options_per_opportunity"]'::jsonb,
 '{"Employee": "employee_name", "Total Sales": "total_sales", "Close Rate %": "close_rate"}'::jsonb),

('hvac_technician', 'HVAC Technician Performance', 'HVAC tech performance including revenue and conversions', 'hvac', NULL,
 '["employee_name", "revenue", "jobs_completed"]'::jsonb,
 '["conversions", "memberships_sold", "leads_set", "recall_rate"]'::jsonb,
 '{"Technician": "employee_name", "Revenue": "revenue", "Jobs": "jobs_completed"}'::jsonb),

('hvac_maintenance', 'HVAC Maintenance Performance', 'HVAC maintenance technician metrics', 'hvac', NULL,
 '["employee_name", "revenue", "jobs_completed"]'::jsonb,
 '["memberships_sold", "recall_rate"]'::jsonb,
 '{}'::jsonb),

('plumbing_technician', 'Plumbing Technician Performance', 'Plumbing tech performance metrics', 'plumbing', NULL,
 '["employee_name", "revenue", "jobs_completed"]'::jsonb,
 '["conversions", "memberships_sold", "leads_set"]'::jsonb,
 '{}'::jsonb),

('electrical_technician', 'Electrical Technician Performance', 'Electrical tech performance metrics', 'electrical', NULL,
 '["employee_name", "revenue", "jobs_completed"]'::jsonb,
 '["conversions", "memberships_sold", "leads_set"]'::jsonb,
 '{}'::jsonb),

('call_center', 'Call Center Performance', 'CSR call metrics and booking rates', 'call_center', NULL,
 '["employee_name", "total_calls", "booking_rate"]'::jsonb,
 '["booked_calls", "avg_call_duration", "memberships_sold", "lead_calls"]'::jsonb,
 '{"CSR": "employee_name", "Calls": "total_calls", "Booking %": "booking_rate"}'::jsonb),

('financial_department', 'Department Financials', 'Revenue and budget by department', 'financial', NULL,
 '["department", "revenue"]'::jsonb,
 '["budget", "jobs_completed", "avg_ticket"]'::jsonb,
 '{"Department": "department", "Revenue": "revenue"}'::jsonb)
ON CONFLICT (template_key) DO NOTHING;

-- ============================================
-- DEFAULT DASHBOARD TEMPLATES
-- ============================================

INSERT INTO dashboard_templates_library (id, name, description, category, is_system, is_public, layout, widgets, required_reports) VALUES
(gen_random_uuid(), 'HVAC Overview', 'Complete HVAC department dashboard with tech performance and financials', 'hvac', true, true,
 '[{"i":"1","x":0,"y":0,"w":3,"h":2},{"i":"2","x":3,"y":0,"w":3,"h":2},{"i":"3","x":6,"y":0,"w":3,"h":2},{"i":"4","x":9,"y":0,"w":3,"h":2},{"i":"5","x":0,"y":2,"w":6,"h":4},{"i":"6","x":6,"y":2,"w":6,"h":4}]'::jsonb,
 '[{"id":"1","type":"kpi_card","title":"Revenue MTD","metric":"revenue","aggregation":"sum"},{"id":"2","type":"kpi_card","title":"Jobs Completed","metric":"jobs_completed","aggregation":"sum"},{"id":"3","type":"kpi_card","title":"Avg Ticket","metric":"avg_ticket","aggregation":"avg"},{"id":"4","type":"gauge","title":"Close Rate","metric":"close_rate"},{"id":"5","type":"bar_chart","title":"Revenue by Tech","metric":"revenue","groupBy":"employee_name"},{"id":"6","type":"leaderboard","title":"Top Performers","metric":"revenue"}]'::jsonb,
 '["hvac_technician"]'::jsonb),

(gen_random_uuid(), 'Call Center Command', 'Real-time call center monitoring dashboard', 'call_center', true, true,
 '[{"i":"1","x":0,"y":0,"w":4,"h":2},{"i":"2","x":4,"y":0,"w":4,"h":2},{"i":"3","x":8,"y":0,"w":4,"h":2},{"i":"4","x":0,"y":2,"w":8,"h":4},{"i":"5","x":8,"y":2,"w":4,"h":4}]'::jsonb,
 '[{"id":"1","type":"kpi_card","title":"Total Calls Today","metric":"total_calls"},{"id":"2","type":"gauge","title":"Booking Rate","metric":"booking_rate"},{"id":"3","type":"kpi_card","title":"Memberships Sold","metric":"memberships_sold"},{"id":"4","type":"data_table","title":"Agent Performance","columns":["employee_name","total_calls","booked_calls","booking_rate"]},{"id":"5","type":"leaderboard","title":"Top Bookers","metric":"booking_rate"}]'::jsonb,
 '["call_center"]'::jsonb),

(gen_random_uuid(), 'Sales Performance', 'Comfort advisor and sales team metrics', 'sales', true, true,
 '[{"i":"1","x":0,"y":0,"w":3,"h":2},{"i":"2","x":3,"y":0,"w":3,"h":2},{"i":"3","x":6,"y":0,"w":3,"h":2},{"i":"4","x":9,"y":0,"w":3,"h":2},{"i":"5","x":0,"y":2,"w":12,"h":4}]'::jsonb,
 '[{"id":"1","type":"kpi_card","title":"Total Sales MTD","metric":"total_sales"},{"id":"2","type":"kpi_card","title":"Close Rate","metric":"close_rate"},{"id":"3","type":"kpi_card","title":"Avg Ticket","metric":"avg_ticket"},{"id":"4","type":"kpi_card","title":"TGL Sales","metric":"tgl_sales"},{"id":"5","type":"leaderboard","title":"Sales Leaderboard","metric":"total_sales"}]'::jsonb,
 '["comfort_advisor"]'::jsonb),

(gen_random_uuid(), 'Executive Overview', 'High-level financial and performance summary', 'financial', true, true,
 '[{"i":"1","x":0,"y":0,"w":6,"h":2},{"i":"2","x":6,"y":0,"w":6,"h":2},{"i":"3","x":0,"y":2,"w":4,"h":3},{"i":"4","x":4,"y":2,"w":4,"h":3},{"i":"5","x":8,"y":2,"w":4,"h":3}]'::jsonb,
 '[{"id":"1","type":"kpi_card","title":"Total Revenue MTD","metric":"revenue","aggregation":"sum","size":"large"},{"id":"2","type":"progress","title":"Budget Progress","metric":"budget_percentage"},{"id":"3","type":"pie_chart","title":"Revenue by Department","metric":"revenue","groupBy":"department"},{"id":"4","type":"line_chart","title":"Revenue Trend","metric":"revenue"},{"id":"5","type":"leaderboard","title":"Top Departments","metric":"revenue","groupBy":"department"}]'::jsonb,
 '["financial_department"]'::jsonb);

-- ============================================
-- SYNC & AUDIT TABLES
-- ============================================

-- Tenant-specific sync log
CREATE TABLE IF NOT EXISTS tenant_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

    sync_type VARCHAR(100) NOT NULL,
    report_id VARCHAR(100),
    period_type VARCHAR(50),

    status VARCHAR(50) DEFAULT 'pending', -- pending, running, success, error
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,

    error_message TEXT,

    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tenant_users_email ON tenant_users(email);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_credentials_tenant ON api_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_reports_tenant ON tenant_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_reports_enabled ON tenant_reports(tenant_id, is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_tenant_performance_data_query ON tenant_performance_data(tenant_id, report_type, period_type, period_date);
CREATE INDEX IF NOT EXISTS idx_tenant_dashboards_tenant ON tenant_dashboards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_dashboard_widgets_dashboard ON tenant_dashboard_widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sync_log_tenant ON tenant_sync_log(tenant_id, started_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE
    ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_users_updated_at BEFORE UPDATE
    ON tenant_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_credentials_updated_at BEFORE UPDATE
    ON api_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_reports_updated_at BEFORE UPDATE
    ON tenant_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_dashboards_updated_at BEFORE UPDATE
    ON tenant_dashboards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_dashboard_widgets_updated_at BEFORE UPDATE
    ON tenant_dashboard_widgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
