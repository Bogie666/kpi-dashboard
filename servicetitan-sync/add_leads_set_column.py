#!/usr/bin/env python3
"""
Add leads_set column to HVAC technician and maintenance performance tables
"""

import os
from google.cloud.sql.connector import Connector
import pg8000

def add_leads_set_columns():
    """Add leads_set column to both HVAC performance tables"""

    # Database connection settings
    INSTANCE_CONNECTION_NAME = os.getenv("INSTANCE_CONNECTION_NAME", "new-dashboard-2025:us-central1:kpi-dashboard")
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

    print("Connecting to database...")
    conn = getconn()
    cursor = conn.cursor()

    try:
        # Add leads_set column to hvac_tech_performance
        print("Adding leads_set column to hvac_tech_performance...")
        cursor.execute("""
            ALTER TABLE hvac_tech_performance
            ADD COLUMN IF NOT EXISTS leads_set NUMERIC(10,2) DEFAULT 0
        """)
        conn.commit()
        print("✅ Successfully added leads_set to hvac_tech_performance")

        # Add leads_set column to hvac_maintenance_performance
        print("Adding leads_set column to hvac_maintenance_performance...")
        cursor.execute("""
            ALTER TABLE hvac_maintenance_performance
            ADD COLUMN IF NOT EXISTS leads_set NUMERIC(10,2) DEFAULT 0
        """)
        conn.commit()
        print("✅ Successfully added leads_set to hvac_maintenance_performance")

        # Verify the columns were added
        print("\nVerifying columns...")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'hvac_tech_performance'
            AND column_name = 'leads_set'
        """)
        result = cursor.fetchone()
        if result:
            print(f"✅ hvac_tech_performance.leads_set: {result[1]}")

        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'hvac_maintenance_performance'
            AND column_name = 'leads_set'
        """)
        result = cursor.fetchone()
        if result:
            print(f"✅ hvac_maintenance_performance.leads_set: {result[1]}")

        print("\n🎉 Migration completed successfully!")

    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()
        connector.close()

if __name__ == "__main__":
    add_leads_set_columns()
