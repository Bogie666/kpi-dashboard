"""
Competition Tracking API for HVAC Technician Competitions
Tracks: Sold Flips, Items Sold (configurable item code), Google Reviews
Uses PostgreSQL (Cloud SQL) - matches existing dashboard infrastructure
"""

import os
import json
import psycopg2
from datetime import datetime, timedelta
import functions_framework
import logging
from decimal import Decimal
import requests
import traceback

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


def get_date_chunks(start_date, end_date, chunk_days=7):
    """
    Split a date range into smaller chunks to avoid ServiceTitan API truncation.

    The ServiceTitan Reporting API truncates results when querying long date ranges.
    This function splits ranges longer than chunk_days into smaller windows.

    Args:
        start_date: Start date (datetime.date or datetime)
        end_date: End date (datetime.date or datetime)
        chunk_days: Maximum days per chunk (default 7)

    Returns:
        List of (chunk_start, chunk_end) tuples as date objects
    """
    # Convert to date objects if datetime
    if hasattr(start_date, 'date'):
        start_date = start_date.date() if isinstance(start_date, datetime) else start_date
    if hasattr(end_date, 'date'):
        end_date = end_date.date() if isinstance(end_date, datetime) else end_date

    # Convert from datetime.date to allow timedelta arithmetic
    from datetime import date
    if isinstance(start_date, date) and not isinstance(start_date, datetime):
        start_date = datetime.combine(start_date, datetime.min.time()).date()
    if isinstance(end_date, date) and not isinstance(end_date, datetime):
        end_date = datetime.combine(end_date, datetime.min.time()).date()

    chunks = []
    current_start = start_date

    while current_start <= end_date:
        # Calculate chunk end (chunk_days - 1 to make inclusive ranges)
        chunk_end = current_start + timedelta(days=chunk_days - 1)

        # Don't go past the overall end date
        if chunk_end > end_date:
            chunk_end = end_date

        chunks.append((current_start, chunk_end))

        # Move to next chunk (next day after current chunk end)
        current_start = chunk_end + timedelta(days=1)

    return chunks


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

db_manager = DatabaseManager()

@functions_framework.http
def competition_api(request):
    """Main entry point for competition API"""

    # CORS headers
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }

    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return ('', 204, cors_headers)

    try:
        path = request.path
        method = request.method

        # Route requests
        if path == '/competitions' and method == 'GET':
            response = get_competitions()
        elif path == '/competitions' and method == 'POST':
            response = create_competition(request)
        elif path == '/sync-active-competitions' and method == 'POST':
            response = sync_all_active_competitions(request)
        elif path.startswith('/competitions/') and path.endswith('/leaderboard') and method == 'GET':
            comp_id = path.split('/')[2]
            response = get_leaderboard(comp_id)
        elif path.startswith('/competitions/') and path.endswith('/sync') and method == 'POST':
            comp_id = path.split('/')[2]
            response = sync_competition_data(comp_id, request)
        elif path.startswith('/competitions/') and path.endswith('/backfill') and method == 'POST':
            # Full historical backfill - fetches entire competition date range
            comp_id = path.split('/')[2]
            response = sync_competition_data(comp_id, request, full_backfill=True)
        elif path.startswith('/competitions/') and path.endswith('/reviews') and method == 'POST':
            comp_id = path.split('/')[2]
            response = update_manual_reviews(comp_id, request)
        elif path.startswith('/competitions/') and method == 'GET':
            comp_id = path.split('/')[2]
            response = get_competition(comp_id)
        elif path.startswith('/competitions/') and method == 'PUT':
            comp_id = path.split('/')[2]
            response = update_competition(comp_id, request)
        elif path.startswith('/competitions/') and method == 'DELETE':
            comp_id = path.split('/')[2]
            response = delete_competition(comp_id)
        else:
            response = ({'status': 'error', 'message': 'Not found'}, 404)

        # Convert to proper response format
        if isinstance(response, tuple):
            data, status = response
        else:
            data, status = response, 200

        headers = {**cors_headers, 'Content-Type': 'application/json'}
        return (json.dumps(data, cls=CustomEncoder), status, headers)

    except Exception as e:
        logger.error(f"Error processing request: {e}")
        headers = {**cors_headers, 'Content-Type': 'application/json'}
        return (json.dumps({
            'status': 'error',
            'message': str(e)
        }), 500, headers)


