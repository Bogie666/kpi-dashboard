-- Migration: Add estimate analysis table for storing all estimates (won, unsold, dismissed)
-- This stores raw estimate data synced from ServiceTitan Report ID: 399168856
-- Data is synced periodically and served to the Analyze tab

CREATE TABLE IF NOT EXISTS estimate_analysis_raw (
    id SERIAL PRIMARY KEY,
    sync_date DATE NOT NULL,
    estimate_id VARCHAR(50),
    opportunity_number VARCHAR(50),
    customer_name VARCHAR(255),
    business_unit VARCHAR(100),
    opportunity_status VARCHAR(50),
    estimate_status VARCHAR(50),
    sold_on DATE,
    estimates_subtotal_cents BIGINT DEFAULT 0,
    creation_date DATE,
    estimate_created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_estimate_analysis_sync_date ON estimate_analysis_raw(sync_date);
CREATE INDEX IF NOT EXISTS idx_estimate_analysis_opportunity ON estimate_analysis_raw(opportunity_number);
CREATE INDEX IF NOT EXISTS idx_estimate_analysis_creation_date ON estimate_analysis_raw(creation_date);
CREATE INDEX IF NOT EXISTS idx_estimate_analysis_business_unit ON estimate_analysis_raw(business_unit);
CREATE INDEX IF NOT EXISTS idx_estimate_analysis_status ON estimate_analysis_raw(opportunity_status);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON estimate_analysis_raw TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE estimate_analysis_raw_id_seq TO PUBLIC;
