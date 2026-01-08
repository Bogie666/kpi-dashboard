import requests
import psycopg2
from datetime import datetime, timedelta
from google.cloud import secretmanager
import json
import os
import logging
import traceback
import time
import functions_framework

BUSINESS_UNIT_DEPARTMENT_MAPPING = {
    "*DO NOT USE - LYONS IAQ ": "ignore",
    "*DO NOT USE - Service IAQ ": "ignore", 
    "*DO NOT USE- RNC Install": "ignore",
    "*DO NOT USE- RNC Rough ": "ignore",
    "*DO NOT USE- RNC Sales": "ignore",
    "*DO NOT USE- Service Warranty (0-2 Yrs)": "ignore",
    "*DO NOT USE- Tyler RNC Install": "ignore",
    "*DO NOT USE- Tyler RNC Sales": "ignore",
    "Commercial Install": "commercial_hvac",
    "Commercial Maintenance": "commercial_hvac", 
    "Commercial Sales": "commercial_hvac",
    "Commercial Service": "commercial_hvac",
    "Electrical Maintenance": "electrical",
    "Electrical Service": "electrical",
    "LYONS Install ": "hvac_replacement",
    "LYONS Maintenance ": "hvac_maintenance",
    "LYONS Sales ": "hvac_replacement", 
    "LYONS Service": "hvac_service",
    "Plumbing Maintenance ": "plumbing",
    "Plumbing Service ": "plumbing",
    "Plumbing Sewer": "plumbing",
    "Service  Star": "ignore",
    "Service Install ": "hvac_replacement",
    "Service Maintenance ": "hvac_maintenance", 
    "Service Residential": "hvac_service",
    "Service Sales ": "hvac_replacement",
    "Tyler IAQ": "tyler",
    "Tyler Install ": "tyler",
    "Tyler Maintenance": "tyler",
    "Tyler Sales Dept.": "tyler", 
    "Tyler Service ": "tyler"
}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def access_secret_version(project_id, secret_id, version_id="latest"):
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version_id}"
    try:
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    except Exception as e:
        logger.error(f"Error accessing secret {secret_id}: {str(e)}")
        raise

