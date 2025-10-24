import os
import json
import psycopg2
from datetime import datetime
import functions_framework
import logging
from decimal import Decimal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Custom JSON encoder to handle Decimal
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)  # Convert Decimal to float
        return super().default(obj)

class DatabaseManager:
    def __init__(self):
        pass
        
    def get_connection(self):
        """Get database connection for Cloud Functions"""
        socket_dir = os.environ.get('DB_SOCKET_DIR', '/cloudsql')
        instance_name = os.environ.get('INSTANCE_CONNECTION_NAME', 'new-dashboard-2025:us-central1:kpi-dashboard')
        
        try:
            return psycopg2.connect(
                host=f'{socket_dir}/{instance_name}',
                database='kpi_data',
                user='postgres',
                password='LexHVAC2025'
            )
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    def get_comfort_advisor_data(self, period_type: str):
        """Get comfort advisor performance data for a specific period"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT 
                    employee_name,
                    business_unit,
                    team,
                    completed_jobs,
                    sales_opportunities,
                    closed_opportunities,
                    canceled_jobs,
                    close_rate_percent,
                    options_per_opportunity,
                    total_sales_cents,
                    closed_average_sale_cents,
                    tgl_opportunities,
                    tgl_sales_cents,
                    tgl_close_rate_percent,
                    tgl_average_sale_cents,
                    tgl_jobs,
                    marketing_opportunities,
                    marketing_sales_cents,
                    marketing_close_rate_percent,
                    marketing_average_sale_cents,
                    marketing_jobs,
                    updated_at
                FROM comfort_advisor_performance 
                WHERE period_type = %s
                ORDER BY total_sales_cents DESC
                """
                
                cursor.execute(query, (period_type,))
                rows = cursor.fetchall()
                
                # Convert to list of dictionaries
                columns = [desc[0] for desc in cursor.description]
                result = []
                
                for row in rows:
                    advisor_data = dict(zip(columns, row))
                    
                    # Convert cents to dollars and format for dashboard
                    result.append({
                        'name': advisor_data['employee_name'],
                        'businessUnit': advisor_data['business_unit'],
                        'team': advisor_data['team'],
                        'jobs': advisor_data['completed_jobs'],
                        'opportunities': advisor_data['sales_opportunities'],
                        'closingPercent': round(float(advisor_data['close_rate_percent']), 1) if advisor_data['close_rate_percent'] is not None else 0.0,
                        'cancellations': advisor_data['canceled_jobs'],
                        'optionsPerJob': round(float(advisor_data['options_per_opportunity']), 2) if advisor_data['options_per_opportunity'] is not None else 0.0,
                        'sales': advisor_data['total_sales_cents'] // 100,
                        'averageDollar': advisor_data['closed_average_sale_cents'] // 100,
                        # TGL Performance
                        'tglOpportunities': advisor_data['tgl_opportunities'],
                        'tglSales': advisor_data['tgl_sales_cents'] // 100,
                        'tglCloseRate': round(float(advisor_data['tgl_close_rate_percent']), 1) if advisor_data['tgl_close_rate_percent'] is not None else 0.0,
                        'tglAverageSale': advisor_data['tgl_average_sale_cents'] // 100,
                        'tglJobs': advisor_data['tgl_jobs'],
                        # Marketing Performance
                        'marketingOpportunities': advisor_data['marketing_opportunities'],
                        'marketingSales': advisor_data['marketing_sales_cents'] // 100,
                        'marketingCloseRate': round(float(advisor_data['marketing_close_rate_percent']), 1) if advisor_data['marketing_close_rate_percent'] is not None else 0.0,
                        'marketingAverageSale': advisor_data['marketing_average_sale_cents'] // 100,
                        'marketingJobs': advisor_data['marketing_jobs'],
                        'updatedAt': advisor_data['updated_at'].isoformat()
                    })
                
                return result
    
    def get_technician_data(self, period_type: str):
        """Get technician performance data for a specific period"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT 
                    employee_name,
                    business_unit,
                    trade,
                    completed_jobs,
                    no_charge_jobs,
                    converted_jobs,
                    unconverted_jobs,
                    invoiced_jobs,
                    jobs_on_hold,
                    completed_revenue_cents,
                    adjustment_revenue_cents,
                    completed_revenue_with_adjustments_cents,
                    invoiced_revenue_cents,
                    converted_revenue_cents,
                    total_sales_cents,
                    tech_lead_sales_cents,
                    converted_job_average_cents,
                    opportunity_job_average_cents,
                    total_job_average_cents,
                    opportunities,
                    sales_opportunities,
                    replacement_opportunities,
                    closed_opportunities,
                    membership_opportunities,
                    tech_recall_percent,
                    opportunity_conversion_rate,
                    close_rate_percent,
                    memberships_sold,
                    leads_set,
                    first_call_arrival_time,
                    updated_at
                FROM technician_performance 
                WHERE period_type = %s
                ORDER BY total_sales_cents DESC
                """
                
                cursor.execute(query, (period_type,))
                rows = cursor.fetchall()
                
                # Convert to list of dictionaries
                columns = [desc[0] for desc in cursor.description]
                result = []
                
                for row in rows:
                    tech_data = dict(zip(columns, row))
                    
                    # Convert cents to dollars and format for dashboard
                    result.append({
                        'name': tech_data['employee_name'],
                        'businessUnit': tech_data['business_unit'],
                        'trade': tech_data['trade'],
                        'completedJobs': tech_data['completed_jobs'],
                        'noChargeJobs': tech_data['no_charge_jobs'],
                        'convertedJobs': tech_data['converted_jobs'],
                        'unconvertedJobs': tech_data['unconverted_jobs'],
                        'invoicedJobs': tech_data['invoiced_jobs'],
                        'jobsOnHold': tech_data['jobs_on_hold'],
                        'completedRevenue': tech_data['completed_revenue_cents'] // 100,
                        'adjustmentRevenue': tech_data['adjustment_revenue_cents'] // 100,
                        'completedRevenueWithAdjustments': tech_data['completed_revenue_with_adjustments_cents'] // 100,
                        'invoicedRevenue': tech_data['invoiced_revenue_cents'] // 100,
                        'convertedRevenue': tech_data['converted_revenue_cents'] // 100,
                        'totalSales': tech_data['total_sales_cents'] // 100,
                        'techLeadSales': tech_data['tech_lead_sales_cents'] // 100,
                        'convertedJobAverage': tech_data['converted_job_average_cents'] // 100,
                        'opportunityJobAverage': tech_data['opportunity_job_average_cents'] // 100,
                        'totalJobAverage': tech_data['total_job_average_cents'] // 100,
                        'opportunities': tech_data['opportunities'],
                        'salesOpportunities': tech_data['sales_opportunities'],
                        'replacementOpportunities': tech_data['replacement_opportunities'],
                        'closedOpportunities': tech_data['closed_opportunities'],
                        'membershipOpportunities': float(tech_data['membership_opportunities']) if tech_data['membership_opportunities'] is not None else 0.0,
                        'techRecallPercent': round(float(tech_data['tech_recall_percent']), 2) if tech_data['tech_recall_percent'] is not None else 0.0,
                        'opportunityConversionRate': round(float(tech_data['opportunity_conversion_rate']), 1) if tech_data['opportunity_conversion_rate'] is not None else 0.0,
                        'closeRatePercent': round(float(tech_data['close_rate_percent']), 1) if tech_data['close_rate_percent'] is not None else 0.0,
                        'membershipsSold': tech_data['memberships_sold'],
                        'leadsSet': float(tech_data['leads_set']) if tech_data['leads_set'] is not None else 0.0,
                        'firstCallArrivalTime': tech_data['first_call_arrival_time'],
                        'updatedAt': tech_data['updated_at'].isoformat() if tech_data['updated_at'] else datetime.now().isoformat()
                    })
                
                return result

    def get_hvac_tech_data(self, period_type: str):
        """Get HVAC tech performance data from hvac_tech_performance table"""
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
                    'name': row[0],
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

    def get_hvac_maintenance_data(self, period_type: str):
        """Get HVAC maintenance performance data from hvac_maintenance_performance table"""
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
                    'name': row[0],
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
    
    def get_summary_metrics(self, period_type: str):
        """Get summary metrics for dashboard cards"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT 
                    COUNT(*) as total_advisors,
                    SUM(completed_jobs) as total_jobs,
                    SUM(total_sales_cents) as total_sales_cents,
                    AVG(close_rate_percent) as avg_close_rate,
                    SUM(closed_opportunities) as total_closed,
                    SUM(sales_opportunities) as total_opportunities
                FROM comfort_advisor_performance 
                WHERE period_type = %s
                """
                
                cursor.execute(query, (period_type,))
                row = cursor.fetchone()
                
                if row:
                    return {
                        'totalAdvisors': row[0],
                        'totalJobs': row[1],
                        'totalSales': row[2] // 100 if row[2] else 0,
                        'averageCloseRate': round(float(row[3]), 1) if row[3] is not None else 0.0,
                        'totalClosed': row[4],
                        'totalOpportunities': row[5],
                        'averageTicket': (row[2] // row[1]) // 100 if row[1] and row[2] else 0
                    }
                return {}
    
    def get_technician_summary_metrics(self, period_type: str):
        """Get technician summary metrics for dashboard cards"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT 
                    COUNT(*) as total_technicians,
                    SUM(completed_jobs) as total_jobs,
                    SUM(total_sales_cents) as total_sales_cents,
                    AVG(close_rate_percent) as avg_close_rate,
                    AVG(tech_recall_percent) as avg_recall_rate,
                    SUM(memberships_sold) as total_memberships,
                    SUM(closed_opportunities) as total_closed,
                    SUM(opportunities) as total_opportunities
                FROM technician_performance 
                WHERE period_type = %s
                """
                
                cursor.execute(query, (period_type,))
                row = cursor.fetchone()
                
                if row:
                    return {
                        'totalTechnicians': row[0],
                        'totalJobs': row[1],
                        'totalSales': row[2] // 100 if row[2] else 0,
                        'averageCloseRate': round(float(row[3]), 1) if row[3] is not None else 0.0,
                        'averageRecallRate': round(float(row[4]), 2) if row[4] is not None else 0.0,
                        'totalMemberships': row[5],
                        'totalClosed': row[6],
                        'totalOpportunities': row[7],
                        'averageTicket': (row[2] // row[1]) // 100 if row[1] and row[2] else 0
                    }
                return {}
    
    def get_call_center_data(self, period_type: str):
        """Get call center performance data for a specific period"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT 
                    employee_name,
                    total_calls,
                    calls_per_hour,
                    booked_calls,
                    inbound_calls,
                    outbound_calls,
                    booking_percent,
                    avg_call_duration_seconds,
                    cool_club_memberships,
                    lead_calls,
                    updated_at
                FROM call_center_performance 
                WHERE period_type = %s
                ORDER BY booking_percent DESC, booked_calls DESC
                """
                
                cursor.execute(query, (period_type,))
                rows = cursor.fetchall()
                
                columns = [desc[0] for desc in cursor.description]
                result = []
                
                for row in rows:
                    call_data = dict(zip(columns, row))
                    # Calculate calls per hour if it's 0 or None
                    calls_per_hour = float(call_data['calls_per_hour']) if call_data['calls_per_hour'] else 0.0
                    total_calls = int(call_data['total_calls']) if call_data['total_calls'] else 0
                    
                    # If calls_per_hour is 0 but we have total_calls, estimate based on 8-hour workday
                    if calls_per_hour == 0.0 and total_calls > 0:
                        calls_per_hour = round(total_calls / 8.0, 1)
                    
                    result.append({
                        'name': call_data['employee_name'],
                        'totalCalls': total_calls,
                        'callsPerHour': calls_per_hour,
                        'bookedCalls': int(call_data['booked_calls']) if call_data['booked_calls'] else 0,
                        'inboundCalls': int(call_data['inbound_calls']) if call_data['inbound_calls'] else 0,
                        'outboundCalls': int(call_data['outbound_calls']) if call_data['outbound_calls'] else 0,
                        'bookingPercent': round(float(call_data['booking_percent']), 1) if call_data['booking_percent'] else 0.0,
                        'avgCallDuration': int(call_data['avg_call_duration_seconds']) if call_data['avg_call_duration_seconds'] else 0,
                        'coolClubMemberships': int(call_data['cool_club_memberships']) if call_data['cool_club_memberships'] else 0,
                        'leadCalls': int(call_data['lead_calls']) if call_data['lead_calls'] else 0,
                        'updatedAt': call_data['updated_at'].isoformat() if call_data['updated_at'] else datetime.now().isoformat()
                    })
                
                return result

    def get_call_center_summary_metrics(self, period_type: str):
        """Get call center summary metrics for dashboard cards"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT 
                    COUNT(*) as total_agents,
                    SUM(total_calls) as total_calls,
                    SUM(booked_calls) as total_booked,
                    AVG(booking_percent) as avg_booking_rate,
                    SUM(cool_club_memberships) as total_memberships,
                    AVG(calls_per_hour) as avg_calls_per_hour
                FROM call_center_performance 
                WHERE period_type = %s
                """
                
                cursor.execute(query, (period_type,))
                row = cursor.fetchone()
                
                if row:
                    return {
                        'totalAgents': row[0],
                        'totalCalls': row[1],
                        'totalBooked': row[2],
                        'averageBookingRate': round(float(row[3]), 1) if row[3] is not None else 0.0,
                        'totalMemberships': row[4],
                        'averageCallsPerHour': round(float(row[5]), 1) if row[5] is not None else 0.0
                    }
                return {}

    def get_financial_data(self, period_type: str):
        """Get financial performance data for a specific period"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT 
                    department_name,
                    invoiced_revenue_cents,
                    completed_revenue_cents,
                    total_revenue_cents,
                    adjustment_revenue_cents,
                    tech_lead_jobs,
                    marketing_lead_jobs,
                    opportunities,
                    membership_revenue_cents,
                    updated_at
                FROM financial_performance 
                WHERE period_type = %s
                ORDER BY total_revenue_cents DESC
                """
                
                cursor.execute(query, (period_type,))
                rows = cursor.fetchall()
                
                columns = [desc[0] for desc in cursor.description]
                result = []
                
                for row in rows:
                    financial_data = dict(zip(columns, row))
                    
                    result.append({
                        'department': financial_data['department_name'],
                        'invoicedRevenue': financial_data['invoiced_revenue_cents'] // 100,
                        'completedRevenue': financial_data['completed_revenue_cents'] // 100,
                        'totalRevenue': financial_data['total_revenue_cents'] // 100,
                        'adjustmentRevenue': financial_data['adjustment_revenue_cents'] // 100,
                        'techLeadJobs': financial_data['tech_lead_jobs'],
                        'marketingLeadJobs': financial_data['marketing_lead_jobs'],
                        'opportunities': financial_data['opportunities'],
                        'membershipRevenue': financial_data['membership_revenue_cents'] // 100,
                        'updatedAt': financial_data['updated_at'].isoformat() if financial_data['updated_at'] else datetime.now().isoformat()
                    })
                
                return result

    def get_financial_summary_metrics(self, period_type: str):
        """Get financial summary metrics for dashboard cards"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT 
                    COUNT(*) as total_departments,
                    SUM(total_revenue_cents) as total_revenue_cents,
                    SUM(tech_lead_jobs) as total_tech_jobs,
                    SUM(marketing_lead_jobs) as total_marketing_jobs,
                    SUM(opportunities) as total_opportunities,
                    SUM(membership_revenue_cents) as total_membership_revenue_cents
                FROM financial_performance 
                WHERE period_type = %s
                """
                
                cursor.execute(query, (period_type,))
                row = cursor.fetchone()
                
                if row:
                    return {
                        'totalDepartments': row[0],
                        'totalRevenue': row[1] // 100 if row[1] else 0,
                        'totalTechJobs': row[2],
                        'totalMarketingJobs': row[3],
                        'totalOpportunities': row[4],
                        'totalMembershipRevenue': row[5] // 100 if row[5] else 0,
                        'averageRevenuePerDepartment': (row[1] // row[0]) // 100 if row[0] and row[1] else 0
                    }
                return {}

    def get_financial_trend_data(self, year=2025):
        """Get monthly financial trend data for YTD chart"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT
                    EXTRACT(YEAR FROM report_date) as year,
                    EXTRACT(MONTH FROM report_date) as month,
                    period_type,
                    SUM(total_revenue_cents) as total_revenue_cents,
                    SUM(invoiced_revenue_cents) as invoiced_revenue_cents,
                    SUM(completed_revenue_cents) as completed_revenue_cents,
                    SUM(tech_lead_jobs) as tech_lead_jobs,
                    SUM(marketing_lead_jobs) as marketing_lead_jobs,
                    SUM(opportunities) as opportunities,
                    MAX(updated_at) as last_updated
                FROM financial_performance
                WHERE EXTRACT(YEAR FROM report_date) = %s
                AND period_type LIKE %s
                GROUP BY EXTRACT(YEAR FROM report_date), EXTRACT(MONTH FROM report_date), period_type
                ORDER BY year, month
                """

                cursor.execute(query, (year, f'monthly_{year}_%'))
                rows = cursor.fetchall()

                trend_data = []
                for row in rows:
                    year_val, month_val, period_type, total_revenue_cents, invoiced_revenue_cents, completed_revenue_cents, tech_lead_jobs, marketing_lead_jobs, opportunities, last_updated = row

                    # Format month for chart (YYYY-MM format)
                    month_date = datetime(int(year_val), int(month_val), 1)
                    month_str = month_date.strftime('%Y-%m')

                    # Get monthly budget target for this month
                    budget_target = self.get_monthly_budget_target(int(year_val), int(month_val))
                    revenue_dollars = int(total_revenue_cents) // 100 if total_revenue_cents else 0
                    budget_percent = (revenue_dollars / budget_target * 100) if budget_target > 0 else 0

                    trend_data.append({
                        'month': month_str,
                        'year': int(year_val),
                        'monthNum': int(month_val),
                        'monthName': month_date.strftime('%B'),
                        'revenue': revenue_dollars,
                        'invoicedRevenue': int(invoiced_revenue_cents) // 100 if invoiced_revenue_cents else 0,
                        'completedRevenue': int(completed_revenue_cents) // 100 if completed_revenue_cents else 0,
                        'techLeadJobs': int(tech_lead_jobs) if tech_lead_jobs else 0,
                        'marketingLeadJobs': int(marketing_lead_jobs) if marketing_lead_jobs else 0,
                        'opportunities': int(opportunities) if opportunities else 0,
                        'budgetTarget': budget_target,
                        'budgetPercent': round(budget_percent, 1),
                        'lastUpdated': last_updated.isoformat() if last_updated else None,
                        'periodType': period_type,
                        'isComplete': not ('mtd' in period_type.lower())  # MTD data is incomplete
                    })

                return trend_data

    def get_monthly_budget_target(self, year, month):
        """Get the total monthly budget target across all departments for a specific month"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT SUM(target_value) as total_budget
                FROM performance_targets
                WHERE target_category = 'financial'
                AND target_name = 'monthly_budget'
                AND target_year = %s
                AND target_month = %s
                """

                cursor.execute(query, (year, month))
                result = cursor.fetchone()

                return float(result[0]) if result and result[0] else 0

    def get_membership_data(self, period_type: str):
        """Get membership performance data for a specific period"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT 
                    membership_name,
                    active_at_start,
                    suspended,
                    canceled,
                    expired,
                    deleted,
                    renewed,
                    reactivated,
                    new_sales,
                    manual,
                    active_at_end,
                    memberships_lost,
                    net_growth,
                    renewal_rate_percent,
                    updated_at
                FROM membership_performance 
                WHERE period_type = %s
                ORDER BY membership_name
                """
            
                cursor.execute(query, (period_type,))
                rows = cursor.fetchall()
            
                # Convert to list of dictionaries
                columns = [desc[0] for desc in cursor.description]
                result = []
            
                for row in rows:
                    membership_data = dict(zip(columns, row))
                
                    result.append({
                        'membershipName': membership_data['membership_name'],
                        'activeAtStart': membership_data['active_at_start'],
                        'suspended': membership_data['suspended'],
                        'canceled': membership_data['canceled'],
                        'expired': membership_data['expired'],
                        'deleted': membership_data['deleted'],
                        'renewed': membership_data['renewed'],
                        'reactivated': membership_data['reactivated'],
                        'newSales': membership_data['new_sales'],
                        'manual': membership_data['manual'],
                        'activeAtEnd': membership_data['active_at_end'],
                        'membershipsLost': membership_data['memberships_lost'],
                        'netGrowth': membership_data['net_growth'],
                        'renewalRatePercent': round(float(membership_data['renewal_rate_percent']), 1) if membership_data['renewal_rate_percent'] is not None else 0.0,
                        'updatedAt': membership_data['updated_at'].isoformat() if membership_data['updated_at'] else datetime.now().isoformat()
                    })
            
                return result

    def get_membership_summary_metrics(self, period_type: str):
        """Get membership summary metrics for dashboard cards"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT 
                    SUM(active_at_end) as total_active_memberships,
                    SUM(new_sales) as total_new_sales,
                    SUM(memberships_lost) as total_memberships_lost,
                    SUM(net_growth) as total_net_growth,
                    AVG(renewal_rate_percent) as avg_renewal_rate,
                    SUM(reactivated) as total_reactivated
                FROM membership_performance 
                WHERE period_type = %s
                """
            
                cursor.execute(query, (period_type,))
                row = cursor.fetchone()
            
                if row:
                    return {
                        'totalActiveMemberships': row[0] or 0,
                        'totalNewSales': row[1] or 0,
                        'totalMembershipsLost': row[2] or 0,
                        'totalNetGrowth': row[3] or 0,
                        'averageRenewalRate': round(float(row[4]), 1) if row[4] is not None else 0.0,
                        'totalReactivated': row[5] or 0
                    }
                return {}

    def get_financial_ttm_data(self, start_year: int, start_month: int, end_year: int, end_month: int):
        """Get trailing twelve months financial data with monthly aggregates"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT
                    EXTRACT(YEAR FROM report_date)::int as year,
                    EXTRACT(MONTH FROM report_date)::int as month,
                    TO_CHAR(MIN(report_date), 'Mon YYYY') as month_label,
                    TO_CHAR(MIN(report_date), 'YYYY-MM') as month_key,
                    SUM(total_revenue_cents) as total_revenue_cents,
                    SUM(invoiced_revenue_cents) as invoiced_revenue_cents,
                    SUM(completed_revenue_cents) as completed_revenue_cents,
                    SUM(tech_lead_jobs) as total_tech_jobs,
                    SUM(marketing_lead_jobs) as total_marketing_jobs,
                    SUM(opportunities) as total_opportunities,
                    MAX(updated_at) as last_updated,
                    -- Determine if month is complete
                    BOOL_AND(CASE
                        WHEN EXTRACT(YEAR FROM report_date) < EXTRACT(YEAR FROM CURRENT_DATE)
                            OR (EXTRACT(YEAR FROM report_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                                AND EXTRACT(MONTH FROM report_date) < EXTRACT(MONTH FROM CURRENT_DATE))
                        THEN true
                        ELSE false
                    END) as is_complete
                FROM financial_performance
                WHERE period_type LIKE 'monthly_%%'
                    AND ((EXTRACT(YEAR FROM report_date) = %s AND EXTRACT(MONTH FROM report_date) >= %s)
                         OR (EXTRACT(YEAR FROM report_date) = %s AND EXTRACT(MONTH FROM report_date) <= %s)
                         OR (EXTRACT(YEAR FROM report_date) > %s AND EXTRACT(YEAR FROM report_date) < %s))
                GROUP BY
                    EXTRACT(YEAR FROM report_date),
                    EXTRACT(MONTH FROM report_date)
                ORDER BY
                    EXTRACT(YEAR FROM report_date),
                    EXTRACT(MONTH FROM report_date)
                """

                logger.info(f"TTM Query params: start_year={start_year}, start_month={start_month}, end_year={end_year}, end_month={end_month}")

                cursor.execute(query, (
                    start_year, start_month,  # >= start date
                    end_year, end_month,      # <= end date
                    start_year, end_year      # Between years
                ))

                rows = cursor.fetchall()
                logger.info(f"TTM Query returned {len(rows)} rows")
                result = []

                for row in rows:
                    try:
                        # Use indexed access instead of unpacking to avoid tuple errors
                        year = row[0]
                        month = row[1]
                        month_label = row[2]
                        month_key = row[3]
                        total_revenue_cents = row[4]
                        invoiced_revenue_cents = row[5]
                        completed_revenue_cents = row[6]
                        tech_jobs = row[7]
                        marketing_jobs = row[8]
                        opportunities = row[9]
                        last_updated = row[10]
                        is_complete = row[11]

                        revenue = total_revenue_cents // 100 if total_revenue_cents else 0

                        result.append({
                            'month': month_key,
                            'monthName': month_label,
                            'year': int(year),
                            'monthNumber': int(month),
                            'revenue': revenue,
                            'invoicedRevenue': invoiced_revenue_cents // 100 if invoiced_revenue_cents else 0,
                            'completedRevenue': completed_revenue_cents // 100 if completed_revenue_cents else 0,
                            'techJobs': tech_jobs or 0,
                            'marketingJobs': marketing_jobs or 0,
                            'opportunities': opportunities or 0,
                            'isComplete': is_complete,
                            'lastUpdated': last_updated.isoformat() if last_updated else None
                        })
                    except Exception as e:
                        logger.error(f"Error processing row: {e}")
                        logger.error(f"Row length: {len(row) if hasattr(row, '__len__') else 'unknown'}")
                        logger.error(f"Row data: {row}")
                        raise

                # Calculate average monthly revenue for variance
                if result:
                    total_revenue = sum(item['revenue'] for item in result)
                    avg_monthly = total_revenue / len(result)

                    # Add variance percentage to each month
                    for item in result:
                        item['avgMonthly'] = int(avg_monthly)
                        item['growth'] = round(((item['revenue'] - avg_monthly) / avg_monthly * 100), 1) if avg_monthly > 0 else 0

                return result

    def get_financial_ttm_departments_data(self, start_year: int, start_month: int, end_year: int, end_month: int):
        """Get trailing twelve months financial data with department breakdowns"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT
                    EXTRACT(YEAR FROM report_date)::int as year,
                    EXTRACT(MONTH FROM report_date)::int as month,
                    TO_CHAR(MIN(report_date), 'Mon') as month_name,
                    TO_CHAR(MIN(report_date), 'Mon YYYY') as month_label,
                    TO_CHAR(MIN(report_date), 'YYYY-MM') as month_key,
                    department_name,
                    SUM(total_revenue_cents) as total_revenue_cents,
                    MAX(updated_at) as last_updated,
                    -- Determine if month is complete
                    BOOL_AND(CASE
                        WHEN EXTRACT(YEAR FROM report_date) < EXTRACT(YEAR FROM CURRENT_DATE)
                            OR (EXTRACT(YEAR FROM report_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                                AND EXTRACT(MONTH FROM report_date) < EXTRACT(MONTH FROM CURRENT_DATE))
                        THEN true
                        ELSE false
                    END) as is_complete
                FROM financial_performance
                WHERE period_type LIKE 'monthly_%%'
                    AND ((EXTRACT(YEAR FROM report_date) = %s AND EXTRACT(MONTH FROM report_date) >= %s)
                         OR (EXTRACT(YEAR FROM report_date) = %s AND EXTRACT(MONTH FROM report_date) <= %s)
                         OR (EXTRACT(YEAR FROM report_date) > %s AND EXTRACT(YEAR FROM report_date) < %s))
                GROUP BY
                    EXTRACT(YEAR FROM report_date),
                    EXTRACT(MONTH FROM report_date),
                    department_name
                ORDER BY
                    EXTRACT(YEAR FROM report_date),
                    EXTRACT(MONTH FROM report_date)
                """

                logger.info(f"TTM Departments Query params: start_year={start_year}, start_month={start_month}, end_year={end_year}, end_month={end_month}")

                cursor.execute(query, (
                    start_year, start_month,  # >= start date
                    end_year, end_month,      # <= end date
                    start_year, end_year      # Between years
                ))

                rows = cursor.fetchall()
                logger.info(f"TTM Departments Query returned {len(rows)} rows")

                # Group by month and aggregate departments
                months_dict = {}

                for row in rows:
                    year = row[0]
                    month = row[1]
                    month_name = row[2]
                    month_label = row[3]
                    month_key = row[4]
                    department_name = row[5]
                    total_revenue_cents = row[6]
                    last_updated = row[7]
                    is_complete = row[8]

                    # Initialize month entry if not exists
                    if month_key not in months_dict:
                        months_dict[month_key] = {
                            'month': month_key,
                            'monthName': month_name,
                            'monthLabel': month_label,
                            'year': int(year),
                            'monthNumber': int(month),
                            'total': 0,
                            'hvac_replacement': 0,
                            'hvac_service': 0,
                            'hvac_maintenance': 0,
                            'commercial_hvac': 0,
                            'plumbing': 0,
                            'electrical': 0,
                            'tyler': 0,
                            'isComplete': is_complete,
                            'lastUpdated': last_updated.isoformat() if last_updated else None
                        }

                    # Convert revenue to dollars
                    revenue = total_revenue_cents // 100 if total_revenue_cents else 0

                    # Add to total
                    months_dict[month_key]['total'] += revenue

                    # Map department name to field name
                    dept_field = department_name.lower().replace(' ', '_').replace('-', '_')
                    if dept_field in months_dict[month_key]:
                        months_dict[month_key][dept_field] = revenue

                # Convert dict to list
                result = list(months_dict.values())

                # Calculate average monthly revenue and growth for each department
                if result:
                    # Calculate totals across all months for each department
                    dept_totals = {
                        'total': sum(item['total'] for item in result),
                        'hvac_replacement': sum(item['hvac_replacement'] for item in result),
                        'hvac_service': sum(item['hvac_service'] for item in result),
                        'hvac_maintenance': sum(item['hvac_maintenance'] for item in result),
                        'commercial_hvac': sum(item['commercial_hvac'] for item in result),
                        'plumbing': sum(item['plumbing'] for item in result),
                        'electrical': sum(item['electrical'] for item in result),
                        'tyler': sum(item['tyler'] for item in result)
                    }

                    # Calculate averages
                    num_months = len(result)
                    dept_averages = {k: v / num_months for k, v in dept_totals.items()}

                    # Add growth calculations for each month (based on total revenue)
                    for item in result:
                        item['avgMonthly'] = int(dept_averages['total'])
                        avg = dept_averages['total']
                        item['growth'] = round(((item['total'] - avg) / avg * 100), 1) if avg > 0 else 0

                return result

# Initialize database manager
db = DatabaseManager()

@functions_framework.http
def dashboard_api(request):
    """Cloud Function entry point - handles all API routes"""
    
    # Set CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }
    
    # Handle preflight requests
    if request.method == 'OPTIONS':
        return ('', 204, headers)
    
    try:
        # Parse the request path
        path = request.path.strip('/')
        path_parts = path.split('/')
        
        logger.info(f"Request path: {path}")
        logger.info(f"Path parts: {path_parts}")
        
        # Route: /comfort-advisors/{period_type}
        if len(path_parts) == 2 and path_parts[0] == 'comfort-advisors':
            period_type = path_parts[1]
            
            if period_type not in ['mtd', 'ytd', 'last_month']:
                return (json.dumps({'error': 'Invalid period type'}, cls=DecimalEncoder), 400, headers)
            
            data = db.get_comfort_advisor_data(period_type)
            response = {
                'status': 'success',
                'data': data,
                'period': period_type,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)
        
        # Route: /technicians/{period_type}
        elif len(path_parts) == 2 and path_parts[0] == 'technicians':
            period_type = path_parts[1]
            
            if period_type not in ['mtd', 'ytd', 'last_month']:
                return (json.dumps({'error': 'Invalid period type'}, cls=DecimalEncoder), 400, headers)
            
            data = db.get_technician_data(period_type)
            response = {
                'status': 'success',
                'data': data,
                'period': period_type,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)

        # Route: /hvac-tech/{period_type}
        elif len(path_parts) == 2 and path_parts[0] == 'hvac-tech':
            period_type = path_parts[1]
    
            if period_type not in ['mtd', 'ytd', 'last_month']:
                return (json.dumps({'error': 'Invalid period type'}, cls=DecimalEncoder), 400, headers)
    
            data = db.get_hvac_tech_data(period_type)
            response = {
                'status': 'success',
                'data': data,
                'period': period_type,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)

        # Route: /hvac-maintenance/{period_type}
        elif len(path_parts) == 2 and path_parts[0] == 'hvac-maintenance':
            period_type = path_parts[1]
    
            if period_type not in ['mtd', 'ytd', 'last_month']:
                return (json.dumps({'error': 'Invalid period type'}, cls=DecimalEncoder), 400, headers)
    
            data = db.get_hvac_maintenance_data(period_type)
            response = {
                'status': 'success',
                'data': data,
                'period': period_type,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)

        # Route: /summary/{period_type}
        elif len(path_parts) == 2 and path_parts[0] == 'summary':
            period_type = path_parts[1]
            
            if period_type not in ['mtd', 'ytd', 'last_month']:
                return (json.dumps({'error': 'Invalid period type'}, cls=DecimalEncoder), 400, headers)
            
            data = db.get_summary_metrics(period_type)
            response = {
                'status': 'success',
                'data': data,
                'period': period_type,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)
        
        # Route: /technician-summary/{period_type}
        elif len(path_parts) == 2 and path_parts[0] == 'technician-summary':
            period_type = path_parts[1]
            
            if period_type not in ['mtd', 'ytd', 'last_month']:
                return (json.dumps({'error': 'Invalid period type'}, cls=DecimalEncoder), 400, headers)
            
            data = db.get_technician_summary_metrics(period_type)
            response = {
                'status': 'success',
                'data': data,
                'period': period_type,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)
            
        # Route: /call-center/{period_type}
        elif len(path_parts) == 2 and path_parts[0] == 'call-center':
            period_type = path_parts[1]
    
            # Support all call center period types
            valid_periods = ['today', 'week', 'mtd', 'ytd', 'last_month']
            
            if period_type not in valid_periods:
                return (json.dumps({'error': 'Invalid period type'}), 400, headers)
    
            data = db.get_call_center_data(period_type)
            response = {
                'status': 'success',
                'data': data,
                'period': period_type,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response), 200, headers)
        
        # Route: /call-center-summary/{period_type}
        elif len(path_parts) == 2 and path_parts[0] == 'call-center-summary':
            period_type = path_parts[1]
            
            valid_periods = ['today', 'week', 'mtd', 'ytd', 'last_month']
            
            if period_type not in valid_periods:
                return (json.dumps({'error': 'Invalid period type'}), 400, headers)
            
            data = db.get_call_center_summary_metrics(period_type)
            response = {
                'status': 'success',
                'data': data,
                'period': period_type,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response), 200, headers)

        # Route: /financial/{period_type}
        elif len(path_parts) == 2 and path_parts[0] == 'financial':
            period_type = path_parts[1]
            
            if period_type not in ['mtd', 'ytd', 'last_month']:
                return (json.dumps({'error': 'Invalid period type for financial data'}, cls=DecimalEncoder), 400, headers)
            
            data = db.get_financial_data(period_type)
            response = {
                'status': 'success',
                'data': data,
                'period': period_type,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)
        
        # Route: /financial-summary/{period_type}
        elif len(path_parts) == 2 and path_parts[0] == 'financial-summary':
            period_type = path_parts[1]
            
            if period_type not in ['mtd', 'ytd', 'last_month']:
                return (json.dumps({'error': 'Invalid period type for financial data'}, cls=DecimalEncoder), 400, headers)
            
            data = db.get_financial_summary_metrics(period_type)
            response = {
                'status': 'success',
                'data': data,
                'period': period_type,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)

        # Route: /financial-trend or /financial-trend/{year}
        elif (len(path_parts) >= 1 and path_parts[0] == 'financial-trend'):
            year = int(path_parts[1]) if len(path_parts) == 2 and path_parts[1].isdigit() else 2025
    
            data = db.get_financial_trend_data(year)
            response = {
                'status': 'success',
                'data': data,
                'year': year,
                'months_available': len(data),
                'total_revenue': sum(item['revenue'] for item in data),
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)

        # Route: /financial-trend (defaults to current year)
        elif path == 'financial-trend':
            current_year = datetime.now().year
            data = db.get_financial_trend_data(current_year)
            response = {
                'status': 'success',
                'data': data,
                'year': current_year,
                'months_available': len(data),
                'total_revenue': sum(item['revenue'] for item in data),
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)

        # Route: /financial-ttm-departments
        elif path == 'financial-ttm-departments' or (len(path_parts) >= 1 and path_parts[0] == 'financial-ttm-departments'):
            # Calculate TTM date range - EXCLUDE current month, go back 12 complete months
            current_date = datetime.now()

            # End month is the PREVIOUS month (not current month)
            end_month = current_date.month - 1
            end_year = current_date.year
            if end_month <= 0:
                end_month = 12
                end_year -= 1

            # Start month is 11 months before end month
            start_month = end_month - 11
            start_year = end_year
            if start_month <= 0:
                start_month += 12
                start_year -= 1

            data = db.get_financial_ttm_departments_data(start_year, start_month, end_year, end_month)

            response = {
                'status': 'success',
                'data': data,
                'period': f'{start_year}-{start_month:02d} to {end_year}-{end_month:02d}',
                'months_available': len(data),
                'total_ttm_revenue': sum(item['total'] for item in data),
                'average_monthly': sum(item['total'] for item in data) / len(data) if data else 0,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)

        # Route: /financial-ttm or /financial-ttm/{year}
        elif path == 'financial-ttm' or (len(path_parts) >= 1 and path_parts[0] == 'financial-ttm'):
            # Get year from last path part if it's a digit, otherwise use current year
            year = datetime.now().year
            if len(path_parts) == 2 and path_parts[0] == 'financial-ttm' and path_parts[1].isdigit():
                year = int(path_parts[1])

            # Calculate TTM date range - EXCLUDE current month, go back 12 complete months
            current_date = datetime.now()

            # End month is the PREVIOUS month (not current month)
            end_month = current_date.month - 1
            end_year = current_date.year
            if end_month <= 0:
                end_month = 12
                end_year -= 1

            # Start month is 11 months before end month
            start_month = end_month - 11
            start_year = end_year
            if start_month <= 0:
                start_month += 12
                start_year -= 1

            data = db.get_financial_ttm_data(start_year, start_month, end_year, end_month)

            response = {
                'status': 'success',
                'data': data,
                'period': f'{start_year}-{start_month:02d} to {end_year}-{end_month:02d}',
                'months_available': len(data),
                'total_ttm_revenue': sum(item['revenue'] for item in data),
                'average_monthly': sum(item['revenue'] for item in data) / len(data) if data else 0,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)

        # Route: /memberships/{period_type}
        elif len(path_parts) == 2 and path_parts[0] == 'memberships':
            period_type = path_parts[1]
            
            if period_type not in ['mtd', 'ytd', 'last_month']:
                return (json.dumps({'error': 'Invalid period type for membership data'}, cls=DecimalEncoder), 400, headers)
            
            data = db.get_membership_data(period_type)
            response = {
                'status': 'success',
                'data': data,
                'period': period_type,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)

        # Route: /membership-summary/{period_type}
        elif len(path_parts) == 2 and path_parts[0] == 'membership-summary':
            period_type = path_parts[1]
            
            if period_type not in ['mtd', 'ytd', 'last_month']:
                return (json.dumps({'error': 'Invalid period type for membership data'}, cls=DecimalEncoder), 400, headers)
            
            data = db.get_membership_summary_metrics(period_type)
            response = {
                'status': 'success',
                'data': data,
                'period': period_type,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)

        # Route: /health
        elif path == 'health':
            response = {
                'status': 'healthy',
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)
        
        # Route: /last-sync
        elif path == 'last-sync':
            with db.get_connection() as conn:
                with conn.cursor() as cursor:
                    query = """
                    SELECT sync_type, period_type, sync_status, started_at, records_processed
                    FROM servicetitan_sync_log 
                    ORDER BY started_at DESC 
                    LIMIT 5
                    """
                    cursor.execute(query)
                    rows = cursor.fetchall()
                    
                    sync_data = []
                    for row in rows:
                        sync_data.append({
                            'syncType': row[0],
                            'periodType': row[1],
                            'status': row[2],
                            'startedAt': row[3].isoformat(),
                            'recordsProcessed': row[4]
                        })
                    
                    response = {
                        'status': 'success',
                        'data': sync_data,
                        'timestamp': datetime.now().isoformat()
                    }
                    return (json.dumps(response, cls=DecimalEncoder), 200, headers)
        
        # Default route - show available endpoints
        else:
            response = {
                'status': 'success',
                'message': 'Dashboard API',
                'endpoints': [
                    '/comfort-advisors/mtd',
                    '/comfort-advisors/ytd',
                    '/comfort-advisors/last_month',
                    '/technicians/mtd',
                    '/technicians/ytd',
                    '/technicians/last_month',
                    '/summary/mtd',
                    '/summary/ytd',
                    '/summary/last_month',
                    '/technician-summary/mtd',
                    '/technician-summary/ytd',
                    '/technician-summary/last_month',
                    '/hvac-tech/mtd',
                    '/hvac-tech/ytd',
                    '/hvac-tech/last_month',
                    '/hvac-maintenance/mtd',
                    '/hvac-maintenance/ytd',
                    '/hvac-maintenance/last_month',
                    '/call-center/today',
                    '/call-center/week',
                    '/call-center/mtd',
                    '/call-center/last_month',
                    '/call-center-summary/today',
                    '/call-center-summary/week',
                    '/call-center-summary/mtd',
                    '/call-center-summary/last_month',
                    '/financial/mtd',
                    '/financial/ytd',
                    '/financial/last_month',
                    '/financial-summary/mtd',
                    '/financial-summary/ytd',
                    '/financial-summary/last_month',
                    '/financial-trend',
                    '/financial-trend/2025',
                    '/financial-ttm',
                    '/financial-ttm-departments',
                    '/memberships/mtd',
                    '/memberships/ytd',
                    '/memberships/last_month',
                    '/membership-summary/mtd',
                    '/membership-summary/ytd',
                    '/membership-summary/last_month',
                    '/health',
                    '/last-sync'
                ],
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response, cls=DecimalEncoder), 200, headers)
        
    except Exception as e:
        import traceback
        logger.error(f"Error processing request: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        error_response = {
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }
        return (json.dumps(error_response, cls=DecimalEncoder), 500, headers)