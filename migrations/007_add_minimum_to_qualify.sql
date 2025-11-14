-- ========================================
-- Add minimum_to_qualify column to competitions table
-- This is the minimum total points needed to qualify for prizes
-- ========================================

ALTER TABLE competitions
ADD COLUMN minimum_to_qualify INTEGER DEFAULT 25;

-- Update existing competitions to have the default minimum
UPDATE competitions
SET minimum_to_qualify = 25
WHERE minimum_to_qualify IS NULL;

SELECT 'Added minimum_to_qualify column to competitions table' as status;
