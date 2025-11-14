"""
Competition Tracking API for HVAC Technician Competitions
Tracks: Sold Flips, Items Sold (configurable item code), Google Reviews
Uses PostgreSQL (Cloud SQL) - matches existing dashboard infrastructure
"""

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

# Custom JSON encoder to handle Decimal and datetime
class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
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
        elif path.startswith('/competitions/') and path.endswith('/leaderboard') and method == 'GET':
            comp_id = path.split('/')[2]
            response = get_leaderboard(comp_id)
        elif path.startswith('/competitions/') and path.endswith('/sync') and method == 'POST':
            comp_id = path.split('/')[2]
            response = sync_competition_data(comp_id, request)
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
                    item_code, created_at, updated_at
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
                        'updatedAt': row[13]
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
                    item_code, created_at, updated_at
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
                    'updatedAt': row[13]
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

        # Get item code
        item_code = data.get('itemCode', '')

        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                INSERT INTO competitions (
                    name, start_date, end_date, status,
                    sold_flips_target, items_sold_target, reviews_target,
                    first_prize, second_prize, third_prize, item_code
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                    item_code
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
                    first_prize, second_prize, third_prize, item_code
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
                    'prizes': {
                        'first': float(comp_row[8]) if comp_row[8] else 500.00,
                        'second': float(comp_row[9]) if comp_row[9] else 300.00,
                        'third': float(comp_row[10]) if comp_row[10] else 150.00
                    },
                    'itemCode': comp_row[11]
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
                        'technicianName': row[1],
                        'metrics': {
                            'soldFlips': row[2],
                            'itemsSold': row[3],
                            'reviews': row[4]
                        },
                        'totalPoints': row[5],
                        'rank': row[6],
                        'previousRank': row[7],
                        'streak': row[8],
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


def sync_competition_data(comp_id, request):
    """
    Sync competition data from ServiceTitan database tables
    Queries servicetitan_items_sold and servicetitan_sold_flips tables
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

                start_date = comp_row[0]
                end_date = comp_row[1]
                status = comp_row[2]
                item_code = comp_row[3]

                if not item_code:
                    return ({'status': 'error', 'message': 'Competition missing item_code'}, 400)

                # Query items sold from ServiceTitan data
                items_sold_query = """
                SELECT sold_by_technician, SUM(quantity) as total_quantity
                FROM servicetitan_items_sold
                WHERE code = %s
                  AND invoice_date >= %s
                  AND invoice_date <= %s
                  AND sold_by_technician IS NOT NULL
                  AND sold_by_technician != ''
                GROUP BY sold_by_technician
                """

                cursor.execute(items_sold_query, (item_code, start_date, end_date))
                items_sold_rows = cursor.fetchall()
                items_sold_data = {row[0]: row[1] for row in items_sold_rows}

                logger.info(f"Found {len(items_sold_data)} technicians with items sold for item code {item_code}")

                # Query sold flips from ServiceTitan data
                # Using LeadsSet column as the sold flips metric
                sold_flips_query = """
                SELECT technician_name, leads_set
                FROM servicetitan_sold_flips
                WHERE period_type = 'mtd'
                  AND technician_name IS NOT NULL
                  AND technician_name != ''
                """

                cursor.execute(sold_flips_query)
                sold_flips_rows = cursor.fetchall()
                sold_flips_data = {row[0]: row[1] for row in sold_flips_rows}

                logger.info(f"Found {len(sold_flips_data)} technicians with sold flips data (LeadsSet)")

                # Get all unique technician names
                all_techs = set(list(items_sold_data.keys()) + list(sold_flips_data.keys()))
                techs_updated = 0

                # Update leaderboard for each technician
                for tech_name in all_techs:
                    sold_flips = sold_flips_data.get(tech_name, 0)  # This is LeadsSet
                    items_sold = items_sold_data.get(tech_name, 0)
                    reviews = 0  # TODO: Add reviews integration

                    # Calculate points: flips*10 + items*5 + reviews*8
                    total_points = (sold_flips * 10) + (items_sold * 5) + (reviews * 8)

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
                        reviews = EXCLUDED.reviews,
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

                # Calculate new total points
                total_points = (sold_flips * 10) + (items_sold * 5) + (reviews * 8)

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
