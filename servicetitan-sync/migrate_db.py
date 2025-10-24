import os
from google.cloud.sql.connector import Connector
import functions_framework

@functions_framework.http
def migrate_add_leads_set(request):
    """Add leads_set column to HVAC performance tables"""

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

        # Add leads_set column to hvac_tech_performance
        messages.append("Adding leads_set column to hvac_tech_performance...")
        cursor.execute("""
            ALTER TABLE hvac_tech_performance
            ADD COLUMN IF NOT EXISTS leads_set NUMERIC(10,2) DEFAULT 0
        """)
        conn.commit()
        messages.append("✅ Successfully added leads_set to hvac_tech_performance")

        # Add leads_set column to hvac_maintenance_performance
        messages.append("Adding leads_set column to hvac_maintenance_performance...")
        cursor.execute("""
            ALTER TABLE hvac_maintenance_performance
            ADD COLUMN IF NOT EXISTS leads_set NUMERIC(10,2) DEFAULT 0
        """)
        conn.commit()
        messages.append("✅ Successfully added leads_set to hvac_maintenance_performance")

        # Verify the columns were added
        messages.append("\nVerifying columns...")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'hvac_tech_performance'
            AND column_name = 'leads_set'
        """)
        result = cursor.fetchone()
        if result:
            messages.append(f"✅ hvac_tech_performance.leads_set: {result[1]}")

        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'hvac_maintenance_performance'
            AND column_name = 'leads_set'
        """)
        result = cursor.fetchone()
        if result:
            messages.append(f"✅ hvac_maintenance_performance.leads_set: {result[1]}")

        messages.append("\n🎉 Migration completed successfully!")

        cursor.close()
        conn.close()
        connector.close()

        return {"status": "success", "messages": messages}

    except Exception as e:
        messages.append(f"❌ Error: {str(e)}")
        return {"status": "error", "messages": messages, "error": str(e)}, 500
