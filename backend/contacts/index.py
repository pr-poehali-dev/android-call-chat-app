import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Manage user contacts - list, add, and remove contacts
    Args: event with httpMethod (GET/POST/DELETE/OPTIONS), body with contact data
          context with request_id
    Returns: HTTP response with contacts list or operation status
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    db_url = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            query_params = event.get('queryStringParameters', {})
            user_id = query_params.get('user_id', '1')
            
            cursor.execute(f"""
                SELECT 
                    c.id as contact_id,
                    u.id, u.unique_id, u.username, u.full_name, 
                    u.phone, u.avatar_url, u.status,
                    c.contact_name, c.added_at
                FROM contacts c
                JOIN users u ON c.contact_user_id = u.id
                WHERE c.user_id = {user_id}
                ORDER BY c.added_at DESC
            """)
            
            contacts = cursor.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps([dict(contact) for contact in contacts], default=str)
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            user_id = body_data.get('user_id', 1)
            contact_user_id = body_data.get('contact_user_id')
            contact_name = body_data.get('contact_name', '')
            
            if not contact_user_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'contact_user_id required'})
                }
            
            contact_name_escaped = contact_name.replace("'", "''")
            
            cursor.execute(f"""
                INSERT INTO contacts (user_id, contact_user_id, contact_name)
                VALUES ({user_id}, {contact_user_id}, '{contact_name_escaped}')
                ON CONFLICT (user_id, contact_user_id) DO NOTHING
                RETURNING id
            """)
            
            result = cursor.fetchone()
            conn.commit()
            
            if result:
                return {
                    'statusCode': 201,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'message': 'Contact added successfully', 'id': result['id']})
                }
            else:
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'message': 'Contact already exists'})
                }
        
        elif method == 'DELETE':
            query_params = event.get('queryStringParameters', {})
            contact_id = query_params.get('contact_id')
            
            if not contact_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'contact_id required'})
                }
            
            cursor.execute(f"UPDATE contacts SET contact_user_id = NULL WHERE id = {contact_id}")
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'message': 'Contact removed successfully'})
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Method not allowed'})
            }
    
    finally:
        cursor.close()
        conn.close()
