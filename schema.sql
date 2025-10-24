-- KPI Dashboard Database Schema
-- PostgreSQL Compatible Version

-- Main comfort advisor performance table
CREATE TABLE comfort_advisor_performance (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('mtd', 'ytd', 'last_month', 'wtd', 'last_week')),
    
    -- Employee Information
    employee_name VARCHAR(100) NOT NULL,
    business_unit VARCHAR(50) NOT NULL,
    team VARCHAR(50) NOT NULL,
    
    -- Core Metrics
    completed_jobs INTEGER DEFAULT 0,
    sales_opportunities INTEGER DEFAULT 0,
    marketing_lead_jobs INTEGER DEFAULT 0,
    tech_lead_jobs INTEGER DEFAULT 0,
    closed_opportunities INTEGER DEFAULT 0,
    canceled_jobs INTEGER DEFAULT 0,
    
    -- Financial Data (stored as cents to avoid decimal precision issues)
    total_sales_cents BIGINT DEFAULT 0,
    closed_average_sale_cents INTEGER DEFAULT 0,
    
    -- TGL (Tech Generated Lead) Metrics
    tgl_opportunities INTEGER DEFAULT 0,
    tgl_sales_cents BIGINT DEFAULT 0,
    tgl_close_rate_percent DECIMAL(5,2) DEFAULT 0,
    tgl_average_sale_cents INTEGER DEFAULT 0,
    tgl_jobs INTEGER DEFAULT 0,
    
    -- Marketing Lead Metrics
    marketing_opportunities INTEGER DEFAULT 0,
    marketing_sales_cents BIGINT DEFAULT 0,
    marketing_close_rate_percent DECIMAL(5,2) DEFAULT 0,
    marketing_average_sale_cents INTEGER DEFAULT 0,
    marketing_jobs INTEGER DEFAULT 0,
    
    -- Calculated Performance Metrics
    close_rate_percent DECIMAL(5,2) DEFAULT 0,
    options_per_opportunity DECIMAL(4,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure no duplicate records for same person/date/period
    UNIQUE(employee_name, report_date, period_type)
);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_comfort_advisor_updated_at BEFORE UPDATE
    ON comfort_advisor_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_comfort_advisor_date_period ON comfort_advisor_performance(report_date, period_type);
CREATE INDEX idx_comfort_advisor_employee ON comfort_advisor_performance(employee_name);
CREATE INDEX idx_comfort_advisor_business_unit ON comfort_advisor_performance(business_unit);

-- Call center performance table
CREATE TABLE call_center_performance (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    
    -- Employee Information
    employee_name VARCHAR(100) NOT NULL,
    
    -- Call Metrics
    total_calls INTEGER DEFAULT 0,
    calls_per_hour INTEGER DEFAULT 0,
    booked_calls INTEGER DEFAULT 0,
    inbound_calls INTEGER DEFAULT 0,
    outbound_calls INTEGER DEFAULT 0,
    booking_percent DECIMAL(5,2) DEFAULT 0,
    avg_call_duration_seconds INTEGER DEFAULT 0,
    cool_club_memberships INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_name, report_date, period_type)
);

-- Create trigger for call center updated_at
CREATE TRIGGER update_call_center_updated_at BEFORE UPDATE
    ON call_center_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Financial performance by department
CREATE TABLE department_financial_performance (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    
    -- Department Information
    department_name VARCHAR(50) NOT NULL,
    business_unit_id VARCHAR(20),
    
    -- Financial Metrics
    revenue_cents BIGINT DEFAULT 0,
    budget_cents BIGINT DEFAULT 0,
    budget_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Job Metrics
    jobs_completed INTEGER DEFAULT 0,
    avg_ticket_cents INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(department_name, report_date, period_type)
);

-- Create trigger for department updated_at
CREATE TRIGGER update_department_updated_at BEFORE UPDATE
    ON department_financial_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Admin configurable targets
