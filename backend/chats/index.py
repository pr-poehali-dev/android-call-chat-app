import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Manage chats - get chat list, messages, send messages
    Args: event with httpMethod (GET/POST/OPTIONS), queryStringParameters, body
          context with request_id
    Returns: HTTP response with chat data or operation confirmation
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
            action = query_params.get('action', 'list')
            user_id = query_params.get('user_id', '1')
            
            if action == 'list':
                cursor.execute(f"""
                    SELECT 
                        c.id, c.name, c.is_group, c.avatar_url,
                        m.content as last_message,
                        m.created_at as last_message_time,
                        COUNT(CASE WHEN m.is_read = false AND m.sender_id != {user_id} THEN 1 END) as unread_count
                    FROM chats c
                    INNER JOIN chat_participants cp ON c.id = cp.chat_id
                    LEFT JOIN messages m ON c.id = m.chat_id
                    WHERE cp.user_id = {user_id}
                    GROUP BY c.id, c.name, c.is_group, c.avatar_url, m.content, m.created_at
                    ORDER BY m.created_at DESC NULLS LAST
                """)
                chats = cursor.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps([dict(chat) for chat in chats], default=str)
                }
            
            elif action == 'messages':
                chat_id = query_params.get('chat_id')
                if not chat_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'chat_id required'})
                    }
                
                cursor.execute(f"""
                    SELECT 
                        m.id, m.content, m.message_type, m.is_read, m.created_at,
                        m.sender_id, u.full_name as sender_name, u.avatar_url as sender_avatar
                    FROM messages m
                    INNER JOIN users u ON m.sender_id = u.id
                    WHERE m.chat_id = {chat_id}
                    ORDER BY m.created_at ASC
                """)
                messages = cursor.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps([dict(msg) for msg in messages], default=str)
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action', 'send')
            
            if action == 'send':
                chat_id = body_data.get('chat_id')
                sender_id = body_data.get('sender_id', 1)
                content = body_data.get('content', '').replace("'", "''")
                message_type = body_data.get('message_type', 'text')
                
                if not chat_id or not content:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'chat_id and content required'})
                    }
                
                cursor.execute(f"""
                    INSERT INTO messages (chat_id, sender_id, content, message_type)
                    VALUES ({chat_id}, {sender_id}, '{content}', '{message_type}')
                    RETURNING id, content, created_at
                """)
                new_message = cursor.fetchone()
                
                cursor.execute(f"UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = {chat_id}")
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({
                        'message': 'Message sent',
                        'data': dict(new_message)
                    }, default=str)
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    finally:
        cursor.close()
        conn.close()
