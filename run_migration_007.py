#!/usr/bin/env python3
"""
Run migration 007 to add minimum_to_qualify column
"""
import psycopg2
from google.cloud.sql.connector import Connector
import os

def run_migration():
    # Initialize Connector
    connector = Connector()

    def getconn():
        conn = connector.connect(
            "new-dashboard-2025:us-central1:kpi-dashboard",
            "pg8000",
            user="postgres",
            password=os.environ.get("DB_PASSWORD", ""),
            db="kpi_data"
        )
        return conn

    # Create connection pool
    try:
        conn = getconn()
        cursor = conn.cursor()

        print("Running migration 007...")

        # Add column if it doesn't exist
        cursor.execute("""
            ALTER TABLE competitions
            ADD COLUMN IF NOT EXISTS minimum_to_qualify INTEGER DEFAULT 25;
        """)

        # Update existing rows
        cursor.execute("""
            UPDATE competitions
            SET minimum_to_qualify = 25
            WHERE minimum_to_qualify IS NULL;
        """)

        conn.commit()

        # Verify
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'competitions' AND column_name = 'minimum_to_qualify';
        """)

        result = cursor.fetchone()
        if result:
            print(f"✅ Migration complete! Column added: {result}")
        else:
            print("❌ Column not found after migration")

        cursor.close()
        conn.close()
        connector.close()

    except Exception as e:
        print(f"Error running migration: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_migration()
