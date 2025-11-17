-- Create table for cached Google reviews
CREATE TABLE IF NOT EXISTS google_reviews_cache (
    id SERIAL PRIMARY KEY,
    review_id VARCHAR(255) UNIQUE NOT NULL,
    reviewer_name VARCHAR(255),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_reply TEXT,
    location_name VARCHAR(255) NOT NULL,
    location_id VARCHAR(50) NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    review_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_google_reviews_location ON google_reviews_cache(location_id);
CREATE INDEX IF NOT EXISTS idx_google_reviews_date ON google_reviews_cache(review_date DESC);

-- Create table to track sync status
CREATE TABLE IF NOT EXISTS google_reviews_sync_status (
    id SERIAL PRIMARY KEY,
    last_sync_at TIMESTAMP NOT NULL,
    total_reviews_synced INTEGER NOT NULL,
    sync_status VARCHAR(50) NOT NULL,
    error_message TEXT,
    location_stats JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_google_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_google_reviews_updated_at ON google_reviews_cache;
CREATE TRIGGER trigger_update_google_reviews_updated_at
    BEFORE UPDATE ON google_reviews_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_google_reviews_updated_at();

-- Grant permissions (adjust role as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON google_reviews_cache TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON google_reviews_sync_status TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE google_reviews_cache_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE google_reviews_sync_status_id_seq TO PUBLIC;
