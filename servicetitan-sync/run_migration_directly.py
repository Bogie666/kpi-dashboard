"""
Run the competition tables migration directly
This script connects to the database and creates the tables
"""

import os
from google.cloud.sql.connector import Connector

# Database connection settings
INSTANCE_CONNECTION_NAME = "new-dashboard-2025:us-central1:kpi-dashboard"
DB_USER = "postgres"
DB_PASSWORD = os.getenv("DB_PASSWORD", "LexHVAC2025")
DB_NAME = "kpi_dashboard"

def create_tables():
    """Create competition tables"""

    print("Initializing database connector...")
    connector = Connector()

    def getconn():
        conn = connector.connect(
            INSTANCE_CONNECTION_NAME,
            "pg8000",
            user=DB_USER,
            password=DB_PASSWORD,
            db=DB_NAME,
        )
        return conn

    try:
        print("Connecting to database...")
        conn = getconn()
        cursor = conn.cursor()

        print("Creating competition tables...")

        # Table: competitions
        print("- competitions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS competitions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_competition_name UNIQUE (name)
            )
        """)
        conn.commit()

        # Table: competition_leaderboard
        print("- competition_leaderboard table...")
        cursor.execute("""
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
            )
        """)
        conn.commit()

        # Table: competition_sync_log
        print("- competition_sync_log table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS competition_sync_log (
                id SERIAL PRIMARY KEY,
                competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
                sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_type VARCHAR(50),
                techs_updated INTEGER DEFAULT 0,
                status VARCHAR(50) DEFAULT 'success',
                error_message TEXT
            )
        """)
        conn.commit()

        # Indexes
        print("Creating indexes...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leaderboard_competition ON competition_leaderboard(competition_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON competition_leaderboard(competition_id, total_points DESC)")
        conn.commit()

        # Helper function
        print("Creating helper function...")
        cursor.execute("""
            CREATE OR REPLACE FUNCTION calculate_competition_points(
                p_sold_flips INTEGER,
                p_uv_lights INTEGER,
                p_reviews INTEGER
            )
            RETURNS INTEGER AS $$
            BEGIN
                RETURN (p_sold_flips * 10) + (p_uv_lights * 5) + (p_reviews * 8);
            END;
            $$ LANGUAGE plpgsql
        """)
        conn.commit()

        print("\n✅ All tables and functions created successfully!")

        # Verify
        print("\nVerifying tables...")
        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'competition%'
        """)

        tables = cursor.fetchall()
        for table in tables:
            print(f"  ✓ {table[0]}")

        cursor.close()
        conn.close()
        connector.close()

        print("\n🎉 Migration completed successfully!")
        return True

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = create_tables()
    exit(0 if success else 1)
