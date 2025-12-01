import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Manage user profile - get and update user information
    Args: event with httpMethod (GET/PUT/OPTIONS), body with user data
          context with request_id
    Returns: HTTP response with user profile data or update confirmation
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    # Database connection
    db_url = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            # Get user profile (default user with id=1 for demo)
            query_params = event.get('queryStringParameters', {})
            user_id = query_params.get('id', '1')
            
            cursor.execute(
                f"SELECT id, username, full_name, email, phone, bio, avatar_url, status, last_seen FROM users WHERE id = {user_id}"
            )
            user = cursor.fetchone()
            
            if not user:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'User not found'})
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps(dict(user), default=str)
            }
        
        elif method == 'PUT':
            # Update user profile
            body_data = json.loads(event.get('body', '{}'))
            user_id = body_data.get('id', 1)
            
            update_fields = []
            if 'full_name' in body_data:
                full_name = body_data['full_name'].replace("'", "''")
                update_fields.append(f"full_name = '{full_name}'")
            if 'email' in body_data:
                email = body_data['email'].replace("'", "''")
                update_fields.append(f"email = '{email}'")
            if 'phone' in body_data:
                phone = body_data['phone'].replace("'", "''")
                update_fields.append(f"phone = '{phone}'")
            if 'bio' in body_data:
                bio = body_data['bio'].replace("'", "''")
                update_fields.append(f"bio = '{bio}'")
            if 'username' in body_data:
                username = body_data['username'].replace("'", "''")
                update_fields.append(f"username = '{username}'")
            if 'avatar_url' in body_data:
                avatar_url = body_data['avatar_url'].replace("'", "''")
                update_fields.append(f"avatar_url = '{avatar_url}'")
            
            if update_fields:
                update_fields.append("updated_at = CURRENT_TIMESTAMP")
                update_query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = {user_id} RETURNING id, username, full_name, email, phone, bio, avatar_url, status"
                
                cursor.execute(update_query)
                updated_user = cursor.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({
                        'message': 'Profile updated successfully',
                        'user': dict(updated_user)
                    }, default=str)
                }
            
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'No fields to update'})
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