class Database:
    def __init__(self):
        pass
        
    def get_connection(self):
        """Get database connection - matches admin-api connection pattern"""
        instance_name = os.environ.get('INSTANCE_CONNECTION_NAME', 'new-dashboard-2025:us-central1:kpi-dashboard')
        
        try:
            socket_dir = os.environ.get('DB_SOCKET_DIR', '/cloudsql')
            socket_path = f'{socket_dir}/{instance_name}'
            
            logger.info(f"Attempting connection via socket: {socket_path}")
            
            return psycopg2.connect(
                host=socket_path,
                database='kpi_data',
                user='postgres',
                password=os.environ.get('DB_PASSWORD', 'LexHVAC2025')
            )
        except Exception as socket_error:
            logger.warning(f"Socket connection failed: {socket_error}")
            
            # Try alternative socket format
            try:
                alt_socket_path = f'/cloudsql/{instance_name}'
                logger.info(f"Attempting alternative socket: {alt_socket_path}")
                
                return psycopg2.connect(
                    host=alt_socket_path,
                    database='kpi_data',
                    user='postgres',
                    password=os.environ.get('DB_PASSWORD', 'LexHVAC2025')
                )
            except Exception as alt_error:
                logger.error(f"All connection methods failed. Primary socket: {socket_error}, Alt socket: {alt_error}")
                raise alt_error

    def insert_comfort_advisor_data(self, data, period_type):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                if period_type in ['mtd', 'ytd', 'last_month']:
                    cursor.execute("""
                        DELETE FROM comfort_advisor_performance 
                        WHERE period_type = %s
                    """, (period_type,))
                    deleted_count = cursor.rowcount
                    logger.info(f"Cleared {deleted_count} existing '{period_type}' records before inserting new data")
                query = """
                INSERT INTO comfort_advisor_performance (
                    report_date, period_type, employee_name, business_unit, team, completed_jobs, 
                    sales_opportunities, marketing_lead_jobs, tech_lead_jobs, closed_opportunities,
                    canceled_jobs, total_sales_cents, closed_average_sale_cents, close_rate_percent, 
                    options_per_opportunity, tgl_opportunities, tgl_sales_cents, tgl_close_rate_percent,
                    tgl_average_sale_cents, tgl_jobs, marketing_opportunities, marketing_sales_cents,
                    marketing_close_rate_percent, marketing_average_sale_cents, marketing_jobs, 
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (employee_name, report_date, period_type)
                DO UPDATE SET
                    business_unit = EXCLUDED.business_unit,
                    team = EXCLUDED.team,
                    completed_jobs = EXCLUDED.completed_jobs,
                    sales_opportunities = EXCLUDED.sales_opportunities,
                    marketing_lead_jobs = EXCLUDED.marketing_lead_jobs,
                    tech_lead_jobs = EXCLUDED.tech_lead_jobs,
                    closed_opportunities = EXCLUDED.closed_opportunities,
                    canceled_jobs = EXCLUDED.canceled_jobs,
                    total_sales_cents = EXCLUDED.total_sales_cents,
                    closed_average_sale_cents = EXCLUDED.closed_average_sale_cents,
                    close_rate_percent = EXCLUDED.close_rate_percent,
                    options_per_opportunity = EXCLUDED.options_per_opportunity,
                    tgl_opportunities = EXCLUDED.tgl_opportunities,
                    tgl_sales_cents = EXCLUDED.tgl_sales_cents,
                    tgl_close_rate_percent = EXCLUDED.tgl_close_rate_percent,
                    tgl_average_sale_cents = EXCLUDED.tgl_average_sale_cents,
                    tgl_jobs = EXCLUDED.tgl_jobs,
                    marketing_opportunities = EXCLUDED.marketing_opportunities,
                    marketing_sales_cents = EXCLUDED.marketing_sales_cents,
                    marketing_close_rate_percent = EXCLUDED.marketing_close_rate_percent,
                    marketing_average_sale_cents = EXCLUDED.marketing_average_sale_cents,
                    marketing_jobs = EXCLUDED.marketing_jobs,
                    updated_at = EXCLUDED.updated_at
                """
                for record in data:
                    cursor.execute(query, (
                        datetime.now().date(),
                        record["period_type"], 
                        record["employee_name"], 
                        record["business_unit"], 
                        record["team"],
                        record["completed_jobs"], 
                        record.get("total_opportunities", 0),
                        record.get("marketing_jobs", 0),
                        record.get("tgl_jobs", 0),
                        record.get("closed_opportunities", 0),
                        record.get("cancellations", 0),
                        record["total_sales_cents"], 
                        record["average_sale_cents"],
                        record["close_rate_percent"], 
                        record.get("options_per_job", 0),
                        record["tgl_opportunities"], 
                        record["tgl_sales_cents"], 
                        record["tgl_close_rate_percent"],
                        record["tgl_average_sale_cents"], 
                        record["tgl_jobs"],
                        record["marketing_opportunities"], 
                        record["marketing_sales_cents"],
                        record["marketing_close_rate_percent"], 
                        record["marketing_average_sale_cents"],
                        record["marketing_jobs"],
                        record["updated_at"],
                        record["updated_at"]
                    ))
                conn.commit()

    def insert_call_center_data(self, data, period_type, report_date):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                try:
                    # For "today" data, delete existing records first to prevent duplicates
                    if period_type in ['today', 'week', 'mtd', 'last_month']:
                        cursor.execute("""
                            DELETE FROM call_center_performance 
                            WHERE period_type = %s
                            """, (period_type,))
                        deleted_count = cursor.rowcount
                        logger.info(f"Cleared {deleted_count} existing '{period_type}' records before inserting new data")
                    
                    # Based on your schema.sql, use only the columns that exist
                    query = """
                    INSERT INTO call_center_performance (
                        report_date, period_type, employee_name, total_calls, calls_per_hour, booked_calls,
                        inbound_calls, outbound_calls, booking_percent, avg_call_duration_seconds,
                        cool_club_memberships, lead_calls, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """

                    # Insert all records
                    for record in data:
                        cursor.execute(query, (
                            report_date, 
                            record.get("period_type", period_type), 
                            record.get("employee_name", ""), 
                            record.get("total_calls", 0),
                            record.get("calls_per_hour", 0), 
                            record.get("booked_calls", 0), 
                            record.get("inbound_calls", 0),
                            record.get("outbound_calls", 0), 
                            record.get("booking_percent", 0.0), 
                            record.get("avg_call_duration_seconds", 0),
                            record.get("cool_club_memberships", 0),
                            record.get("lead_calls", 0), 
                            record.get("created_at", datetime.now()), 
                            record.get("updated_at", datetime.now())
                        ))
                    
                    # Commit the transaction
                    conn.commit()
                    logger.info(f"Successfully inserted {len(data)} call center records for {period_type}")
                    
                except Exception as e:
                    # Rollback on error
                    conn.rollback()
                    logger.error(f"Error inserting call center data: {e}")
                    raise

    def insert_financial_data(self, data, period_type):
        """Insert financial performance data"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Check if table exists, create if not
                cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'financial_performance'
                );
                """)
                table_exists = cursor.fetchone()[0]
                
                if not table_exists:
                    cursor.execute("""
                    CREATE TABLE financial_performance (
                        id SERIAL PRIMARY KEY,
                        report_date DATE NOT NULL,
                        period_type VARCHAR(20) NOT NULL,
                        department_name VARCHAR(50) NOT NULL,
                        invoiced_revenue_cents BIGINT DEFAULT 0,
                        completed_revenue_cents BIGINT DEFAULT 0,
                        total_revenue_cents BIGINT DEFAULT 0,
                        adjustment_revenue_cents BIGINT DEFAULT 0,
                        tech_lead_jobs INTEGER DEFAULT 0,
                        marketing_lead_jobs INTEGER DEFAULT 0,
                        opportunities INTEGER DEFAULT 0,
                        membership_revenue_cents BIGINT DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(department_name, report_date, period_type)
                    );
                    """)
                    conn.commit()
                
                # Clear existing data for this period
                if period_type in ['mtd', 'ytd', 'last_month']:
                    cursor.execute("""
                        DELETE FROM financial_performance 
                        WHERE period_type = %s
                    """, (period_type,))
                    deleted_count = cursor.rowcount
                    logger.info(f"Cleared {deleted_count} existing '{period_type}' financial records")
                
                # Insert new data
                query = """
                INSERT INTO financial_performance (
                    report_date, period_type, department_name, invoiced_revenue_cents,
                    completed_revenue_cents, total_revenue_cents, adjustment_revenue_cents,
                    tech_lead_jobs, marketing_lead_jobs, opportunities, membership_revenue_cents,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (department_name, report_date, period_type)
                DO UPDATE SET
                    invoiced_revenue_cents = EXCLUDED.invoiced_revenue_cents,
                    completed_revenue_cents = EXCLUDED.completed_revenue_cents,
                    total_revenue_cents = EXCLUDED.total_revenue_cents,
                    adjustment_revenue_cents = EXCLUDED.adjustment_revenue_cents,
                    tech_lead_jobs = EXCLUDED.tech_lead_jobs,
                    marketing_lead_jobs = EXCLUDED.marketing_lead_jobs,
                    opportunities = EXCLUDED.opportunities,
                    membership_revenue_cents = EXCLUDED.membership_revenue_cents,
                    updated_at = EXCLUDED.updated_at
                """
                
                for record in data:
                    cursor.execute(query, (
                        datetime.now().date(),
                        record["period_type"],
                        record["department_name"],
                        record["invoiced_revenue_cents"],
                        record["completed_revenue_cents"],
                        record["total_revenue_cents"],
                        record["adjustment_revenue_cents"],
                        record["tech_lead_jobs"],
                        record["marketing_lead_jobs"],
                        record["opportunities"],
                        record["membership_revenue_cents"],
                        record["updated_at"],
                        record["updated_at"]
                    ))
                
                conn.commit()
                logger.info(f"Inserted {len(data)} financial records for {period_type}")

    def insert_membership_data(self, data, period_type):
        """Insert membership performance data"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Check if table exists, create if not (you already created it, but this is a safety check)
                cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'membership_performance'
                );
                """)
                table_exists = cursor.fetchone()[0]
                
                if not table_exists:
                    logger.error("membership_performance table does not exist. Please run the schema update first.")
                    return
                
                # Clear existing data for this period
                if period_type in ['mtd', 'ytd', 'last_month']:
                    cursor.execute("""
                        DELETE FROM membership_performance 
                        WHERE period_type = %s
                    """, (period_type,))
                    deleted_count = cursor.rowcount
                    logger.info(f"Cleared {deleted_count} existing '{period_type}' membership records")
                
                # Insert new data
                query = """
                INSERT INTO membership_performance (
                    report_date, period_type, membership_name, active_at_start, suspended, canceled,
                    expired, deleted, renewed, reactivated, new_sales, manual, active_at_end,
                    renewal_rate_percent, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (membership_name, report_date, period_type)
                DO UPDATE SET
                    active_at_start = EXCLUDED.active_at_start,
                    suspended = EXCLUDED.suspended,
                    canceled = EXCLUDED.canceled,
                    expired = EXCLUDED.expired,
                    deleted = EXCLUDED.deleted,
                    renewed = EXCLUDED.renewed,
                    reactivated = EXCLUDED.reactivated,
                    new_sales = EXCLUDED.new_sales,
                    manual = EXCLUDED.manual,
                    active_at_end = EXCLUDED.active_at_end,
                    renewal_rate_percent = EXCLUDED.renewal_rate_percent,
                    updated_at = EXCLUDED.updated_at
                """
                
                for record in data:
                    cursor.execute(query, (
                        datetime.now().date(),
                        record["period_type"],
                        record["membership_name"],
                        record["active_at_start"],
                        record["suspended"],
                        record["canceled"],
                        record["expired"],
                        record["deleted"],
                        record["renewed"],
                        record["reactivated"],
                        record["new_sales"],
                        record["manual"],
                        record["active_at_end"],
                        record["renewal_rate_percent"],
                        record["updated_at"],
                        record["updated_at"]
                    ))
                
                conn.commit()
                logger.info(f"Inserted {len(data)} membership records for {period_type}")

    def insert_hvac_tech_data(self, data, period_type):
        """Insert HVAC tech data into hvac_tech_performance table"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Clear existing data for this period
                if period_type in ['mtd', 'ytd', 'last_month']:
                    cursor.execute("""
                        DELETE FROM hvac_tech_performance
                        WHERE period_type = %s
                    """, (period_type,))
                    deleted_count = cursor.rowcount
                    logger.info(f"Cleared {deleted_count} existing HVAC tech '{period_type}' records")

                query = """
                INSERT INTO hvac_tech_performance (
                    report_date, period_type, employee_name, business_unit, trade,
                    completed_jobs, no_charge_jobs, converted_jobs, unconverted_jobs, invoiced_jobs, jobs_on_hold,
                    completed_revenue_cents, adjustment_revenue_cents, completed_revenue_with_adjustments_cents,
                    invoiced_revenue_cents, converted_revenue_cents, total_sales_cents, tech_lead_sales_cents,
                    converted_job_average_cents, opportunity_job_average_cents, total_job_average_cents,
                    opportunities, sales_opportunities, replacement_opportunities, closed_opportunities,
                    close_rate_percent, memberships_sold, leads_set, tech_recall_percent, updated_at
                ) VALUES (
                    CURRENT_DATE, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s, %s
                )
                ON CONFLICT (employee_name, report_date, period_type)
                DO UPDATE SET
                    business_unit = EXCLUDED.business_unit,
                    trade = EXCLUDED.trade,
                    completed_jobs = EXCLUDED.completed_jobs,
                    no_charge_jobs = EXCLUDED.no_charge_jobs,
                    converted_jobs = EXCLUDED.converted_jobs,
                    unconverted_jobs = EXCLUDED.unconverted_jobs,
                    invoiced_jobs = EXCLUDED.invoiced_jobs,
                    jobs_on_hold = EXCLUDED.jobs_on_hold,
                    completed_revenue_cents = EXCLUDED.completed_revenue_cents,
                    adjustment_revenue_cents = EXCLUDED.adjustment_revenue_cents,
                    completed_revenue_with_adjustments_cents = EXCLUDED.completed_revenue_with_adjustments_cents,
                    invoiced_revenue_cents = EXCLUDED.invoiced_revenue_cents,
                    converted_revenue_cents = EXCLUDED.converted_revenue_cents,
                    total_sales_cents = EXCLUDED.total_sales_cents,
                    tech_lead_sales_cents = EXCLUDED.tech_lead_sales_cents,
                    converted_job_average_cents = EXCLUDED.converted_job_average_cents,
                    opportunity_job_average_cents = EXCLUDED.opportunity_job_average_cents,
                    total_job_average_cents = EXCLUDED.total_job_average_cents,
                    opportunities = EXCLUDED.opportunities,
                    sales_opportunities = EXCLUDED.sales_opportunities,
                    replacement_opportunities = EXCLUDED.replacement_opportunities,
                    closed_opportunities = EXCLUDED.closed_opportunities,
                    close_rate_percent = EXCLUDED.close_rate_percent,
                    memberships_sold = EXCLUDED.memberships_sold,
                    leads_set = EXCLUDED.leads_set,
                    tech_recall_percent = EXCLUDED.tech_recall_percent,
                    updated_at = EXCLUDED.updated_at
                """

                for record in data:
                    try:
                        cursor.execute(query, (
                            record["period_type"],
                            record["employee_name"],
                            record["business_unit"],
                            record["trade"],
                            record["completed_jobs"],
                            record["no_charge_jobs"],
                            record["converted_jobs"],
                            record["unconverted_jobs"],
                            record["invoiced_jobs"],
                            record["jobs_on_hold"],
                            record["completed_revenue_cents"],
                            record["adjustment_revenue_cents"],
                            record["completed_revenue_with_adjustments_cents"],
                            record["invoiced_revenue_cents"],
                            record["converted_revenue_cents"],
                            record["total_sales_cents"],
                            record["tech_lead_sales_cents"],
                            record["converted_job_average_cents"],
                            record["opportunity_job_average_cents"],
                            record["total_job_average_cents"],
                            record["opportunities"],
                            record["sales_opportunities"],
                            record["replacement_opportunities"],
                            record["closed_opportunities"],
                            record["close_rate_percent"],
                            record["memberships_sold"],
                            record["leads_set"],
                            record["tech_recall_percent"],
                            record["updated_at"]
                        ))
                    except Exception as e:
                        logger.error(f"Error inserting HVAC tech record for {record['employee_name']}: {str(e)}")
                        logger.error(f"Problem record data: {record}")
                        raise

                conn.commit()
                logger.info(f"Inserted {len(data)} HVAC tech records for {period_type}")

    def insert_hvac_maintenance_data(self, data, period_type):
        """Insert HVAC maintenance data into hvac_maintenance_performance table"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Clear existing data for this period
                if period_type in ['mtd', 'ytd', 'last_month']:
                    cursor.execute("""
                        DELETE FROM hvac_maintenance_performance
                        WHERE period_type = %s
                    """, (period_type,))
                    deleted_count = cursor.rowcount
                    logger.info(f"Cleared {deleted_count} existing HVAC maintenance '{period_type}' records")

                query = """
            INSERT INTO hvac_maintenance_performance (
                report_date, period_type, employee_name, business_unit, trade,
                completed_jobs, no_charge_jobs, converted_jobs, unconverted_jobs, invoiced_jobs, jobs_on_hold,
                completed_revenue_cents, adjustment_revenue_cents, completed_revenue_with_adjustments_cents,
                invoiced_revenue_cents, converted_revenue_cents, total_sales_cents, tech_lead_sales_cents,
                converted_job_average_cents, opportunity_job_average_cents, total_job_average_cents,
                opportunities, sales_opportunities, replacement_opportunities, closed_opportunities,
                close_rate_percent, memberships_sold, leads_set, tech_recall_percent, updated_at
            ) VALUES (
                CURRENT_DATE, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
            ON CONFLICT (employee_name, report_date, period_type)
            DO UPDATE SET
                business_unit = EXCLUDED.business_unit,
                trade = EXCLUDED.trade,
                completed_jobs = EXCLUDED.completed_jobs,
                no_charge_jobs = EXCLUDED.no_charge_jobs,
                converted_jobs = EXCLUDED.converted_jobs,
                unconverted_jobs = EXCLUDED.unconverted_jobs,
                invoiced_jobs = EXCLUDED.invoiced_jobs,
                jobs_on_hold = EXCLUDED.jobs_on_hold,
                completed_revenue_cents = EXCLUDED.completed_revenue_cents,
                adjustment_revenue_cents = EXCLUDED.adjustment_revenue_cents,
                completed_revenue_with_adjustments_cents = EXCLUDED.completed_revenue_with_adjustments_cents,
                invoiced_revenue_cents = EXCLUDED.invoiced_revenue_cents,
                converted_revenue_cents = EXCLUDED.converted_revenue_cents,
                total_sales_cents = EXCLUDED.total_sales_cents,
                tech_lead_sales_cents = EXCLUDED.tech_lead_sales_cents,
                converted_job_average_cents = EXCLUDED.converted_job_average_cents,
                opportunity_job_average_cents = EXCLUDED.opportunity_job_average_cents,
                total_job_average_cents = EXCLUDED.total_job_average_cents,
                opportunities = EXCLUDED.opportunities,
                sales_opportunities = EXCLUDED.sales_opportunities,
                replacement_opportunities = EXCLUDED.replacement_opportunities,
                closed_opportunities = EXCLUDED.closed_opportunities,
                close_rate_percent = EXCLUDED.close_rate_percent,
                memberships_sold = EXCLUDED.memberships_sold,
                leads_set = EXCLUDED.leads_set,
                tech_recall_percent = EXCLUDED.tech_recall_percent,
                updated_at = EXCLUDED.updated_at
                """

                for record in data:
                    cursor.execute(query, (
                        record["period_type"],
                        record["employee_name"],
                        record["business_unit"],
                        record["trade"],
                        record["completed_jobs"],
                        record["no_charge_jobs"],
                        record["converted_jobs"],
                        record["unconverted_jobs"],
                        record["invoiced_jobs"],
                        record["jobs_on_hold"],
                        record["completed_revenue_cents"],
                        record["adjustment_revenue_cents"],
                        record["completed_revenue_with_adjustments_cents"],
                        record["invoiced_revenue_cents"],
                        record["converted_revenue_cents"],
                        record["total_sales_cents"],
                        record["tech_lead_sales_cents"],
                        record["converted_job_average_cents"],
                        record["opportunity_job_average_cents"],
                        record["total_job_average_cents"],
                        record["opportunities"],
                        record["sales_opportunities"],
                        record["replacement_opportunities"],
                        record["closed_opportunities"],
                        record["close_rate_percent"],
                        record["memberships_sold"],
                        record["leads_set"],
                        record["tech_recall_percent"],
                        record["updated_at"]
                    ))

                conn.commit()
                logger.info(f"Inserted {len(data)} HVAC maintenance records for {period_type}")

    def insert_commercial_hvac_data(self, data, period_type):
        """Insert Commercial HVAC data into commercial_hvac_performance table"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Clear existing data for this period
                if period_type in ['mtd', 'ytd', 'last_month']:
                    cursor.execute("""
                        DELETE FROM commercial_hvac_performance
                        WHERE period_type = %s
                    """, (period_type,))
                    deleted_count = cursor.rowcount
                    logger.info(f"Cleared {deleted_count} existing Commercial HVAC '{period_type}' records")

                query = """
                INSERT INTO commercial_hvac_performance (
                    report_date, period_type, employee_name, business_unit, trade,
                    completed_jobs, total_sales_cents, total_job_average_cents,
                    close_rate_percent, opportunities, memberships_sold, leads_set,
                    tech_recall_percent, updated_at
                ) VALUES (
                    CURRENT_DATE, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s
                )
                ON CONFLICT (employee_name, report_date, period_type)
                DO UPDATE SET
                    business_unit = EXCLUDED.business_unit,
                    trade = EXCLUDED.trade,
                    completed_jobs = EXCLUDED.completed_jobs,
                    total_sales_cents = EXCLUDED.total_sales_cents,
                    total_job_average_cents = EXCLUDED.total_job_average_cents,
                    close_rate_percent = EXCLUDED.close_rate_percent,
                    opportunities = EXCLUDED.opportunities,
                    memberships_sold = EXCLUDED.memberships_sold,
                    leads_set = EXCLUDED.leads_set,
                    tech_recall_percent = EXCLUDED.tech_recall_percent,
                    updated_at = EXCLUDED.updated_at
                """

                for record in data:
                    try:
                        cursor.execute(query, (
                            record["period_type"],
                            record["employee_name"],
                            record["business_unit"],
                            record["trade"],
                            record["completed_jobs"],
                            record["total_sales_cents"],
                            record["total_job_average_cents"],
                            record["close_rate_percent"],
                            record["opportunities"],
                            record["memberships_sold"],
                            record.get("leads_set", 0),
                            record["tech_recall_percent"],
                            record["updated_at"]
                        ))
                    except Exception as e:
                        logger.error(f"Error inserting Commercial HVAC record for {record.get('employee_name', 'Unknown')}: {e}")

                conn.commit()
                logger.info(f"Inserted {len(data)} Commercial HVAC records for {period_type}")

    def insert_plumbing_data(self, data, period_type):
        """Insert Plumbing data into plumbing_tech_performance table"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Clear existing data for this period
                if period_type in ['mtd', 'ytd', 'last_month']:
                    cursor.execute("""
                        DELETE FROM plumbing_tech_performance
                        WHERE period_type = %s
                    """, (period_type,))
                    deleted_count = cursor.rowcount
                    logger.info(f"Cleared {deleted_count} existing Plumbing '{period_type}' records")

                query = """
                INSERT INTO plumbing_tech_performance (
                    report_date, period_type, employee_name, business_unit, trade,
                    completed_jobs, no_charge_jobs, converted_jobs, unconverted_jobs, invoiced_jobs, jobs_on_hold,
                    completed_revenue_cents, adjustment_revenue_cents, completed_revenue_with_adjustments_cents,
                    invoiced_revenue_cents, converted_revenue_cents, total_sales_cents, tech_lead_sales_cents,
                    converted_job_average_cents, opportunity_job_average_cents, total_job_average_cents,
                    opportunities, sales_opportunities, replacement_opportunities, closed_opportunities,
                    close_rate_percent, memberships_sold, tech_recall_percent, updated_at
                ) VALUES (
                    CURRENT_DATE, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s
                )
                ON CONFLICT (employee_name, report_date, period_type)
                DO UPDATE SET
                    business_unit = EXCLUDED.business_unit,
                    trade = EXCLUDED.trade,
                    completed_jobs = EXCLUDED.completed_jobs,
                    no_charge_jobs = EXCLUDED.no_charge_jobs,
                    converted_jobs = EXCLUDED.converted_jobs,
                    unconverted_jobs = EXCLUDED.unconverted_jobs,
                    invoiced_jobs = EXCLUDED.invoiced_jobs,
                    jobs_on_hold = EXCLUDED.jobs_on_hold,
                    completed_revenue_cents = EXCLUDED.completed_revenue_cents,
                    adjustment_revenue_cents = EXCLUDED.adjustment_revenue_cents,
                    completed_revenue_with_adjustments_cents = EXCLUDED.completed_revenue_with_adjustments_cents,
                    invoiced_revenue_cents = EXCLUDED.invoiced_revenue_cents,
                    converted_revenue_cents = EXCLUDED.converted_revenue_cents,
                    total_sales_cents = EXCLUDED.total_sales_cents,
                    tech_lead_sales_cents = EXCLUDED.tech_lead_sales_cents,
                    converted_job_average_cents = EXCLUDED.converted_job_average_cents,
                    opportunity_job_average_cents = EXCLUDED.opportunity_job_average_cents,
                    total_job_average_cents = EXCLUDED.total_job_average_cents,
                    opportunities = EXCLUDED.opportunities,
                    sales_opportunities = EXCLUDED.sales_opportunities,
                    replacement_opportunities = EXCLUDED.replacement_opportunities,
                    closed_opportunities = EXCLUDED.closed_opportunities,
                    close_rate_percent = EXCLUDED.close_rate_percent,
                    memberships_sold = EXCLUDED.memberships_sold,
                    tech_recall_percent = EXCLUDED.tech_recall_percent,
                    updated_at = EXCLUDED.updated_at
                """

                for record in data:
                    cursor.execute(query, (
                        record["period_type"],
                        record["employee_name"],
                        record["business_unit"],
                        record["trade"],
                        record["completed_jobs"],
                        record["no_charge_jobs"],
                        record["converted_jobs"],
                        record["unconverted_jobs"],
                        record["invoiced_jobs"],
                        record["jobs_on_hold"],
                        record["completed_revenue_cents"],
                        record["adjustment_revenue_cents"],
                        record["completed_revenue_with_adjustments_cents"],
                        record["invoiced_revenue_cents"],
                        record["converted_revenue_cents"],
                        record["total_sales_cents"],
                        record["tech_lead_sales_cents"],
                        record["converted_job_average_cents"],
                        record["opportunity_job_average_cents"],
                        record["total_job_average_cents"],
                        record["opportunities"],
                        record["sales_opportunities"],
                        record["replacement_opportunities"],
                        record["closed_opportunities"],
                        record["close_rate_percent"],
                        record["memberships_sold"],
                        record["tech_recall_percent"],
                        record["updated_at"]
                    ))

                conn.commit()
                logger.info(f"Inserted {len(data)} Plumbing records for {period_type}")

    def insert_electrical_data(self, data, period_type):
        """Insert Electrical data into electrical_tech_performance table"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Clear existing data for this period
                if period_type in ['mtd', 'ytd', 'last_month']:
                    cursor.execute("""
                        DELETE FROM electrical_tech_performance
                        WHERE period_type = %s
                    """, (period_type,))
                    deleted_count = cursor.rowcount
                    logger.info(f"Cleared {deleted_count} existing Electrical '{period_type}' records")

                query = """
                INSERT INTO electrical_tech_performance (
                    report_date, period_type, employee_name, business_unit, trade,
                    completed_jobs, no_charge_jobs, converted_jobs, unconverted_jobs, invoiced_jobs, jobs_on_hold,
                    completed_revenue_cents, adjustment_revenue_cents, completed_revenue_with_adjustments_cents,
                    invoiced_revenue_cents, converted_revenue_cents, total_sales_cents, tech_lead_sales_cents,
                    converted_job_average_cents, opportunity_job_average_cents, total_job_average_cents,
                    opportunities, sales_opportunities, replacement_opportunities, closed_opportunities,
                    close_rate_percent, memberships_sold, tech_recall_percent, updated_at
                ) VALUES (
                    CURRENT_DATE, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s
                )
                ON CONFLICT (employee_name, report_date, period_type)
                DO UPDATE SET
                    business_unit = EXCLUDED.business_unit,
                    trade = EXCLUDED.trade,
                    completed_jobs = EXCLUDED.completed_jobs,
                    no_charge_jobs = EXCLUDED.no_charge_jobs,
                    converted_jobs = EXCLUDED.converted_jobs,
                    unconverted_jobs = EXCLUDED.unconverted_jobs,
                    invoiced_jobs = EXCLUDED.invoiced_jobs,
                    jobs_on_hold = EXCLUDED.jobs_on_hold,
                    completed_revenue_cents = EXCLUDED.completed_revenue_cents,
                    adjustment_revenue_cents = EXCLUDED.adjustment_revenue_cents,
                    completed_revenue_with_adjustments_cents = EXCLUDED.completed_revenue_with_adjustments_cents,
                    invoiced_revenue_cents = EXCLUDED.invoiced_revenue_cents,
                    converted_revenue_cents = EXCLUDED.converted_revenue_cents,
                    total_sales_cents = EXCLUDED.total_sales_cents,
                    tech_lead_sales_cents = EXCLUDED.tech_lead_sales_cents,
                    converted_job_average_cents = EXCLUDED.converted_job_average_cents,
                    opportunity_job_average_cents = EXCLUDED.opportunity_job_average_cents,
                    total_job_average_cents = EXCLUDED.total_job_average_cents,
                    opportunities = EXCLUDED.opportunities,
                    sales_opportunities = EXCLUDED.sales_opportunities,
                    replacement_opportunities = EXCLUDED.replacement_opportunities,
                    closed_opportunities = EXCLUDED.closed_opportunities,
                    close_rate_percent = EXCLUDED.close_rate_percent,
                    memberships_sold = EXCLUDED.memberships_sold,
                    tech_recall_percent = EXCLUDED.tech_recall_percent,
                    updated_at = EXCLUDED.updated_at
                """

                for record in data:
                    cursor.execute(query, (
                        record["period_type"],
                        record["employee_name"],
                        record["business_unit"],
                        record["trade"],
                        record["completed_jobs"],
                        record["no_charge_jobs"],
                        record["converted_jobs"],
                        record["unconverted_jobs"],
                        record["invoiced_jobs"],
                        record["jobs_on_hold"],
                        record["completed_revenue_cents"],
                        record["adjustment_revenue_cents"],
                        record["completed_revenue_with_adjustments_cents"],
                        record["invoiced_revenue_cents"],
                        record["converted_revenue_cents"],
                        record["total_sales_cents"],
                        record["tech_lead_sales_cents"],
                        record["converted_job_average_cents"],
                        record["opportunity_job_average_cents"],
                        record["total_job_average_cents"],
                        record["opportunities"],
                        record["sales_opportunities"],
                        record["replacement_opportunities"],
                        record["closed_opportunities"],
                        record["close_rate_percent"],
                        record["memberships_sold"],
                        record["tech_recall_percent"],
                        record["updated_at"]
                    ))

                conn.commit()
                logger.info(f"Inserted {len(data)} Electrical records for {period_type}")

    def insert_items_sold_data(self, data, period_type):
        """Insert items sold report data"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Delete existing data for this period to avoid duplicates
                if period_type in ['mtd', 'ytd', 'last_month']:
                    cursor.execute("""
                        DELETE FROM servicetitan_items_sold
                        WHERE period_type = %s
                    """, (period_type,))
                    deleted_count = cursor.rowcount
                    logger.info(f"Cleared {deleted_count} existing Items Sold '{period_type}' records")

                query = """
                INSERT INTO servicetitan_items_sold (
                    invoice_date, sold_by_technician, code, quantity,
                    invoice_number, job_business_unit, job_type, period_type
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (invoice_number, code, sold_by_technician, period_type)
                DO UPDATE SET
                    invoice_date = EXCLUDED.invoice_date,
                    quantity = EXCLUDED.quantity,
                    job_business_unit = EXCLUDED.job_business_unit,
                    job_type = EXCLUDED.job_type,
                    synced_at = CURRENT_TIMESTAMP
                """

                for record in data:
                    cursor.execute(query, (
                        record.get("invoice_date"),
                        record.get("sold_by_technician"),
                        record.get("code"),
                        record.get("quantity", 0),
                        record.get("invoice_number"),
                        record.get("job_business_unit"),
                        record.get("job_type"),
                        period_type
                    ))

                conn.commit()
                logger.info(f"Inserted {len(data)} Items Sold records for {period_type}")

    def insert_sold_flips_data(self, data, period_type):
        """Insert sold flips (technician leads sold) report data"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Delete existing data for this period
                if period_type in ['mtd', 'ytd', 'last_month']:
                    cursor.execute("""
                        DELETE FROM servicetitan_sold_flips
                        WHERE period_type = %s
                    """, (period_type,))
                    deleted_count = cursor.rowcount
                    logger.info(f"Cleared {deleted_count} existing Sold Flips '{period_type}' records")

                query = """
                INSERT INTO servicetitan_sold_flips (
                    technician_name, completed_jobs, completed_revenue_cents, total_job_average_cents,
                    adjustment_revenue_cents, completed_revenue_with_adjustments_cents, total_sales_cents,
                    close_rate, closed_average_sale_cents, total_lead_sales_cents, leads_set, leads_sold,
                    average_lead_sale_cents, recall_percentage, recall_jobs, no_charge_jobs, converted_jobs,
                    unconverted_jobs, invoiced_jobs, jobs_on_hold, opportunity, sales_opportunity,
                    replacement_opportunity, closed_opportunities, converted_job_average_cents,
                    opportunity_job_average_cents, opportunity_conversion_rate, invoiced_revenue_cents,
                    converted_revenue_cents, memberships_sold, membership_opportunities, warranty_jobs,
                    completed_non_opportunities, total_conversion_rate, options_per_opportunity,
                    lead_conversion_rate, billable_efficiency, first_call_arrival_time,
                    technician_division, technician_business_unit, technician_trade, period_type
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (technician_name, period_type)
                DO UPDATE SET
                    completed_jobs = EXCLUDED.completed_jobs,
                    completed_revenue_cents = EXCLUDED.completed_revenue_cents,
                    total_job_average_cents = EXCLUDED.total_job_average_cents,
                    adjustment_revenue_cents = EXCLUDED.adjustment_revenue_cents,
                    completed_revenue_with_adjustments_cents = EXCLUDED.completed_revenue_with_adjustments_cents,
                    total_sales_cents = EXCLUDED.total_sales_cents,
                    close_rate = EXCLUDED.close_rate,
                    closed_average_sale_cents = EXCLUDED.closed_average_sale_cents,
                    total_lead_sales_cents = EXCLUDED.total_lead_sales_cents,
                    leads_set = EXCLUDED.leads_set,
                    leads_sold = EXCLUDED.leads_sold,
                    average_lead_sale_cents = EXCLUDED.average_lead_sale_cents,
                    recall_percentage = EXCLUDED.recall_percentage,
                    recall_jobs = EXCLUDED.recall_jobs,
                    no_charge_jobs = EXCLUDED.no_charge_jobs,
                    converted_jobs = EXCLUDED.converted_jobs,
                    unconverted_jobs = EXCLUDED.unconverted_jobs,
                    invoiced_jobs = EXCLUDED.invoiced_jobs,
                    jobs_on_hold = EXCLUDED.jobs_on_hold,
                    opportunity = EXCLUDED.opportunity,
                    sales_opportunity = EXCLUDED.sales_opportunity,
                    replacement_opportunity = EXCLUDED.replacement_opportunity,
                    closed_opportunities = EXCLUDED.closed_opportunities,
                    converted_job_average_cents = EXCLUDED.converted_job_average_cents,
                    opportunity_job_average_cents = EXCLUDED.opportunity_job_average_cents,
                    opportunity_conversion_rate = EXCLUDED.opportunity_conversion_rate,
                    invoiced_revenue_cents = EXCLUDED.invoiced_revenue_cents,
                    converted_revenue_cents = EXCLUDED.converted_revenue_cents,
                    memberships_sold = EXCLUDED.memberships_sold,
                    membership_opportunities = EXCLUDED.membership_opportunities,
                    warranty_jobs = EXCLUDED.warranty_jobs,
                    completed_non_opportunities = EXCLUDED.completed_non_opportunities,
                    total_conversion_rate = EXCLUDED.total_conversion_rate,
                    options_per_opportunity = EXCLUDED.options_per_opportunity,
                    lead_conversion_rate = EXCLUDED.lead_conversion_rate,
                    billable_efficiency = EXCLUDED.billable_efficiency,
                    first_call_arrival_time = EXCLUDED.first_call_arrival_time,
                    technician_division = EXCLUDED.technician_division,
                    technician_business_unit = EXCLUDED.technician_business_unit,
                    technician_trade = EXCLUDED.technician_trade,
                    synced_at = CURRENT_TIMESTAMP
                """

                for record in data:
                    cursor.execute(query, (
                        record.get("technician_name"),
                        record.get("completed_jobs", 0),
                        record.get("completed_revenue_cents", 0),
                        record.get("total_job_average_cents", 0),
                        record.get("adjustment_revenue_cents", 0),
                        record.get("completed_revenue_with_adjustments_cents", 0),
                        record.get("total_sales_cents", 0),
                        record.get("close_rate", 0),
                        record.get("closed_average_sale_cents", 0),
                        record.get("total_lead_sales_cents", 0),
                        record.get("leads_set", 0),
                        record.get("leads_sold", 0),
                        record.get("average_lead_sale_cents", 0),
                        record.get("recall_percentage", 0),
                        record.get("recall_jobs", 0),
                        record.get("no_charge_jobs", 0),
                        record.get("converted_jobs", 0),
                        record.get("unconverted_jobs", 0),
                        record.get("invoiced_jobs", 0),
                        record.get("jobs_on_hold", 0),
                        record.get("opportunity", 0),
                        record.get("sales_opportunity", 0),
                        record.get("replacement_opportunity", 0),
                        record.get("closed_opportunities", 0),
                        record.get("converted_job_average_cents", 0),
                        record.get("opportunity_job_average_cents", 0),
                        record.get("opportunity_conversion_rate", 0),
                        record.get("invoiced_revenue_cents", 0),
                        record.get("converted_revenue_cents", 0),
                        record.get("memberships_sold", 0),
                        record.get("membership_opportunities", 0),
                        record.get("warranty_jobs", 0),
                        record.get("completed_non_opportunities", 0),
                        record.get("total_conversion_rate", 0),
                        record.get("options_per_opportunity", 0),
                        record.get("lead_conversion_rate", 0),
                        record.get("billable_efficiency", 0),
                        record.get("first_call_arrival_time"),
                        record.get("technician_division"),
                        record.get("technician_business_unit"),
                        record.get("technician_trade"),
                        period_type
                    ))

                conn.commit()
                logger.info(f"Inserted {len(data)} Sold Flips records for {period_type}")

    def get_hvac_tech_data(self, period_type):
        """Get HVAC tech performance data"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT
                    employee_name, business_unit, trade,
                    completed_jobs, total_sales_cents, total_job_average_cents,
                    close_rate_percent, opportunities, memberships_sold, leads_set, tech_recall_percent
                FROM hvac_tech_performance
                WHERE period_type = %s
                ORDER BY total_sales_cents DESC
                """
                cursor.execute(query, (period_type,))
                rows = cursor.fetchall()

                return [{
                    'employeeName': row[0],
                    'businessUnit': row[1],
                    'trade': row[2],
                    'completedJobs': row[3],
                    'totalSales': row[4] / 100 if row[4] else 0,
                    'totalJobAverage': row[5] / 100 if row[5] else 0,
                    'closeRatePercent': float(row[6]) if row[6] else 0,
                    'opportunities': row[7],
                    'membershipsSold': row[8],
                    'leadsSet': float(row[9]) if row[9] else 0,
                    'techRecallPercent': float(row[10]) if row[10] else 0
                } for row in rows]

    def get_hvac_maintenance_data(self, period_type):
        """Get HVAC maintenance performance data"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT
                    employee_name, business_unit, trade,
                    completed_jobs, total_sales_cents, total_job_average_cents,
                    close_rate_percent, opportunities, memberships_sold, leads_set, tech_recall_percent
                FROM hvac_maintenance_performance
                WHERE period_type = %s
                ORDER BY total_sales_cents DESC
                """
                cursor.execute(query, (period_type,))
                rows = cursor.fetchall()

                return [{
                    'employeeName': row[0],
                    'businessUnit': row[1],
                    'trade': row[2],
                    'completedJobs': row[3],
                    'totalSales': row[4] / 100 if row[4] else 0,
                    'totalJobAverage': row[5] / 100 if row[5] else 0,
                    'closeRatePercent': float(row[6]) if row[6] else 0,
                    'opportunities': row[7],
                    'membershipsSold': row[8],
                    'leadsSet': float(row[9]) if row[9] else 0,
                    'techRecallPercent': float(row[10]) if row[10] else 0
                } for row in rows]

def fetch_service_titan_token():
    project_id = "new-dashboard-2025"
    try:
        client_id = access_secret_version(project_id, "st-client-id")
        client_secret = access_secret_version(project_id, "st-client-secret")
        url = "https://auth.servicetitan.io/connect/token"
        payload = f"grant_type=client_credentials&client_id={client_id}&client_secret={client_secret}"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        response = requests.post(url, data=payload, headers=headers)
        response.raise_for_status()
        return response.json()["access_token"]
    except Exception as e:
        logger.error(f"Error fetching token: {str(e)}")
        raise

def get_auth_headers():
    project_id = "new-dashboard-2025"
    try:
        app_key = access_secret_version(project_id, "st-app-key")
        return {
            "Authorization": f"Bearer {fetch_service_titan_token()}",
            "ST-App-Key": app_key,
            "Content-Type": "application/json"
        }
    except Exception as e:
        logger.error(f"Error getting auth headers: {str(e)}")
        raise

def safe_get(data, key, default=None):
    """Safely get value from dict or return default"""
    if isinstance(data, dict):
        return data.get(key, default)
    return default

def safe_int(value, default=0):
    """Safely convert to int"""
    try:
        return int(float(value)) if value is not None else default
    except (ValueError, TypeError):
        return default

def safe_float(value, default=0.0):
    """Safely convert to float"""
    try:
        return float(value) if value is not None else default
    except (ValueError, TypeError):
        return default

def safe_percent(value, default=0.0):
    """Safely convert percentage value and cap at 99.99 to avoid NUMERIC(4,2) overflow"""
    try:
        if value is None or value == '':
            return default
        result = float(value) if value is not None and value != '' else default
        # Cap at 99.99 to fit in NUMERIC(4,2) field
        return min(result, 99.99)
    except (ValueError, TypeError):
        return default

def fetch_comfort_advisor_data(period_type):
    headers = get_auth_headers()
    tenant_id = "1498628772"
    url = f"https://api.servicetitan.io/reporting/v2/tenant/{tenant_id}/report-category/technician/reports/374338685/data"
    today = datetime.now()
    
    if period_type == "today":
        from_date = today.strftime("%Y-%m-%d")
        to_date = from_date
    elif period_type == "week":
        from_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "mtd":
        from_date = today.replace(day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "ytd":
        from_date = today.replace(month=1, day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "last_month":
        last_month = today.replace(day=1) - timedelta(days=1)
        from_date = last_month.replace(day=1).strftime("%Y-%m-%d")
        to_date = last_month.strftime("%Y-%m-%d")
    else:
        raise ValueError("Invalid period_type")

    payload = {
        "parameters": [
            {"name": "IncludeInactive", "value": "true"},
            {"name": "BusinessUnitId", "value": "7698,154691820,8085"},
            {"name": "From", "value": from_date},
            {"name": "To", "value": to_date}
        ]
    }
    
    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 429:
                logger.info(f"Rate limited. Retrying in 120 seconds... (attempt {attempt + 1}/{max_retries})")
                time.sleep(120)
                continue
            response.raise_for_status()
            
            raw_data = response.json()
            logger.info(f"Comfort Advisor API raw response (type: {type(raw_data)}): {json.dumps(raw_data, indent=2)[:1000]}...")
            
            # Handle different response structures safely
            records = []
            if isinstance(raw_data, list):
                records = raw_data
            elif isinstance(raw_data, dict):
                # Try to get data from dict
                if "data" in raw_data:
                    data = raw_data["data"]
                    if isinstance(data, list):
                        records = data
                    elif isinstance(data, dict):
                        # Look for common array keys in nested dict
                        for key in ["rows", "records", "results", "items"]:
                            if key in data and isinstance(data[key], list):
                                records = data[key]
                                break
                else:
                    # Look for common array keys in root dict
                    for key in ["rows", "records", "results", "items"]:
                        if key in raw_data and isinstance(raw_data[key], list):
                            records = raw_data[key]
                            break
            
            if not isinstance(records, list):
                logger.error(f"Could not find list of records in response. Type: {type(records)}")
                return []

            processed_data = []
            for i, record in enumerate(records):
                try:
                    if isinstance(record, dict):
                        # Handle dictionary format
                        processed_data.append({
                            "employee_name": safe_get(record, "EmployeeName") or safe_get(record, "Name", ""),
                            "period_type": period_type,
                            "business_unit": safe_get(record, "BusinessUnit", ""),
                            "team": safe_get(record, "Team", ""),
                            "completed_jobs": safe_int(safe_get(record, "CompletedJobs")),
                            "total_opportunities": safe_int(safe_get(record, "TotalOpportunities")),
                            "total_sales_cents": safe_int(safe_float(safe_get(record, "TotalSales")) * 100),
                            "average_sale_cents": safe_int(safe_float(safe_get(record, "AverageSale")) * 100),
                            "close_rate_percent": safe_float(safe_get(record, "CloseRatePercent")),
                            "cancellations": safe_int(safe_get(record, "Cancellations")),
                            "options_per_job": safe_float(safe_get(record, "OptionsPerJob")),
                            "tgl_opportunities": safe_int(safe_get(record, "TglOpportunities")),
                            "tgl_sales_cents": safe_int(safe_float(safe_get(record, "TglSales")) * 100),
                            "tgl_close_rate_percent": safe_float(safe_get(record, "TglCloseRatePercent")),
                            "tgl_average_sale_cents": safe_int(safe_float(safe_get(record, "TglAverageSale")) * 100),
                            "tgl_jobs": safe_int(safe_get(record, "TglJobs")),
                            "marketing_opportunities": safe_int(safe_get(record, "MarketingOpportunities")),
                            "marketing_sales_cents": safe_int(safe_float(safe_get(record, "MarketingSales")) * 100),
                            "marketing_close_rate_percent": safe_float(safe_get(record, "MarketingCloseRatePercent")),
                            "marketing_average_sale_cents": safe_int(safe_float(safe_get(record, "MarketingAverageSale")) * 100),
                            "marketing_jobs": safe_int(safe_get(record, "MarketingJobs")),
                            "updated_at": datetime.now()
                        })
                    elif isinstance(record, list) and len(record) >= 21:
                        # Handle array format
                        logger.info(f"🔍 DEBUG - Processing array record for {record[0] if len(record) > 0 else 'unknown'}")
                        logger.info(f"📊 Full array (first 31 elements): {record[:31] if len(record) > 30 else record}")
                        logger.info(f"📊 Key indices: [27]=Memberships:{record[27] if len(record) > 27 else 'N/A'}, [28]=Flips:{record[28] if len(record) > 28 else 'N/A'}, [30]=OptionsPerOpp:{record[30] if len(record) > 30 else 'N/A'}")
                        # CORRECTED ARRAY MAPPING based on user's specification
                        # [2] = completed jobs (FIXED: was [3])
                        # [15] = opportunities (FIXED: was [16])
                        # [17] = divisor for average sale (FIXED: was [18])
                        # [24] = total sales
                        # [25] = close rate (needs to be multiplied by 100)
                        # [27] = flips (leads set) - FIXED
                        # [28] = memberships sold - FIXED
                        # [30] = options per opportunity
                        completed_jobs = safe_int(record[2] if len(record) > 2 else 0)
                        total_sales = safe_float(record[24] if len(record) > 24 else 0)
                        opportunities = safe_int(record[15] if len(record) > 15 else 0)
                        close_rate = safe_float(record[25] if len(record) > 25 else 0) * 100  # Convert to percentage
                        divisor = safe_float(record[17] if len(record) > 17 else 0)
                        avg_sale = (total_sales / divisor) if divisor > 0 else 0
                        leads_set = safe_float(record[27] if len(record) > 27 else 0)  # flips
                        memberships_sold = safe_int(record[28] if len(record) > 28 else 0)
                        options_per_opp = safe_float(record[30] if len(record) > 30 else 0)

                        processed_data.append({
                            "employee_name": str(record[0]) if len(record) > 0 and record[0] else "",
                            "period_type": period_type,
                            "business_unit": str(record[1]) if len(record) > 1 and record[1] else "",
                            "team": str(record[3] if len(record) > 3 else 0),  # Team moved to [3]
                            "completed_jobs": completed_jobs,  # [2]
                            "total_opportunities": opportunities,  # [15]
                            "total_sales_cents": safe_int(total_sales * 100),  # [24]
                            "average_sale_cents": safe_int(avg_sale * 100),  # [24] / [17]
                            "close_rate_percent": close_rate,  # [25] * 100
                            "cancellations": safe_int(record[8] if len(record) > 8 else 0),
                            "options_per_job": options_per_opp,  # [30] - Options per Opportunity
                            "leads_set": leads_set,  # [27] - Flips
                            "memberships_sold": memberships_sold,  # [28]
                            "tgl_opportunities": safe_int(record[12] if len(record) > 12 else 0),
                            "tgl_sales_cents": safe_int(safe_float(record[22] if len(record) > 22 else 0) * 100),
                            "tgl_close_rate_percent": safe_float(record[14] if len(record) > 14 else 0),
                            "tgl_average_sale_cents": safe_int(safe_float(record[23] if len(record) > 23 else 0) * 100),
                            "tgl_jobs": safe_int(record[19] if len(record) > 19 else 0),
                            "marketing_opportunities": safe_int(record[16] if len(record) > 16 else 0),
                            "marketing_sales_cents": safe_int(safe_float(record[22] if len(record) > 22 else 0) * 100),
                            "marketing_close_rate_percent": safe_float(record[17] if len(record) > 17 else 0),
                            "marketing_average_sale_cents": safe_int(avg_sale * 100),
                            "marketing_jobs": safe_int(record[18] if len(record) > 18 else 0),
                            "updated_at": datetime.now()
                        })
                    else:
                        logger.warning(f"Skipping record {i}: unexpected format {type(record)}")
                except Exception as e:
                    logger.error(f"Error processing comfort advisor record {i}: {str(e)}")
                    continue
            
            logger.info(f"Processed {len(processed_data)} Comfort Advisor records")
            return processed_data
            
        except Exception as e:
            logger.error(f"Error in fetch_comfort_advisor_data: {str(e)}")
            if attempt < max_retries - 1:
                continue
            raise

def fetch_technician_data(period_type):
    headers = get_auth_headers()
    tenant_id = "1498628772"
    url = f"https://api.servicetitan.io/reporting/v2/tenant/{tenant_id}/report-category/technician/reports/374367121/data"
    today = datetime.now()
    
    if period_type == "today":
        from_date = today.strftime("%Y-%m-%d")
        to_date = from_date
    elif period_type == "week":
        from_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "mtd":
        from_date = today.replace(day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "ytd":
        from_date = today.replace(month=1, day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "last_month":
        last_month = today.replace(day=1) - timedelta(days=1)
        from_date = last_month.replace(day=1).strftime("%Y-%m-%d")
        to_date = last_month.strftime("%Y-%m-%d")
    else:
        raise ValueError("Invalid period_type")

    payload = {
        "parameters": [
            {"name": "IncludeInactive", "value": "true"},
            {"name": "BusinessUnitId", "value": "6540,6534,154684495"},
            {"name": "From", "value": from_date},
            {"name": "To", "value": to_date}
        ]
    }
    
    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 429:
                logger.info(f"Rate limited. Retrying in 120 seconds... (attempt {attempt + 1}/{max_retries})")
                time.sleep(120)
                continue
            response.raise_for_status()
            
            raw_data = response.json()
            logger.info(f"Technician API raw response (type: {type(raw_data)}): {json.dumps(raw_data, indent=2)[:1000]}...")
            
            records = []
            if isinstance(raw_data, list):
                records = raw_data
            elif isinstance(raw_data, dict):
                # Try to get data from dict
                if "data" in raw_data:
                    data = raw_data["data"]
                    if isinstance(data, list):
                        records = data
                    elif isinstance(data, dict):
                        # Look for common array keys in nested dict
                        for key in ["rows", "records", "results", "items"]:
                            if key in data and isinstance(data[key], list):
                                records = data[key]
                                break
                else:
                    # Look for common array keys in root dict
                    for key in ["rows", "records", "results", "items"]:
                        if key in raw_data and isinstance(raw_data[key], list):
                            records = raw_data[key]
                            break
            
            if not isinstance(records, list):
                logger.error(f"Could not find list of records in response. Type: {type(records)}")
                return []

            processed_data = []
            for i, record in enumerate(records):
                try:
                    if isinstance(record, dict):
                        # Handle dictionary format
                        processed_data.append({
                            "employee_name": safe_get(record, "Name") or safe_get(record, "Technician", ""),
                            "period_type": period_type,
                            "business_unit": safe_get(record, "TechnicianBusinessUnit", ""),
                            "trade": safe_get(record, "TechnicianTrade", ""),
                            "completed_jobs": safe_int(safe_get(record, "CompletedJobs")),
                            "no_charge_jobs": safe_int(safe_get(record, "NoChargeJobs")),
                            "converted_jobs": safe_int(safe_get(record, "ConvertedJobs")),
                            "unconverted_jobs": safe_int(safe_get(record, "UnconvertedJobs")),
                            "invoiced_jobs": safe_int(safe_get(record, "InvoicedJobs")),
                            "jobs_on_hold": safe_int(safe_get(record, "JobsOnHold")),
                            "completed_revenue_cents": safe_int(safe_float(safe_get(record, "CompletedRevenue")) * 100),
                            "adjustment_revenue_cents": safe_int(safe_float(safe_get(record, "AdjustmentRevenue")) * 100),
                            "completed_revenue_with_adjustments_cents": safe_int(safe_float(safe_get(record, "CompletedRevenueWithAdjustments")) * 100),
                            "invoiced_revenue_cents": safe_int(safe_float(safe_get(record, "InvoicedRevenue")) * 100),
                            "converted_revenue_cents": safe_int(safe_float(safe_get(record, "ConvertedRevenue")) * 100),
                            "total_sales_cents": safe_int(safe_float(safe_get(record, "TotalSales")) * 100),
                            "tech_lead_sales_cents": safe_int(safe_float(safe_get(record, "TotalTechLeadSales")) * 100),
                            "converted_job_average_cents": safe_int(safe_float(safe_get(record, "ConvertedJobAverage")) * 100),
                            "opportunity_job_average_cents": safe_int(safe_float(safe_get(record, "OpportunityJobAverage")) * 100),
                            "total_job_average_cents": safe_int(safe_float(safe_get(record, "TotalJobAverage")) * 100),
                            "opportunities": safe_int(safe_get(record, "Opportunity")),
                            "sales_opportunities": safe_int(safe_get(record, "SalesOpportunity")),
                            "replacement_opportunities": safe_int(safe_get(record, "ReplacementOpportunity")),
                            "closed_opportunities": safe_int(safe_get(record, "ClosedOpportunities")),
                            "membership_opportunities": safe_float(safe_get(record, "MembershipOpportunities")),
                            "tech_recall_percent": safe_percent(safe_get(record, "TechRecall%").replace('%', '') if safe_get(record, "TechRecall%") else 0.0),
                            "opportunity_conversion_rate": safe_percent(safe_get(record, "OpportunityConversionRate").replace('%', '') if safe_get(record, "OpportunityConversionRate") else 0.0),
                            "close_rate_percent": safe_percent(safe_get(record, "CloseRate").replace('%', '') if safe_get(record, "CloseRate") else 0.0),
                            "memberships_sold": safe_int(safe_get(record, "MembershipsSold")),
                            "leads_set": safe_float(safe_get(record, "LeadsSet")),
                            "first_call_arrival_time": safe_get(record, "FirstCallArrivalTime", ""),
                            "updated_at": datetime.now()
                        })
                    elif isinstance(record, list) and len(record) >= 25:
                        # CORRECTED ARRAY MAPPING for HVAC Tech
                        # [2] = completed jobs
                        # [7] = recall rate (multiply by 100)
                        # [15] = opportunities
                        # [17] = divisor for average sale
                        # [24] = total sales
                        # [25] = close rate (multiply by 100)
                        # [26] = memberships sold (HVAC specific)
                        # [27] = flips (leads set)

                        # Debug logging for first record
                        if i == 0:
                            logger.info(f"🔍 HVAC Tech DEBUG - First record: {record[0]}")
                            logger.info(f"📊 Array length: {len(record)}")
                            if len(record) > 27:
                                logger.info(f"📊 Index [26]=Memberships:{record[26]}, [27]=Flips:{record[27]}, [28]:{record[28] if len(record) > 28 else 'N/A'}")

                        completed_jobs = safe_int(record[2] if len(record) > 2 else 0)
                        total_sales = safe_float(record[24] if len(record) > 24 else 0)
                        opportunities = safe_int(record[15] if len(record) > 15 else 0)
                        close_rate = safe_float(record[25] if len(record) > 25 else 0) * 100
                        recall_rate = safe_float(record[7] if len(record) > 7 else 0) * 100
                        divisor = safe_float(record[17] if len(record) > 17 else 0)
                        avg_sale = (total_sales / divisor) if divisor > 0 else 0
                        memberships_sold = safe_int(record[26] if len(record) > 26 else 0)  # HVAC: [26]
                        leads_set = safe_float(record[27] if len(record) > 27 else 0)  # flips

                        # Debug logging for leads_set
                        logger.info(f"🎯 HVAC Tech - {record[0]}: leads_set[27]={leads_set} (raw value: {record[27] if len(record) > 27 else 'N/A'})")

                        processed_data.append({
                            "employee_name": str(record[0]) if len(record) > 0 and record[0] else "",
                            "period_type": period_type,
                            "business_unit": str(record[1]) if len(record) > 1 and record[1] else "",
                            "trade": str(record[6]) if len(record) > 6 and record[6] else "",
                            "completed_jobs": completed_jobs,  # [2]
                            "no_charge_jobs": safe_int(record[8] if len(record) > 8 else 0),
                            "converted_jobs": safe_int(record[9] if len(record) > 9 else 0),
                            "unconverted_jobs": safe_int(record[10] if len(record) > 10 else 0),
                            "invoiced_jobs": safe_int(record[11] if len(record) > 11 else 0),
                            "jobs_on_hold": safe_int(record[12] if len(record) > 12 else 0),
                            "completed_revenue_cents": safe_int(safe_float(record[3] if len(record) > 3 else 0) * 100),
                            "adjustment_revenue_cents": safe_int(safe_float(record[4] if len(record) > 4 else 0) * 100),
                            "completed_revenue_with_adjustments_cents": safe_int(safe_float(record[5] if len(record) > 5 else 0) * 100),
                            "invoiced_revenue_cents": safe_int(safe_float(record[21] if len(record) > 21 else 0) * 100),
                            "converted_revenue_cents": safe_int(safe_float(record[22] if len(record) > 22 else 0) * 100),
                            "total_sales_cents": safe_int(total_sales * 100),  # [24]
                            "tech_lead_sales_cents": safe_int(safe_float(record[28] if len(record) > 28 else 0) * 100),
                            "converted_job_average_cents": safe_int(safe_float(record[18] if len(record) > 18 else 0) * 100),
                            "opportunity_job_average_cents": safe_int(safe_float(record[19] if len(record) > 19 else 0) * 100),
                            "total_job_average_cents": safe_int(safe_float(record[23] if len(record) > 23 else 0) * 100),  # TotalJobAverage
                            "opportunities": opportunities,  # [15]
                            "sales_opportunities": safe_int(record[15] if len(record) > 15 else 0),
                            "replacement_opportunities": safe_int(record[16] if len(record) > 16 else 0),
                            "closed_opportunities": safe_int(record[17] if len(record) > 17 else 0),
                            "membership_opportunities": safe_float(record[29] if len(record) > 29 else 0),
                            "tech_recall_percent": recall_rate,  # [7] * 100
                            "opportunity_conversion_rate": safe_percent(safe_float(record[20]) * 100 if len(record) > 20 and record[20] else 0.0),
                            "close_rate_percent": close_rate,  # [25] * 100
                            "memberships_sold": memberships_sold,  # [26]
                            "leads_set": leads_set,  # [27]
                            "first_call_arrival_time": str(record[13]) if len(record) > 13 and record[13] else "",
                            "updated_at": datetime.now()
                        })
                    else:
                                logger.warning(f"Skipping technician record {i}: unexpected format {type(record)}")
                except Exception as e:
                    logger.error(f"Error processing technician record {i}: {str(e)}")
                    continue
            
            logger.info(f"Processed {len(processed_data)} Technician records")
            return processed_data
            
        except Exception as e:
            logger.error(f"Error in fetch_technician_data: {str(e)}")
            if attempt < max_retries - 1:
                continue
            raise

def fetch_hvac_maintenance_data(period_type):
    """Fetch HVAC maintenance technician data from ServiceTitan"""
    headers = get_auth_headers()
    tenant_id = "1498628772"
    # NEW REPORT: 374418414
    url = f"https://api.servicetitan.io/reporting/v2/tenant/{tenant_id}/report-category/technician/reports/374418414/data"
    today = datetime.now()
    
    if period_type == "today":
        from_date = today.strftime("%Y-%m-%d")
        to_date = from_date
    elif period_type == "week":
        from_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "mtd":
        from_date = today.replace(day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "ytd":
        from_date = today.replace(month=1, day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "last_month":
        last_month = today.replace(day=1) - timedelta(days=1)
        from_date = last_month.replace(day=1).strftime("%Y-%m-%d")
        to_date = last_month.strftime("%Y-%m-%d")
    else:
        raise ValueError("Invalid period_type")

    payload = {
        "parameters": [
            {"name": "IncludeInactive", "value": "true"},
            {"name": "BusinessUnitId", "value": "7831,154681497,8087"},
            {"name": "From", "value": from_date},
            {"name": "To", "value": to_date}
        ]
    }
    
    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 429:
                logger.info(f"Rate limited on attempt {attempt + 1}, waiting before retry...")
                time.sleep(120)
                continue
            response.raise_for_status()
            
            data = response.json()
            fields = data.get("fields", [])
            rows = data.get("data", [])
            
            processed_data = []
            for row in rows:
                # CORRECTED ARRAY MAPPING for HVAC Maintenance
                # [2] = completed jobs
                # [7] = recall rate (multiply by 100)
                # [15] = opportunities
                # [17] = divisor for average sale
                # [24] = total sales
                # [25] = close rate (multiply by 100)
                # [26] = memberships sold (HVAC specific)
                # [27] = flips (leads set)
                completed_jobs = safe_int(row[2] if len(row) > 2 else 0)
                total_sales = safe_float(row[24] if len(row) > 24 else 0)
                opportunities = safe_int(row[15] if len(row) > 15 else 0)
                close_rate = safe_float(row[25] if len(row) > 25 else 0) * 100
                recall_rate = safe_float(row[7] if len(row) > 7 else 0) * 100
                divisor = safe_float(row[17] if len(row) > 17 else 0)
                avg_sale = (total_sales / divisor) if divisor > 0 else 0
                memberships_sold = safe_int(row[26] if len(row) > 26 else 0)  # HVAC: [26]
                leads_set = safe_float(row[27] if len(row) > 27 else 0)  # flips

                # Debug logging for leads_set
                logger.info(f"🎯 HVAC Maintenance - {row[0]}: leads_set[27]={leads_set} (raw value: {row[27] if len(row) > 27 else 'N/A'})")

                record = {
                    "period_type": period_type,
                    "employee_name": str(row[0]) if len(row) > 0 and row[0] else "Unknown",
                    "business_unit": str(row[1]) if len(row) > 1 and row[1] else "Unknown",
                    "trade": str(row[6]) if len(row) > 6 and row[6] else "Unknown",
                    "completed_jobs": completed_jobs,  # [2]
                    "no_charge_jobs": safe_int(row[4] if len(row) > 4 else 0),
                    "converted_jobs": safe_int(row[5] if len(row) > 5 else 0),
                    "unconverted_jobs": safe_int(row[6] if len(row) > 6 else 0),
                    "invoiced_jobs": safe_int(row[7] if len(row) > 7 else 0),
                    "jobs_on_hold": safe_int(row[8] if len(row) > 8 else 0),
                    "completed_revenue_cents": safe_int(safe_float(row[9] if len(row) > 9 else 0) * 100),
                    "adjustment_revenue_cents": safe_int(safe_float(row[10] if len(row) > 10 else 0) * 100),
                    "completed_revenue_with_adjustments_cents": safe_int(safe_float(row[11] if len(row) > 11 else 0) * 100),
                    "invoiced_revenue_cents": safe_int(safe_float(row[12] if len(row) > 12 else 0) * 100),
                    "converted_revenue_cents": safe_int(safe_float(row[13] if len(row) > 13 else 0) * 100),
                    "total_sales_cents": safe_int(total_sales * 100),  # [24]
                    "tech_lead_sales_cents": safe_int(safe_float(row[15] if len(row) > 15 else 0) * 100),
                    "converted_job_average_cents": safe_int(safe_float(row[16] if len(row) > 16 else 0) * 100),
                    "opportunity_job_average_cents": safe_int(safe_float(row[19] if len(row) > 19 else 0) * 100),
                    "total_job_average_cents": safe_int(safe_float(row[23] if len(row) > 23 else 0) * 100),  # TotalJobAverage
                    "opportunities": opportunities,  # [15]
                    "sales_opportunities": safe_int(row[20] if len(row) > 20 else 0),
                    "replacement_opportunities": safe_int(row[21] if len(row) > 21 else 0),
                    "closed_opportunities": safe_int(row[22] if len(row) > 22 else 0),
                    "close_rate_percent": close_rate,  # [25] * 100
                    "memberships_sold": memberships_sold,  # [26]
                    "leads_set": leads_set,  # [27]
                    "tech_recall_percent": recall_rate,  # [7] * 100
                    "updated_at": datetime.now()
                }
                processed_data.append(record)
            
            logger.info(f"Successfully fetched {len(processed_data)} HVAC maintenance records for {period_type}")
            return processed_data
            
        except Exception as e:
            logger.error(f"Error in fetch_hvac_maintenance_data: {str(e)}")
            if attempt < max_retries - 1:
                continue
            raise

def fetch_commercial_hvac_data(period_type):
    """Fetch Commercial HVAC technician data from ServiceTitan"""
    headers = get_auth_headers()
    tenant_id = "1498628772"
    url = f"https://api.servicetitan.io/reporting/v2/tenant/{tenant_id}/report-category/technician/reports/398188829/data"
    today = datetime.now()

    if period_type == "today":
        from_date = today.strftime("%Y-%m-%d")
        to_date = from_date
    elif period_type == "week":
        from_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "mtd":
        from_date = today.replace(day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "ytd":
        from_date = today.replace(month=1, day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "last_month":
        last_month = today.replace(day=1) - timedelta(days=1)
        from_date = last_month.replace(day=1).strftime("%Y-%m-%d")
        to_date = last_month.strftime("%Y-%m-%d")
    else:
        raise ValueError("Invalid period_type")

    payload = {
        "parameters": [
            {"name": "From", "value": from_date},
            {"name": "To", "value": to_date}
        ]
    }

    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 429:
                logger.info(f"Rate limited. Retrying in 120 seconds... (attempt {attempt + 1}/{max_retries})")
                time.sleep(120)
                continue
            response.raise_for_status()

            raw_data = response.json()
            logger.info(f"Commercial HVAC API raw response (first 1000 chars): {json.dumps(raw_data, indent=2)[:1000]}...")

            # Handle the response format
            records = []
            if isinstance(raw_data, dict) and "data" in raw_data:
                records = raw_data["data"]
            elif isinstance(raw_data, list):
                records = raw_data

            processed_data = []
            for i, record in enumerate(records):
                try:
                    if isinstance(record, dict):
                        # Dictionary format
                        processed_record = {
                            "employee_name": safe_get(record, "Name") or safe_get(record, "Technician", ""),
                            "period_type": period_type,
                            "business_unit": safe_get(record, "TechnicianBusinessUnit", ""),
                            "trade": "Commercial HVAC",
                            "completed_jobs": safe_int(safe_get(record, "CompletedJobs")),
                            "total_sales_cents": safe_int(safe_float(safe_get(record, "TotalSales")) * 100),
                            "total_job_average_cents": safe_int(safe_float(safe_get(record, "TotalJobAverage")) * 100),
                            "close_rate_percent": safe_float(safe_get(record, "CloseRate", "0").replace('%', '') if safe_get(record, "CloseRate") else 0) * 100,
                            "opportunities": safe_int(safe_get(record, "Opportunity")),
                            "memberships_sold": safe_int(safe_get(record, "MembershipsSold")),
                            "leads_set": safe_float(safe_get(record, "LeadsSet", 0)),
                            "tech_recall_percent": safe_float(safe_get(record, "TechRecall%", "0").replace('%', '') if safe_get(record, "TechRecall%") else 0) * 100,
                            "updated_at": datetime.now()
                        }
                        processed_data.append(processed_record)
                    elif isinstance(record, list) and len(record) >= 25:
                        # Array format - EXACT same layout as HVAC tech report
                        # [0] = Name, [1] = Business Unit, [2] = Completed Jobs
                        # [6] = Trade, [7] = Recall Rate (multiply by 100)
                        # [15] = Opportunities, [17] = Closed Opportunities (divisor)
                        # [23] = Total Job Average, [24] = Total Sales
                        # [25] = Close Rate (multiply by 100), [26] = Memberships Sold
                        # [27] = Leads Set (flips)

                        if i == 0:
                            logger.info(f"🔍 Commercial HVAC DEBUG - First record: {record[0]}")
                            logger.info(f"📊 Array length: {len(record)}")

                        completed_jobs = safe_int(record[2] if len(record) > 2 else 0)
                        total_sales = safe_float(record[24] if len(record) > 24 else 0)  # Total Sales
                        opportunities = safe_int(record[14] if len(record) > 14 else 0)  # Opportunity
                        close_rate = safe_float(record[25] if len(record) > 25 else 0) * 100  # Close Rate
                        recall_rate = safe_float(record[7] if len(record) > 7 else 0) * 100  # Tech Recall %
                        total_job_avg = safe_float(record[23] if len(record) > 23 else 0)  # Total Job Average
                        memberships_sold = safe_int(record[26] if len(record) > 26 else 0)  # Memberships Sold
                        leads_set = safe_float(record[27] if len(record) > 27 else 0)  # Leads Set

                        processed_record = {
                            "employee_name": str(record[0]) if len(record) > 0 and record[0] else "",
                            "period_type": period_type,
                            "business_unit": str(record[1]) if len(record) > 1 and record[1] else "",
                            "trade": "Commercial HVAC",
                            "completed_jobs": completed_jobs,
                            "total_sales_cents": safe_int(total_sales * 100),
                            "total_job_average_cents": safe_int(total_job_avg * 100),
                            "close_rate_percent": close_rate,
                            "opportunities": opportunities,
                            "memberships_sold": memberships_sold,
                            "leads_set": leads_set,
                            "tech_recall_percent": recall_rate,
                            "updated_at": datetime.now()
                        }
                        processed_data.append(processed_record)
                    else:
                        logger.warning(f"Skipping Commercial HVAC record {i}: unexpected format or length {len(record) if isinstance(record, list) else type(record)}")
                except Exception as e:
                    logger.error(f"Error processing Commercial HVAC record {i}: {e}")

            logger.info(f"Successfully fetched {len(processed_data)} Commercial HVAC records for {period_type}")
            return processed_data

        except Exception as e:
            logger.error(f"Error in fetch_commercial_hvac_data: {str(e)}")
            if attempt < max_retries - 1:
                continue
            raise

def fetch_plumbing_data(period_type):
    """Fetch Plumbing technician data from ServiceTitan"""
    headers = get_auth_headers()
    tenant_id = "1498628772"
    url = f"https://api.servicetitan.io/reporting/v2/tenant/{tenant_id}/report-category/technician/reports/392071756/data"
    today = datetime.now()

    if period_type == "today":
        from_date = today.strftime("%Y-%m-%d")
        to_date = from_date
    elif period_type == "week":
        from_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "mtd":
        from_date = today.replace(day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "ytd":
        from_date = today.replace(month=1, day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "last_month":
        last_month = today.replace(day=1) - timedelta(days=1)
        from_date = last_month.replace(day=1).strftime("%Y-%m-%d")
        to_date = last_month.strftime("%Y-%m-%d")
    else:
        raise ValueError("Invalid period_type")

    payload = {
        "parameters": [
            {"name": "IncludeInactive", "value": "true"},
            {"name": "BusinessUnitId", "value": "124468396,124467371,124692394"},
            {"name": "From", "value": from_date},
            {"name": "To", "value": to_date}
        ]
    }

    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 429:
                logger.info(f"Rate limited on attempt {attempt + 1}, waiting before retry...")
                time.sleep(120)
                continue
            response.raise_for_status()

            data = response.json()
            fields = data.get("fields", [])
            rows = data.get("data", [])

            processed_data = []
            for row in rows:
                # Array mapping (same format as HVAC Tech/Maintenance)
                completed_jobs = safe_int(row[2] if len(row) > 2 else 0)
                total_sales = safe_float(row[24] if len(row) > 24 else 0)
                opportunities = safe_int(row[15] if len(row) > 15 else 0)
                close_rate = safe_float(row[25] if len(row) > 25 else 0) * 100
                recall_rate = safe_float(row[7] if len(row) > 7 else 0) * 100
                divisor = safe_float(row[17] if len(row) > 17 else 0)
                avg_sale = (total_sales / divisor) if divisor > 0 else 0
                memberships_sold = safe_int(row[26] if len(row) > 26 else 0)

                record = {
                    "period_type": period_type,
                    "employee_name": str(row[0]) if len(row) > 0 and row[0] else "Unknown",
                    "business_unit": str(row[1]) if len(row) > 1 and row[1] else "Unknown",
                    "trade": str(row[6]) if len(row) > 6 and row[6] else "Unknown",
                    "completed_jobs": completed_jobs,
                    "no_charge_jobs": safe_int(row[8] if len(row) > 8 else 0),
                    "converted_jobs": safe_int(row[9] if len(row) > 9 else 0),
                    "unconverted_jobs": safe_int(row[10] if len(row) > 10 else 0),
                    "invoiced_jobs": safe_int(row[11] if len(row) > 11 else 0),
                    "jobs_on_hold": safe_int(row[12] if len(row) > 12 else 0),
                    "completed_revenue_cents": safe_int(safe_float(row[3] if len(row) > 3 else 0) * 100),
                    "adjustment_revenue_cents": safe_int(safe_float(row[4] if len(row) > 4 else 0) * 100),
                    "completed_revenue_with_adjustments_cents": safe_int(safe_float(row[5] if len(row) > 5 else 0) * 100),
                    "invoiced_revenue_cents": safe_int(safe_float(row[21] if len(row) > 21 else 0) * 100),
                    "converted_revenue_cents": safe_int(safe_float(row[22] if len(row) > 22 else 0) * 100),
                    "total_sales_cents": safe_int(total_sales * 100),
                    "tech_lead_sales_cents": safe_int(safe_float(row[28] if len(row) > 28 else 0) * 100),
                    "converted_job_average_cents": safe_int(safe_float(row[18] if len(row) > 18 else 0) * 100),
                    "opportunity_job_average_cents": safe_int(safe_float(row[19] if len(row) > 19 else 0) * 100),
                    "total_job_average_cents": safe_int(safe_float(row[23] if len(row) > 23 else 0) * 100),  # TotalJobAverage
                    "opportunities": opportunities,
                    "sales_opportunities": safe_int(row[15] if len(row) > 15 else 0),
                    "replacement_opportunities": safe_int(row[16] if len(row) > 16 else 0),
                    "closed_opportunities": safe_int(row[17] if len(row) > 17 else 0),
                    "close_rate_percent": close_rate,
                    "memberships_sold": memberships_sold,
                    "tech_recall_percent": recall_rate,
                    "updated_at": datetime.now()
                }
                processed_data.append(record)

            logger.info(f"Successfully fetched {len(processed_data)} Plumbing records for {period_type}")
            return processed_data

        except Exception as e:
            logger.error(f"Error in fetch_plumbing_data: {str(e)}")
            if attempt < max_retries - 1:
                continue
            raise

def fetch_electrical_data(period_type):
    """Fetch Electrical technician data from ServiceTitan"""
    headers = get_auth_headers()
    tenant_id = "1498628772"
    url = f"https://api.servicetitan.io/reporting/v2/tenant/{tenant_id}/report-category/technician/reports/392071757/data"
    today = datetime.now()

    if period_type == "today":
        from_date = today.strftime("%Y-%m-%d")
        to_date = from_date
    elif period_type == "week":
        from_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "mtd":
        from_date = today.replace(day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "ytd":
        from_date = today.replace(month=1, day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "last_month":
        last_month = today.replace(day=1) - timedelta(days=1)
        from_date = last_month.replace(day=1).strftime("%Y-%m-%d")
        to_date = last_month.strftime("%Y-%m-%d")
    else:
        raise ValueError("Invalid period_type")

    payload = {
        "parameters": [
            {"name": "IncludeInactive", "value": "true"},
            {"name": "BusinessUnitId", "value": "455,161649734"},
            {"name": "From", "value": from_date},
            {"name": "To", "value": to_date}
        ]
    }

    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 429:
                logger.info(f"Rate limited on attempt {attempt + 1}, waiting before retry...")
                time.sleep(120)
                continue
            response.raise_for_status()

            data = response.json()
            fields = data.get("fields", [])
            rows = data.get("data", [])

            processed_data = []
            for row in rows:
                # Array mapping (same format as HVAC Tech/Maintenance)
                completed_jobs = safe_int(row[2] if len(row) > 2 else 0)
                total_sales = safe_float(row[24] if len(row) > 24 else 0)
                opportunities = safe_int(row[15] if len(row) > 15 else 0)
                close_rate = safe_float(row[25] if len(row) > 25 else 0) * 100
                recall_rate = safe_float(row[7] if len(row) > 7 else 0) * 100
                divisor = safe_float(row[17] if len(row) > 17 else 0)
                avg_sale = (total_sales / divisor) if divisor > 0 else 0
                memberships_sold = safe_int(row[26] if len(row) > 26 else 0)

                record = {
                    "period_type": period_type,
                    "employee_name": str(row[0]) if len(row) > 0 and row[0] else "Unknown",
                    "business_unit": str(row[1]) if len(row) > 1 and row[1] else "Unknown",
                    "trade": str(row[6]) if len(row) > 6 and row[6] else "Unknown",
                    "completed_jobs": completed_jobs,
                    "no_charge_jobs": safe_int(row[8] if len(row) > 8 else 0),
                    "converted_jobs": safe_int(row[9] if len(row) > 9 else 0),
                    "unconverted_jobs": safe_int(row[10] if len(row) > 10 else 0),
                    "invoiced_jobs": safe_int(row[11] if len(row) > 11 else 0),
                    "jobs_on_hold": safe_int(row[12] if len(row) > 12 else 0),
                    "completed_revenue_cents": safe_int(safe_float(row[3] if len(row) > 3 else 0) * 100),
                    "adjustment_revenue_cents": safe_int(safe_float(row[4] if len(row) > 4 else 0) * 100),
                    "completed_revenue_with_adjustments_cents": safe_int(safe_float(row[5] if len(row) > 5 else 0) * 100),
                    "invoiced_revenue_cents": safe_int(safe_float(row[21] if len(row) > 21 else 0) * 100),
                    "converted_revenue_cents": safe_int(safe_float(row[22] if len(row) > 22 else 0) * 100),
                    "total_sales_cents": safe_int(total_sales * 100),
                    "tech_lead_sales_cents": safe_int(safe_float(row[28] if len(row) > 28 else 0) * 100),
                    "converted_job_average_cents": safe_int(safe_float(row[18] if len(row) > 18 else 0) * 100),
                    "opportunity_job_average_cents": safe_int(safe_float(row[19] if len(row) > 19 else 0) * 100),
                    "total_job_average_cents": safe_int(safe_float(row[23] if len(row) > 23 else 0) * 100),  # TotalJobAverage
                    "opportunities": opportunities,
                    "sales_opportunities": safe_int(row[15] if len(row) > 15 else 0),
                    "replacement_opportunities": safe_int(row[16] if len(row) > 16 else 0),
                    "closed_opportunities": safe_int(row[17] if len(row) > 17 else 0),
                    "close_rate_percent": close_rate,
                    "memberships_sold": memberships_sold,
                    "tech_recall_percent": recall_rate,
                    "updated_at": datetime.now()
                }
                processed_data.append(record)

            logger.info(f"Successfully fetched {len(processed_data)} Electrical records for {period_type}")
            return processed_data

        except Exception as e:
            logger.error(f"Error in fetch_electrical_data: {str(e)}")
            if attempt < max_retries - 1:
                continue
            raise


def fetch_items_sold_data(period_type):
    """Fetch Items Sold Report from ServiceTitan - Report ID: 394027220"""
    headers = get_auth_headers()
    tenant_id = "1498628772"
    # Report ID for Item Sold Report
    url = f"https://api.servicetitan.io/reporting/v2/tenant/{tenant_id}/report-category/marketing/reports/394027220/data"
    today = datetime.now()

    if period_type == "today":
        from_date = today.strftime("%Y-%m-%d")
        to_date = from_date
    elif period_type == "week":
        from_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "mtd":
        from_date = today.replace(day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "ytd":
        from_date = today.replace(month=1, day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "last_month":
        last_month = today.replace(day=1) - timedelta(days=1)
        from_date = last_month.replace(day=1).strftime("%Y-%m-%d")
        to_date = last_month.strftime("%Y-%m-%d")
    else:
        raise ValueError("Invalid period_type")

    payload = {
        "parameters": [
            {"name": "DateType", "value": "0"},  # Custom date range
            {"name": "IncludeInactive", "value": "false"},
            {"name": "From", "value": from_date},
            {"name": "To", "value": to_date}
        ]
    }

    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 429:
                logger.info(f"Rate limited on attempt {attempt + 1}, waiting before retry...")
                time.sleep(120)
                continue
            response.raise_for_status()

            data = response.json()
            rows = data.get("data", [])

            processed_data = []
            for row in rows:
                # Parse quantity - handle both string and numeric formats
                quantity_raw = row[3] if len(row) > 3 else 0
                try:
                    if isinstance(quantity_raw, str):
                        # Remove $ and commas
                        quantity = int(float(quantity_raw.replace('$', '').replace(',', '')))
                    else:
                        quantity = int(quantity_raw)
                except (ValueError, AttributeError):
                    quantity = 0

                record = {
                    "invoice_date": row[0] if len(row) > 0 else None,  # InvoiceDate
                    "sold_by_technician": str(row[1]) if len(row) > 1 and row[1] else None,  # SoldByTechnician
                    "code": str(row[2]) if len(row) > 2 and row[2] else None,  # Code
                    "quantity": quantity,  # Quantity
                    "invoice_number": str(row[4]) if len(row) > 4 and row[4] else None,  # InvoiceNumber
                    "job_business_unit": str(row[5]) if len(row) > 5 and row[5] else None,  # JobBusinessUnit
                    "job_type": str(row[6]) if len(row) > 6 and row[6] else None  # JobType
                }
                processed_data.append(record)

            logger.info(f"Successfully fetched {len(processed_data)} Items Sold records for {period_type}")
            return processed_data

        except Exception as e:
            logger.error(f"Error in fetch_items_sold_data: {str(e)}")
            if attempt < max_retries - 1:
                continue
            raise


def fetch_sold_flips_data(period_type):
    """Fetch Technician Leads Sold Report from ServiceTitan - Report ID: 394041816"""
    headers = get_auth_headers()
    tenant_id = "1498628772"
    # Technician Leads Sold Report
    url = f"https://api.servicetitan.io/reporting/v2/tenant/{tenant_id}/report-category/technician/reports/394041816/data"
    today = datetime.now()

    if period_type == "today":
        from_date = today.strftime("%Y-%m-%d")
        to_date = from_date
    elif period_type == "week":
        from_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "mtd":
        from_date = today.replace(day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "ytd":
        from_date = today.replace(month=1, day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "last_month":
        last_month = today.replace(day=1) - timedelta(days=1)
        from_date = last_month.replace(day=1).strftime("%Y-%m-%d")
        to_date = last_month.strftime("%Y-%m-%d")
    else:
        raise ValueError("Invalid period_type")

    payload = {
        "parameters": [
            {"name": "DateType", "value": "0"},
            {"name": "IncludeInactive", "value": "false"},
            {"name": "From", "value": from_date},
            {"name": "To", "value": to_date}
        ]
    }

    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 429:
                logger.info(f"Rate limited on attempt {attempt + 1}, waiting before retry...")
                time.sleep(120)
                continue
            response.raise_for_status()

            data = response.json()
            rows = data.get("data", [])

            processed_data = []
            for row in rows:
                # Based on "Technician Leads Sold" CSV structure - Report 394041816
                # Maps all 41 columns from the report
                record = {
                    "technician_name": str(row[0]) if len(row) > 0 and row[0] else None,
                    "completed_jobs": safe_int(row[1] if len(row) > 1 else 0),
                    "completed_revenue_cents": safe_int(safe_float(row[2] if len(row) > 2 else 0) * 100),
                    "total_job_average_cents": safe_int(safe_float(row[3] if len(row) > 3 else 0) * 100),
                    "adjustment_revenue_cents": safe_int(safe_float(row[4] if len(row) > 4 else 0) * 100),
                    "completed_revenue_with_adjustments_cents": safe_int(safe_float(row[5] if len(row) > 5 else 0) * 100),
                    "total_sales_cents": safe_int(safe_float(row[6] if len(row) > 6 else 0) * 100),
                    "close_rate": safe_float(row[7] if len(row) > 7 else 0),
                    "closed_average_sale_cents": safe_int(safe_float(row[8] if len(row) > 8 else 0) * 100),
                    "total_lead_sales_cents": safe_int(safe_float(row[9] if len(row) > 9 else 0) * 100),
                    "leads_set": safe_int(row[10] if len(row) > 10 else 0),
                    "leads_sold": safe_int(row[11] if len(row) > 11 else 0),
                    "average_lead_sale_cents": safe_int(safe_float(row[12] if len(row) > 12 else 0) * 100),
                    "recall_percentage": safe_float(row[13] if len(row) > 13 else 0),
                    "recall_jobs": safe_int(row[14] if len(row) > 14 else 0),
                    "no_charge_jobs": safe_int(row[15] if len(row) > 15 else 0),
                    "converted_jobs": safe_int(row[16] if len(row) > 16 else 0),  # KEY FIELD for competition
                    "unconverted_jobs": safe_int(row[17] if len(row) > 17 else 0),
                    "invoiced_jobs": safe_int(row[18] if len(row) > 18 else 0),
                    "jobs_on_hold": safe_int(row[19] if len(row) > 19 else 0),
                    "opportunity": safe_int(row[20] if len(row) > 20 else 0),
                    "sales_opportunity": safe_int(row[21] if len(row) > 21 else 0),
                    "replacement_opportunity": safe_int(row[22] if len(row) > 22 else 0),
                    "closed_opportunities": safe_int(row[23] if len(row) > 23 else 0),
                    "converted_job_average_cents": safe_int(safe_float(row[24] if len(row) > 24 else 0) * 100),
                    "opportunity_job_average_cents": safe_int(safe_float(row[25] if len(row) > 25 else 0) * 100),
                    "opportunity_conversion_rate": safe_float(row[26] if len(row) > 26 else 0),
                    "invoiced_revenue_cents": safe_int(safe_float(row[27] if len(row) > 27 else 0) * 100),
                    "converted_revenue_cents": safe_int(safe_float(row[28] if len(row) > 28 else 0) * 100),
                    "memberships_sold": safe_int(row[29] if len(row) > 29 else 0),
                    "membership_opportunities": safe_int(row[30] if len(row) > 30 else 0),
                    "warranty_jobs": safe_int(row[31] if len(row) > 31 else 0),
                    "completed_non_opportunities": safe_int(row[32] if len(row) > 32 else 0),
                    "total_conversion_rate": safe_float(row[33] if len(row) > 33 else 0),
                    "options_per_opportunity": safe_float(row[34] if len(row) > 34 else 0),
                    "lead_conversion_rate": safe_float(row[35] if len(row) > 35 else 0),
                    "billable_efficiency": safe_float(row[36] if len(row) > 36 else 0),
                    "first_call_arrival_time": str(row[37]) if len(row) > 37 and row[37] else None,
                    "technician_division": str(row[38]) if len(row) > 38 and row[38] else None,
                    "technician_business_unit": str(row[39]) if len(row) > 39 and row[39] else None,
                    "technician_trade": str(row[40]) if len(row) > 40 and row[40] else None
                }
                processed_data.append(record)

            logger.info(f"Successfully fetched {len(processed_data)} Sold Flips records for {period_type}")
            return processed_data

        except Exception as e:
            logger.error(f"Error in fetch_sold_flips_data: {str(e)}")
            if attempt < max_retries - 1:
                continue
            raise


def fetch_items_sold_custom_date_range(start_date, end_date):
    """
    Fetch Items Sold Report from ServiceTitan for a custom date range
    Used by competition tracking to get data for specific competition periods
    Report ID: 394027220
    """
    headers = get_auth_headers()
    tenant_id = "1498628772"
    url = f"https://api.servicetitan.io/reporting/v2/tenant/{tenant_id}/report-category/marketing/reports/394027220/data"

    payload = {
        "parameters": [
            {"name": "DateType", "value": "0"},  # Custom date range
            {"name": "IncludeInactive", "value": "false"},
            {"name": "From", "value": start_date},
            {"name": "To", "value": end_date}
        ]
    }

    max_retries = 2
    for attempt in range(max_retries):
        try:
            logger.info(f"Fetching Items Sold data from ServiceTitan API for {start_date} to {end_date}")
            response = requests.post(url, headers=headers, json=payload)

            if response.status_code == 429:
                logger.info(f"Rate limited on attempt {attempt + 1}, waiting before retry...")
                time.sleep(120)
                continue

            response.raise_for_status()

            data = response.json()
            rows = data.get("data", [])

            processed_data = []
            for row in rows:
                # Parse quantity - handle both string and numeric formats
                quantity_raw = row[3] if len(row) > 3 else 0
                try:
                    if isinstance(quantity_raw, str):
                        quantity = int(float(quantity_raw.replace('$', '').replace(',', '')))
                    else:
                        quantity = int(quantity_raw)
                except (ValueError, AttributeError):
                    quantity = 0

                record = {
                    "invoice_date": row[0] if len(row) > 0 else None,
                    "sold_by_technician": str(row[1]) if len(row) > 1 and row[1] else None,
                    "code": str(row[2]) if len(row) > 2 and row[2] else None,
                    "quantity": quantity,
                    "invoice_number": str(row[4]) if len(row) > 4 and row[4] else None,
                    "job_business_unit": str(row[5]) if len(row) > 5 and row[5] else None,
                    "job_type": str(row[6]) if len(row) > 6 and row[6] else None
                }

                # Only include if we have actual data
                if record["sold_by_technician"] and record["code"]:
                    processed_data.append(record)

            logger.info(f"Successfully fetched {len(processed_data)} Items Sold records for custom date range")
            return processed_data

        except Exception as e:
            logger.error(f"Error in fetch_items_sold_custom_date_range: {str(e)}")
            logger.error(traceback.format_exc())
            if attempt < max_retries - 1:
                logger.info(f"Retrying... (attempt {attempt + 2}/{max_retries})")
                continue
            raise


def fetch_sold_flips_custom_date_range(start_date, end_date):
    """
    Fetch Technician Leads Sold Report from ServiceTitan for a custom date range
    Used by competition tracking to get data for specific competition periods
    Report ID: 394041816
    """
    headers = get_auth_headers()
    tenant_id = "1498628772"
    url = f"https://api.servicetitan.io/reporting/v2/tenant/{tenant_id}/report-category/technician/reports/394041816/data"

    payload = {
        "parameters": [
            {"name": "DateType", "value": "0"},  # Custom date range
            {"name": "IncludeInactive", "value": "false"},
            {"name": "From", "value": start_date},
            {"name": "To", "value": end_date}
        ]
    }

    max_retries = 2
    for attempt in range(max_retries):
        try:
            logger.info(f"Fetching Sold Flips data from ServiceTitan API for {start_date} to {end_date}")
            response = requests.post(url, headers=headers, json=payload)

            if response.status_code == 429:
                logger.info(f"Rate limited on attempt {attempt + 1}, waiting before retry...")
                time.sleep(120)
                continue

            response.raise_for_status()

            data = response.json()
            rows = data.get("data", [])

            processed_data = []
            for row in rows:
                # Return simplified data with just the fields needed for competition
                # technician_name and leads_sold are the key fields
                record = {
                    "technician_name": str(row[0]) if len(row) > 0 and row[0] else None,
                    "leads_sold": safe_int(row[11] if len(row) > 11 else 0),  # Column 11 is leads_sold
                    "leads_set": safe_int(row[10] if len(row) > 10 else 0),  # Column 10 for reference
                    "converted_jobs": safe_int(row[16] if len(row) > 16 else 0),
                    "completed_jobs": safe_int(row[1] if len(row) > 1 else 0),
                    "total_sales_cents": safe_int(safe_float(row[6] if len(row) > 6 else 0) * 100),
                }

                # Only include technicians with data
                if record["technician_name"]:
                    processed_data.append(record)

            logger.info(f"Successfully fetched {len(processed_data)} Sold Flips records for custom date range")
            return processed_data

        except Exception as e:
            logger.error(f"Error in fetch_sold_flips_custom_date_range: {str(e)}")
            logger.error(traceback.format_exc())
            if attempt < max_retries - 1:
                logger.info(f"Retrying... (attempt {attempt + 2}/{max_retries})")
                continue
            raise


def fetch_call_center_data(period_type, retry_count=0, max_retries=2):
    headers = get_auth_headers()
    tenant_id = "1498628772"
    url = f"https://api.servicetitan.io/reporting/v2/tenant/{tenant_id}/report-category/operations/reports/2665/data"
    
    # Use Chicago timezone like your Apps Script
    import pytz
    chicago_tz = pytz.timezone('America/Chicago')
    today_chicago = datetime.now(chicago_tz)
    
    # Handle different period types with Chicago timezone
    if period_type == "today":
        from_date = today_chicago.strftime("%Y-%m-%d")
        to_date = today_chicago.strftime("%Y-%m-%d")
        report_date = to_date
    elif period_type == "week":
        # Start of current week (Monday) in Chicago time
        start_of_week = today_chicago - timedelta(days=today_chicago.weekday())
        from_date = start_of_week.strftime("%Y-%m-%d")
        to_date = today_chicago.strftime("%Y-%m-%d")
        report_date = to_date
    elif period_type == "mtd":
        from_date = today_chicago.replace(day=1).strftime("%Y-%m-%d")
        to_date = today_chicago.strftime("%Y-%m-%d")
        report_date = to_date
    elif period_type == "last_month":
        last_month = today_chicago.replace(day=1) - timedelta(days=1)
        from_date = last_month.replace(day=1).strftime("%Y-%m-%d")
        to_date = last_month.strftime("%Y-%m-%d")
        report_date = to_date
    elif period_type == "ytd":
        from_date = today_chicago.replace(month=1, day=1).strftime("%Y-%m-%d")
        to_date = today_chicago.strftime("%Y-%m-%d")
        report_date = to_date
    else:
        raise ValueError(f"Invalid period_type: {period_type}")

    # Match your Apps Script parameter order exactly
    parameters = [
        {"name": "IncludeInactive", "value": "false"},
        {"name": "IncludeExternalEmployees", "value": "false"},
        {"name": "From", "value": from_date},
        {"name": "To", "value": to_date}
    ]
    
    payload = {
        "parameters": parameters
    }

    logger.info(f"Call Center API request for {period_type}: {from_date} to {to_date} (Chicago time)")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        # Handle rate limiting with exponential backoff
        if response.status_code == 429 and retry_count < max_retries:
            wait_time = [120, 300, 600][retry_count]  # 2min, 5min, 10min
            logger.warning(f"Rate limited. Retrying in {wait_time} seconds... (attempt {retry_count + 1}/{max_retries})")
            time.sleep(wait_time)
            return fetch_call_center_data(period_type, retry_count + 1, max_retries)
        
        response.raise_for_status()
        raw_data = response.json()
        logger.info(f"Call Center API response type: {type(raw_data)}")
        
        # Handle the response format (should be similar to comfort advisor)
        if isinstance(raw_data, list):
            records = raw_data
        elif isinstance(raw_data, dict):
            records = raw_data.get('data', [])
        else:
            logger.error(f"Unexpected data structure: {type(raw_data)}")
            return [], report_date

        logger.info(f"Call Center raw records count: {len(records)}")
        
        # Process the data
        processed_data = []
        for record in records:
            if isinstance(record, list) and len(record) >= 15:
                # Map according to your actual CSV columns
                employee_name = str(record[0]) if record[0] else ""
                total_calls = safe_int(record[1])  # CallsTaken
                inbound_booking_rate = safe_float(record[2])  # InboundBookingRate (as decimal)
                outbound_calls = safe_int(record[3])  # OutboundCalls
                manual_calls_booked = safe_int(record[4])  # ManualCallsBooked
                memberships = safe_int(record[5])  # MembershipsSold
                booked_calls = safe_int(record[6])  # TotalJobsBooked
                lead_calls = safe_int(record[7])  # LeadCalls - Index 7
                raw_time_value = record[11] if len(record) > 11 else None
                avg_call_duration_seconds = 0

                if raw_time_value is not None and raw_time_value != "":
                    try:
                        # Convert to string safely
                        avg_call_time_str = str(raw_time_value).strip()
        
                        # Skip empty values
                        if avg_call_time_str and avg_call_time_str != "0:00:00" and avg_call_time_str != "None":
                            time_parts = avg_call_time_str.split(":")
            
                            if len(time_parts) == 3:
                                # Format: "H:MM:SS"
                                hours = int(float(time_parts[0]))
                                minutes = int(float(time_parts[1]))
                                seconds = int(float(time_parts[2]))
                                avg_call_duration_seconds = hours * 3600 + minutes * 60 + seconds
                            elif len(time_parts) == 2:
                                # Format: "MM:SS"  
                                minutes = int(float(time_parts[0]))
                                seconds = int(float(time_parts[1]))
                                avg_call_duration_seconds = minutes * 60 + seconds
            
                    except Exception as e:
                        logger.error(f"Could not parse AverageCallTime for {employee_name}: raw='{raw_time_value}', error: {e}")
                        avg_call_duration_seconds = 0
                
                # Calculate booking percentage
                booking_percent = round(inbound_booking_rate * 100, 1)
                
                # Calculate inbound calls (total - outbound)
                inbound_calls = total_calls - outbound_calls if total_calls >= outbound_calls else 0
                
                processed_data.append({
                    "report_date": report_date,
                    "period_type": period_type,
                    "employee_name": employee_name,
                    "total_calls": total_calls,
                    "calls_per_hour": 0.0,  # Calculate if needed
                    "booked_calls": booked_calls,
                    "inbound_calls": inbound_calls,
                    "outbound_calls": outbound_calls,
                    "booking_percent": booking_percent,
                    "avg_call_duration_seconds": avg_call_duration_seconds,  # FIXED
                    "cool_club_memberships": memberships,
                    "lead_calls": lead_calls,  # FIXED
                    "manual_calls_booked": manual_calls_booked,  # Optional: if you want to store this
                    "created_at": datetime.now(),
                    "updated_at": datetime.now()
                })
                
                # Log first few records for debugging
                if len(processed_data) <= 3:
                    logger.info(f"Processed {employee_name}: lead_calls={lead_calls}, avg_time_str='{avg_call_time_str}', avg_call_duration_seconds={avg_call_duration_seconds}")
        
        logger.info(f"Processed {len(processed_data)} Call Center records for {period_type}")
        return processed_data, report_date
        
    except Exception as e:
        logger.error(f"Error in fetch_call_center_data: {e}")
        if "429" in str(e) and retry_count < max_retries:
            wait_time = [120, 300, 600][retry_count]
            logger.warning(f"Rate limit error, waiting {wait_time} seconds before retry")
            time.sleep(wait_time)
            return fetch_call_center_data(period_type, retry_count + 1, max_retries)
        raise

def fetch_financial_data(period_type):
    """Fetch financial data from ServiceTitan"""
    headers = get_auth_headers()
    tenant_id = "1498628772"
    url = f"https://api.servicetitan.io/reporting/v2/tenant/{tenant_id}/report-category/accounting/reports/128062649/data"
    today = datetime.now()
    
    if period_type == "mtd":
        from_date = today.replace(day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "ytd":
        from_date = today.replace(month=1, day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "last_month":
        last_month = today.replace(day=1) - timedelta(days=1)
        from_date = last_month.replace(day=1).strftime("%Y-%m-%d")
        to_date = last_month.strftime("%Y-%m-%d")
    else:
        raise ValueError("Invalid period_type for financial data")

    payload = {
        "parameters": [
            {"name": "From", "value": from_date},
            {"name": "To", "value": to_date}
        ]
    }
    
    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 429:
                logger.info(f"Rate limited. Retrying in 120 seconds... (attempt {attempt + 1}/{max_retries})")
                time.sleep(120)
                continue
            response.raise_for_status()
            
            raw_data = response.json()
            logger.info(f"Financial API raw response (type: {type(raw_data)}): {json.dumps(raw_data, indent=2)[:1000]}...")
            
            # Handle different response structures safely
            records = []
            if isinstance(raw_data, list):
                records = raw_data
            elif isinstance(raw_data, dict):
                if "data" in raw_data:
                    data = raw_data["data"]
                    if isinstance(data, list):
                        records = data
                    elif isinstance(data, dict):
                        for key in ["rows", "records", "results", "items"]:
                            if key in data and isinstance(data[key], list):
                                records = data[key]
                                break
                else:
                    for key in ["rows", "records", "results", "items"]:
                        if key in raw_data and isinstance(raw_data[key], list):
                            records = raw_data[key]
                            break
            
            if not isinstance(records, list):
                logger.error(f"Could not find list of records in response. Type: {type(records)}")
                return []

            # Process financial data and aggregate by department
            department_totals = {}
            
            for i, record in enumerate(records):
                try:
                    if isinstance(record, dict):
                        # Handle dictionary format
                        business_unit = safe_get(record, "Name", "")
                        department = BUSINESS_UNIT_DEPARTMENT_MAPPING.get(business_unit, "unknown")
                        
                        if department == "ignore":
                            continue
                            
                        if department not in department_totals:
                            department_totals[department] = {
                                "department_name": department,
                                "period_type": period_type,
                                "invoiced_revenue_cents": 0,
                                "completed_revenue_cents": 0,
                                "total_revenue_cents": 0,
                                "adjustment_revenue_cents": 0,
                                "tech_lead_jobs": 0,
                                "marketing_lead_jobs": 0,
                                "opportunities": 0,
                                "membership_revenue_cents": 0,
                                "updated_at": datetime.now()
                            }
                        
                        # Aggregate the financial data
                        department_totals[department]["invoiced_revenue_cents"] += round(safe_float(safe_get(record, "InvoicedRevenue")) * 100)
                        department_totals[department]["completed_revenue_cents"] += round(safe_float(safe_get(record, "CompletedRevenue")) * 100)
                        department_totals[department]["total_revenue_cents"] += round(safe_float(safe_get(record, "TotalRevenue")) * 100)
                        department_totals[department]["adjustment_revenue_cents"] += round(safe_float(safe_get(record, "AdjustmentRevenue")) * 100)
                        department_totals[department]["tech_lead_jobs"] += safe_int(safe_get(record, "TechLeadJobs"))
                        department_totals[department]["marketing_lead_jobs"] += safe_int(safe_get(record, "MarketingLeadJobs"))
                        department_totals[department]["opportunities"] += safe_int(safe_get(record, "Opportunity"))
                        department_totals[department]["membership_revenue_cents"] += round(safe_float(safe_get(record, "MembershipTotalInvoicedRevenue")) * 100)
                        
                    elif isinstance(record, list) and len(record) >= 10:
                        # Handle array format
                        business_unit = str(record[0]) if record[0] else ""
                        department = BUSINESS_UNIT_DEPARTMENT_MAPPING.get(business_unit, "unknown")
                        
                        if department == "ignore":
                            continue
                            
                        if department not in department_totals:
                            department_totals[department] = {
                                "department_name": department,
                                "period_type": period_type,
                                "invoiced_revenue_cents": 0,
                                "completed_revenue_cents": 0,
                                "total_revenue_cents": 0,
                                "adjustment_revenue_cents": 0,
                                "tech_lead_jobs": 0,
                                "marketing_lead_jobs": 0,
                                "opportunities": 0,
                                "membership_revenue_cents": 0,
                                "updated_at": datetime.now()
                            }
                        
                        # Aggregate the financial data from array
                        department_totals[department]["invoiced_revenue_cents"] += round(safe_float(record[1]) * 100) if len(record) > 1 else 0
                        department_totals[department]["completed_revenue_cents"] += round(safe_float(record[2]) * 100) if len(record) > 2 else 0
                        department_totals[department]["total_revenue_cents"] += round(safe_float(record[4]) * 100) if len(record) > 4 else 0
                        department_totals[department]["adjustment_revenue_cents"] += round(safe_float(record[3]) * 100) if len(record) > 3 else 0
                        department_totals[department]["tech_lead_jobs"] += safe_int(record[6]) if len(record) > 6 else 0
                        department_totals[department]["marketing_lead_jobs"] += safe_int(record[7]) if len(record) > 7 else 0
                        department_totals[department]["opportunities"] += safe_int(record[8]) if len(record) > 8 else 0
                        department_totals[department]["membership_revenue_cents"] += round(safe_float(record[9]) * 100) if len(record) > 9 else 0
                        
                except Exception as e:
                    logger.error(f"Error processing financial record {i}: {str(e)}")
                    continue
            
            # Convert department totals to list
            processed_data = list(department_totals.values())
            logger.info(f"Processed {len(processed_data)} Financial department records")
            return processed_data
            
        except Exception as e:
            logger.error(f"Error in fetch_financial_data: {str(e)}")
            if attempt < max_retries - 1:
                continue
            raise
def fetch_monthly_financial_data_for_year(year=None, start_month=1, end_month=12):
    """Fetch financial data for each completed month of the year"""
    if year is None:
        year = datetime.now().year
    headers = get_auth_headers()
    tenant_id = "1498628772"
    url = f"https://api.servicetitan.io/reporting/v2/tenant/{tenant_id}/report-category/accounting/reports/128062649/data"
    
    monthly_data = {}
    current_date = datetime.now()
    
    # Define months to fetch (January through current month)
    months_to_fetch = []
    
    for month in range(start_month, min(end_month + 1, 13)):  # Don't go past December
        month_date = datetime(year, month, 1)

        # Only fetch completed months + current month for MTD
        # Fix: Compare full datetime objects, not just month numbers
        if month_date < datetime(current_date.year, current_date.month, 1):
            # Completed months - get full month data
            months_to_fetch.append({
                'month': month,
                'year': year,
                'label': f'{year}-{month:02d}',
                'period_type': f'monthly_{year}_{month:02d}',
                'is_complete': True
         })
        elif month_date.year == current_date.year and month_date.month == current_date.month:
            # Current month - get MTD data
            months_to_fetch.append({
                'month': month,
                'period_type': f'monthly_{year}_{month:02d}_mtd',
                'label': f'{year}-{month:02d} (MTD)',
                'is_complete': False
            })
    
    logger.info(f"Planning to fetch data for {len(months_to_fetch)} months: {[m['label'] for m in months_to_fetch]}")
    
    for month_info in months_to_fetch:
        try:
            month = month_info['month']
            
            # Calculate date range for the month
            from_date = datetime(year, month, 1).strftime("%Y-%m-%d")
            
            if month_info['is_complete']:
                # Full month - last day of month
                if month == 12:
                    to_date = datetime(year, 12, 31).strftime("%Y-%m-%d")
                else:
                    next_month = datetime(year, month + 1, 1)
                    last_day_of_month = next_month - timedelta(days=1)
                    to_date = last_day_of_month.strftime("%Y-%m-%d")
            else:
                # Current month MTD - use today's date
                to_date = current_date.strftime("%Y-%m-%d")
            
            payload = {
                "parameters": [
                    {"name": "From", "value": from_date},
                    {"name": "To", "value": to_date}
                ]
            }
            
            logger.info(f"Fetching financial data for {month_info['label']}: {from_date} to {to_date}")
            
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    response = requests.post(url, headers=headers, json=payload)
                    if response.status_code == 429:
                        logger.info(f"Rate limited. Retrying in 120 seconds... (attempt {attempt + 1}/{max_retries})")
                        time.sleep(120)
                        continue
                    response.raise_for_status()
                    
                    raw_data = response.json()
                    
                    # Process the data using existing logic
                    processed_data = process_monthly_financial_data(raw_data, month_info['period_type'])
                    
                    if processed_data:
                        monthly_data[month_info['label']] = {
                            'data': processed_data,
                            'period_type': month_info['period_type'],
                            'month': month,
                            'year': year,
                            'from_date': from_date,
                            'to_date': to_date,
                            'is_complete': month_info['is_complete'],
                            'total_revenue': sum(d['total_revenue_cents'] for d in processed_data) // 100
                        }
                        logger.info(f"Successfully processed {len(processed_data)} financial records for {month_info['label']} - Total Revenue: ${monthly_data[month_info['label']]['total_revenue']:,}")
                    
                    break  # Success, exit retry loop
                    
                except Exception as e:
                    logger.error(f"Error fetching financial data for {month_info['label']}, attempt {attempt + 1}: {str(e)}")
                    if attempt < max_retries - 1:
                        continue
                    raise
            
            # Rate limiting - wait between months to avoid hitting API limits
            time.sleep(10)  # 10 seconds between requests
            
        except Exception as e:
            logger.error(f"Failed to fetch financial data for {month_info['label']}: {str(e)}")
            continue
    
    return monthly_data

def process_monthly_financial_data(raw_data, period_identifier):
    """Process monthly financial data - reuse existing logic"""
    # Handle different response structures
    records = []
    if isinstance(raw_data, list):
        records = raw_data
    elif isinstance(raw_data, dict):
        if "data" in raw_data:
            data = raw_data["data"]
            if isinstance(data, list):
                records = data
            elif isinstance(data, dict):
                for key in ["rows", "records", "results", "items"]:
                    if key in data and isinstance(data[key], list):
                        records = data[key]
                        break
        else:
            for key in ["rows", "records", "results", "items"]:
                if key in raw_data and isinstance(raw_data[key], list):
                    records = raw_data[key]
                    break
    
    if not isinstance(records, list):
        logger.error(f"Could not find list of records in response for {period_identifier}")
        return []

    # Department totals - using your existing BUSINESS_UNIT_DEPARTMENT_MAPPING
    department_totals = {}
    
    for i, record in enumerate(records):
        try:
            if isinstance(record, dict):
                business_unit = safe_get(record, "Name", "")
            elif isinstance(record, list) and len(record) > 0:
                business_unit = str(record[0]) if record[0] else ""
            else:
                continue
                
            # Map business unit to department using your existing mapping
            department = BUSINESS_UNIT_DEPARTMENT_MAPPING.get(business_unit, "unknown")
            
            if department == "ignore":
                continue
                
            if department not in department_totals:
                department_totals[department] = {
                    "department_name": department,
                    "period_type": period_identifier,
                    "invoiced_revenue_cents": 0,
                    "completed_revenue_cents": 0,
                    "total_revenue_cents": 0,
                    "adjustment_revenue_cents": 0,
                    "tech_lead_jobs": 0,
                    "marketing_lead_jobs": 0,
                    "opportunities": 0,
                    "membership_revenue_cents": 0,
                    "updated_at": datetime.now()
                }
            
            # Aggregate financial data
            if isinstance(record, dict):
                department_totals[department]["invoiced_revenue_cents"] += round(safe_float(safe_get(record, "InvoicedRevenue")) * 100)
                department_totals[department]["completed_revenue_cents"] += round(safe_float(safe_get(record, "CompletedRevenue")) * 100)
                department_totals[department]["total_revenue_cents"] += round(safe_float(safe_get(record, "TotalRevenue")) * 100)
                department_totals[department]["adjustment_revenue_cents"] += round(safe_float(safe_get(record, "AdjustmentRevenue")) * 100)
                department_totals[department]["tech_lead_jobs"] += safe_int(safe_get(record, "TechLeadJobs"))
                department_totals[department]["marketing_lead_jobs"] += safe_int(safe_get(record, "MarketingLeadJobs"))
                department_totals[department]["opportunities"] += safe_int(safe_get(record, "Opportunity"))
                department_totals[department]["membership_revenue_cents"] += round(safe_float(safe_get(record, "MembershipTotalInvoicedRevenue")) * 100)

            elif isinstance(record, list) and len(record) >= 10:
                department_totals[department]["invoiced_revenue_cents"] += round(safe_float(record[1]) * 100) if len(record) > 1 else 0
                department_totals[department]["completed_revenue_cents"] += round(safe_float(record[2]) * 100) if len(record) > 2 else 0
                department_totals[department]["total_revenue_cents"] += round(safe_float(record[4]) * 100) if len(record) > 4 else 0
                department_totals[department]["adjustment_revenue_cents"] += round(safe_float(record[3]) * 100) if len(record) > 3 else 0
                department_totals[department]["tech_lead_jobs"] += safe_int(record[6]) if len(record) > 6 else 0
                department_totals[department]["marketing_lead_jobs"] += safe_int(record[7]) if len(record) > 7 else 0
                department_totals[department]["opportunities"] += safe_int(record[8]) if len(record) > 8 else 0
                department_totals[department]["membership_revenue_cents"] += round(safe_float(record[9]) * 100) if len(record) > 9 else 0
                
        except Exception as e:
            logger.error(f"Error processing financial record {i} for {period_identifier}: {str(e)}")
            continue
    
    processed_data = list(department_totals.values())
    return processed_data

def insert_monthly_financial_data(monthly_data_dict):
    """Insert monthly financial data into database"""
    db = Database()
    
    for month_label, month_info in monthly_data_dict.items():
        try:
            year = month_info['year']
            month = month_info['month']
            month_date = datetime(year, month, 1)
            
            with db.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Clear existing monthly data for this specific month
                    cursor.execute("""
                        DELETE FROM financial_performance 
                        WHERE EXTRACT(YEAR FROM report_date) = %s 
                        AND EXTRACT(MONTH FROM report_date) = %s
                        AND period_type LIKE %s
                    """, (year, month, f"monthly_{year}_%"))
                    
                    deleted_count = cursor.rowcount
                    logger.info(f"Cleared {deleted_count} existing monthly records for {month_label}")
                    
                    # Insert new monthly data
                    query = """
                    INSERT INTO financial_performance (
                        report_date, period_type, department_name, invoiced_revenue_cents,
                        completed_revenue_cents, total_revenue_cents, adjustment_revenue_cents,
                        tech_lead_jobs, marketing_lead_jobs, opportunities, membership_revenue_cents,
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    inserted_count = 0
                    for record in month_info['data']:
                        cursor.execute(query, (
                            month_date.date(),
                            record["period_type"],
                            record["department_name"],
                            record["invoiced_revenue_cents"],
                            record["completed_revenue_cents"],
                            record["total_revenue_cents"],
                            record["adjustment_revenue_cents"],
                            record["tech_lead_jobs"],
                            record["marketing_lead_jobs"],
                            record["opportunities"],
                            record["membership_revenue_cents"],
                            record["updated_at"],
                            record["updated_at"]
                        ))
                        inserted_count += 1
                    
                    conn.commit()
                    logger.info(f"Inserted {inserted_count} financial records for {month_label} (Total Revenue: ${month_info['total_revenue']:,})")
                    
        except Exception as e:
            logger.error(f"Error inserting monthly financial data for {month_label}: {str(e)}")
            continue
            
def fetch_membership_data(period_type):
    """Fetch membership data from ServiceTitan"""
    headers = get_auth_headers()
    tenant_id = "1498628772"
    url = f"https://api.servicetitan.io/reporting/v2/tenant/{tenant_id}/report-category/marketing/reports/371386314/data"
    today = datetime.now()
    
    if period_type == "mtd":
        from_date = today.replace(day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "ytd":
        from_date = today.replace(month=1, day=1).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
    elif period_type == "last_month":
        last_month = today.replace(day=1) - timedelta(days=1)
        from_date = last_month.replace(day=1).strftime("%Y-%m-%d")
        to_date = last_month.strftime("%Y-%m-%d")
    else:
        raise ValueError("Invalid period_type for membership data")

    payload = {
        "parameters": [
            {"name": "IncludeInactiveMembershipTypes", "value": "true"},
            {"name": "AggregatesOnly", "value": "false"},
            {"name": "From", "value": from_date},
            {"name": "To", "value": to_date}
        ]
    }
    
    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 429:
                logger.info(f"Rate limited. Retrying in 120 seconds... (attempt {attempt + 1}/{max_retries})")
                time.sleep(120)
                continue
            response.raise_for_status()
            
            raw_data = response.json()
            logger.info(f"Membership API raw response (type: {type(raw_data)}): {json.dumps(raw_data, indent=2)[:1000]}...")
            
            # Handle different response structures safely
            records = []
            if isinstance(raw_data, list):
                records = raw_data
            elif isinstance(raw_data, dict):
                if "data" in raw_data:
                    data = raw_data["data"]
                    if isinstance(data, list):
                        records = data
                    elif isinstance(data, dict):
                        for key in ["rows", "records", "results", "items"]:
                            if key in data and isinstance(data[key], list):
                                records = data[key]
                                break
                else:
                    for key in ["rows", "records", "results", "items"]:
                        if key in raw_data and isinstance(raw_data[key], list):
                            records = raw_data[key]
                            break
            
            if not isinstance(records, list):
                logger.error(f"Could not find list of records in response. Type: {type(records)}")
                return []

            # Process membership data - aggregate all membership types into "Cool Club Memberships"
            aggregated_data = {
                "membership_name": "Cool Club Memberships",
                "period_type": period_type,
                "active_at_start": 0,
                "suspended": 0,
                "canceled": 0,
                "expired": 0,
                "deleted": 0,
                "renewed": 0,
                "reactivated": 0,
                "new_sales": 0,
                "manual": 0,
                "active_at_end": 0,
                "updated_at": datetime.now()
            }
            
            for i, record in enumerate(records):
                try:
                    if isinstance(record, dict):
                        # Handle dictionary format - aggregate all membership types
                        aggregated_data["active_at_start"] += safe_int(safe_get(record, "ActiveAtStart"))
                        aggregated_data["suspended"] += safe_int(safe_get(record, "Suspended"))
                        aggregated_data["canceled"] += safe_int(safe_get(record, "Canceled"))
                        aggregated_data["expired"] += safe_int(safe_get(record, "Expired"))
                        aggregated_data["deleted"] += safe_int(safe_get(record, "Deleted"))
                        aggregated_data["renewed"] += safe_int(safe_get(record, "Renewed"))
                        aggregated_data["reactivated"] += safe_int(safe_get(record, "Reactivated"))
                        aggregated_data["new_sales"] += safe_int(safe_get(record, "NewSales"))
                        aggregated_data["manual"] += safe_int(safe_get(record, "Manual"))
                        aggregated_data["active_at_end"] += safe_int(safe_get(record, "ActiveAtEnd"))
                        
                    elif isinstance(record, list) and len(record) >= 12:
                        # Handle array format - based on your CSV structure
                        # Name, ActiveAtStart, Suspended, Canceled, Expired, Deleted, Renewed, Reactivated, NewSales, Manual, ActiveAtEnd, ActiveType
                        aggregated_data["active_at_start"] += safe_int(record[1] if len(record) > 1 else 0)
                        aggregated_data["suspended"] += safe_int(record[2] if len(record) > 2 else 0)
                        aggregated_data["canceled"] += safe_int(record[3] if len(record) > 3 else 0)
                        aggregated_data["expired"] += safe_int(record[4] if len(record) > 4 else 0)
                        aggregated_data["deleted"] += safe_int(record[5] if len(record) > 5 else 0)
                        aggregated_data["renewed"] += safe_int(record[6] if len(record) > 6 else 0)
                        aggregated_data["reactivated"] += safe_int(record[7] if len(record) > 7 else 0)
                        aggregated_data["new_sales"] += safe_int(record[8] if len(record) > 8 else 0)
                        aggregated_data["manual"] += safe_int(record[9] if len(record) > 9 else 0)
                        aggregated_data["active_at_end"] += safe_int(record[10] if len(record) > 10 else 0)
                        
                except Exception as e:
                    logger.error(f"Error processing membership record {i}: {str(e)}")
                    continue
            
            # Calculate renewal rate
            total_eligible_for_renewal = aggregated_data["renewed"] + aggregated_data["canceled"] + aggregated_data["expired"]
            if total_eligible_for_renewal > 0:
                aggregated_data["renewal_rate_percent"] = round((aggregated_data["renewed"] / total_eligible_for_renewal) * 100, 2)
            else:
                aggregated_data["renewal_rate_percent"] = 0.0
            
            logger.info(f"Processed membership data: {aggregated_data}")
            return [aggregated_data]  # Return as list for consistency with other functions
            
        except Exception as e:
            logger.error(f"Error in fetch_membership_data: {str(e)}")
            if attempt < max_retries - 1:
                continue
            raise

def get_existing_monthly_data(year=None):
    """Check what monthly data already exists in database"""
    if year is None:
        year = datetime.now().year
    db = Database()
    
    with db.get_connection() as conn:
        with conn.cursor() as cursor:
            query = """
            SELECT 
                EXTRACT(MONTH FROM report_date) as month,
                COUNT(*) as dept_count,
                MAX(updated_at) as last_updated,
                period_type
            FROM financial_performance 
            WHERE EXTRACT(YEAR FROM report_date) = %s
            AND period_type LIKE %s
            GROUP BY EXTRACT(MONTH FROM report_date), period_type
            ORDER BY month
            """
            
            cursor.execute(query, (year, f'monthly_{year}_%'))
            rows = cursor.fetchall()
            
            existing_months = {}
            for row in rows:
                month = int(row[0])
                dept_count = row[1]
                last_updated = row[2]
                period_type = row[3]
                
                existing_months[month] = {
                    'departments': dept_count,
                    'last_updated': last_updated,
                    'period_type': period_type,
                    'is_complete': dept_count >= 7  # Assuming 7 departments
                }
            
            return existing_months

def smart_monthly_financial_sync(year=None):
    """Intelligently sync only needed monthly financial data"""
    if year is None:
        year = datetime.now().year
    logger.info(f"Starting smart monthly financial sync for {year}")
    
    # Get current date info
    current_date = datetime.now()
    current_month = current_date.month
    current_year = current_date.year
    
    # Only work with the current year
    if year != current_year:
        logger.info(f"Year {year} is not current year {current_year}, skipping smart sync")
        return {
            'status': 'skipped',
            'message': f'Smart sync only works for current year ({current_year})',
            'year': year
        }
    
    # Check existing data
    existing_months = get_existing_monthly_data(year)
    logger.info(f"Found existing data for months: {list(existing_months.keys())}")
    
    # Determine what needs to be fetched
    months_to_fetch = []
    
    # 1. Check for missing historical months (Jan to last month)
    for month in range(1, current_month):
        if month not in existing_months:
            months_to_fetch.append(month)
            logger.info(f"Month {month} is missing - will fetch")
        elif not existing_months[month]['is_complete']:
            logger.info(f"Month {month} incomplete ({existing_months[month]['departments']} departments) - will fetch")
            months_to_fetch.append(month)
        else:
            logger.info(f"Month {month} complete - skipping")
    
    # 2. Always update current month (MTD data)
    months_to_fetch.append(current_month)
    logger.info(f"Current month {current_month} - will update MTD")
    
    if not months_to_fetch:
        return {
            'status': 'success',
            'message': 'No months need updating',
            'months_checked': list(existing_months.keys()),
            'months_fetched': [],
            'year': year
        }
    
    # Fetch only the needed months
    logger.info(f"Fetching data for months: {months_to_fetch}")
    
    try:
        monthly_data = {}
        
        for month in months_to_fetch:
            logger.info(f"Fetching month {month} data...")
            
            # Use existing fetch function for single month
            month_data = fetch_monthly_financial_data_for_year(year, month, month)
            
            if month_data:
                monthly_data.update(month_data)
                logger.info(f"Successfully fetched month {month}")
            else:
                logger.warning(f"No data returned for month {month}")
        
        if monthly_data:
            # Insert the new data
            insert_monthly_financial_data(monthly_data)
            
            fetched_months = [month_info['month'] for month_info in monthly_data.values()]
            total_revenue = sum(month['total_revenue'] for month in monthly_data.values())
            
            return {
                'status': 'success',
                'message': f'Smart sync completed for {year}',
                'months_fetched': fetched_months,
                'months_skipped': [m for m in range(1, current_month) if m not in months_to_fetch and m in existing_months],
                'total_revenue_updated': f"${total_revenue:,}",
                'api_calls_saved': 12 - len(months_to_fetch),  # Max 12 months possible
                'year': year
            }
        else:
            return {
                'status': 'error',
                'message': 'No monthly data was fetched',
                'months_attempted': months_to_fetch,
                'year': year
            }
            
    except Exception as e:
        logger.error(f"Error in smart monthly sync: {str(e)}")
        return {
            'status': 'error',
            'message': f'Smart monthly sync failed: {str(e)}',
            'year': year
        }

def monthly_cleanup_sync():
    """Monthly cleanup - finalize previous month, update targets"""
    logger.info("Starting monthly cleanup sync")
    
    current_date = datetime.now()
    last_month = current_date.replace(day=1) - timedelta(days=1)
    
    try:
        # Simple cleanup - just log and refresh
        logger.info(f"Monthly cleanup completed for {last_month.strftime('%B %Y')}")
        
        return {
            'status': 'success',
            'message': f'Monthly cleanup completed for {last_month.strftime("%B %Y")}',
            'actions': [
                'Logged monthly transition',
                'Prepared for new month tracking',
                'System ready for continued operation'
            ],
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in monthly cleanup: {str(e)}")
        return {
            'status': 'error',
            'message': f'Monthly cleanup failed: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }

def sync_servicetitan_data(request):
    """Main sync function with debug endpoint"""

    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }

    if request.method == 'OPTIONS':
        return ('', 204, headers)

    try:
        # Log the request path for debugging
        logger.info("=== NEW VERSION 2025-10-09 14:48 DEPLOYED ===")
        logger.info(f"Starting sync_servicetitan_data - Path: {request.path}")

        # Check for migration endpoint
        if request.path and '/migrate-add-leads-set' in request.path:
            logger.info("Running migration to add leads_set columns...")
            db = Database()

            try:
                with db.get_connection() as conn:
                    with conn.cursor() as cursor:
                        # Add leads_set to hvac_tech_performance
                        cursor.execute("""
                            ALTER TABLE hvac_tech_performance
                            ADD COLUMN IF NOT EXISTS leads_set NUMERIC(10,2) DEFAULT 0
                        """)
                        conn.commit()

                        # Add leads_set to hvac_maintenance_performance
                        cursor.execute("""
                            ALTER TABLE hvac_maintenance_performance
                            ADD COLUMN IF NOT EXISTS leads_set NUMERIC(10,2) DEFAULT 0
                        """)
                        conn.commit()

                        logger.info("✅ Migration completed successfully!")
                        return (json.dumps({"status": "success", "message": "Added leads_set columns to both tables"}), 200, headers)
            except Exception as e:
                logger.error(f"Migration failed: {str(e)}")
                return (json.dumps({"status": "error", "error": str(e)}), 500, headers)

        # Fix percentage column precision to allow values up to 100
        if request.path and '/migrate-fix-percentage-precision' in request.path:
            logger.info("Running migration to fix percentage column precision...")
            db = Database()

            try:
                with db.get_connection() as conn:
                    with conn.cursor() as cursor:
                        # Fix hvac_tech_performance percentage columns
                        logger.info("Updating hvac_tech_performance percentage columns to NUMERIC(5,2)...")
                        cursor.execute("""
                            ALTER TABLE hvac_tech_performance
                            ALTER COLUMN tech_recall_percent TYPE NUMERIC(5,2),
                            ALTER COLUMN close_rate_percent TYPE NUMERIC(5,2)
                        """)
                        conn.commit()

                        # Fix hvac_maintenance_performance percentage columns
                        logger.info("Updating hvac_maintenance_performance percentage columns to NUMERIC(5,2)...")
                        cursor.execute("""
                            ALTER TABLE hvac_maintenance_performance
                            ALTER COLUMN tech_recall_percent TYPE NUMERIC(5,2),
                            ALTER COLUMN close_rate_percent TYPE NUMERIC(5,2)
                        """)
                        conn.commit()

                        logger.info("✅ Percentage precision migration completed successfully!")
                        return (json.dumps({
                            "status": "success",
                            "message": "Updated tech_recall_percent and close_rate_percent columns to NUMERIC(5,2) to allow values up to 999.99"
                        }), 200, headers)
            except Exception as e:
                logger.error(f"Migration failed: {str(e)}")
                return (json.dumps({"status": "error", "error": str(e)}), 500, headers)

        # Check for yearly-financial endpoint FIRST
        if request.path and '/yearly-financial' in request.path:
            year = int(request.args.get('year', datetime.now().year))
            start_month = int(request.args.get('start_month', 1))
            end_month = int(request.args.get('end_month', 12))

            logger.info(f"Starting yearly financial sync for {year}, months {start_month}-{end_month}")
            
            try:
                monthly_data = fetch_monthly_financial_data_for_year(year, start_month, end_month)
                
                if monthly_data:
                    insert_monthly_financial_data(monthly_data)
                    
                    # Summary for response
                    total_months = len(monthly_data)
                    total_revenue = sum(month['total_revenue'] for month in monthly_data.values())
                    months_processed = list(monthly_data.keys())
                    
                    response = {
                        'status': 'success',
                        'message': f'Yearly financial data sync completed for {year}',
                        'summary': {
                            'months_processed': total_months,
                            'months': months_processed,
                            'total_revenue_collected': f"${total_revenue:,}",
                            'departments_per_month': len(monthly_data[months_processed[0]]['data']) if months_processed else 0
                        },
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, default=str, indent=2), 200, headers)
                else:
                    response = {
                        'status': 'error',
                        'message': f'No monthly data was fetched for {year}',
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, default=str, indent=2), 400, headers)
                    
            except Exception as e:
                logger.error(f"Error in yearly financial sync: {str(e)}")
                response = {
                    'status': 'error',
                    'message': f'Yearly financial sync failed: {str(e)}',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, default=str, indent=2), 500, headers)

        # Check for smart-monthly endpoint
        if request.path and '/smart-monthly' in request.path:
            year = int(request.args.get('year', datetime.now().year))
            
            logger.info(f"Starting smart monthly sync for {year}")
            
            try:
                result = smart_monthly_financial_sync(year)
                return (json.dumps(result, default=str, indent=2), 200, headers)
                
            except Exception as e:
                logger.error(f"Error in smart monthly sync: {str(e)}")
                response = {
                    'status': 'error',
                    'message': f'Smart monthly sync failed: {str(e)}',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, default=str, indent=2), 500, headers)

        # Check for monthly-cleanup endpoint
        if request.path and '/monthly-cleanup' in request.path:
            logger.info("Starting monthly cleanup")
            
            try:
                result = monthly_cleanup_sync()
                return (json.dumps(result, default=str, indent=2), 200, headers)
                
            except Exception as e:
                logger.error(f"Error in monthly cleanup: {str(e)}")
                response = {
                    'status': 'error',
                    'message': f'Monthly cleanup failed: {str(e)}',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, default=str, indent=2), 500, headers)

        # Custom date range sold flips endpoint for competition tracking
        if request.path and '/fetch-sold-flips-custom' in request.path:
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')

            if not start_date or not end_date:
                response = {
                    'status': 'error',
                    'message': 'start_date and end_date parameters are required',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response), 400, headers)

            logger.info(f"Fetching sold flips for custom date range: {start_date} to {end_date}")

            try:
                # Fetch sold flips data for custom date range
                sold_flips_records = fetch_sold_flips_custom_date_range(start_date, end_date)

                if sold_flips_records:
                    # Return the data without storing it
                    # Competition API will use this data directly
                    response = {
                        'status': 'success',
                        'message': f'Fetched {len(sold_flips_records)} technician records',
                        'data': sold_flips_records,
                        'date_range': {
                            'start': start_date,
                            'end': end_date
                        },
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, default=str, indent=2), 200, headers)
                else:
                    response = {
                        'status': 'success',
                        'message': 'No data found for the specified date range',
                        'data': [],
                        'date_range': {
                            'start': start_date,
                            'end': end_date
                        },
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, default=str, indent=2), 200, headers)

            except Exception as e:
                logger.error(f"Error fetching custom date range sold flips: {str(e)}")
                logger.error(traceback.format_exc())
                response = {
                    'status': 'error',
                    'message': f'Failed to fetch sold flips data: {str(e)}',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, default=str, indent=2), 500, headers)

        # Custom date range items sold endpoint for competition tracking
        if request.path and '/fetch-items-sold-custom' in request.path:
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')

            if not start_date or not end_date:
                response = {
                    'status': 'error',
                    'message': 'start_date and end_date parameters are required',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response), 400, headers)

            logger.info(f"Fetching items sold for custom date range: {start_date} to {end_date}")

            try:
                # Fetch items sold data for custom date range
                items_sold_records = fetch_items_sold_custom_date_range(start_date, end_date)

                if items_sold_records:
                    # Return the data without storing it
                    # Competition API will use this data directly
                    response = {
                        'status': 'success',
                        'message': f'Fetched {len(items_sold_records)} items sold records',
                        'data': items_sold_records,
                        'date_range': {
                            'start': start_date,
                            'end': end_date
                        },
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, default=str, indent=2), 200, headers)
                else:
                    response = {
                        'status': 'success',
                        'message': 'No data found for the specified date range',
                        'data': [],
                        'date_range': {
                            'start': start_date,
                            'end': end_date
                        },
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, default=str, indent=2), 200, headers)

            except Exception as e:
                logger.error(f"Error fetching custom date range items sold: {str(e)}")
                logger.error(traceback.format_exc())
                response = {
                    'status': 'error',
                    'message': f'Failed to fetch items sold data: {str(e)}',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, default=str, indent=2), 500, headers)

        # Debug endpoint
        if request.path and '/debug' in request.path:
            period = request.args.get('period', 'mtd')
            logger.info(f"Debug endpoint called for period: {period}")
            
            try:
                # Only test data types that support the requested period
                debug_response = {
                    'status': 'success',
                    'debug': True,
                    'period': period,
                    'timestamp': datetime.now().isoformat()
                }
                
                if period in ['mtd', 'ytd', 'last_month']:
                    comfort_data = fetch_comfort_advisor_data(period)
                    technician_data = fetch_technician_data(period)
                    debug_response.update({
                        'comfort_advisor': {
                            'count': len(comfort_data),
                            'sample': comfort_data[:2] if comfort_data else []
                        },
                        'technician': {
                            'count': len(technician_data),
                            'sample': technician_data[:2] if technician_data else []
                        },
                        'financial': {
                            'count': len(financial_data), 
                            'sample': financial_data[:2] if financial_data else []
                        },
                        'membership': {
                            'count': len(membership_data),
                            'sample': membership_data[:2] if membership_data else []
                        }
                })

                return (json.dumps(debug_response), 200, headers)

            except Exception as e:
                logger.error(f"Debug endpoint error: {str(e)}")
                return (json.dumps({"error": f"Debug endpoint failed: {str(e)}"}), 500, headers)

        # Regular sync
        periods = request.args.get('periods', 'mtd').split(',')
        valid_periods = ["today", "week", "mtd", "ytd", "last_month"]
        periods = [p.strip() for p in periods if p.strip() in valid_periods]
        
        if not periods:
            return (json.dumps({"error": "Invalid or missing periods parameter"}), 400, headers)

        db = Database()
        
        for period in periods:
            logger.info(f"Processing period: {period}")
            
            # Comfort Advisor and Technician data: only for MTD, YTD, Last Month
            if period in ['mtd', 'ytd', 'last_month']:
                # Fetch comfort advisor data
                try:
                    advisor_data = fetch_comfort_advisor_data(period)
                    if advisor_data:
                        db.insert_comfort_advisor_data(advisor_data, period)
                        logger.info(f"Inserted {len(advisor_data)} Comfort Advisor records")
                    else:
                        logger.info("No Comfort Advisor data returned")
                except Exception as e:
                    logger.error(f"Failed to sync Comfort Advisor data: {str(e)}")
                
                # Fetch technician data
                try:
                    hvac_tech_data = fetch_technician_data(period)
                    if hvac_tech_data:
                        db.insert_hvac_tech_data(hvac_tech_data, period)
                        logger.info(f"Inserted {len(hvac_tech_data)} HVAC tech records")
                    else:
                        logger.info("No HVAC tech data returned")
                except Exception as e:
                    logger.error(f"Failed to sync HVAC tech data: {str(e)}")

                # HVAC Maintenance
                try:
                    maintenance_data = fetch_hvac_maintenance_data(period)
                    if maintenance_data:
                        db.insert_hvac_maintenance_data(maintenance_data, period)
                        logger.info(f"Inserted {len(maintenance_data)} HVAC maintenance records")
                    else:
                        logger.info("No HVAC maintenance data returned")
                except Exception as e:
                    logger.error(f"Failed to sync HVAC maintenance data: {str(e)}")

                # Plumbing
                try:
                    plumbing_data = fetch_plumbing_data(period)
                    if plumbing_data:
                        db.insert_plumbing_data(plumbing_data, period)
                        logger.info(f"Inserted {len(plumbing_data)} Plumbing records")
                    else:
                        logger.info("No Plumbing data returned")
                except Exception as e:
                    logger.error(f"Failed to sync Plumbing data: {str(e)}")

                # Electrical
                try:
                    electrical_data = fetch_electrical_data(period)
                    if electrical_data:
                        db.insert_electrical_data(electrical_data, period)
                        logger.info(f"Inserted {len(electrical_data)} Electrical records")
                    else:
                        logger.info("No Electrical data returned")
                except Exception as e:
                    logger.error(f"Failed to sync Electrical data: {str(e)}")

                # Commercial HVAC
                try:
                    commercial_hvac_data = fetch_commercial_hvac_data(period)
                    if commercial_hvac_data:
                        db.insert_commercial_hvac_data(commercial_hvac_data, period)
                        logger.info(f"Inserted {len(commercial_hvac_data)} Commercial HVAC records")
                    else:
                        logger.info("No Commercial HVAC data returned")
                except Exception as e:
                    logger.error(f"Failed to sync Commercial HVAC data: {str(e)}")

                # Items Sold (Competition Data)
                try:
                    items_sold_data = fetch_items_sold_data(period)
                    if items_sold_data:
                        db.insert_items_sold_data(items_sold_data, period)
                        logger.info(f"Inserted {len(items_sold_data)} Items Sold records")
                    else:
                        logger.info("No Items Sold data returned")
                except Exception as e:
                    logger.error(f"Failed to sync Items Sold data: {str(e)}")

                # Sold Flips (Competition Data)
                try:
                    sold_flips_data = fetch_sold_flips_data(period)
                    if sold_flips_data:
                        db.insert_sold_flips_data(sold_flips_data, period)
                        logger.info(f"Inserted {len(sold_flips_data)} Sold Flips records")
                    else:
                        logger.info("No Sold Flips data returned")
                except Exception as e:
                    logger.error(f"Failed to sync Sold Flips data: {str(e)}")

                # Financial data: supports mtd, ytd, last_month
                try:
                    financial_data = fetch_financial_data(period)
                    if financial_data:
                        db.insert_financial_data(financial_data, period)
                        logger.info(f"Inserted {len(financial_data)} Financial records")
                    else:
                        logger.info("No Financial data returned")
                except Exception as e:
                    logger.error(f"Failed to sync Financial data: {str(e)}")
                # Membership data: supports mtd, ytd, last_month
                try:
                    membership_data = fetch_membership_data(period)
                    if membership_data:
                        db.insert_membership_data(membership_data, period)
                        logger.info(f"Inserted {len(membership_data)} Membership records")
                    else:
                        logger.info("No Membership data returned")
                except Exception as e:
                    logger.error(f"Failed to sync Membership data: {str(e)}")
            # Call Center data: supports all periods including 'today'
            try:
                call_center_data, report_date = fetch_call_center_data(period)
                if call_center_data:
                    db.insert_call_center_data(call_center_data, period, report_date)
                    logger.info(f"Inserted {len(call_center_data)} Call Center records")
                else:
                    logger.info("No Call Center data returned")
            except Exception as e:
                logger.error(f"Failed to sync Call Center data: {str(e)}")
        
        return (json.dumps({"status": "success", "message": f"Data sync completed for periods: {periods}"}), 200, headers)
        
    except Exception as e:
        logger.error(f"Error in sync_servicetitan_data: {str(e)}")
        return (json.dumps({"error": str(e)}), 500, headers)