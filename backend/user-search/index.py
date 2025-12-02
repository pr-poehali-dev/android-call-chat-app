import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Search users by username or phone number
    Args: event with httpMethod (GET/OPTIONS), query with search term
          context with request_id
    Returns: HTTP response with list of found users
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    db_url = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        query_params = event.get('queryStringParameters', {})
        search_term = query_params.get('q', '').strip()
        
        if not search_term:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Search term required'})
            }
        
        search_escaped = search_term.replace("'", "''")
        
        cursor.execute(f"""
            SELECT id, unique_id, username, full_name, phone, avatar_url, status
            FROM users
            WHERE username ILIKE '%{search_escaped}%'
               OR phone LIKE '%{search_escaped}%'
            LIMIT 20
        """)
        
        users = cursor.fetchall()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps([dict(user) for user in users], default=str)
        }
    
    finally:
        cursor.close()
        conn.close()
