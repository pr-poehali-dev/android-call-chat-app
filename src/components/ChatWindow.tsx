import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';

interface Message {
  id: number;
  content: string;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  created_at: string;
  is_read: boolean;
}

interface Chat {
  id: number;
  name: string;
  is_group: boolean;
  avatar_url?: string;
}

interface ChatWindowProps {
  chat: Chat;
  onClose: () => void;
  onCall: (type: 'audio' | 'video') => void;
  currentUserId: number;
}

export default function ChatWindow({ chat, onClose, onCall, currentUserId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
  }, [chat.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/f417f6a0-d66b-4378-a1c5-23b680124a78?action=messages&chat_id=${chat.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || loading) return;

    setLoading(true);
    try {
      let messageContent = newMessage;
      
      if (selectedFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });
        const base64 = await base64Promise;
        
        messageContent = `📎 ${selectedFile.name}${newMessage ? '\n' + newMessage : ''}`;
      }

      const response = await fetch('https://functions.poehali.dev/f417f6a0-d66b-4378-a1c5-23b680124a78', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          chat_id: chat.id,
          sender_id: currentUserId,
          content: messageContent,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        setSelectedFile(null);
        await fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col max-w-md mx-auto shadow-2xl">
      <div className="bg-gradient-to-r from-primary to-secondary p-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <Icon name="ArrowLeft" size={24} />
          </Button>

          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage src={chat.avatar_url} />
            <AvatarFallback className="bg-white text-primary">
              {chat.is_group ? <Icon name="Users" size={20} /> : chat.name[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className="font-semibold text-lg">{chat.name}</h2>
            <p className="text-xs text-white/80">В сети</p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCall('video')}
            className="text-white hover:bg-white/20"
          >
            <Icon name="Video" size={22} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCall('audio')}
            className="text-white hover:bg-white/20"
          >
            <Icon name="Phone" size={22} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 bg-muted/20" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => {
            const isOwn = message.sender_id === currentUserId;
            const showAvatar = !isOwn && (index === 0 || messages[index - 1].sender_id !== message.sender_id);

            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {!isOwn && (
                  <Avatar className={`h-8 w-8 ${showAvatar ? 'visible' : 'invisible'}`}>
                    <AvatarImage src={message.sender_avatar} />
                    <AvatarFallback className="bg-primary text-white text-xs">
                      {message.sender_name[0]}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
                  {!isOwn && showAvatar && (
                    <span className="text-xs text-muted-foreground mb-1 px-2">{message.sender_name}</span>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 shadow-md ${
                      isOwn
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-card text-foreground rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm break-words">{message.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 px-2">
                    {new Date(message.created_at).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 bg-card border-t">
        {selectedFile && (
          <div className="mb-2 p-2 bg-muted rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="File" size={20} className="text-primary" />
              <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedFile(null)}
            >
              <Icon name="X" size={16} />
            </Button>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Icon name="Smile" size={22} />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="Paperclip" size={22} />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedFile(file);
              }
            }}
          />

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedFile ? "Добавить подпись..." : "Введите сообщение..."}
            className="flex-1"
            disabled={loading}
          />

          <Button
            onClick={sendMessage}
            disabled={(!newMessage.trim() && !selectedFile) || loading}
            size="icon"
            className="bg-primary hover:bg-primary/90 text-white rounded-full h-10 w-10"
          >
            {loading ? (
              <Icon name="Loader2" size={20} className="animate-spin" />
            ) : (
              <Icon name="Send" size={20} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}