def get_competitions():
    """Get all competitions"""
    try:
        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT
                    id, name, start_date, end_date, status,
                    sold_flips_target, items_sold_target, reviews_target,
                    first_prize, second_prize, third_prize,
                    item_code, created_at, updated_at, minimum_to_qualify
                FROM competitions
                ORDER BY start_date DESC
                """

                cursor.execute(query)
                rows = cursor.fetchall()

                competitions = []
                for row in rows:
                    competitions.append({
                        'id': row[0],
                        'name': row[1],
                        'startDate': row[2].isoformat() if row[2] else None,
                        'endDate': row[3].isoformat() if row[3] else None,
                        'status': row[4],
                        'metrics': [
                            {'name': 'soldFlips', 'target': row[5], 'current': 0},
                            {'name': 'itemsSold', 'target': row[6], 'current': 0},
                            {'name': 'reviews', 'target': row[7], 'current': 0}
                        ],
                        'prizes': {
                            'first': float(row[8]) if row[8] else 500.00,
                            'second': float(row[9]) if row[9] else 300.00,
                            'third': float(row[10]) if row[10] else 150.00
                        },
                        'itemCode': row[11],
                        'createdAt': row[12],
                        'updatedAt': row[13],
                        'minimumToQualify': row[14] if row[14] else 25
                    })

                return {'status': 'success', 'data': competitions}

    except Exception as e:
        logger.error(f"Error getting competitions: {e}")
        return ({'status': 'error', 'message': str(e)}, 500)


def get_competition(comp_id):
    """Get a specific competition"""
    try:
        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT
                    id, name, start_date, end_date, status,
                    sold_flips_target, items_sold_target, reviews_target,
                    first_prize, second_prize, third_prize,
                    item_code, created_at, updated_at, minimum_to_qualify
                FROM competitions
                WHERE id = %s
                """

                cursor.execute(query, (comp_id,))
                row = cursor.fetchone()

                if not row:
                    return ({'status': 'error', 'message': 'Competition not found'}, 404)

                competition = {
                    'id': row[0],
                    'name': row[1],
                    'startDate': row[2].isoformat() if row[2] else None,
                    'endDate': row[3].isoformat() if row[3] else None,
                    'status': row[4],
                    'metrics': [
                        {'name': 'soldFlips', 'target': row[5], 'current': 0},
                        {'name': 'itemsSold', 'target': row[6], 'current': 0},
                        {'name': 'reviews', 'target': row[7], 'current': 0}
                    ],
                    'prizes': {
                        'first': float(row[8]) if row[8] else 500.00,
                        'second': float(row[9]) if row[9] else 300.00,
                        'third': float(row[10]) if row[10] else 150.00
                    },
                    'itemCode': row[11],
                    'createdAt': row[12],
                    'updatedAt': row[13],
                    'minimumToQualify': row[14] if row[14] else 25
                }

                return {'status': 'success', 'data': competition}

    except Exception as e:
        logger.error(f"Error getting competition: {e}")
        return ({'status': 'error', 'message': str(e)}, 500)


