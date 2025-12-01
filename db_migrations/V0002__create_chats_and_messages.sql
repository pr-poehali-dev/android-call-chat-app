-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    is_group BOOLEAN DEFAULT false,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chat_participants table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS chat_participants (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chats(id),
    user_id INTEGER REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chats(id),
    sender_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create calls table
CREATE TABLE IF NOT EXISTS calls (
    id SERIAL PRIMARY KEY,
    caller_id INTEGER REFERENCES users(id),
    receiver_id INTEGER REFERENCES users(id),
    call_type VARCHAR(10) CHECK (call_type IN ('audio', 'video')),
    status VARCHAR(20) DEFAULT 'ringing',
    duration INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON calls(receiver_id);

-- Insert demo chats and messages
INSERT INTO chats (name, is_group) VALUES 
    ('Анна Петрова', false),
    ('Команда Проекта', true),
    ('Максим Иванов', false)
ON CONFLICT DO NOTHING;

-- Link participants to chats (assuming user id=1 is current user)
INSERT INTO chat_participants (chat_id, user_id) VALUES 
    (1, 1),
    (2, 1),
    (3, 1)
ON CONFLICT DO NOTHING;

-- Insert demo messages
INSERT INTO messages (chat_id, sender_id, content, created_at) VALUES 
    (1, 1, 'Привет! Как дела?', NOW() - INTERVAL '2 hours'),
    (1, 1, 'Давно не виделись', NOW() - INTERVAL '1 hour'),
    (2, 1, 'Встреча в 15:00', NOW() - INTERVAL '30 minutes'),
    (3, 1, 'Отправил файлы', NOW() - INTERVAL '1 hour')
ON CONFLICT DO NOTHING;