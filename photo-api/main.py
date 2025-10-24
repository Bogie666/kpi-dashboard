import os
import json
import psycopg2
from datetime import datetime
import functions_framework
import logging
import base64

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PhotoDatabaseManager:
    def __init__(self):
        pass
        
    def get_connection(self):
        """Get database connection"""
        instance_name = os.environ.get('INSTANCE_CONNECTION_NAME', 'new-dashboard-2025:us-central1:kpi-dashboard')
        
        try:
            socket_dir = os.environ.get('DB_SOCKET_DIR', '/cloudsql')
            socket_path = f'{socket_dir}/{instance_name}'
            
            return psycopg2.connect(
                host=socket_path,
                database='kpi_data',
                user='postgres',
                password='LexHVAC2025'
            )
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    def get_all_technicians(self):
        """Get all technician photos"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                SELECT id, name, photo_url, department, created_at, updated_at
                FROM technician_photos
                ORDER BY name
                """
                cursor.execute(query)
                rows = cursor.fetchall()
                
                return [{
                    'id': row[0],
                    'name': row[1],
                    'photo_url': row[2],
                    'department': row[3],
                    'created_at': row[4].isoformat() if row[4] else None,
                    'updated_at': row[5].isoformat() if row[5] else None
                } for row in rows]
    
    def add_or_update_technician(self, name, photo_url, department=None):
        """Add or update technician photo"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                INSERT INTO technician_photos (name, photo_url, department, updated_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (name) 
                DO UPDATE SET 
                    photo_url = EXCLUDED.photo_url,
                    department = EXCLUDED.department,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, name, photo_url, department
                """
                cursor.execute(query, (name, photo_url, department))
                row = cursor.fetchone()
                conn.commit()
                
                return {
                    'id': row[0],
                    'name': row[1],
                    'photo_url': row[2],
                    'department': row[3]
                }
    
    def delete_technician(self, tech_id):
        """Delete technician photo"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM technician_photos WHERE id = %s", (tech_id,))
                conn.commit()
                return True

photo_db = PhotoDatabaseManager()

@functions_framework.http
def photo_api(request):
    """Photo management API Cloud Function"""
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    }
    
    if request.method == 'OPTIONS':
        return ('', 204, headers)
    
    try:
        path = request.path.strip('/').replace('photo_api/', '')
        method = request.method
    
        logger.info(f"Request path: {path}, method: {method}")
        
        # GET /technicians - Get all technicians
        if method == 'GET' and path == 'technicians':
            technicians = photo_db.get_all_technicians()
            response = {
                'status': 'success',
                'data': technicians,
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response), 200, headers)
        
        # POST /technicians - Add or update technician
        elif method == 'POST' and path == 'technicians':
            data = request.get_json()
            
            if not data.get('name') or not data.get('photo_url'):
                return (json.dumps({
                    'status': 'error',
                    'message': 'Name and photo_url are required'
                }), 400, headers)
            
            technician = photo_db.add_or_update_technician(
                data['name'],
                data['photo_url'],
                data.get('department')
            )
            
            response = {
                'status': 'success',
                'data': technician,
                'message': 'Technician photo saved successfully',
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response), 200, headers)
        
        # DELETE /technicians/{id} - Delete technician
        elif method == 'DELETE' and path.startswith('technicians/'):
            tech_id = path.split('/')[-1]
            photo_db.delete_technician(int(tech_id))
            
            response = {
                'status': 'success',
                'message': 'Technician deleted successfully',
                'timestamp': datetime.now().isoformat()
            }
            return (json.dumps(response), 200, headers)
        
        else:
            response = {
                'status': 'success',
                'message': 'Photo Management API',
                'endpoints': [
                    'GET /technicians - Get all technicians',
                    'POST /technicians - Add/update technician',
                    'DELETE /technicians/{id} - Delete technician'
                ]
            }
            return (json.dumps(response), 200, headers)
            
    except Exception as e:
        logger.error(f"Error: {e}")
        return (json.dumps({
            'status': 'error',
            'message': str(e)
        }), 500, headers)