def create_competition(request):
    """Create a new competition"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['name', 'startDate', 'endDate']
        for field in required_fields:
            if field not in data:
                return ({'status': 'error', 'message': f'Missing required field: {field}'}, 400)

        # Extract metrics targets
        metrics = data.get('metrics', [])
        sold_flips_target = next((m['target'] for m in metrics if m['name'] == 'soldFlips'), 0)
        items_sold_target = next((m['target'] for m in metrics if m['name'] == 'itemsSold'), 0)
        reviews_target = next((m['target'] for m in metrics if m['name'] == 'reviews'), 0)

        # Get item code and minimum to qualify
        item_code = data.get('itemCode', '')
        minimum_to_qualify = data.get('minimumToQualify', 25)

        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                INSERT INTO competitions (
                    name, start_date, end_date, status,
                    sold_flips_target, items_sold_target, reviews_target,
                    first_prize, second_prize, third_prize, item_code, minimum_to_qualify
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """

                cursor.execute(query, (
                    data['name'],
                    data['startDate'],
                    data['endDate'],
                    data.get('status', 'draft'),
                    sold_flips_target,
                    items_sold_target,
                    reviews_target,
                    data.get('firstPrize', 500.00),
                    data.get('secondPrize', 300.00),
                    data.get('thirdPrize', 150.00),
                    item_code,
                    minimum_to_qualify
                ))

                comp_id = cursor.fetchone()[0]
                conn.commit()

                return {
                    'status': 'success',
                    'data': {
                        'id': comp_id,
                        'name': data['name'],
                        'message': 'Competition created successfully'
                    }
                }

    except Exception as e:
        logger.error(f"Error creating competition: {e}")
        return ({'status': 'error', 'message': str(e)}, 500)


def update_competition(comp_id, request):
    """Update a competition"""
    try:
        data = request.get_json()

        # Build dynamic update query based on provided fields
        update_fields = []
        values = []

        if 'name' in data:
            update_fields.append('name = %s')
            values.append(data['name'])
        if 'startDate' in data:
            update_fields.append('start_date = %s')
            values.append(data['startDate'])
        if 'endDate' in data:
            update_fields.append('end_date = %s')
            values.append(data['endDate'])
        if 'status' in data:
            update_fields.append('status = %s')
            values.append(data['status'])

        # Handle metrics
        if 'metrics' in data:
            for metric in data['metrics']:
                if metric['name'] == 'soldFlips':
                    update_fields.append('sold_flips_target = %s')
                    values.append(metric['target'])
                elif metric['name'] == 'itemsSold':
                    update_fields.append('items_sold_target = %s')
                    values.append(metric['target'])
                elif metric['name'] == 'reviews':
                    update_fields.append('reviews_target = %s')
                    values.append(metric['target'])

        # Handle item code
        if 'itemCode' in data:
            update_fields.append('item_code = %s')
            values.append(data['itemCode'])

        # Handle minimum to qualify
        if 'minimumToQualify' in data:
            update_fields.append('minimum_to_qualify = %s')
            values.append(data['minimumToQualify'])

        update_fields.append('updated_at = CURRENT_TIMESTAMP')
        values.append(comp_id)

        if not update_fields:
            return ({'status': 'error', 'message': 'No fields to update'}, 400)

        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                query = f"""
                UPDATE competitions
                SET {', '.join(update_fields)}
                WHERE id = %s
                """

                cursor.execute(query, values)
                conn.commit()

                return {'status': 'success', 'message': 'Competition updated successfully'}

    except Exception as e:
        logger.error(f"Error updating competition: {e}")
        return ({'status': 'error', 'message': str(e)}, 500)


def delete_competition(comp_id):
    """Delete a competition"""
    try:
        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                query = "DELETE FROM competitions WHERE id = %s"
                cursor.execute(query, (comp_id,))
                conn.commit()

                return {'status': 'success', 'message': 'Competition deleted successfully'}

    except Exception as e:
        logger.error(f"Error deleting competition: {e}")
        return ({'status': 'error', 'message': str(e)}, 500)


