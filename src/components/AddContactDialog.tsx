import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';

interface User {
  id: number;
  unique_id: string;
  username: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  status?: string;
}

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: number;
  onContactAdded?: () => void;
}

export default function AddContactDialog({ 
  open, 
  onOpenChange, 
  currentUserId,
  onContactAdded 
}: AddContactDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingContactId, setAddingContactId] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://functions.poehali.dev/e0f6f00d-0a43-4fa0-a01f-e183db4f651d?q=${encodeURIComponent(searchQuery)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.filter((user: User) => user.id !== currentUserId));
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (user: User) => {
    setAddingContactId(user.id);
    try {
      const response = await fetch('https://functions.poehali.dev/26146939-005e-4eb7-af42-13d391ce1e74', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          contact_user_id: user.id,
          contact_name: user.full_name
        })
      });

      if (response.ok) {
        onContactAdded?.();
        setSearchQuery('');
        setSearchResults([]);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error adding contact:', error);
    } finally {
      setAddingContactId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить контакт</DialogTitle>
          <DialogDescription>
            Введите имя пользователя или номер телефона
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Поиск по имени или телефону..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Icon name="Search" size={20} />
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Поиск...
            </div>
          ) : searchResults.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-primary text-white">
                        {user.full_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.phone}</p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleAddContact(user)}
                      disabled={addingContactId === user.id}
                    >
                      {addingContactId === user.id ? (
                        <Icon name="Loader2" size={16} className="animate-spin" />
                      ) : (
                        <Icon name="Plus" size={16} />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : searchQuery && !loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Пользователи не найдены
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
