import os
import json
import psycopg2
from datetime import datetime
import functions_framework
import logging
import jwt
import hashlib
import secrets
from decimal import Decimal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Custom JSON encoder to handle Decimal and datetime
class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

class AdminDatabaseManager:
    def __init__(self):
        pass
        
    def get_connection(self):
        """Get database connection for Cloud Functions"""
        instance_name = os.environ.get('INSTANCE_CONNECTION_NAME', 'new-dashboard-2025:us-central1:kpi-dashboard')
        
        # For Cloud Functions Gen2, try the Unix socket path (this is the standard way)
        try:
            socket_dir = os.environ.get('DB_SOCKET_DIR', '/cloudsql')
            socket_path = f'{socket_dir}/{instance_name}'
            
            logger.info(f"Attempting connection via socket: {socket_path}")
            
            return psycopg2.connect(
                host=socket_path,
                database='kpi_data',
                user='postgres',
                password='LexHVAC2025'
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
                    password='LexHVAC2025'
                )
            except Exception as alt_error:
                logger.error(f"All connection methods failed. Primary socket: {socket_error}, Alt socket: {alt_error}")
                raise alt_error

    # Widget Management
    def get_widgets(self):
        """Get widget configuration"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # First check if the table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'widget_config'
                    );
                """)
                table_exists = cursor.fetchone()[0]
                
                if not table_exists:
                    # Create the table if it doesn't exist
                    cursor.execute("""
                        CREATE TABLE widget_config (
                            widget_id VARCHAR(50) PRIMARY KEY,
                            enabled BOOLEAN DEFAULT true,
                            position INTEGER DEFAULT 0,
                            settings JSONB DEFAULT '{}',
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    """)
                    
                    # Insert default widgets
                    default_widgets = [
                        ('comfort-advisor', True, 1),
                        ('call-center', True, 2),
                        ('financial', True, 3),
                        ('technician', True, 4),
                        ('memberships', True, 5)
                    ]
                    
                    for widget_id, enabled, position in default_widgets:
                        cursor.execute("""
                            INSERT INTO widget_config (widget_id, enabled, position)
                            VALUES (%s, %s, %s)
                        """, (widget_id, enabled, position))
                    
                    conn.commit()
                
                query = """
                SELECT widget_id, enabled, position, settings
                FROM widget_config 
                ORDER BY position
                """
                cursor.execute(query)
                rows = cursor.fetchall()
                
                widgets = []
                for row in rows:
                    widgets.append({
                        'id': row[0],
                        'name': row[0].replace('-', ' ').title(),
                        'icon': self.get_icon_name(row[0]),
                        'enabled': row[1],
                        'position': row[2],
                        'settings': row[3] or {}
                    })
                
                return widgets

    def update_widgets(self, widgets_data):
        """Update widget configuration"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                for widget in widgets_data:
                    query = """
                    UPDATE widget_config 
                    SET enabled = %s, position = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE widget_id = %s
                    """
                    cursor.execute(query, (widget['enabled'], widget['position'], widget['id']))
                conn.commit()
                return True

    def get_icon_name(self, widget_id):
        """Map widget ID to icon name"""
        icon_map = {
            'comfort-advisor': 'UserCheck',
            'call-center': 'Phone',
            'financial': 'DollarSign',
            'technician': 'Wrench',
            'memberships': 'Users'
        }
        return icon_map.get(widget_id, 'Monitor')

    # Performance Targets Management
    def get_targets(self, year=None):
        """Get all performance targets organized by category, optionally filtered by year"""
        # Default to current year if not specified
        if year is None:
            year = datetime.now().year
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Check if performance_targets table exists
                cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'performance_targets'
                );
                """)
                table_exists = cursor.fetchone()[0]
                
                if not table_exists:
                    # Create the table with updated schema
                    cursor.execute("""
                    CREATE TABLE performance_targets (
                        id SERIAL PRIMARY KEY,
                        target_category VARCHAR(50) NOT NULL,
                        target_name VARCHAR(100) NOT NULL,
                        target_value DECIMAL(10,2) NOT NULL,
                        target_unit VARCHAR(20) DEFAULT 'number',
                        department VARCHAR(50),
                        target_month INTEGER,
                        target_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
                        alert_threshold DECIMAL(10,2),
                        current_value DECIMAL(10,2) DEFAULT 0,
                        effective_from DATE DEFAULT CURRENT_DATE,
                        effective_to DATE,
                        created_by VARCHAR(100) DEFAULT 'admin',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    """)
                    
                    # Insert some default targets including technician targets
                    default_targets = [
                        ('comfort_advisor', 'avg_ticket', 450.00, 'dollars', None, None, 2025, 400.00, 420.00),
                        ('comfort_advisor', 'close_rate', 75.00, 'percent', None, None, 2025, 65.00, 72.00),
                        ('call_center', 'booking_rate', 85.00, 'percent', None, None, 2025, 75.00, 82.00),
                        ('call_center', 'memberships_sold', 3.00, 'number', None, None, 2025, 2.00, 2.50),
                        ('technician', 'avg_ticket', 500.00, 'dollars', None, None, 2025, 450.00, 475.00),
                        ('technician', 'close_rate', 60.00, 'percent', None, None, 2025, 50.00, 55.00),
                        ('technician', 'recall_rate', 5.00, 'percent', None, None, 2025, 8.00, 6.50),
                        ('technician', 'memberships_sold', 2.00, 'number', None, None, 2025, 1.00, 1.50),
                        ('financial', 'annual_budget', 5000000.00, 'dollars', 'total', None, 2025, 4500000.00, 4800000.00)
                    ]
                    
                    for target in default_targets:
                        cursor.execute("""
                        INSERT INTO performance_targets 
                        (target_category, target_name, target_value, target_unit, department, 
                         target_month, target_year, alert_threshold, current_value)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, target)
                    
                    conn.commit()
                
                # STEP 1: Update current values from actual performance data
                try:
                    self.update_current_values_from_live_data(cursor)
                except Exception as e:
                    logger.error(f"Error updating current values: {e}")
                    # Continue even if this fails
                
                # STEP 2: Get the targets with updated current values
                query = """
                SELECT id, target_category, target_name, target_value, target_unit, 
                   department, target_month, target_year, 
                   COALESCE(alert_threshold, 0) as alert_threshold, 
                   COALESCE(current_value, 0) as current_value,
                   CASE 
                       WHEN target_name = 'recall_rate' THEN 
                           CASE 
                               WHEN COALESCE(current_value, 0) <= target_value THEN 'success'
                               WHEN COALESCE(current_value, 0) <= COALESCE(alert_threshold, target_value * 1.3) THEN 'warning'
                               ELSE 'danger'
                           END
                       ELSE 
                           CASE 
                               WHEN COALESCE(current_value, 0) >= target_value THEN 'success'
                               WHEN COALESCE(current_value, 0) >= COALESCE(alert_threshold, 0) THEN 'warning' 
                               ELSE 'danger'
                           END
                   END as status,
                   CASE 
                       WHEN target_name = 'recall_rate' THEN 
                           CASE 
                               WHEN target_value > 0 THEN ROUND((target_value / GREATEST(COALESCE(current_value, 1), 0.1) * 100), 1)
                               ELSE 100 
                           END
                       ELSE 
                           CASE 
                               WHEN target_value > 0 THEN ROUND((COALESCE(current_value, 0) / target_value * 100), 1)
                               ELSE 0 
                           END
                   END as completion_percentage,
                   effective_from, effective_to, 
                   COALESCE(created_by, 'admin') as created_by
                FROM performance_targets
                WHERE (effective_to IS NULL OR effective_to > CURRENT_DATE)
                AND (target_year = %s OR target_year IS NULL)
                ORDER BY target_category, department, target_month
                """
                cursor.execute(query, (year,))
                rows = cursor.fetchall()
                
                # Organize targets by category
                targets = {
                    'comfort_advisor': [],
                    'technician': [],
                    'hvac_maintenance': [],
                    'plumbing': [],
                    'electrical': [],
                    'call_center': [],
                    'financial': {
                        'annual': [],
                        'monthly': {}
                    }
                }
                
                for row in rows:
                    try:
                        target = {
                            'id': row[0],
                            'category': row[1],
                            'name': self.format_target_name(row[2]),
                            'value': float(row[3]) if row[3] is not None else 0.0,
                            'unit': row[4] if row[4] is not None else 'number',
                            'department': row[5],
                            'month': row[6],
                            'year': row[7] if row[7] is not None else 2025,
                            'alertThreshold': float(row[8]) if row[8] is not None else 0.0,
                            'currentValue': float(row[9]) if row[9] is not None else 0.0,
                            'status': row[10] if row[10] is not None else 'unknown',
                            'completionPercentage': float(row[11]) if row[11] is not None else 0.0,
                            'effectiveFrom': row[12].isoformat() if row[12] is not None else datetime.now().date().isoformat(),
                            'effectiveTo': row[13].isoformat() if row[13] is not None else None,
                            'createdBy': row[14] if row[14] is not None else 'admin'
                        }
                    
                        if target['category'] == 'financial':
                            if target['month'] is None:
                                # Annual target
                                targets['financial']['annual'].append(target)
                            else:
                                # Monthly target
                                dept = target['department']
                                if dept not in targets['financial']['monthly']:
                                    targets['financial']['monthly'][dept] = []
                                targets['financial']['monthly'][dept].append(target)
                        else:
                            if target['category'] in targets:
                                targets[target['category']].append(target)
                            else:
                                # Log unknown category but don't fail
                                logger.warning(f"Unknown target category: {target['category']}")
                            
                    except Exception as e:
                        logger.error(f"Error processing target row {row}: {e}")
                        continue
                
                return targets

    def update_current_values_from_live_data(self, cursor):
        """Update current values from actual performance data tables"""
        
        logger.info("Updating current values from live performance data...")
        
        try:
            # First check if we have any comfort advisor data
            cursor.execute("""
                SELECT COUNT(*) FROM comfort_advisor_performance 
                WHERE period_type = 'mtd' 
                AND closed_average_sale_cents > 0
            """)
            comfort_advisor_count = cursor.fetchone()[0]
    
            if comfort_advisor_count > 0:
                # Calculate comfort advisor average ticket
                cursor.execute("""
                    SELECT ROUND(AVG(closed_average_sale_cents::DECIMAL / 100), 2)
                    FROM comfort_advisor_performance 
                    WHERE period_type = 'mtd' 
                    AND closed_average_sale_cents > 0
                """)
                ca_avg_ticket_result = cursor.fetchone()
                ca_avg_ticket = ca_avg_ticket_result[0] if ca_avg_ticket_result and ca_avg_ticket_result[0] else 0

                # Calculate comfort advisor close rate  
                cursor.execute("""
                    SELECT ROUND(AVG(close_rate_percent), 1)
                    FROM comfort_advisor_performance
                    WHERE period_type = 'mtd'
                    AND close_rate_percent > 0
                """)
                ca_close_rate_result = cursor.fetchone()
                ca_close_rate = ca_close_rate_result[0] if ca_close_rate_result and ca_close_rate_result[0] else 0

                # Update average ticket target with calculated value
                if ca_avg_ticket > 0:
                    cursor.execute("""
                        UPDATE performance_targets
                        SET current_value = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE target_category = 'comfort_advisor' AND target_name = 'avg_ticket'
                    """, (ca_avg_ticket,))
                    logger.info(f"Updated comfort advisor avg_ticket: ${ca_avg_ticket}")

                # Update close rate target with calculated value
                if ca_close_rate > 0:
                    cursor.execute("""
                        UPDATE performance_targets
                        SET current_value = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE target_category = 'comfort_advisor' AND target_name = 'close_rate'
                    """, (ca_close_rate,))
                    logger.info(f"Updated comfort advisor close_rate: {ca_close_rate}%")

                logger.info(f"Updated comfort advisor targets from {comfort_advisor_count} records - avg_ticket: ${ca_avg_ticket}, close_rate: {ca_close_rate}%")
            else:
                logger.info("No MTD comfort advisor data found, keeping default values")
        
        except Exception as e:
            logger.error(f"Error updating comfort advisor targets: {e}")
            logger.error(f"Exception details: {str(e)}")

        # Update Technician targets
        try:
            # Check if we have technician data
            cursor.execute("""
                SELECT COUNT(*) FROM technician_performance 
                WHERE period_type = 'mtd'
            """)
            technician_count = cursor.fetchone()[0]
            
            if technician_count > 0:
                # Average Ticket: Get average of total_job_average_cents converted to dollars
                cursor.execute("""
                UPDATE performance_targets 
                SET current_value = COALESCE((
                    SELECT ROUND(AVG(total_job_average_cents::DECIMAL / 100), 2)
                    FROM technician_performance 
                    WHERE period_type = 'mtd' 
                    AND total_job_average_cents > 0
                ), 0),
                updated_at = CURRENT_TIMESTAMP
                WHERE target_category IN ('technician', 'hvac_maintenance', 'plumbing', 'electrical') 
                AND target_name LIKE '%avg_ticket%'
                """)
                
                # Close Rate: Get average close rate percentage
                cursor.execute("""
                UPDATE performance_targets 
                SET current_value = COALESCE((
                    SELECT ROUND(AVG(close_rate_percent), 1)
                    FROM technician_performance 
                    WHERE period_type = 'mtd' 
                    AND close_rate_percent >= 0
                ), 0),
                updated_at = CURRENT_TIMESTAMP
                WHERE target_category IN ('technician', 'hvac_maintenance', 'plumbing', 'electrical')
                AND target_name LIKE '%close_rate%'
                """)
                
                # Recall Rate: Get average recall rate percentage (lower is better)
                cursor.execute("""
                UPDATE performance_targets 
                SET current_value = COALESCE((
                    SELECT ROUND(AVG(tech_recall_percent), 2)
                    FROM technician_performance 
                    WHERE period_type = 'mtd' 
                    AND tech_recall_percent >= 0
                ), 0),
                updated_at = CURRENT_TIMESTAMP
                WHERE target_category IN ('technician', 'hvac_maintenance', 'plumbing', 'electrical')
                AND target_name LIKE '%recall_rate%'
                """)
                
                # Memberships Sold: Get average memberships sold per technician
                cursor.execute("""
                UPDATE performance_targets 
                SET current_value = COALESCE((
                    SELECT ROUND(AVG(memberships_sold), 1)
                    FROM technician_performance 
                    WHERE period_type = 'mtd' 
                    AND memberships_sold >= 0
                ), 0),
                updated_at = CURRENT_TIMESTAMP
                WHERE target_category IN ('technician', 'hvac_maintenance', 'plumbing', 'electrical')
                AND target_name LIKE '%memberships_sold%'
                """)
                # HVAC Maintenance Targets - Average Ticket
                cursor.execute("""
                UPDATE performance_targets 
                SET current_value = COALESCE((
                    SELECT ROUND(AVG(total_job_average_cents::DECIMAL / 100), 2)
                    FROM technician_performance 
                    WHERE period_type = 'mtd' 
                    AND business_unit LIKE '%Service Maintenance%'
                    AND total_job_average_cents > 0
                ), 0),
                updated_at = CURRENT_TIMESTAMP
                WHERE target_category = 'hvac_maintenance' 
                AND target_name LIKE '%avg_ticket%'
                """)

                # HVAC Maintenance Targets - Close Rate
                cursor.execute("""
                UPDATE performance_targets 
                SET current_value = COALESCE((
                    SELECT ROUND(AVG(close_rate_percent), 1)
                    FROM technician_performance 
                    WHERE period_type = 'mtd' 
                    AND business_unit LIKE '%Service Maintenance%'
                    AND close_rate_percent >= 0
                ), 0),
                updated_at = CURRENT_TIMESTAMP
                WHERE target_category = 'hvac_maintenance'
                AND target_name LIKE '%close_rate%'
                """)

                # HVAC Maintenance Targets - Recall Rate
                cursor.execute("""
                UPDATE performance_targets 
                SET current_value = COALESCE((
                    SELECT ROUND(AVG(tech_recall_percent), 2)
                    FROM technician_performance 
                    WHERE period_type = 'mtd' 
                    AND business_unit LIKE '%Service Maintenance%'
                    AND tech_recall_percent >= 0
                ), 0),
                updated_at = CURRENT_TIMESTAMP
                WHERE target_category = 'hvac_maintenance'
                AND target_name LIKE '%recall_rate%'
                """)

                # HVAC Maintenance Targets - Memberships Sold
                cursor.execute("""
                UPDATE performance_targets 
                SET current_value = COALESCE((
                    SELECT ROUND(AVG(memberships_sold), 1)
                    FROM technician_performance 
                    WHERE period_type = 'mtd' 
                    AND business_unit LIKE '%Service Maintenance%'
                    AND memberships_sold >= 0
                ), 0),
                updated_at = CURRENT_TIMESTAMP
                WHERE target_category = 'hvac_maintenance'
                AND target_name LIKE '%memberships_sold%'
                """)

                logger.info(f"Updated hvac_maintenance targets")
                logger.info(f"Updated technician targets from {technician_count} records")
            else:
                logger.info("No MTD technician data found, keeping default values")
                
        except Exception as e:
            logger.error(f"Error updating technician targets: {e}")
        

        
        # Update Call Center targets
        try:
            # Check if we have call center data
            cursor.execute("""
                SELECT COUNT(*) FROM call_center_performance 
                WHERE period_type = 'mtd'
            """)
            call_center_count = cursor.fetchone()[0]
            
            if call_center_count > 0:
                # Booking Rate: Get average booking percentage
                cursor.execute("""
                UPDATE performance_targets 
                SET current_value = COALESCE((
                    SELECT ROUND(AVG(booking_percent), 1)
                    FROM call_center_performance 
                    WHERE period_type = 'mtd' 
                    AND booking_percent > 0
                ), 0),
                updated_at = CURRENT_TIMESTAMP
                WHERE target_category = 'call_center' 
                AND target_name LIKE '%booking_rate%'
                """)
                
                # Memberships Sold: Get average memberships per agent for MTD
                cursor.execute("""
                UPDATE performance_targets 
                SET current_value = COALESCE((
                    SELECT ROUND(AVG(cool_club_memberships), 1)
                    FROM call_center_performance 
                    WHERE period_type = 'mtd'
                ), 0),
                updated_at = CURRENT_TIMESTAMP
                WHERE target_category = 'call_center' 
                AND target_name LIKE '%memberships_sold%'
                """)
                
                logger.info(f"Updated call center targets from {call_center_count} records")
            else:
                logger.info("No MTD call center data found, keeping default values")
                
        except Exception as e:
            logger.error(f"Error updating call center targets: {e}")
        
        # Update Financial targets (if you have the department_financial_performance table)
        try:
            # Check if the financial table exists first
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'department_financial_performance'
                )
            """)
            financial_table_exists = cursor.fetchone()[0]
            
            if financial_table_exists:
                cursor.execute("""
                UPDATE performance_targets 
                SET current_value = COALESCE((
                    SELECT SUM(revenue_cents::DECIMAL / 100)
                    FROM department_financial_performance 
                    WHERE department_name = performance_targets.department 
                    AND EXTRACT(MONTH FROM report_date) = performance_targets.target_month
                    AND EXTRACT(YEAR FROM report_date) = performance_targets.target_year
                    AND period_type = 'mtd'
                ), 0),
                updated_at = CURRENT_TIMESTAMP
                WHERE target_category = 'financial' 
                AND target_name = 'monthly_budget'
                AND department IS NOT NULL
                """)
                
                logger.info("Updated financial targets")
            else:
                logger.info("Financial performance table does not exist, skipping financial targets")
                
        except Exception as e:
            logger.info(f"Financial targets update skipped: {e}")
        
        # Commit all updates
        try:
            cursor.connection.commit()
            logger.info("Current values update completed successfully")
        except Exception as e:
            logger.error(f"Error committing current values update: {e}")
            cursor.connection.rollback()

    def format_target_name(self, target_name):
        """Format target name for display"""
        name_map = {
            'avg_ticket': 'Average Ticket',
            'close_rate': 'Close Rate',
            'recall_rate': 'Recall Rate',
            'memberships_sold': 'Memberships Sold',
            'booking_rate': 'Booking Rate',
            'annual_budget': 'Annual Budget',
            'monthly_budget': 'Monthly Budget'
        }
        return name_map.get(target_name, target_name.replace('_', ' ').title())

    def get_financial_departments(self):
        """Get list of financial departments"""
        return [
            {'value': 'total', 'label': 'Total'},
            {'value': 'hvac_service', 'label': 'HVAC Service'},
            {'value': 'hvac_maintenance', 'label': 'HVAC Maintenance'},
            {'value': 'hvac_replacement', 'label': 'HVAC Replacement'},
            {'value': 'plumbing', 'label': 'Plumbing'},
            {'value': 'electrical', 'label': 'Electrical'},
            {'value': 'commercial_hvac', 'label': 'Commercial HVAC'},
            {'value': 'tyler', 'label': 'Tyler'}
        ]

    def create_target(self, target_data):
        """Create new performance target"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Handle financial targets with months
                if target_data['category'] == 'financial' and target_data.get('isMonthly'):
                    # Create 12 monthly targets
                    target_ids = []
                    monthly_value = target_data['value'] / 12  # Distribute annual value across months
                    
                    for month in range(1, 13):
                        query = """
                        INSERT INTO performance_targets (
                            target_category, target_name, target_value, target_unit, 
                            department, target_month, target_year, alert_threshold, effective_from, created_by
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """
                        cursor.execute(query, (
                            target_data['category'],
                            'monthly_budget',
                            monthly_value,
                            target_data['unit'],
                            target_data['department'],
                            month,
                            target_data.get('year', datetime.now().year),
                            monthly_value * 0.9,  # 90% threshold
                            datetime.now().date(),
                            'admin'
                        ))
                        target_ids.append(cursor.fetchone()[0])
                    
                    conn.commit()
                    return target_ids
                else:
                    # Create single target
                    query = """
                    INSERT INTO performance_targets (
                        target_category, target_name, target_value, target_unit, 
                        department, target_month, target_year, alert_threshold, effective_from, created_by
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """
                    cursor.execute(query, (
                        target_data['category'],
                        target_data['name'].lower().replace(' ', '_'),
                        target_data['value'],
                        target_data['unit'],
                        target_data.get('department'),
                        target_data.get('month'),
                        target_data.get('year', datetime.now().year),
                        target_data.get('alertThreshold', target_data['value'] * 0.9),
                        datetime.now().date(),
                        'admin'
                    ))
                    target_id = cursor.fetchone()[0]
                    conn.commit()
                    return target_id

    def update_target(self, target_id, target_data):
        """Update existing performance target"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                UPDATE performance_targets 
                SET target_value = %s, alert_threshold = %s, department = %s, 
                    target_month = %s, target_year = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """
                cursor.execute(query, (
                    target_data['value'],
                    target_data.get('alertThreshold', target_data['value'] * 0.9),
                    target_data.get('department'),
                    target_data.get('month'),
                    target_data.get('year', datetime.now().year),
                    target_id
                ))
                conn.commit()
                return True

    def update_current_values(self, category):
        """Update current values from actual data"""
        # This would pull real data from your existing tables
        # For now, we'll simulate with mock updates
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                if category == 'comfort_advisor':
                    # Update from comfort_advisor_performance table
                    query = """
                    UPDATE performance_targets pt SET current_value = (
                        SELECT CASE 
                            WHEN pt.target_name = 'avg_ticket' THEN AVG(closed_average_sale_cents::DECIMAL / 100)
                            WHEN pt.target_name = 'close_rate' THEN AVG(close_rate_percent)
                        END
                        FROM comfort_advisor_performance 
                        WHERE period_type = 'mtd'
                    )
                    WHERE pt.target_category = 'comfort_advisor'
                    """
                    cursor.execute(query)
                
                elif category == 'call_center':
                    # Update from call_center_performance table
                    query = """
                    UPDATE performance_targets pt SET current_value = (
                        SELECT CASE 
                            WHEN pt.target_name = 'booking_rate' THEN AVG(booking_percent)
                            WHEN pt.target_name = 'memberships_sold' THEN SUM(cool_club_memberships)
                        END
                        FROM call_center_performance 
                        WHERE period_type = 'mtd'
                    )
                    WHERE pt.target_category = 'call_center'
                    """
                    cursor.execute(query)
                
                conn.commit()
                return True

    def delete_target(self, target_id):
        """Delete performance target"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = "DELETE FROM performance_targets WHERE id = %s"
                cursor.execute(query, (target_id,))
                conn.commit()
                return True

    # User Management
    def get_users(self):
        """Get all dashboard users"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Check if table exists, create if not
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'dashboard_users'
                    );
                """)
                table_exists = cursor.fetchone()[0]
                
                if not table_exists:
                    cursor.execute("""
                        CREATE TABLE dashboard_users (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(100) NOT NULL,
                            email VARCHAR(255) UNIQUE NOT NULL,
                            role VARCHAR(50) DEFAULT 'viewer',
                            status VARCHAR(20) DEFAULT 'active',
                            last_login TIMESTAMP,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    """)
                    
                    # Insert default admin user
                    cursor.execute("""
                        INSERT INTO dashboard_users (name, email, role, status)
                        VALUES ('Admin User', 'admin@lexhvac.com', 'admin', 'active')
                    """)
                    
                    conn.commit()
                
                query = """
                SELECT id, name, email, role, status, last_login, created_at
                FROM dashboard_users 
                ORDER BY created_at DESC
                """
                cursor.execute(query)
                rows = cursor.fetchall()
                
                users = []
                for row in rows:
                    users.append({
                        'id': row[0],
                        'name': row[1],
                        'email': row[2],
                        'role': row[3],
                        'status': row[4],
                        'lastLogin': row[5].strftime('%Y-%m-%d') if row[5] else 'Never',
                        'createdAt': row[6].isoformat()
                    })
                
                return users

    def create_user(self, user_data):
        """Create new dashboard user"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                INSERT INTO dashboard_users (name, email, role, status)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """
                cursor.execute(query, (
                    user_data['name'],
                    user_data['email'],
                    user_data['role'],
                    user_data['status']
                ))
                user_id = cursor.fetchone()[0]
                conn.commit()
                return user_id

    def update_user(self, user_id, user_data):
        """Update existing user"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                UPDATE dashboard_users 
                SET name = %s, email = %s, role = %s, status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """
                cursor.execute(query, (
                    user_data['name'],
                    user_data['email'],
                    user_data['role'],
                    user_data['status'],
                    user_id
                ))
                conn.commit()
                return True

    def delete_user(self, user_id):
        """Delete user"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = "DELETE FROM dashboard_users WHERE id = %s"
                cursor.execute(query, (user_id,))
                conn.commit()
                return True

    # System Settings
    def get_settings(self):
        """Get system settings"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Check if table exists, create if not
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'system_settings'
                    );
                """)
                table_exists = cursor.fetchone()[0]
                
                if not table_exists:
                    cursor.execute("""
                        CREATE TABLE system_settings (
                            id SERIAL PRIMARY KEY,
                            setting_key VARCHAR(100) UNIQUE NOT NULL,
                            setting_value TEXT NOT NULL,
                            setting_type VARCHAR(20) DEFAULT 'string',
                            description TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    """)
                    
                    # Insert default settings
                    default_settings = [
                        ('refresh_interval', '300', 'number', 'Dashboard refresh interval in seconds'),
                        ('auto_sync', 'true', 'boolean', 'Automatically sync data from ServiceTitan'),
                        ('company_name', 'Lex HVAC', 'string', 'Company name displayed on dashboard'),
                        ('timezone', 'America/Chicago', 'string', 'Default timezone for reports'),
                        ('display_cycle_interval', '30', 'number', 'Auto-cycle interval for TV displays in seconds'),
                        ('default_tv_dashboard', 'financial', 'string', 'Default dashboard view for TV displays')
                    ]
                    
                    for setting in default_settings:
                        cursor.execute("""
                            INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
                            VALUES (%s, %s, %s, %s)
                        """, setting)
                    
                    conn.commit()
                
                query = """
                SELECT setting_key, setting_value, setting_type, description
                FROM system_settings
                """
                cursor.execute(query)
                rows = cursor.fetchall()
                
                settings = {}
                for row in rows:
                    key, value, setting_type, description = row
                    
                    # Convert value based on type
                    if setting_type == 'number':
                        value = float(value)
                    elif setting_type == 'boolean':
                        value = value.lower() == 'true'
                    
                    settings[key] = {
                        'value': value,
                        'type': setting_type,
                        'description': description
                    }
                
                return settings

    def update_settings(self, settings_data):
        """Update system settings"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                for key, value in settings_data.items():
                    query = """
                    UPDATE system_settings 
                    SET setting_value = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE setting_key = %s
                    """
                    cursor.execute(query, (str(value), key))
                conn.commit()
                return True

    # System Status
    def get_system_status(self):
        """Get system health status"""
        status = {
            'database': 'connected',
            'serviceTitan': 'connected',
            'lastSync': datetime.now().isoformat(),
            'syncStatus': 'success'
        }
        
        # Check database connection
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
        except Exception:
            status['database'] = 'disconnected'
        
        # TODO: Check ServiceTitan API connection
        # TODO: Get actual last sync time from sync log
        
        return status
    def hash_password(self, password):
        """Hash password with salt for security"""
        salt = secrets.token_hex(16)
        pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return f"{salt}:{pwd_hash.hex()}"
    
    def verify_password(self, password, stored_password):
        """Verify password against stored hash"""
        try:
            salt, pwd_hash = stored_password.split(':')
            return pwd_hash == hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
        except:
            return False

    def generate_jwt_token(self, user_data):
        """Generate JWT token for authenticated user"""
        try:
            import jwt
            from datetime import datetime, timedelta

            secret_key = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')

            payload = {
                'user_id': user_data['id'],
                'email': user_data['email'],
                'role': user_data['role'],
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + timedelta(hours=24)
            }

            token = jwt.encode(payload, secret_key, algorithm='HS256')
            logger.info(f"Generated JWT token of length: {len(token)}")
            return token
        except Exception as e:
            logger.error(f"Error generating JWT token: {e}")
            return None

    def verify_jwt_token(self, token):
        """Verify JWT token and return user data"""
        try:
            secret_key = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    def authenticate_display_user(self, email):
        """Authenticate display user (no password required)"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT id, name, email, role, status
                FROM dashboard_users
                WHERE email = %s AND status = 'active' AND role = 'display'
                """
                cursor.execute(query, (email,))
                user = cursor.fetchone()

                if user:
                    user_id, name, email, role, status = user

                    # Update last login
                    cursor.execute("""
                        UPDATE dashboard_users
                        SET last_login = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (user_id,))
                    conn.commit()

                    return {
                        'id': user_id,
                        'name': name,
                        'email': email,
                        'role': role,
                        'status': status
                    }

                return None

    def get_users(self):
        """Get all dashboard users"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Check if table exists, create if not
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'dashboard_users'
                    );
                """)
                table_exists = cursor.fetchone()[0]
                
                if not table_exists:
                    cursor.execute("""
                        CREATE TABLE dashboard_users (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(100) NOT NULL,
                            email VARCHAR(255) UNIQUE NOT NULL,
                            role VARCHAR(50) DEFAULT 'viewer',
                            status VARCHAR(20) DEFAULT 'active',
                            password_hash VARCHAR(255), -- Added password field
                            last_login TIMESTAMP,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    """)
                    
                    # Insert default admin user with a password
                    default_password_hash = self.hash_password('admin123') # Change this!
                    cursor.execute("""
                        INSERT INTO dashboard_users (name, email, role, status, password_hash)
                        VALUES ('Admin User', 'admin@lexhvac.com', 'admin', 'active', %s)
                    """, (default_password_hash,))
                    
                    conn.commit()
                
                # Check if password_hash column exists (for existing installations)
                cursor.execute("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'dashboard_users' AND column_name = 'password_hash';
                """)
                password_column_exists = cursor.fetchone()
                
                if not password_column_exists:
                    # Add password column to existing table
                    cursor.execute("""
                        ALTER TABLE dashboard_users 
                        ADD COLUMN password_hash VARCHAR(255);
                    """)
                    conn.commit()
                    logger.info("Added password_hash column to existing dashboard_users table")
                
                query = """
                SELECT id, name, email, role, status, last_login, created_at
                FROM dashboard_users 
                ORDER BY created_at DESC
                """
                cursor.execute(query)
                rows = cursor.fetchall()
                
                users = []
                for row in rows:
                    users.append({
                        'id': row[0],
                        'name': row[1],
                        'email': row[2],
                        'role': row[3],
                        'status': row[4],
                        'lastLogin': row[5].strftime('%Y-%m-%d') if row[5] else 'Never',
                        'createdAt': row[6].isoformat(),
                        'hasPassword': True  # Don't expose actual password info
                    })
                
                return users

    def create_user(self, user_data):
        """Create new dashboard user"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                password_hash = None
                
                # Hash password if provided (not required for display users)
                if user_data.get('password') and user_data['role'] != 'display':
                    password_hash = self.hash_password(user_data['password'])
                
                query = """
                INSERT INTO dashboard_users (name, email, role, status, password_hash)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """
                cursor.execute(query, (
                    user_data['name'],
                    user_data['email'],
                    user_data['role'],
                    user_data['status'],
                    password_hash
                ))
                user_id = cursor.fetchone()[0]
                conn.commit()
                return user_id

    def update_user(self, user_id, user_data):
        """Update existing user"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Check if password should be updated
                if user_data.get('password') and user_data['role'] != 'display':
                    password_hash = self.hash_password(user_data['password'])
                    query = """
                    UPDATE dashboard_users 
                    SET name = %s, email = %s, role = %s, status = %s, 
                        password_hash = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """
                    cursor.execute(query, (
                        user_data['name'],
                        user_data['email'],
                        user_data['role'],
                        user_data['status'],
                        password_hash,
                        user_id
                    ))
                else:
                    # Update without changing password
                    query = """
                    UPDATE dashboard_users 
                    SET name = %s, email = %s, role = %s, status = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """
                    cursor.execute(query, (
                        user_data['name'],
                        user_data['email'],
                        user_data['role'],
                        user_data['status'],
                        user_id
                    ))
                
                # Clear password for display users
                if user_data['role'] == 'display':
                    cursor.execute("""
                        UPDATE dashboard_users 
                        SET password_hash = NULL 
                        WHERE id = %s
                    """, (user_id,))
                
                conn.commit()
                return True

    def authenticate_user(self, email, password):
        """Authenticate user login"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT id, name, email, role, status, password_hash
                FROM dashboard_users
                WHERE email = %s AND status = 'active'
                """
                cursor.execute(query, (email,))
                user = cursor.fetchone()

                if not user:
                    return None

                user_id, name, email, role, status, password_hash = user

                # Display users don't need password authentication
                if role == 'display':
                    # Update last login
                    cursor.execute("""
                        UPDATE dashboard_users
                        SET last_login = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (user_id,))
                    conn.commit()

                    return {
                        'id': user_id,
                        'name': name,
                        'email': email,
                        'role': role,
                        'status': status
                    }

                # Verify password for non-display users
                if password_hash and self.verify_password(password, password_hash):
                    # Update last login
                    cursor.execute("""
                        UPDATE dashboard_users
                        SET last_login = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (user_id,))
                    conn.commit()

                    return {
                        'id': user_id,
                        'name': name,
                        'email': email,
                        'role': role,
                        'status': status
                    }

                return None

    # =========================
    # Advanced Widget Management Methods
    # =========================

    def get_widget_types(self):
        """Get all available widget types"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT widget_type_key, name, description, category, default_config, icon
                FROM widget_types
                WHERE is_active = true
                ORDER BY category, name
                """
                cursor.execute(query)
                rows = cursor.fetchall()

                widget_types = []
                for row in rows:
                    # Parse JSONB default_config if needed
                    default_config = row[4] if isinstance(row[4], dict) else {}

                    widget_types.append({
                        'widget_type_key': row[0],
                        'name': row[1],
                        'display_name': row[1],  # For backwards compatibility
                        'description': row[2],
                        'category': row[3],
                        'default_config': default_config,
                        'icon': row[5],
                        'is_active': True
                    })

                return widget_types

    def get_dashboard_views(self):
        """Get all dashboard views"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT view_key, name, description, icon, display_order
                FROM dashboard_views
                WHERE is_active = true
                ORDER BY display_order
                """
                cursor.execute(query)
                rows = cursor.fetchall()

                views = []
                for row in rows:
                    views.append({
                        'view_key': row[0],
                        'name': row[1],
                        'display_name': row[1],  # For backwards compatibility
                        'description': row[2],
                        'icon': row[3],
                        'display_order': row[4],
                        'is_active': True
                    })

                return views

    def get_widget_instances(self, dashboard_key=None):
        """Get widget instances, optionally filtered by dashboard"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                if dashboard_key:
                    query = """
                    SELECT widget_instance_key, widget_type_key, dashboard_view_key,
                           title, subtitle, layout_position, grid_column_span, grid_row_span,
                           config, is_visible, required_role
                    FROM widget_instances
                    WHERE dashboard_view_key = %s
                    ORDER BY layout_position
                    """
                    cursor.execute(query, (dashboard_key,))
                else:
                    query = """
                    SELECT widget_instance_key, widget_type_key, dashboard_view_key,
                           title, subtitle, layout_position, grid_column_span, grid_row_span,
                           config, is_visible, required_role
                    FROM widget_instances
                    ORDER BY dashboard_view_key, layout_position
                    """
                    cursor.execute(query)

                rows = cursor.fetchall()

                instances = []
                for row in rows:
                    instances.append({
                        'widget_instance_key': row[0],
                        'widget_type_key': row[1],
                        'dashboard_view_key': row[2],
                        'title': row[3],
                        'subtitle': row[4],
                        'layout_position': row[5],
                        'grid_column_span': row[6],
                        'grid_row_span': row[7],
                        'config': row[8],
                        'is_visible': row[9],
                        'required_role': row[10]
                    })

                return instances

    def create_widget_instance(self, widget_data):
        """Create a new widget instance"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                INSERT INTO widget_instances (
                    widget_instance_key, widget_type_key, dashboard_view_key,
                    title, subtitle, layout_position, grid_column_span, grid_row_span,
                    config, is_visible, required_role, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING widget_instance_key
                """
                cursor.execute(query, (
                    widget_data['widget_instance_key'],
                    widget_data['widget_type_key'],
                    widget_data['dashboard_view_key'],
                    widget_data['title'],
                    widget_data.get('subtitle'),
                    widget_data['layout_position'],
                    widget_data['grid_column_span'],
                    widget_data['grid_row_span'],
                    json.dumps(widget_data['config']),
                    widget_data.get('is_visible', True),
                    widget_data.get('required_role'),
                    'admin'
                ))
                widget_key = cursor.fetchone()[0]
                conn.commit()
                return widget_key

    def update_widget_instance(self, widget_key, updates):
        """Update an existing widget instance"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Build dynamic UPDATE query based on provided fields
                set_clauses = []
                values = []

                if 'title' in updates:
                    set_clauses.append('title = %s')
                    values.append(updates['title'])
                if 'subtitle' in updates:
                    set_clauses.append('subtitle = %s')
                    values.append(updates['subtitle'])
                if 'layout_position' in updates:
                    set_clauses.append('layout_position = %s')
                    values.append(updates['layout_position'])
                if 'grid_column_span' in updates:
                    set_clauses.append('grid_column_span = %s')
                    values.append(updates['grid_column_span'])
                if 'grid_row_span' in updates:
                    set_clauses.append('grid_row_span = %s')
                    values.append(updates['grid_row_span'])
                if 'config' in updates:
                    set_clauses.append('config = %s')
                    values.append(json.dumps(updates['config']))
                if 'is_visible' in updates:
                    set_clauses.append('is_visible = %s')
                    values.append(updates['is_visible'])
                if 'required_role' in updates:
                    set_clauses.append('required_role = %s')
                    values.append(updates['required_role'])

                set_clauses.append('updated_at = CURRENT_TIMESTAMP')
                values.append(widget_key)

                query = f"""
                UPDATE widget_instances
                SET {', '.join(set_clauses)}
                WHERE widget_instance_key = %s
                """
                cursor.execute(query, values)
                conn.commit()
                return True

    def delete_widget_instance(self, widget_key):
        """Delete a widget instance"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = "DELETE FROM widget_instances WHERE widget_instance_key = %s"
                cursor.execute(query, (widget_key,))
                conn.commit()
                return True

    def reorder_widget_instances(self, dashboard_key, widget_order):
        """Reorder widgets in a dashboard"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                for position, widget_key in enumerate(widget_order):
                    query = """
                    UPDATE widget_instances
                    SET layout_position = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE widget_instance_key = %s AND dashboard_view_key = %s
                    """
                    cursor.execute(query, (position, widget_key, dashboard_key))
                conn.commit()
                return True

    def get_widget_data_sources(self):
        """Get all widget data sources"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT data_source_key, name as display_name, description, query_template,
                       available_filters, refresh_interval_seconds, available_fields
                FROM widget_data_sources
                WHERE is_active = true
                ORDER BY name
                """
                cursor.execute(query)
                rows = cursor.fetchall()

                data_sources = []
                for row in rows:
                    # Parse JSONB fields if they're strings
                    available_filters = row[4] if isinstance(row[4], (list, dict)) else []
                    available_fields = row[6] if row[6] and isinstance(row[6], (list, dict)) else []

                    data_sources.append({
                        'data_source_key': row[0],
                        'display_name': row[1],
                        'name': row[1],  # For backwards compatibility
                        'description': row[2],
                        'query_template': row[3],
                        'available_filters': available_filters,
                        'available_fields': available_fields,
                        'refresh_interval_seconds': row[5]
                    })

                return data_sources

    def fetch_widget_data(self, data_source_key, filters=None):
        """Fetch data for a widget based on data source"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Get the query template for this data source
                query = """
                SELECT query_template
                FROM widget_data_sources
                WHERE data_source_key = %s AND is_active = true
                """
                cursor.execute(query, (data_source_key,))
                result = cursor.fetchone()

                if not result:
                    return []

                query_template = result[0]

                # Execute the data query
                # Note: In production, you'd want to properly sanitize and parameterize this
                try:
                    cursor.execute(query_template)
                    rows = cursor.fetchall()
                    columns = [desc[0] for desc in cursor.description]

                    # Convert to list of dictionaries
                    data = []
                    for row in rows:
                        data.append(dict(zip(columns, row)))

                    return data
                except Exception as e:
                    logger.error(f"Error fetching widget data: {e}")
                    return []

    def get_dashboard_presets(self, dashboard_key=None):
        """Get dashboard layout presets"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                if dashboard_key:
                    query = """
                    SELECT id, preset_name, dashboard_view_key, widget_configuration,
                           is_default, created_by, created_at
                    FROM dashboard_layout_presets
                    WHERE dashboard_view_key = %s
                    ORDER BY preset_name
                    """
                    cursor.execute(query, (dashboard_key,))
                else:
                    query = """
                    SELECT id, preset_name, dashboard_view_key, widget_configuration,
                           is_default, created_by, created_at
                    FROM dashboard_layout_presets
                    ORDER BY dashboard_view_key, preset_name
                    """
                    cursor.execute(query)

                rows = cursor.fetchall()

                presets = []
                for row in rows:
                    presets.append({
                        'id': row[0],
                        'preset_name': row[1],
                        'dashboard_view_key': row[2],
                        'widget_configuration': row[3],
                        'is_default': row[4],
                        'created_by': row[5],
                        'created_at': row[6].isoformat() if row[6] else None
                    })

                return presets

    def save_dashboard_preset(self, preset_data):
        """Save a dashboard layout preset"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                INSERT INTO dashboard_layout_presets (
                    preset_name, dashboard_view_key, widget_configuration,
                    is_default, created_by
                ) VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """
                cursor.execute(query, (
                    preset_data['preset_name'],
                    preset_data['dashboard_view_key'],
                    json.dumps(preset_data['widget_configuration']),
                    preset_data.get('is_default', False),
                    preset_data.get('created_by', 'admin')
                ))
                preset_id = cursor.fetchone()[0]
                conn.commit()
                return preset_id

    def apply_dashboard_preset(self, preset_id, dashboard_key):
        """Apply a preset to a dashboard (restore widget configuration)"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Get preset configuration
                query = """
                SELECT widget_configuration
                FROM dashboard_layout_presets
                WHERE id = %s
                """
                cursor.execute(query, (preset_id,))
                result = cursor.fetchone()

                if not result:
                    return False

                widget_config = result[0]

                # Delete current widgets for this dashboard
                cursor.execute("""
                    DELETE FROM widget_instances
                    WHERE dashboard_view_key = %s
                """, (dashboard_key,))

                # Recreate widgets from preset
                for widget in widget_config:
                    cursor.execute("""
                        INSERT INTO widget_instances (
                            widget_instance_key, widget_type_key, dashboard_view_key,
                            title, subtitle, layout_position, grid_column_span, grid_row_span,
                            config, is_visible, required_role
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        widget['widget_instance_key'],
                        widget['widget_type_key'],
                        dashboard_key,
                        widget['title'],
                        widget.get('subtitle'),
                        widget['layout_position'],
                        widget['grid_column_span'],
                        widget['grid_row_span'],
                        json.dumps(widget['config']),
                        widget.get('is_visible', True),
                        widget.get('required_role')
                    ))

                conn.commit()
                return True

    def get_user_preferences(self, user_email, dashboard_key=None):
        """Get user dashboard preferences"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                if dashboard_key:
                    query = """
                    SELECT id, user_email, dashboard_view_key, preferences
                    FROM user_dashboard_preferences
                    WHERE user_email = %s AND dashboard_view_key = %s
                    """
                    cursor.execute(query, (user_email, dashboard_key))
                else:
                    query = """
                    SELECT id, user_email, dashboard_view_key, preferences
                    FROM user_dashboard_preferences
                    WHERE user_email = %s
                    """
                    cursor.execute(query, (user_email,))

                rows = cursor.fetchall()

                prefs = []
                for row in rows:
                    prefs.append({
                        'id': row[0],
                        'user_email': row[1],
                        'dashboard_view_key': row[2],
                        'preferences': row[3]
                    })

                return prefs[0] if dashboard_key and prefs else prefs

    def save_user_preferences(self, user_email, dashboard_key, preferences):
        """Save user dashboard preferences"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Upsert preferences
                query = """
                INSERT INTO user_dashboard_preferences (user_email, dashboard_view_key, preferences)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_email, dashboard_view_key)
                DO UPDATE SET preferences = %s, updated_at = CURRENT_TIMESTAMP
                RETURNING id
                """
                cursor.execute(query, (
                    user_email,
                    dashboard_key,
                    json.dumps(preferences),
                    json.dumps(preferences)
                ))
                pref_id = cursor.fetchone()[0]
                conn.commit()
                return pref_id
