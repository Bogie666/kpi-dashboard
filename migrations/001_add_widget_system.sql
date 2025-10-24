-- ============================================
-- WIDGET MANAGEMENT SYSTEM MIGRATION
-- ============================================
-- Run this migration to add the advanced widget management system
-- Execute: psql "host=127.0.0.1 dbname=kpi_data user=postgres password=LexHVAC2025" -f migrations/001_add_widget_system.sql

-- Widget type definitions (available widget templates)
CREATE TABLE IF NOT EXISTS widget_types (
    id SERIAL PRIMARY KEY,
    widget_type_key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    icon VARCHAR(50),
    default_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard view definitions
CREATE TABLE IF NOT EXISTS dashboard_views (
    id SERIAL PRIMARY KEY,
    view_key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Widget instances (actual widgets placed on dashboards)
CREATE TABLE IF NOT EXISTS widget_instances (
    id SERIAL PRIMARY KEY,
    widget_instance_key VARCHAR(100) UNIQUE NOT NULL,
    widget_type_key VARCHAR(50) NOT NULL REFERENCES widget_types(widget_type_key),
    dashboard_view_key VARCHAR(50) NOT NULL REFERENCES dashboard_views(view_key),
    title VARCHAR(200),
    subtitle VARCHAR(200),
    layout_position INTEGER DEFAULT 0,
    grid_column_span INTEGER DEFAULT 1,
    grid_row_span INTEGER DEFAULT 1,
    config JSONB,
    is_visible BOOLEAN DEFAULT true,
    required_role VARCHAR(50),
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Widget data source mappings
CREATE TABLE IF NOT EXISTS widget_data_sources (
    id SERIAL PRIMARY KEY,
    data_source_key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    query_template TEXT,
    available_filters JSONB,
    refresh_interval_seconds INTEGER DEFAULT 300,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard layout presets (saved configurations)
CREATE TABLE IF NOT EXISTS dashboard_layout_presets (
    id SERIAL PRIMARY KEY,
    preset_name VARCHAR(100) NOT NULL,
    dashboard_view_key VARCHAR(50) NOT NULL REFERENCES dashboard_views(view_key),
    widget_configuration JSONB,
    is_default BOOLEAN DEFAULT false,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(preset_name, dashboard_view_key)
);

-- User dashboard preferences
CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(100) NOT NULL,
    dashboard_view_key VARCHAR(50) NOT NULL REFERENCES dashboard_views(view_key),
    preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, dashboard_view_key)
);

-- Create triggers for updated_at (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_widget_types_updated_at') THEN
        CREATE TRIGGER update_widget_types_updated_at BEFORE UPDATE
            ON widget_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dashboard_views_updated_at') THEN
        CREATE TRIGGER update_dashboard_views_updated_at BEFORE UPDATE
            ON dashboard_views FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_widget_instances_updated_at') THEN
        CREATE TRIGGER update_widget_instances_updated_at BEFORE UPDATE
            ON widget_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_widget_data_sources_updated_at') THEN
        CREATE TRIGGER update_widget_data_sources_updated_at BEFORE UPDATE
            ON widget_data_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dashboard_layout_presets_updated_at') THEN
        CREATE TRIGGER update_dashboard_layout_presets_updated_at BEFORE UPDATE
            ON dashboard_layout_presets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_dashboard_preferences_updated_at') THEN
        CREATE TRIGGER update_user_dashboard_preferences_updated_at BEFORE UPDATE
            ON user_dashboard_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_widget_instances_dashboard ON widget_instances(dashboard_view_key);
CREATE INDEX IF NOT EXISTS idx_widget_instances_type ON widget_instances(widget_type_key);
CREATE INDEX IF NOT EXISTS idx_widget_instances_position ON widget_instances(dashboard_view_key, layout_position);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_dashboard_preferences(user_email);

-- ============================================
-- SAMPLE WIDGET CONFIGURATION DATA
-- ============================================

-- Insert dashboard views
INSERT INTO dashboard_views (view_key, name, description, icon, display_order, is_active) VALUES
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
INSERT INTO widget_types (widget_type_key, name, description, category, icon, default_config, is_active) VALUES
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
INSERT INTO widget_data_sources (data_source_key, name, description, query_template, available_filters, is_active) VALUES
('comfort_advisor_perf', 'Comfort Advisor Performance', 'Comfort advisor metrics and performance data',
 'SELECT * FROM comfort_advisor_performance WHERE period_type = ''mtd'' ORDER BY total_sales_cents DESC',
 '[{"field": "period_type", "label": "Period", "type": "select", "options": ["mtd", "ytd", "last_month"]}]'::jsonb, true),

('call_center_perf', 'Call Center Performance', 'Call center metrics and KPIs',
 'SELECT * FROM call_center_performance WHERE period_type = ''today'' ORDER BY booking_percent DESC',
 '[{"field": "period_type", "label": "Period", "type": "select", "options": ["today", "wtd", "mtd", "last_month"]}]'::jsonb, true),

('department_financial', 'Department Financial', 'Financial performance by department',
 'SELECT * FROM department_financial_performance WHERE period_type = ''mtd'' ORDER BY revenue_cents DESC',
 '[{"field": "period_type", "label": "Period", "type": "select", "options": ["mtd", "ytd", "last_month"]}]'::jsonb, true)
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

-- Migration complete!
SELECT 'Widget Management System installed successfully!' AS status;
