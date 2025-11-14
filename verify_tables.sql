-- Quick verification that competition tables exist
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'competition%'
ORDER BY table_name;

-- Test the helper function
SELECT calculate_competition_points(10, 20, 15) as test_points;
-- Expected: 320 = (10*10) + (20*5) + (15*8)
