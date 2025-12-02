import json
from typing import Dict, Any, List
from datetime import datetime

# In-memory storage (in production use Redis/Database)
active_connections: Dict[str, set] = {}
pending_messages: Dict[str, List[Dict[str, Any]]] = {}

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: WebRTC signaling server for audio/video calls
    Args: event with httpMethod, body for signaling messages
    Returns: HTTP response with signaling data
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
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        msg_type = body_data.get('type')
        from_user = body_data.get('from')
        to_user = body_data.get('to')
        data = body_data.get('data')
        room_id = body_data.get('roomId', 'default')
        
        if msg_type == 'join':
            if room_id not in active_connections:
                active_connections[room_id] = set()
            active_connections[room_id].add(from_user)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'participants': list(active_connections[room_id])
                })
            }
        
        elif msg_type == 'leave':
            if room_id in active_connections:
                active_connections[room_id].discard(from_user)
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': True})
            }
        
        elif msg_type in ['offer', 'answer', 'ice-candidate']:
            if to_user not in pending_messages:
                pending_messages[to_user] = []
            pending_messages[to_user].append(body_data)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': True})
            }
        
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Invalid message type'})
        }
    
    if method == 'GET':
        query_params = event.get('queryStringParameters', {})
        user_id = query_params.get('userId')
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'userId required'})
            }
        
        messages = pending_messages.get(user_id, [])
        if user_id in pending_messages:
            del pending_messages[user_id]
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'messages': messages})
        }
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': 'Method not allowed'})
    }
