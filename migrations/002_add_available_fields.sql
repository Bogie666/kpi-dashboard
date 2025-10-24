-- ============================================
-- ADD AVAILABLE_FIELDS TO WIDGET DATA SOURCES
-- ============================================
-- Execute: psql "host=127.0.0.1 dbname=kpi_data user=postgres password=LexHVAC2025" -f migrations/002_add_available_fields.sql

-- Add available_fields column if it doesn't exist
ALTER TABLE widget_data_sources
ADD COLUMN IF NOT EXISTS available_fields JSONB DEFAULT '[]'::jsonb;

-- Update existing data sources with available fields
UPDATE widget_data_sources
SET available_fields = '[
  {"field": "employee_name", "label": "Employee", "type": "string"},
  {"field": "total_sales_cents", "label": "Total Sales", "type": "currency"},
  {"field": "close_rate_percent", "label": "Close Rate", "type": "percentage"},
  {"field": "completed_jobs", "label": "Completed Jobs", "type": "number"},
  {"field": "closed_average_sale_cents", "label": "Avg Sale", "type": "currency"}
]'::jsonb
WHERE data_source_key = 'comfort_advisor_perf';

UPDATE widget_data_sources
SET available_fields = '[
  {"field": "employee_name", "label": "Employee", "type": "string"},
  {"field": "total_calls", "label": "Total Calls", "type": "number"},
  {"field": "booking_percent", "label": "Booking Rate", "type": "percentage"},
  {"field": "booked_calls", "label": "Booked Calls", "type": "number"}
]'::jsonb
WHERE data_source_key = 'call_center_perf';

UPDATE widget_data_sources
SET available_fields = '[
  {"field": "department_name", "label": "Department", "type": "string"},
  {"field": "revenue_cents", "label": "Revenue", "type": "currency"},
  {"field": "budget_percentage", "label": "Budget %", "type": "percentage"},
  {"field": "jobs_completed", "label": "Jobs", "type": "number"}
]'::jsonb
WHERE data_source_key = 'department_financial';

SELECT 'Available fields added successfully!' AS status;

-- Verify the update
SELECT data_source_key, name, available_fields
FROM widget_data_sources
WHERE is_active = true;
