-- Migration: Add first_call_arrival_time to trade-specific technician tables
-- This field stores the average time technicians arrive at their first call

-- Add to hvac_tech_performance
ALTER TABLE hvac_tech_performance
ADD COLUMN IF NOT EXISTS first_call_arrival_time VARCHAR(50);

-- Add to hvac_maintenance_performance
ALTER TABLE hvac_maintenance_performance
ADD COLUMN IF NOT EXISTS first_call_arrival_time VARCHAR(50);

-- Add to commercial_hvac_performance
ALTER TABLE commercial_hvac_performance
ADD COLUMN IF NOT EXISTS first_call_arrival_time VARCHAR(50);

-- Add to plumbing_tech_performance
ALTER TABLE plumbing_tech_performance
ADD COLUMN IF NOT EXISTS first_call_arrival_time VARCHAR(50);

-- Add to electrical_tech_performance
ALTER TABLE electrical_tech_performance
ADD COLUMN IF NOT EXISTS first_call_arrival_time VARCHAR(50);