CREATE TABLE performance_targets (
    id SERIAL PRIMARY KEY,
    target_type VARCHAR(50) NOT NULL, -- 'comfort_advisor_avg_ticket', 'call_center_booking_rate', etc.
    department VARCHAR(50),
    employee_name VARCHAR(100), -- NULL for department-wide targets
    
    -- Target Values
    target_value DECIMAL(10,2) NOT NULL,
    target_period VARCHAR(20) NOT NULL, -- 'monthly', 'weekly', 'daily'
    
    -- Date Range
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    -- Metadata
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for targets updated_at
CREATE TRIGGER update_targets_updated_at BEFORE UPDATE
    ON performance_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ServiceTitan sync log for monitoring
CREATE TABLE servicetitan_sync_log (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL, -- 'comfort_advisor', 'call_center', 'financial'
    report_id VARCHAR(20), -- ServiceTitan report ID (e.g., '2526')
    period_type VARCHAR(20) NOT NULL,
    sync_date DATE NOT NULL,
    
    -- Sync Results
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    sync_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'success', 'error'
    error_message TEXT,
    
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER
);

-- Utility functions for converting cents to dollars
CREATE OR REPLACE FUNCTION cents_to_dollars(cents BIGINT)
RETURNS DECIMAL(10,2) AS $$
BEGIN
    RETURN cents::DECIMAL / 100.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- View for dashboard API (comfort advisors with dollar formatting)
CREATE VIEW comfort_advisor_dashboard AS
SELECT 
    employee_name,
    business_unit,
    team,
    report_date,
    period_type,
    
    -- Core metrics
    completed_jobs,
    sales_opportunities,
    closed_opportunities,
    canceled_jobs,
    close_rate_percent,
    options_per_opportunity,
    
    -- Financial (converted to dollars)
    cents_to_dollars(total_sales_cents) AS total_sales,
    cents_to_dollars(closed_average_sale_cents) AS average_sale,
    
    -- TGL Performance
    tgl_opportunities,
    tgl_jobs,
    tgl_close_rate_percent,
    cents_to_dollars(tgl_sales_cents) AS tgl_sales,
    cents_to_dollars(tgl_average_sale_cents) AS tgl_average_sale,
    
    -- Marketing Performance  
    marketing_opportunities,
    marketing_jobs,
    marketing_close_rate_percent,
    cents_to_dollars(marketing_sales_cents) AS marketing_sales,
    cents_to_dollars(marketing_average_sale_cents) AS marketing_average_sale,
    
    updated_at
FROM comfort_advisor_performance
ORDER BY report_date DESC, total_sales_cents DESC;

-- Sample data for testing (using your actual ServiceTitan data)
INSERT INTO comfort_advisor_performance (
    report_date, period_type, employee_name, business_unit, team,
    completed_jobs, sales_opportunities, marketing_lead_jobs, tech_lead_jobs,
    total_sales_cents, closed_opportunities, closed_average_sale_cents,
    close_rate_percent, options_per_opportunity, canceled_jobs,
    tgl_opportunities, tgl_sales_cents, tgl_close_rate_percent, tgl_average_sale_cents, tgl_jobs,
    marketing_opportunities, marketing_sales_cents, marketing_close_rate_percent, marketing_average_sale_cents, marketing_jobs
) VALUES 
(CURRENT_DATE, 'mtd', 'Frankie Monforte', 'Service Residential', 'Selling Technician',
 1, 1, 0, 1, 2229100, 1, 2229100, 100.00, 1.00, 0,
 1, 2229100, 100.00, 2229100, 1,
 0, 0, 0.00, 0, 0),
 
(CURRENT_DATE, 'mtd', 'John Hill', 'Service Sales', 'Sales Team - Comfort Advisors', 
 8, 8, 5, 3, 3781100, 4, 945275, 50.00, 1.38, 4,
 3, 2771100, 67.00, 1385600, 3,
 5, 1010000, 40.00, 505000, 5),
 
(CURRENT_DATE, 'mtd', 'John King Tech', 'Service Sales', 'Selling Technician',
 4, 4, 1, 3, 2319000, 1, 2319000, 25.00, 2.25, 1,
 3, 2319000, 33.00, 2319000, 3,
 1, 0, 0.00, 0, 1);

-- Create sample targets
INSERT INTO performance_targets (target_type, target_value, target_period, effective_from, created_by) VALUES 
('comfort_advisor_avg_ticket', 450.00, 'monthly', CURRENT_DATE, 'system'),
('comfort_advisor_close_rate', 75.00, 'monthly', CURRENT_DATE, 'system'),
('call_center_booking_rate', 85.00, 'monthly', CURRENT_DATE, 'system');

-- Insert sample call center data
INSERT INTO call_center_performance (
    report_date, period_type, employee_name, total_calls, calls_per_hour, booked_calls,
    inbound_calls, outbound_calls, booking_percent, avg_call_duration_seconds, cool_club_memberships
) VALUES 
-- Today's data (smaller numbers for daily)
(CURRENT_DATE, 'today', 'Sarah Johnson', 8, 8, 7, 6, 2, 87.5, 425, 1),
(CURRENT_DATE, 'today', 'Mike Davis', 9, 9, 6, 7, 2, 66.7, 375, 0),
(CURRENT_DATE, 'today', 'Lisa Chen', 7, 7, 6, 5, 2, 85.7, 455, 1),
(CURRENT_DATE, 'today', 'Robert Wilson', 6, 6, 4, 4, 2, 66.7, 395, 0),
(CURRENT_DATE, 'today', 'Emma Martinez', 10, 10, 9, 7, 3, 90.0, 410, 2),

-- WTD data (moderate numbers for weekly)
(CURRENT_DATE, 'wtd', 'Sarah Johnson', 25, 8, 21, 18, 7, 84.0, 420, 3),
(CURRENT_DATE, 'wtd', 'Mike Davis', 28, 9, 20, 20, 8, 71.4, 380, 2),
(CURRENT_DATE, 'wtd', 'Lisa Chen', 22, 7, 19, 15, 7, 86.4, 450, 4),
(CURRENT_DATE, 'wtd', 'Robert Wilson', 24, 8, 16, 16, 8, 66.7, 390, 1),
(CURRENT_DATE, 'wtd', 'Emma Martinez', 26, 9, 24, 18, 8, 92.3, 405, 3),

-- MTD data (existing)
(CURRENT_DATE, 'mtd', 'Sarah Johnson', 45, 8, 38, 30, 15, 84.4, 420, 5),
(CURRENT_DATE, 'mtd', 'Mike Davis', 52, 9, 41, 35, 17, 78.8, 380, 3),
(CURRENT_DATE, 'mtd', 'Lisa Chen', 38, 7, 32, 25, 13, 84.2, 450, 7),
(CURRENT_DATE, 'mtd', 'Robert Wilson', 41, 8, 29, 28, 13, 70.7, 390, 2),
(CURRENT_DATE, 'mtd', 'Emma Martinez', 48, 9, 43, 32, 16, 89.6, 405, 6),

-- Last Month data (existing)
(CURRENT_DATE, 'last_month', 'Sarah Johnson', 180, 8, 155, 120, 60, 86.1, 415, 18),
(CURRENT_DATE, 'last_month', 'Mike Davis', 165, 8, 125, 110, 55, 75.8, 385, 12),
(CURRENT_DATE, 'last_month', 'Lisa Chen', 195, 9, 168, 140, 55, 86.2, 440, 22),
(CURRENT_DATE, 'last_month', 'Robert Wilson', 172, 8, 115, 120, 52, 66.9, 400, 8),
(CURRENT_DATE, 'last_month', 'Emma Martinez', 188, 9, 171, 135, 53, 91.0, 410, 25)
ON CONFLICT (employee_name, report_date, period_type) DO NOTHING;

-- ============================================
-- WIDGET MANAGEMENT SYSTEM
-- ============================================

-- Widget type definitions (available widget templates)
CREATE TABLE widget_types (
    id SERIAL PRIMARY KEY,
    widget_type_key VARCHAR(50) UNIQUE NOT NULL, -- 'kpi_card', 'bar_chart', 'line_chart', etc.
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'metric', 'chart', 'table', 'custom'
    icon VARCHAR(50), -- lucide-react icon name
    default_config JSONB, -- Default configuration template
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard view definitions
CREATE TABLE dashboard_views (
    id SERIAL PRIMARY KEY,
    view_key VARCHAR(50) UNIQUE NOT NULL, -- 'financial', 'comfort_advisor', 'call_center', etc.
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Widget instances (actual widgets placed on dashboards)
CREATE TABLE widget_instances (
    id SERIAL PRIMARY KEY,
    widget_instance_key VARCHAR(100) UNIQUE NOT NULL, -- Unique identifier for this widget instance
    widget_type_key VARCHAR(50) NOT NULL REFERENCES widget_types(widget_type_key),
    dashboard_view_key VARCHAR(50) NOT NULL REFERENCES dashboard_views(view_key),

    -- Display properties
    title VARCHAR(200),
    subtitle VARCHAR(200),

    -- Layout positioning
    layout_position INTEGER DEFAULT 0, -- Order in grid
    grid_column_span INTEGER DEFAULT 1, -- How many columns wide (1-4)
    grid_row_span INTEGER DEFAULT 1, -- How many rows tall

    -- Widget configuration
    config JSONB, -- Widget-specific configuration (data source, filters, etc.)

    -- Visibility and permissions
    is_visible BOOLEAN DEFAULT true,
    required_role VARCHAR(50), -- NULL = all users, 'admin', 'manager', etc.

    -- Metadata
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Widget data source mappings
CREATE TABLE widget_data_sources (
    id SERIAL PRIMARY KEY,
    data_source_key VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Query configuration
    source_type VARCHAR(50) NOT NULL, -- 'table', 'view', 'api', 'custom_query'
    table_name VARCHAR(100), -- For 'table' or 'view' types
    api_endpoint VARCHAR(500), -- For 'api' type
    custom_query TEXT, -- For 'custom_query' type

    -- Available fields from this data source
    available_fields JSONB, -- Array of field definitions

    -- Filtering options
    available_filters JSONB, -- Array of available filter configurations

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard layout presets (saved configurations)
CREATE TABLE dashboard_layout_presets (
    id SERIAL PRIMARY KEY,
    preset_name VARCHAR(100) NOT NULL,
    dashboard_view_key VARCHAR(50) NOT NULL REFERENCES dashboard_views(view_key),
    description TEXT,

    -- Complete layout configuration
    layout_config JSONB, -- Full snapshot of widget configurations

    -- Preset metadata
    is_default BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false, -- Can other users use this preset
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(preset_name, dashboard_view_key)
);

-- User dashboard preferences
CREATE TABLE user_dashboard_preferences (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(100) NOT NULL,
    dashboard_view_key VARCHAR(50) NOT NULL REFERENCES dashboard_views(view_key),

    -- User's custom configuration
    custom_layout JSONB, -- Override default layout
    active_preset_id INTEGER REFERENCES dashboard_layout_presets(id),

    -- Preferences
    preferences JSONB, -- Theme, refresh rate, default time period, etc.

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_email, dashboard_view_key)
);

-- Create triggers for updated_at
CREATE TRIGGER update_widget_types_updated_at BEFORE UPDATE
    ON widget_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_views_updated_at BEFORE UPDATE
    ON dashboard_views FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widget_instances_updated_at BEFORE UPDATE
    ON widget_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widget_data_sources_updated_at BEFORE UPDATE
    ON widget_data_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_layout_presets_updated_at BEFORE UPDATE
    ON dashboard_layout_presets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_dashboard_preferences_updated_at BEFORE UPDATE
    ON user_dashboard_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_widget_instances_dashboard ON widget_instances(dashboard_view_key);
CREATE INDEX idx_widget_instances_type ON widget_instances(widget_type_key);
CREATE INDEX idx_widget_instances_position ON widget_instances(dashboard_view_key, layout_position);
CREATE INDEX idx_user_preferences_user ON user_dashboard_preferences(user_email);

-- ============================================
-- SAMPLE WIDGET CONFIGURATION DATA
-- ============================================

-- Insert dashboard views
INSERT INTO dashboard_views (view_key, display_name, description, icon, display_order, is_active) VALUES
('financial', 'Financial', 'Financial performance overview', 'DollarSign', 1, true),
('comfort_advisor', 'Comfort Advisor', 'Comfort advisor performance metrics', 'UserCheck', 2, true),
('technician', 'HVAC Tech', 'Technician performance tracking', 'Wrench', 3, true),
('hvac_maintenance', 'HVAC Maintenance', 'HVAC maintenance metrics', 'Wrench', 4, true),
('plumbing', 'Plumbing', 'Plumbing department performance', 'Droplets', 5, true),
('electrical', 'Electrical', 'Electrical department performance', 'Zap', 6, true),
('call_center', 'Call Center', 'Call center performance metrics', 'Phone', 7, true),
('memberships', 'Memberships', 'Membership sales and retention', 'Users', 8, true),
('revenue_ttm', 'Revenue TTM', 'Trailing twelve months revenue', 'TrendingUp', 9, true),
('top_performers', 'Top Performers', 'Top performing employees', 'Trophy', 10, true)
ON CONFLICT (view_key) DO NOTHING;

-- Insert widget types
INSERT INTO widget_types (widget_type_key, display_name, description, category, icon, default_config, is_active) VALUES
('kpi_card', 'KPI Card', 'Single metric display with trend indicator', 'metric', 'Square',
 '{"showTrend": true, "showTarget": true, "colorThresholds": {"warning": 80, "danger": 60}}'::jsonb, true),

('stat_card', 'Stat Card', 'Basic statistic card with icon', 'metric', 'Hash',
 '{"showIcon": true, "format": "number"}'::jsonb, true),

('bar_chart', 'Bar Chart', 'Vertical or horizontal bar chart', 'chart', 'BarChart3',
 '{"orientation": "vertical", "showGrid": true, "showLegend": true}'::jsonb, true),

('line_chart', 'Line Chart', 'Time series line chart', 'chart', 'LineChart',
 '{"showGrid": true, "showLegend": true, "smooth": false}'::jsonb, true),

('trend_chart', 'Trend Chart', 'YTD or period comparison trend chart', 'chart', 'TrendingUp',
 '{"comparisonType": "ytd", "showTarget": true}'::jsonb, true),

('leaderboard_table', 'Leaderboard Table', 'Ranked performance table', 'table', 'Trophy',
 '{"pageSize": 10, "showRank": true, "sortable": true}'::jsonb, true),

('performance_table', 'Performance Table', 'Detailed performance data table', 'table', 'Table',
 '{"pageSize": 10, "sortable": true, "filterable": true}'::jsonb, true),

('comparison_card', 'Comparison Card', 'Compare actual vs target metrics', 'metric', 'Target',
 '{"showPercentage": true, "showProgress": true}'::jsonb, true)
ON CONFLICT (widget_type_key) DO NOTHING;

-- Insert data sources
INSERT INTO widget_data_sources (data_source_key, display_name, description, source_type, table_name, available_fields, available_filters, is_active) VALUES
('comfort_advisor_perf', 'Comfort Advisor Performance', 'Comfort advisor metrics and performance data', 'table', 'comfort_advisor_performance',
 '[
   {"field": "employee_name", "label": "Employee", "type": "string"},
   {"field": "total_sales_cents", "label": "Total Sales", "type": "currency"},
   {"field": "close_rate_percent", "label": "Close Rate", "type": "percentage"},
   {"field": "completed_jobs", "label": "Completed Jobs", "type": "number"},
   {"field": "closed_average_sale_cents", "label": "Avg Sale", "type": "currency"}
 ]'::jsonb,
 '[
   {"field": "period_type", "label": "Period", "type": "select", "options": ["mtd", "ytd", "last_month"]},
   {"field": "business_unit", "label": "Business Unit", "type": "string"},
   {"field": "team", "label": "Team", "type": "string"}
 ]'::jsonb, true),

('call_center_perf', 'Call Center Performance', 'Call center metrics and KPIs', 'table', 'call_center_performance',
 '[
   {"field": "employee_name", "label": "Employee", "type": "string"},
   {"field": "total_calls", "label": "Total Calls", "type": "number"},
   {"field": "booking_percent", "label": "Booking Rate", "type": "percentage"},
   {"field": "booked_calls", "label": "Booked Calls", "type": "number"}
 ]'::jsonb,
 '[
   {"field": "period_type", "label": "Period", "type": "select", "options": ["today", "wtd", "mtd", "last_month"]}
 ]'::jsonb, true),

('department_financial', 'Department Financial', 'Financial performance by department', 'table', 'department_financial_performance',
 '[
   {"field": "department_name", "label": "Department", "type": "string"},
   {"field": "revenue_cents", "label": "Revenue", "type": "currency"},
   {"field": "budget_percentage", "label": "Budget %", "type": "percentage"},
   {"field": "jobs_completed", "label": "Jobs", "type": "number"}
 ]'::jsonb,
 '[
   {"field": "period_type", "label": "Period", "type": "select", "options": ["mtd", "ytd", "last_month"]}
 ]'::jsonb, true)
ON CONFLICT (data_source_key) DO NOTHING;

-- Sample widget instances for Financial dashboard
INSERT INTO widget_instances (widget_instance_key, widget_type_key, dashboard_view_key, title, subtitle, layout_position, grid_column_span, config, is_visible, required_role) VALUES
('financial_revenue_kpi', 'kpi_card', 'financial', 'Total Revenue', 'Month to Date', 1, 1,
 '{"dataSource": "department_financial", "metric": "revenue_cents", "aggregation": "sum", "format": "currency"}'::jsonb, true, NULL),

('financial_jobs_kpi', 'kpi_card', 'financial', 'Jobs Completed', 'Month to Date', 2, 1,
 '{"dataSource": "department_financial", "metric": "jobs_completed", "aggregation": "sum", "format": "number"}'::jsonb, true, NULL),

('financial_budget_kpi', 'comparison_card', 'financial', 'Budget Performance', 'vs Monthly Target', 3, 1,
 '{"dataSource": "department_financial", "metric": "budget_percentage", "aggregation": "avg", "format": "percentage"}'::jsonb, true, NULL),

('financial_dept_chart', 'bar_chart', 'financial', 'Revenue by Department', '', 4, 2,
 '{"dataSource": "department_financial", "xAxis": "department_name", "yAxis": "revenue_cents", "format": "currency"}'::jsonb, true, NULL)
ON CONFLICT (widget_instance_key) DO NOTHING;

-- Sample widget instances for Comfort Advisor dashboard
INSERT INTO widget_instances (widget_instance_key, widget_type_key, dashboard_view_key, title, subtitle, layout_position, grid_column_span, config, is_visible, required_role) VALUES
('ca_sales_kpi', 'kpi_card', 'comfort_advisor', 'Total Sales', 'Month to Date', 1, 1,
 '{"dataSource": "comfort_advisor_perf", "metric": "total_sales_cents", "aggregation": "sum", "format": "currency"}'::jsonb, true, NULL),

('ca_close_rate_kpi', 'kpi_card', 'comfort_advisor', 'Close Rate', 'Month to Date', 2, 1,
 '{"dataSource": "comfort_advisor_perf", "metric": "close_rate_percent", "aggregation": "avg", "format": "percentage"}'::jsonb, true, NULL),

('ca_jobs_kpi', 'kpi_card', 'comfort_advisor', 'Completed Jobs', 'Month to Date', 3, 1,
 '{"dataSource": "comfort_advisor_perf", "metric": "completed_jobs", "aggregation": "sum", "format": "number"}'::jsonb, true, NULL),

('ca_leaderboard', 'leaderboard_table', 'comfort_advisor', 'Top Performers', '', 4, 2,
 '{"dataSource": "comfort_advisor_perf", "sortBy": "total_sales_cents", "sortOrder": "desc", "limit": 10}'::jsonb, true, NULL)
ON CONFLICT (widget_instance_key) DO NOTHING;

-- Sample widget instances for Call Center dashboard
INSERT INTO widget_instances (widget_instance_key, widget_type_key, dashboard_view_key, title, subtitle, layout_position, grid_column_span, config, is_visible, required_role) VALUES
('cc_calls_kpi', 'kpi_card', 'call_center', 'Total Calls', 'Today', 1, 1,
 '{"dataSource": "call_center_perf", "metric": "total_calls", "aggregation": "sum", "format": "number"}'::jsonb, true, NULL),

('cc_booking_kpi', 'kpi_card', 'call_center', 'Booking Rate', 'Today', 2, 1,
 '{"dataSource": "call_center_perf", "metric": "booking_percent", "aggregation": "avg", "format": "percentage"}'::jsonb, true, NULL),

('cc_booked_kpi', 'kpi_card', 'call_center', 'Booked Calls', 'Today', 3, 1,
 '{"dataSource": "call_center_perf", "metric": "booked_calls", "aggregation": "sum", "format": "number"}'::jsonb, true, NULL),

('cc_performance_table', 'performance_table', 'call_center', 'Agent Performance', '', 4, 2,
 '{"dataSource": "call_center_perf", "columns": ["employee_name", "total_calls", "booked_calls", "booking_percent"]}'::jsonb, true, NULL)
ON CONFLICT (widget_instance_key) DO NOTHING;