def get_leaderboard(comp_id):
    """Get leaderboard for a competition"""
    try:
        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                # Get competition details
                comp_query = """
                SELECT
                    id, name, start_date, end_date, status,
                    sold_flips_target, items_sold_target, reviews_target,
                    first_prize, second_prize, third_prize, item_code, minimum_to_qualify
                FROM competitions
                WHERE id = %s
                """

                cursor.execute(comp_query, (comp_id,))
                comp_row = cursor.fetchone()

                if not comp_row:
                    return ({'status': 'error', 'message': 'Competition not found'}, 404)

                competition = {
                    'id': comp_row[0],
                    'name': comp_row[1],
                    'startDate': comp_row[2].isoformat() if comp_row[2] else None,
                    'endDate': comp_row[3].isoformat() if comp_row[3] else None,
                    'status': comp_row[4],
                    'metrics': [
                        {'name': 'Sold Flips', 'target': comp_row[5] or 0},
                        {'name': 'Items Sold', 'target': comp_row[6] or 0},
                        {'name': 'Google Reviews', 'target': comp_row[7] or 0}
                    ],
                    'prizes': {
                        'first': float(comp_row[8]) if comp_row[8] else 500.00,
                        'second': float(comp_row[9]) if comp_row[9] else 300.00,
                        'third': float(comp_row[10]) if comp_row[10] else 150.00
                    },
                    'itemCode': comp_row[11],
                    'minimumToQualify': comp_row[12] if comp_row[12] else 25
                }

                # Get leaderboard entries
                leaderboard_query = """
                SELECT
                    id, technician_name, sold_flips, items_sold, reviews,
                    total_points, rank, previous_rank, streak_days, badges
                FROM competition_leaderboard
                WHERE competition_id = %s
                ORDER BY total_points DESC, technician_name ASC
                """

                cursor.execute(leaderboard_query, (comp_id,))
                leaderboard_rows = cursor.fetchall()

                leaderboard = []
                for row in leaderboard_rows:
                    leaderboard.append({
                        'id': row[0],
                        'name': row[1],  # Frontend expects 'name' not 'technicianName'
                        'metrics': {
                            'soldFlips': row[2],
                            'itemsSold': row[3],
                            'reviews': row[4]
                        },
                        'totalPoints': row[5],
                        'rank': row[6],
                        'previousRank': row[7] if row[7] else row[6],  # Default to current rank if no previous
                        'streak': row[8] if row[8] else 0,
                        'badges': row[9] if row[9] else []
                    })

                return {
                    'status': 'success',
                    'data': {
                        'competition': competition,
                        'leaderboard': leaderboard
                    }
                }

    except Exception as e:
        logger.error(f"Error getting leaderboard: {e}")
        return ({'status': 'error', 'message': str(e)}, 500)


