import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';

interface IncomingCallDialogProps {
  open: boolean;
  callerName: string;
  callerAvatar?: string;
  isVideo: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallDialog({
  open,
  callerName,
  callerAvatar,
  isVideo,
  onAccept,
  onDecline
}: IncomingCallDialogProps) {
  const [ringing, setRinging] = useState(false);
  const [audio] = useState(() => {
    const audioElement = new Audio();
    audioElement.loop = true;
    return audioElement;
  });

  useEffect(() => {
    if (open) {
      setRinging(true);
      // Генерация простого звука звонка через Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.1;
      
      const startTime = audioContext.currentTime;
      
      // Создаем паттерн звонка
      const playRing = () => {
        if (!open) return;
        
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        setTimeout(() => {
          if (open) {
            oscillator.frequency.setValueAtTime(550, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          }
        }, 400);
        
        setTimeout(() => {
          if (open) playRing();
        }, 2000);
      };
      
      oscillator.start();
      playRing();
      
      return () => {
        oscillator.stop();
        audioContext.close();
        setRinging(false);
      };
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center py-8 space-y-6">
          <div className="relative">
            <Avatar className={`h-32 w-32 border-4 border-primary shadow-2xl ${ringing ? 'animate-pulse' : ''}`}>
              <AvatarImage src={callerAvatar} />
              <AvatarFallback className="bg-primary text-white text-4xl">
                {callerName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -top-2 -right-2 bg-primary rounded-full p-2 shadow-lg animate-bounce">
              <Icon name={isVideo ? "Video" : "Phone"} size={24} className="text-white" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{callerName}</h2>
            <p className="text-muted-foreground animate-pulse">
              {isVideo ? 'Видеозвонок...' : 'Звонок...'}
            </p>
          </div>

          <div className="flex gap-6">
            <div className="flex flex-col items-center gap-2">
              <Button
                size="lg"
                variant="destructive"
                className="h-16 w-16 rounded-full shadow-xl hover:scale-110 transition-transform"
                onClick={onDecline}
              >
                <Icon name="PhoneOff" size={28} />
              </Button>
              <span className="text-xs text-muted-foreground">Отклонить</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Button
                size="lg"
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 shadow-xl hover:scale-110 transition-transform animate-pulse"
                onClick={onAccept}
              >
                <Icon name="Phone" size={28} />
              </Button>
              <span className="text-xs text-muted-foreground">Принять</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
