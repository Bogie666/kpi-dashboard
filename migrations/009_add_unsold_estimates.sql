-- Migration: Add unsold estimates tables for potential revenue tracking
-- This stores both aggregated summary data for dashboard display
-- and raw data for Tools page export functionality

-- Aggregated summary for dashboard display
CREATE TABLE IF NOT EXISTS unsold_estimates_summary (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL,
    period_type VARCHAR(50) NOT NULL,
    total_opportunities INTEGER DEFAULT 0,
    total_potential_revenue_cents BIGINT DEFAULT 0,
    total_estimates INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_date, period_type)
);

-- Raw data for Tools page export
CREATE TABLE IF NOT EXISTS unsold_estimates_raw (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL,
    period_type VARCHAR(50) NOT NULL,
    estimate_id VARCHAR(50),
    opportunity_number VARCHAR(50),
    customer_name VARCHAR(255),
    location_phone VARCHAR(50),
    customer_email VARCHAR(255),
    business_unit VARCHAR(100),
    email_sent VARCHAR(50),
    estimates_discount_total_cents BIGINT DEFAULT 0,
    estimates_subtotal_cents BIGINT DEFAULT 0,
    estimate_age_days INTEGER DEFAULT 0,
    follow_up_date DATE,
    number_of_follow_ups INTEGER DEFAULT 0,
    creation_date DATE,
    estimate_created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_unsold_summary_period ON unsold_estimates_summary(period_type);
CREATE INDEX IF NOT EXISTS idx_unsold_raw_period ON unsold_estimates_raw(period_type);
CREATE INDEX IF NOT EXISTS idx_unsold_raw_opportunity ON unsold_estimates_raw(opportunity_number);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON unsold_estimates_summary TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON unsold_estimates_raw TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE unsold_estimates_summary_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE unsold_estimates_raw_id_seq TO PUBLIC;
