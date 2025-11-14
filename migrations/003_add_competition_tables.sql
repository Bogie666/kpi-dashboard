-- Competition System Tables
-- Migration: 003_add_competition_tables.sql

-- Table: competitions
-- Stores competition details (dates, metrics, targets)
CREATE TABLE IF NOT EXISTS competitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),

    -- Metric targets
    sold_flips_target INTEGER DEFAULT 0,
    uv_lights_target INTEGER DEFAULT 0,
    reviews_target INTEGER DEFAULT 0,

    -- Prize amounts
    first_prize DECIMAL(10,2) DEFAULT 500.00,
    second_prize DECIMAL(10,2) DEFAULT 300.00,
    third_prize DECIMAL(10,2) DEFAULT 150.00,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT unique_competition_name UNIQUE (name)
);

-- Table: competition_leaderboard
-- Stores technician performance in competitions
CREATE TABLE IF NOT EXISTS competition_leaderboard (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,

    -- Technician info
    technician_name VARCHAR(255) NOT NULL,
    technician_id VARCHAR(100), -- Optional: ST technician ID

    -- Metrics
    sold_flips INTEGER DEFAULT 0,
    uv_lights INTEGER DEFAULT 0,
    reviews INTEGER DEFAULT 0,

    -- Calculated fields
    total_points INTEGER DEFAULT 0,
    rank INTEGER,
    previous_rank INTEGER,

    -- Engagement metrics
    streak_days INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]'::jsonb,

    -- Metadata
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_tech_per_competition UNIQUE (competition_id, technician_name)
);

-- Table: competition_sync_log
-- Tracks data sync operations
CREATE TABLE IF NOT EXISTS competition_sync_log (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
    sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_type VARCHAR(50), -- 'manual', 'scheduled', 'auto'

    -- Sync results
    techs_updated INTEGER DEFAULT 0,
    uv_lights_synced BOOLEAN DEFAULT FALSE,
    sold_flips_synced BOOLEAN DEFAULT FALSE,
    reviews_synced BOOLEAN DEFAULT FALSE,

    -- Status
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,

    -- Data snapshot
    data_snapshot JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);
CREATE INDEX IF NOT EXISTS idx_competitions_dates ON competitions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leaderboard_competition ON competition_leaderboard(competition_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON competition_leaderboard(competition_id, rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON competition_leaderboard(competition_id, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_competition ON competition_sync_log(competition_id);

-- Function: Update competition leaderboard updated_at
CREATE OR REPLACE FUNCTION update_competition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_competition_updated_at ON competitions;
CREATE TRIGGER trigger_competition_updated_at
    BEFORE UPDATE ON competitions
    FOR EACH ROW
    EXECUTE FUNCTION update_competition_updated_at();

DROP TRIGGER IF NOT EXISTS trigger_leaderboard_updated_at ON competition_leaderboard;
CREATE TRIGGER trigger_leaderboard_updated_at
    BEFORE UPDATE ON competition_leaderboard
    FOR EACH ROW
    EXECUTE FUNCTION update_competition_updated_at();

-- Function: Calculate total points
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

-- Function: Update ranks for a competition
CREATE OR REPLACE FUNCTION update_competition_ranks(p_competition_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Store previous ranks
    UPDATE competition_leaderboard
    SET previous_rank = rank
    WHERE competition_id = p_competition_id AND previous_rank IS NULL;

    -- Calculate new ranks
    WITH ranked_techs AS (
        SELECT
            id,
            ROW_NUMBER() OVER (ORDER BY total_points DESC, updated_at ASC) as new_rank
        FROM competition_leaderboard
        WHERE competition_id = p_competition_id
    )
    UPDATE competition_leaderboard cl
    SET rank = rt.new_rank
    FROM ranked_techs rt
    WHERE cl.id = rt.id;
END;
$$ LANGUAGE plpgsql;

-- Sample data (optional - for testing)
-- Uncomment to insert sample competition
/*
INSERT INTO competitions (name, start_date, end_date, status, sold_flips_target, uv_lights_target, reviews_target)
VALUES ('November Hustle', '2025-11-01', '2025-11-30', 'active', 25, 50, 40)
ON CONFLICT (name) DO NOTHING;
*/

COMMENT ON TABLE competitions IS 'Stores HVAC technician competition configurations';
COMMENT ON TABLE competition_leaderboard IS 'Tracks technician performance in competitions';
COMMENT ON TABLE competition_sync_log IS 'Logs competition data synchronization events';
COMMENT ON FUNCTION calculate_competition_points IS 'Calculates total points: (flips*10) + (lights*5) + (reviews*8)';
COMMENT ON FUNCTION update_competition_ranks IS 'Updates technician rankings within a competition';