def sync_competition_data(comp_id, request, full_backfill=False):
    """
    Sync competition data from ServiceTitan API using incremental approach.

    This uses an incremental strategy to handle ServiceTitan API data truncation:
    1. Store individual item records in competition_items_sold table with deduplication
    2. On regular syncs, only fetch the last 3 days to avoid API truncation issues
    3. Use full_backfill=True to do a complete historical sync with chunked fetching
    4. Recalculate totals from the stored records table

    This approach ensures we never lose data due to API quirks.
    """
    try:
        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                # Get competition details
                query = """
                SELECT start_date, end_date, status, item_code
                FROM competitions
                WHERE id = %s
                """

                cursor.execute(query, (comp_id,))
                comp_row = cursor.fetchone()

                if not comp_row:
                    return ({'status': 'error', 'message': 'Competition not found'}, 404)

                comp_start_date = comp_row[0]
                comp_end_date = comp_row[1]
                status = comp_row[2]
                item_code = comp_row[3]

                if not item_code:
                    return ({'status': 'error', 'message': 'Competition missing item_code'}, 400)

                # Get ServiceTitan sync URL
                servicetitan_sync_url = os.environ.get('SERVICETITAN_SYNC_URL',
                    'https://us-central1-new-dashboard-2025.cloudfunctions.net/servicetitan-sync')

                # Cap end date at today to avoid querying future dates
                today = datetime.now().date()
                # Convert dates to date objects
                if hasattr(comp_start_date, 'date') and callable(comp_start_date.date):
                    start_date_obj = comp_start_date.date()
                elif hasattr(comp_start_date, 'year'):
                    start_date_obj = comp_start_date
                else:
                    start_date_obj = comp_start_date

                if hasattr(comp_end_date, 'date') and callable(comp_end_date.date):
                    end_date_obj = comp_end_date.date()
                elif hasattr(comp_end_date, 'year'):
                    end_date_obj = comp_end_date
                else:
                    end_date_obj = comp_end_date

                effective_end_date = min(end_date_obj, today)

                # Determine fetch date range based on sync mode
                if full_backfill:
                    # Full backfill: fetch entire competition range in chunks
                    fetch_start = start_date_obj
                    fetch_end = effective_end_date
                    date_chunks = get_date_chunks(fetch_start, fetch_end, chunk_days=5)
                    logger.info(f"FULL BACKFILL: Fetching {fetch_start} to {fetch_end} in {len(date_chunks)} chunks")
                else:
                    # Incremental: only fetch last 3 days (ServiceTitan API works reliably for short ranges)
                    fetch_start = max(start_date_obj, today - timedelta(days=3))
                    fetch_end = effective_end_date
                    date_chunks = [(fetch_start, fetch_end)]
                    logger.info(f"INCREMENTAL SYNC: Fetching {fetch_start} to {fetch_end}")

                # Fetch and store items sold records
                items_fetch_url = f"{servicetitan_sync_url}/fetch-items-sold-custom"
                items_inserted = 0
                items_duplicates = 0

                for chunk_start, chunk_end in date_chunks:
                    params = {
                        'start_date': str(chunk_start),
                        'end_date': str(chunk_end)
                    }
                    logger.info(f"Fetching items sold for: {chunk_start} to {chunk_end}")

                    try:
                        response = requests.get(items_fetch_url, params=params, timeout=120)
                        response.raise_for_status()
                        api_result = response.json()

                        if api_result.get('status') == 'success':
                            items_sold_records = api_result.get('data', [])

                            # Store individual records for items matching our item_code
                            for record in items_sold_records:
                                tech_name = record.get('sold_by_technician')
                                code = record.get('code')
                                quantity = record.get('quantity', 0)
                                invoice_number = record.get('invoice_number')
                                invoice_date = record.get('invoice_date', '')[:10] if record.get('invoice_date') else None
                                job_business_unit = record.get('job_business_unit')

                                if tech_name and code == item_code and invoice_date:
                                    try:
                                        # Insert with ON CONFLICT DO NOTHING for deduplication
                                        cursor.execute("""
                                            INSERT INTO competition_items_sold
                                            (competition_id, invoice_number, invoice_date, technician_name, item_code, quantity, job_business_unit)
                                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                                            ON CONFLICT (competition_id, invoice_number, technician_name, item_code) DO NOTHING
                                        """, (comp_id, invoice_number, invoice_date, tech_name, code, quantity, job_business_unit))

                                        if cursor.rowcount > 0:
                                            items_inserted += 1
                                        else:
                                            items_duplicates += 1
                                    except Exception as e:
                                        logger.warning(f"Error inserting item record: {e}")

                            logger.info(f"Chunk {chunk_start}-{chunk_end}: processed {len(items_sold_records)} records")
                        else:
                            logger.warning(f"Failed to fetch items for {chunk_start}-{chunk_end}: {api_result.get('message')}")

                    except requests.exceptions.Timeout:
                        logger.error(f"Timeout fetching items for {chunk_start} to {chunk_end}")
                    except Exception as e:
                        logger.error(f"Error fetching items for {chunk_start} to {chunk_end}: {e}")

                logger.info(f"Items sold: {items_inserted} new, {items_duplicates} duplicates skipped")

                # Fetch and store sold flips records
                fetch_url = f"{servicetitan_sync_url}/fetch-sold-flips-custom"
                flips_inserted = 0

                for chunk_start, chunk_end in date_chunks:
                    params = {
                        'start_date': str(chunk_start),
                        'end_date': str(chunk_end)
                    }
                    logger.info(f"Fetching sold flips for: {chunk_start} to {chunk_end}")

                    try:
                        response = requests.get(fetch_url, params=params, timeout=120)
                        response.raise_for_status()
                        api_result = response.json()

                        if api_result.get('status') == 'success':
                            sold_flips_records = api_result.get('data', [])

                            # Store sold flips by date for each technician (allows daily tracking)
                            for record in sold_flips_records:
                                tech_name = record.get('technician_name')
                                leads_sold = record.get('leads_sold', 0)

                                if tech_name and leads_sold > 0:
                                    try:
                                        # Use chunk_end as sync_date, upsert to update if re-syncing same period
                                        cursor.execute("""
                                            INSERT INTO competition_sold_flips
                                            (competition_id, sync_date, technician_name, leads_sold)
                                            VALUES (%s, %s, %s, %s)
                                            ON CONFLICT (competition_id, sync_date, technician_name)
                                            DO UPDATE SET leads_sold = EXCLUDED.leads_sold
                                        """, (comp_id, chunk_end, tech_name, leads_sold))
                                        flips_inserted += 1
                                    except Exception as e:
                                        logger.warning(f"Error inserting sold flip: {e}")

                            logger.info(f"Chunk {chunk_start}-{chunk_end}: {len(sold_flips_records)} sold flips records")
                        else:
                            logger.warning(f"Failed to fetch sold flips for {chunk_start}-{chunk_end}: {api_result.get('message')}")

                    except requests.exceptions.Timeout:
                        logger.error(f"Timeout fetching sold flips for {chunk_start} to {chunk_end}")
                    except Exception as e:
                        logger.error(f"Error fetching sold flips for {chunk_start} to {chunk_end}: {e}")

                logger.info(f"Sold flips: {flips_inserted} records upserted")

                # Now recalculate leaderboard totals from stored records
                # Get items sold totals from competition_items_sold table
                cursor.execute("""
                    SELECT technician_name, SUM(quantity) as total_items
                    FROM competition_items_sold
                    WHERE competition_id = %s
                    GROUP BY technician_name
                """, (comp_id,))
                items_sold_data = {row[0]: row[1] for row in cursor.fetchall()}

                # Get sold flips - use MAX per technician (sold flips report is cumulative per period)
                # We store the latest value for each chunk period, so get the max
                cursor.execute("""
                    SELECT technician_name, MAX(leads_sold) as total_flips
                    FROM competition_sold_flips
                    WHERE competition_id = %s
                    GROUP BY technician_name
                """, (comp_id,))
                sold_flips_data = {row[0]: row[1] for row in cursor.fetchall()}

                logger.info(f"Recalculated from DB - items_sold: {items_sold_data}")
                logger.info(f"Recalculated from DB - sold_flips: {sold_flips_data}")

                # Get all unique technician names
                all_techs = set(list(items_sold_data.keys()) + list(sold_flips_data.keys()))
                techs_updated = 0

                # Update leaderboard for each technician
                for tech_name in all_techs:
                    sold_flips = sold_flips_data.get(tech_name, 0) or 0
                    items_sold = items_sold_data.get(tech_name, 0) or 0

                    # Preserve existing review count - reviews are manually managed
                    cursor.execute("""
                        SELECT reviews FROM competition_leaderboard
                        WHERE competition_id = %s AND technician_name = %s
                    """, (comp_id, tech_name))
                    existing_row = cursor.fetchone()
                    reviews = existing_row[0] if existing_row else 0

                    # Calculate points: 1:1 ratio
                    total_points = sold_flips + items_sold + reviews

                    logger.info(f"Updating {tech_name}: sold_flips={sold_flips}, items_sold={items_sold}, reviews={reviews}, points={total_points}")

                    # Upsert into leaderboard
                    upsert_query = """
                    INSERT INTO competition_leaderboard (
                        competition_id, technician_name, sold_flips, items_sold, reviews, total_points
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (competition_id, technician_name)
                    DO UPDATE SET
                        sold_flips = EXCLUDED.sold_flips,
                        items_sold = EXCLUDED.items_sold,
                        total_points = EXCLUDED.total_points,
                        updated_at = CURRENT_TIMESTAMP
                    """

                    cursor.execute(upsert_query, (
                        comp_id,
                        tech_name,
                        sold_flips,
                        items_sold,
                        reviews,
                        total_points
                    ))
                    techs_updated += 1

                # Update ranks
                rank_query = """
                UPDATE competition_leaderboard
                SET previous_rank = rank,
                    rank = sub.new_rank
                FROM (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY total_points DESC, technician_name ASC) as new_rank
                    FROM competition_leaderboard
                    WHERE competition_id = %s
                ) sub
                WHERE competition_leaderboard.id = sub.id
                """
                cursor.execute(rank_query, (comp_id,))

                # Log sync success
                log_query = """
                INSERT INTO competition_sync_log (
                    competition_id, sync_type, techs_updated, status
                )
                VALUES (%s, %s, %s, %s)
                """

                cursor.execute(log_query, (
                    comp_id,
                    'servicetitan_sync',
                    techs_updated,
                    'success'
                ))

                conn.commit()

                return {
                    'status': 'success',
                    'message': f'Successfully synced data for {techs_updated} technicians',
                    'data': {
                        'techsUpdated': techs_updated,
                        'itemsSoldTechs': len(items_sold_data),
                        'soldFlipsTechs': len(sold_flips_data)
                    }
                }

    except Exception as e:
        logger.error(f"Error syncing competition data: {e}")
        return ({'status': 'error', 'message': str(e)}, 500)