# Initialize database manager
admin_db = AdminDatabaseManager()

@functions_framework.http
def admin_api(request):
    """Admin API Cloud Function entry point"""
    
    # Set CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    }
    
    # Handle preflight requests
    if request.method == 'OPTIONS':
        return ('', 204, headers)
    
    try:
        # Parse the request path
        path = request.path.strip('/')
        path_parts = path.split('/')
        method = request.method
        
        logger.info(f"Admin API request: {method} {path}")
        
        # Authentication Routes
        if path_parts[0] == 'auth':
            if len(path_parts) > 1 and path_parts[1] == 'login' and method == 'POST':
                login_data = request.get_json()
                
                if login_data.get('loginType') == 'display':
                    # Display user login - no password required
                    user = admin_db.authenticate_display_user(login_data['email'])
                else:
                    # Standard user login - password required
                    user = admin_db.authenticate_user(login_data['email'], login_data.get('password'))
                
                if user:
                    # Generate JWT token
                    token = admin_db.generate_jwt_token(user)
                    
                    response = {
                        'status': 'success',
                        'message': 'Login successful',
                        'user': user,
                        'token': token,
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, cls=CustomEncoder), 200, headers)
                else:
                    response = {
                        'status': 'error',
                        'message': 'Invalid credentials',
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, cls=CustomEncoder), 401, headers)
            
            elif len(path_parts) > 1 and path_parts[1] == 'verify' and method == 'POST':
                # Verify token
                auth_header = request.headers.get('Authorization', '')
                token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else None
                
                if token:
                    user_data = admin_db.verify_jwt_token(token)
                    if user_data:
                        response = {
                            'status': 'success',
                            'user': user_data,
                            'timestamp': datetime.now().isoformat()
                        }
                        return (json.dumps(response, cls=CustomEncoder), 200, headers)
                
                response = {
                    'status': 'error',
                    'message': 'Invalid or expired token',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 401, headers)
        
        # ============================================================================
        # OPTIONAL: ADD PROTECTION FOR SENSITIVE ROUTES
        # ============================================================================
        
        # Protected routes - require authentication (except for widgets, targets public access)
        auth_required_routes = ['users', 'settings']  # Add routes that need authentication
        if path_parts[0] in auth_required_routes:
            auth_header = request.headers.get('Authorization', '')
            token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else None
            
            if not token:
                response = {
                    'status': 'error',
                    'message': 'Authentication required',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 401, headers)
            
            user_data = admin_db.verify_jwt_token(token)
            if not user_data:
                response = {
                    'status': 'error',
                    'message': 'Invalid or expired token',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 401, headers)
            
            # Check admin permissions for certain operations
            admin_only_operations = ['users', 'settings']
            if path_parts[0] in admin_only_operations and user_data.get('role') != 'admin':
                response = {
                    'status': 'error',
                    'message': 'Admin access required',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 403, headers)

        # Widget Configuration Routes (Advanced Widget Management System)
        if path_parts[0] == 'widgets':
            # GET /widgets/types - Get widget types
            if len(path_parts) > 1 and path_parts[1] == 'types' and method == 'GET':
                widget_types = admin_db.get_widget_types()
                response = {
                    'status': 'success',
                    'data': widget_types,
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)

            # GET /widgets/views - Get dashboard views
            elif len(path_parts) > 1 and path_parts[1] == 'views' and method == 'GET':
                views = admin_db.get_dashboard_views()
                response = {
                    'status': 'success',
                    'data': views,
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)

            # Widget instances routes
            elif len(path_parts) > 1 and path_parts[1] == 'instances':
                # GET /widgets/instances?dashboard=<key> - Get widget instances
                if method == 'GET':
                    dashboard_key = request.args.get('dashboard')
                    instances = admin_db.get_widget_instances(dashboard_key)
                    response = {
                        'status': 'success',
                        'data': instances,
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, cls=CustomEncoder), 200, headers)

                # POST /widgets/instances - Create widget instance
                elif method == 'POST':
                    widget_data = request.get_json()
                    widget_key = admin_db.create_widget_instance(widget_data)
                    response = {
                        'status': 'success',
                        'message': 'Widget instance created successfully',
                        'widget_instance_key': widget_key,
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, cls=CustomEncoder), 201, headers)

                # PUT /widgets/instances/{key} - Update widget instance
                elif method == 'PUT' and len(path_parts) > 2:
                    widget_key = path_parts[2]
                    if widget_key == 'reorder':
                        # POST /widgets/instances/reorder - Reorder widgets
                        reorder_data = request.get_json()
                        admin_db.reorder_widget_instances(
                            reorder_data['dashboard'],
                            reorder_data['order']
                        )
                        response = {
                            'status': 'success',
                            'message': 'Widgets reordered successfully',
                            'timestamp': datetime.now().isoformat()
                        }
                        return (json.dumps(response, cls=CustomEncoder), 200, headers)
                    else:
                        updates = request.get_json()
                        admin_db.update_widget_instance(widget_key, updates)
                        response = {
                            'status': 'success',
                            'message': 'Widget instance updated successfully',
                            'timestamp': datetime.now().isoformat()
                        }
                        return (json.dumps(response, cls=CustomEncoder), 200, headers)

                # DELETE /widgets/instances/{key} - Delete widget instance
                elif method == 'DELETE' and len(path_parts) > 2:
                    widget_key = path_parts[2]
                    admin_db.delete_widget_instance(widget_key)
                    response = {
                        'status': 'success',
                        'message': 'Widget instance deleted successfully',
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, cls=CustomEncoder), 200, headers)

                # POST /widgets/instances/reorder - Reorder widgets
                elif len(path_parts) > 2 and path_parts[2] == 'reorder' and method == 'POST':
                    reorder_data = request.get_json()
                    admin_db.reorder_widget_instances(
                        reorder_data['dashboard'],
                        reorder_data['order']
                    )
                    response = {
                        'status': 'success',
                        'message': 'Widgets reordered successfully',
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, cls=CustomEncoder), 200, headers)

            # GET /widgets/datasources - Get data sources
            elif len(path_parts) > 1 and path_parts[1] == 'datasources' and method == 'GET':
                data_sources = admin_db.get_widget_data_sources()
                response = {
                    'status': 'success',
                    'data': data_sources,
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)

            # GET /widgets/data/{key} - Fetch widget data
            elif len(path_parts) > 2 and path_parts[1] == 'data' and method == 'GET':
                data_source_key = path_parts[2]
                filters = request.args.to_dict()
                data = admin_db.fetch_widget_data(data_source_key, filters)
                response = {
                    'status': 'success',
                    'data': data,
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)

            # Dashboard presets routes
            elif len(path_parts) > 1 and path_parts[1] == 'presets':
                # GET /widgets/presets?dashboard=<key> - Get presets
                if method == 'GET':
                    dashboard_key = request.args.get('dashboard')
                    presets = admin_db.get_dashboard_presets(dashboard_key)
                    response = {
                        'status': 'success',
                        'data': presets,
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, cls=CustomEncoder), 200, headers)

                # POST /widgets/presets - Save preset
                elif method == 'POST':
                    preset_data = request.get_json()
                    preset_id = admin_db.save_dashboard_preset(preset_data)
                    response = {
                        'status': 'success',
                        'message': 'Dashboard preset saved successfully',
                        'preset_id': preset_id,
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, cls=CustomEncoder), 201, headers)

                # POST /widgets/presets/{id}/apply - Apply preset
                elif method == 'POST' and len(path_parts) > 3 and path_parts[3] == 'apply':
                    preset_id = int(path_parts[2])
                    apply_data = request.get_json()
                    success = admin_db.apply_dashboard_preset(preset_id, apply_data['dashboard'])
                    response = {
                        'status': 'success' if success else 'error',
                        'message': 'Preset applied successfully' if success else 'Failed to apply preset',
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, cls=CustomEncoder), 200 if success else 400, headers)

            # User preferences routes
            elif len(path_parts) > 1 and path_parts[1] == 'preferences':
                # GET /widgets/preferences?user=<email>&dashboard=<key> - Get preferences
                if method == 'GET':
                    user_email = request.args.get('user')
                    dashboard_key = request.args.get('dashboard')
                    prefs = admin_db.get_user_preferences(user_email, dashboard_key)
                    response = {
                        'status': 'success',
                        'data': prefs,
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, cls=CustomEncoder), 200, headers)

                # POST /widgets/preferences - Save preferences
                elif method == 'POST':
                    pref_data = request.get_json()
                    pref_id = admin_db.save_user_preferences(
                        pref_data['user_email'],
                        pref_data['dashboard_view_key'],
                        pref_data['preferences']
                    )
                    response = {
                        'status': 'success',
                        'message': 'User preferences saved successfully',
                        'preference_id': pref_id,
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, cls=CustomEncoder), 201, headers)

            # Legacy widget config routes (backwards compatibility)
            elif method == 'GET' and len(path_parts) == 1:
                widgets = admin_db.get_widgets()
                response = {
                    'status': 'success',
                    'data': widgets,
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)

            elif method == 'PUT' and len(path_parts) == 1:
                widgets_data = request.get_json()
                admin_db.update_widgets(widgets_data)
                response = {
                    'status': 'success',
                    'message': 'Widgets updated successfully',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)
        
        # Performance Targets Routes
        elif path_parts[0] == 'targets':
            if method == 'GET':
                # Get year filter from query params
                year_param = request.args.get('year')
                year = int(year_param) if year_param else None
                targets = admin_db.get_targets(year)
                response = {
                    'status': 'success',
                    'data': targets,
                    'year': year or datetime.now().year,
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)
            
            elif method == 'POST':
                target_data = request.get_json()
                target_id = admin_db.create_target(target_data)
                response = {
                    'status': 'success',
                    'message': 'Target created successfully',
                    'id': target_id,
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 201, headers)
            
            elif method == 'PUT' and len(path_parts) > 1:
                target_id = int(path_parts[1])
                target_data = request.get_json()
                admin_db.update_target(target_id, target_data)
                response = {
                    'status': 'success',
                    'message': 'Target updated successfully',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)
            
            elif method == 'DELETE' and len(path_parts) > 1:
                target_id = int(path_parts[1])
                admin_db.delete_target(target_id)
                response = {
                    'status': 'success',
                    'message': 'Target deleted successfully',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)
        
        # User Management Routes
        elif path_parts[0] == 'users':
            if method == 'GET':
                users = admin_db.get_users()
                response = {
                    'status': 'success',
                    'data': users,
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)
            
            elif method == 'POST':
                user_data = request.get_json()
                user_id = admin_db.create_user(user_data)
                response = {
                    'status': 'success',
                    'message': 'User created successfully',
                    'id': user_id,
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 201, headers)
            
            elif method == 'PUT' and len(path_parts) > 1:
                user_id = int(path_parts[1])
                user_data = request.get_json()
                admin_db.update_user(user_id, user_data)
                response = {
                    'status': 'success',
                    'message': 'User updated successfully',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)
            
            elif method == 'DELETE' and len(path_parts) > 1:
                user_id = int(path_parts[1])
                admin_db.delete_user(user_id)
                response = {
                    'status': 'success',
                    'message': 'User deleted successfully',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)
        
        # System Settings Routes
        elif path_parts[0] == 'settings':
            if method == 'GET':
                settings = admin_db.get_settings()
                response = {
                    'status': 'success',
                    'data': settings,
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)
            
            elif method == 'PUT':
                settings_data = request.get_json()
                admin_db.update_settings(settings_data)
                response = {
                    'status': 'success',
                    'message': 'Settings updated successfully',
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)
        
        # System Status Route
        elif path_parts[0] == 'status':
            if method == 'GET':
                status = admin_db.get_system_status()
                response = {
                    'status': 'success',
                    'data': status,
                    'timestamp': datetime.now().isoformat()
                }
                return (json.dumps(response, cls=CustomEncoder), 200, headers)
        
        # Default route - show available endpoints
        else:
            response = {
                'status': 'success',
                'message': 'Admin API',
                'endpoints': [
                    'GET /widgets - Get widget configuration',
                    'PUT /widgets - Update widget configuration',
                    'GET /targets - Get performance targets',
                    'POST /targets - Create new target',
                    'PUT /targets/{id} - Update target',
                    'DELETE /targets/{id} - Delete target',
                    'GET /users - Get users',
                    'POST /users - Create new user',
                    'PUT /users/{id} - Update user',
                    'DELETE /users/{id} - Delete user',
                    'GET /settings - Get system settings',
                    'PUT /settings - Update system settings',
                    'GET /status - Get system status'
                ],
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=CustomEncoder), 200, headers)
        
    except Exception as e:
        logger.error(f"Error processing admin request: {e}")
        error_response = {
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }
        return (json.dumps(error_response, cls=CustomEncoder), 500, headers)