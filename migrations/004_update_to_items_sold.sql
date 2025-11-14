-- ========================================
-- Update Competition System for Configurable Items
-- Changes UV Lights to Items Sold with configurable item code
-- ========================================

-- Update competitions table
ALTER TABLE competitions
  RENAME COLUMN uv_lights_target TO items_sold_target;

ALTER TABLE competitions
  ADD COLUMN item_code VARCHAR(100);

COMMENT ON COLUMN competitions.item_code IS 'Item code to track (e.g., MUV-7-50DR-12)';

-- Update competition_leaderboard table
ALTER TABLE competition_leaderboard
  RENAME COLUMN uv_lights TO items_sold;

-- Update existing competition with default item code
UPDATE competitions
SET item_code = 'MUV-7-50DR-12'
WHERE item_code IS NULL;

-- Verify changes
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'competitions'
    AND column_name IN ('items_sold_target', 'item_code')
ORDER BY column_name;

SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'competition_leaderboard'
    AND column_name = 'items_sold';

SELECT '✅ Competition tables updated to support configurable items!' as status;
