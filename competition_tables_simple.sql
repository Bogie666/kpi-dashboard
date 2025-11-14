-- ========================================
-- Competition System Tables - Simple Version
-- Run this in Google Cloud SQL Console
-- ========================================

-- Table 1: competitions
CREATE TABLE IF NOT EXISTS competitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    sold_flips_target INTEGER DEFAULT 0,
    uv_lights_target INTEGER DEFAULT 0,
    reviews_target INTEGER DEFAULT 0,
    first_prize DECIMAL(10,2) DEFAULT 500.00,
    second_prize DECIMAL(10,2) DEFAULT 300.00,
    third_prize DECIMAL(10,2) DEFAULT 150.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: competition_leaderboard
CREATE TABLE IF NOT EXISTS competition_leaderboard (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    technician_name VARCHAR(255) NOT NULL,
    sold_flips INTEGER DEFAULT 0,
    uv_lights INTEGER DEFAULT 0,
    reviews INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    rank INTEGER,
    previous_rank INTEGER,
    streak_days INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]'::jsonb,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tech_per_competition UNIQUE (competition_id, technician_name)
);

-- Table 3: competition_sync_log
CREATE TABLE IF NOT EXISTS competition_sync_log (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
    sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_type VARCHAR(50),
    techs_updated INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_competition ON competition_leaderboard(competition_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON competition_leaderboard(competition_id, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);

-- Helper function to calculate points
CREATE OR REPLACE FUNCTION calculate_competition_points(
    p_sold_flips INTEGER,
    p_uv_lights INTEGER,
    p_reviews INTEGER
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (p_sold_flips * 10) + (p_uv_lights * 5) + (p_reviews * 8);
END;
$$ LANGUAGE plpgsql;

-- Verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'competition%'
ORDER BY table_name;

-- Success message
SELECT '✅ Competition tables created successfully!' as status;