def update_manual_reviews(comp_id, request):
    """
    Manually update review count for a technician in a competition
    Used until automatic Google Reviews integration is implemented
    """
    try:
        request_json = request.get_json(silent=True)
        if not request_json:
            return ({'status': 'error', 'message': 'Invalid request body'}, 400)

        technician_name = request_json.get('technician_name')
        review_count = request_json.get('review_count', 0)

        if not technician_name:
            return ({'status': 'error', 'message': 'technician_name is required'}, 400)

        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                # Verify competition exists
                cursor.execute("SELECT id FROM competitions WHERE id = %s", (comp_id,))
                if not cursor.fetchone():
                    return ({'status': 'error', 'message': 'Competition not found'}, 404)

                # Get current leaderboard entry if exists
                query = """
                SELECT sold_flips, items_sold, reviews
                FROM competition_leaderboard
                WHERE competition_id = %s AND technician_name = %s
                """
                cursor.execute(query, (comp_id, technician_name))
                row = cursor.fetchone()

                if row:
                    # Update existing entry
                    sold_flips = row[0] or 0
                    items_sold = row[1] or 0
                    # Update review count
                    reviews = review_count
                else:
                    # Create new entry with just reviews
                    sold_flips = 0
                    items_sold = 0
                    reviews = review_count

                # Calculate new total points: 1:1 ratio - each flip, item, and review = 1 point
                total_points = sold_flips + items_sold + reviews

                # Upsert the leaderboard entry
                upsert_query = """
                INSERT INTO competition_leaderboard (
                    competition_id, technician_name, sold_flips, items_sold, reviews, total_points
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (competition_id, technician_name)
                DO UPDATE SET
                    reviews = EXCLUDED.reviews,
                    total_points = EXCLUDED.total_points,
                    updated_at = CURRENT_TIMESTAMP
                """

                cursor.execute(upsert_query, (
                    comp_id,
                    technician_name,
                    sold_flips,
                    items_sold,
                    reviews,
                    total_points
                ))

                # Update ranks
                rank_query = """
                UPDATE competition_leaderboard
                SET previous_rank = rank,
                    rank = sub.new_rank
                FROM (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY total_points DESC, technician_name ASC) as new_rank
                    FROM competition_leaderboard
                    WHERE competition_id = %s
                ) sub
                WHERE competition_leaderboard.id = sub.id
                """
                cursor.execute(rank_query, (comp_id,))

                conn.commit()

                logger.info(f"Manually updated reviews for {technician_name} in competition {comp_id}: {review_count} reviews")

                return {
                    'status': 'success',
                    'message': f'Successfully updated reviews for {technician_name}',
                    'data': {
                        'technician_name': technician_name,
                        'review_count': reviews,
                        'total_points': total_points
                    }
                }

    except Exception as e:
        logger.error(f"Error updating manual reviews: {e}")
        return ({'status': 'error', 'message': str(e)}, 500)


