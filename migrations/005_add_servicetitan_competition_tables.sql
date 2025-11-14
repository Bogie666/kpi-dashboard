-- ========================================
-- Add ServiceTitan Competition Data Tables
-- Items Sold Report and Sold Flips Report
-- ========================================

-- Items Sold Report Table
-- Stores individual item sales transactions
CREATE TABLE IF NOT EXISTS servicetitan_items_sold (
    id SERIAL PRIMARY KEY,
    invoice_date TIMESTAMP NOT NULL,
    sold_by_technician VARCHAR(255),
    code VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 0,
    invoice_number VARCHAR(50),
    job_business_unit VARCHAR(255),
    job_type VARCHAR(255),
    period_type VARCHAR(20) NOT NULL,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_item_sale UNIQUE (invoice_number, code, sold_by_technician, period_type)
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_items_sold_code ON servicetitan_items_sold(code);
CREATE INDEX IF NOT EXISTS idx_items_sold_tech ON servicetitan_items_sold(sold_by_technician);
CREATE INDEX IF NOT EXISTS idx_items_sold_date ON servicetitan_items_sold(invoice_date);
CREATE INDEX IF NOT EXISTS idx_items_sold_period ON servicetitan_items_sold(period_type);

-- Sold Flips (Technician Leads Sold) Report Table
-- Stores technician performance including converted jobs (sold flips)
-- Based on ServiceTitan Report 394041816
CREATE TABLE IF NOT EXISTS servicetitan_sold_flips (
    id SERIAL PRIMARY KEY,
    technician_name VARCHAR(255) NOT NULL,
    completed_jobs INTEGER DEFAULT 0,
    completed_revenue_cents BIGINT DEFAULT 0,
    total_job_average_cents BIGINT DEFAULT 0,
    adjustment_revenue_cents BIGINT DEFAULT 0,
    completed_revenue_with_adjustments_cents BIGINT DEFAULT 0,
    total_sales_cents BIGINT DEFAULT 0,
    close_rate NUMERIC(10,4) DEFAULT 0,
    closed_average_sale_cents BIGINT DEFAULT 0,
    total_lead_sales_cents BIGINT DEFAULT 0,
    leads_set INTEGER DEFAULT 0,
    leads_sold INTEGER DEFAULT 0,
    average_lead_sale_cents BIGINT DEFAULT 0,
    recall_percentage NUMERIC(10,4) DEFAULT 0,
    recall_jobs INTEGER DEFAULT 0,
    no_charge_jobs INTEGER DEFAULT 0,
    converted_jobs INTEGER DEFAULT 0,
    unconverted_jobs INTEGER DEFAULT 0,
    invoiced_jobs INTEGER DEFAULT 0,
    jobs_on_hold INTEGER DEFAULT 0,
    opportunity INTEGER DEFAULT 0,
    sales_opportunity INTEGER DEFAULT 0,
    replacement_opportunity INTEGER DEFAULT 0,
    closed_opportunities INTEGER DEFAULT 0,
    converted_job_average_cents BIGINT DEFAULT 0,
    opportunity_job_average_cents BIGINT DEFAULT 0,
    opportunity_conversion_rate NUMERIC(10,4) DEFAULT 0,
    invoiced_revenue_cents BIGINT DEFAULT 0,
    converted_revenue_cents BIGINT DEFAULT 0,
    memberships_sold INTEGER DEFAULT 0,
    membership_opportunities INTEGER DEFAULT 0,
    warranty_jobs INTEGER DEFAULT 0,
    completed_non_opportunities INTEGER DEFAULT 0,
    total_conversion_rate NUMERIC(10,4) DEFAULT 0,
    options_per_opportunity NUMERIC(10,4) DEFAULT 0,
    lead_conversion_rate NUMERIC(10,4) DEFAULT 0,
    billable_efficiency NUMERIC(10,4) DEFAULT 0,
    first_call_arrival_time VARCHAR(50),
    technician_division VARCHAR(255),
    technician_business_unit VARCHAR(255),
    technician_trade VARCHAR(100),
    period_type VARCHAR(20) NOT NULL,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tech_flip UNIQUE (technician_name, period_type)
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_sold_flips_tech ON servicetitan_sold_flips(technician_name);
CREATE INDEX IF NOT EXISTS idx_sold_flips_period ON servicetitan_sold_flips(period_type);
CREATE INDEX IF NOT EXISTS idx_sold_flips_converted ON servicetitan_sold_flips(converted_jobs);

-- Verify tables were created
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('servicetitan_items_sold', 'servicetitan_sold_flips')
ORDER BY table_name, ordinal_position;

SELECT '✅ ServiceTitan competition data tables created successfully!' as status;
