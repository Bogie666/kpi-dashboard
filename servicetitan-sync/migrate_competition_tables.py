"""
Migration script to add competition tables to the database
Run this to create the competition system tables
"""

import os
from google.cloud.sql.connector import Connector
import functions_framework

@functions_framework.http
def migrate_competition_tables(request):
    """Add competition tables to the database"""

    # Database connection settings
    INSTANCE_CONNECTION_NAME = "new-dashboard-2025:us-central1:kpi-dashboard"
    DB_USER = "postgres"
    DB_PASSWORD = os.getenv("DB_PASSWORD", "LexHVAC2025")
    DB_NAME = "kpi_dashboard"

    # Initialize Connector
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

    messages = []

    try:
        messages.append("Connecting to database...")
        conn = getconn()
        cursor = conn.cursor()

        # Execute the migration SQL directly (embedded)
        messages.append("Creating competition tables...")

        # Table: competitions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS competitions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
                sold_flips_target INTEGER DEFAULT 0,
                uv_lights_target INTEGER DEFAULT 0,
                reviews_target INTEGER DEFAULT 0,
                first_prize DECIMAL(10,2) DEFAULT 500.00,
                second_prize DECIMAL(10,2) DEFAULT 300.00,
                third_prize DECIMAL(10,2) DEFAULT 150.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(255),
                CONSTRAINT unique_competition_name UNIQUE (name)
            )
        """)
        conn.commit()
        messages.append("✅ Created competitions table")

        # Table: competition_leaderboard
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS competition_leaderboard (
                id SERIAL PRIMARY KEY,
                competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
                technician_name VARCHAR(255) NOT NULL,
                technician_id VARCHAR(100),
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
        messages.append("✅ Created competition_leaderboard table")

        # Table: competition_sync_log
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS competition_sync_log (
                id SERIAL PRIMARY KEY,
                competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
                sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_type VARCHAR(50),
                techs_updated INTEGER DEFAULT 0,
                uv_lights_synced BOOLEAN DEFAULT FALSE,
                sold_flips_synced BOOLEAN DEFAULT FALSE,
                reviews_synced BOOLEAN DEFAULT FALSE,
                status VARCHAR(50) DEFAULT 'success',
                error_message TEXT,
                data_snapshot JSONB
            )
        """)
        conn.commit()
        messages.append("✅ Created competition_sync_log table")

        # Indexes
        messages.append("Creating indexes...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_competitions_dates ON competitions(start_date, end_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leaderboard_competition ON competition_leaderboard(competition_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON competition_leaderboard(competition_id, rank)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON competition_leaderboard(competition_id, total_points DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_log_competition ON competition_sync_log(competition_id)")
        conn.commit()
        messages.append("✅ Created indexes")

        # Functions
        messages.append("Creating functions...")

        # Update timestamp function
        cursor.execute("""
            CREATE OR REPLACE FUNCTION update_competition_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        """)
        conn.commit()
        messages.append("✅ Created update_competition_updated_at function")

        # Calculate points function
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
        messages.append("✅ Created calculate_competition_points function")

        # Update ranks function
        cursor.execute("""
            CREATE OR REPLACE FUNCTION update_competition_ranks(p_competition_id INTEGER)
            RETURNS VOID AS $$
            BEGIN
                UPDATE competition_leaderboard
                SET previous_rank = rank
                WHERE competition_id = p_competition_id AND previous_rank IS NULL;

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
            $$ LANGUAGE plpgsql
        """)
        conn.commit()
        messages.append("✅ Created update_competition_ranks function")

        # Triggers
        messages.append("Creating triggers...")
        cursor.execute("DROP TRIGGER IF EXISTS trigger_competition_updated_at ON competitions")
        cursor.execute("""
            CREATE TRIGGER trigger_competition_updated_at
                BEFORE UPDATE ON competitions
                FOR EACH ROW
                EXECUTE FUNCTION update_competition_updated_at()
        """)
        cursor.execute("DROP TRIGGER IF EXISTS trigger_leaderboard_updated_at ON competition_leaderboard")
        cursor.execute("""
            CREATE TRIGGER trigger_leaderboard_updated_at
                BEFORE UPDATE ON competition_leaderboard
                FOR EACH ROW
                EXECUTE FUNCTION update_competition_updated_at()
        """)
        conn.commit()
        messages.append("✅ Created triggers")

        messages.append("✅ Competition tables created successfully!")

        # Verify tables were created
        messages.append("\nVerifying tables...")

        tables_to_check = ['competitions', 'competition_leaderboard', 'competition_sync_log']

        for table in tables_to_check:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = %s
                )
            """, (table,))

            exists = cursor.fetchone()[0]

            if exists:
                # Get column count
                cursor.execute("""
                    SELECT COUNT(*)
                    FROM information_schema.columns
                    WHERE table_name = %s
                """, (table,))

                col_count = cursor.fetchone()[0]
                messages.append(f"✅ Table '{table}' created with {col_count} columns")
            else:
                messages.append(f"❌ Table '{table}' not found!")

        # Check functions
        messages.append("\nVerifying functions...")

        functions_to_check = [
            'calculate_competition_points',
            'update_competition_ranks',
            'update_competition_updated_at'
        ]

        for func in functions_to_check:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM pg_proc p
                    JOIN pg_namespace n ON p.pronamespace = n.oid
                    WHERE n.nspname = 'public'
                    AND p.proname = %s
                )
            """, (func,))

            exists = cursor.fetchone()[0]

            if exists:
                messages.append(f"✅ Function '{func}' created")
            else:
                messages.append(f"❌ Function '{func}' not found!")

        messages.append("\n🎉 Migration completed successfully!")
        messages.append("\nNext steps:")
        messages.append("1. Create your first competition in the admin panel")
        messages.append("2. Configure ServiceTitan sync credentials")
        messages.append("3. Run a test sync")

        cursor.close()
        conn.close()
        connector.close()

        return {
            "status": "success",
            "messages": messages,
            "tables_created": tables_to_check,
            "functions_created": functions_to_check
        }

    except Exception as e:
        messages.append(f"❌ Error: {str(e)}")
        import traceback
        messages.append(f"Traceback: {traceback.format_exc()}")

        return {
            "status": "error",
            "messages": messages,
            "error": str(e)
        }, 500


# For local testing
if __name__ == '__main__':
    class MockRequest:
        pass

    result = migrate_competition_tables(MockRequest())
    print("\n".join(result.get('messages', [])))