def sync_all_active_competitions(request):
    """
    Automatically sync all active competitions
    Called by Cloud Scheduler hourly to keep competition data up to date
    """
    try:
        logger.info("Starting automatic sync for all active competitions")

        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                # Get all active competitions
                query = """
                SELECT id, name, start_date, end_date
                FROM competitions
                WHERE status = 'active'
                ORDER BY created_at DESC
                """
                cursor.execute(query)
                active_comps = cursor.fetchall()

                if not active_comps:
                    logger.info("No active competitions to sync")
                    return {
                        'status': 'success',
                        'message': 'No active competitions to sync',
                        'synced': 0,
                        'timestamp': datetime.now().isoformat()
                    }

                sync_results = []
                total_techs_updated = 0

                for comp_row in active_comps:
                    comp_id = comp_row[0]
                    comp_name = comp_row[1]

                    try:
                        logger.info(f"Syncing competition: {comp_name} (ID: {comp_id})")

                        # Use the existing sync_competition_data function
                        # Pass a mock request object with empty body
                        class MockRequest:
                            def get_json(self, silent=True):
                                return {}

                        result = sync_competition_data(comp_id, MockRequest())

                        if isinstance(result, tuple):
                            result_data = result[0]
                        else:
                            result_data = result

                        if result_data.get('status') == 'success':
                            techs_updated = result_data.get('data', {}).get('techsUpdated', 0)
                            total_techs_updated += techs_updated
                            sync_results.append({
                                'competition_id': comp_id,
                                'competition_name': comp_name,
                                'status': 'success',
                                'technicians_updated': techs_updated
                            })
                            logger.info(f"✅ Synced {comp_name}: {techs_updated} technicians updated")
                        else:
                            error_msg = result_data.get('message', 'Unknown error')
                            sync_results.append({
                                'competition_id': comp_id,
                                'competition_name': comp_name,
                                'status': 'error',
                                'error': error_msg
                            })
                            logger.error(f"❌ Failed to sync {comp_name}: {error_msg}")

                    except Exception as e:
                        logger.error(f"Error syncing competition {comp_name}: {str(e)}")
                        sync_results.append({
                            'competition_id': comp_id,
                            'competition_name': comp_name,
                            'status': 'error',
                            'error': str(e)
                        })

                logger.info(f"Completed automatic sync: {len(active_comps)} competitions processed, {total_techs_updated} total technicians updated")

                return {
                    'status': 'success',
                    'message': f'Synced {len(active_comps)} active competition(s)',
                    'data': {
                        'competitions_synced': len(active_comps),
                        'total_technicians_updated': total_techs_updated,
                        'results': sync_results
                    },
                    'timestamp': datetime.now().isoformat()
                }

    except Exception as e:
        logger.error(f"Error in sync_all_active_competitions: {e}")
        return ({'status': 'error', 'message': str(e)}, 500)
