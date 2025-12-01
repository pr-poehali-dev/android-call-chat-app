import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface VideoCallWindowProps {
  userName: string;
  userAvatar?: string;
  callType: 'audio' | 'video';
  onEnd: () => void;
}

export default function VideoCallWindow({ userName, userAvatar, callType, onEnd }: VideoCallWindowProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected'>('connecting');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
    }, 2000);

    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    if (callStatus === 'connected') {
      const timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [callStatus]);

  useEffect(() => {
    if (callType === 'video' && videoRef.current && callStatus === 'connected') {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.error('Error accessing camera:', err));
    }
  }, [callType, callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    onEnd();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 z-50 flex flex-col max-w-md mx-auto">
      {callType === 'video' && !isVideoOff ? (
        <div className="relative flex-1">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          <div className="absolute top-4 right-4 w-24 h-32 bg-slate-800 rounded-lg overflow-hidden shadow-xl border-2 border-white/20">
            <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white text-xs">Вы</span>
            </div>
          </div>

          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
            <p className="text-white text-sm font-medium">{formatDuration(callDuration)}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Avatar className="h-40 w-40 border-4 border-white shadow-2xl mb-6 animate-pulse">
            <AvatarImage src={userAvatar} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-5xl">
              {userName[0]}
            </AvatarFallback>
          </Avatar>

          <h2 className="text-white text-2xl font-bold mb-2">{userName}</h2>
          
          {callStatus === 'connecting' ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-white/80 text-lg">Соединение...</p>
            </div>
          ) : (
            <p className="text-white/80 text-lg">{formatDuration(callDuration)}</p>
          )}
        </div>
      )}

      <div className="p-8 flex items-center justify-center gap-6">
        <Button
          onClick={() => setIsMuted(!isMuted)}
          size="lg"
          className={`h-16 w-16 rounded-full shadow-xl ${
            isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'
          } text-white`}
        >
          <Icon name={isMuted ? 'MicOff' : 'Mic'} size={24} />
        </Button>

        {callType === 'video' && (
          <Button
            onClick={() => setIsVideoOff(!isVideoOff)}
            size="lg"
            className={`h-16 w-16 rounded-full shadow-xl ${
              isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'
            } text-white`}
          >
            <Icon name={isVideoOff ? 'VideoOff' : 'Video'} size={24} />
          </Button>
        )}

        <Button
          onClick={handleEndCall}
          size="lg"
          className="h-16 w-16 rounded-full shadow-xl bg-red-500 hover:bg-red-600 text-white"
        >
          <Icon name="PhoneOff" size={24} />
        </Button>

        <Button
          size="lg"
          className="h-16 w-16 rounded-full shadow-xl bg-slate-700 hover:bg-slate-600 text-white"
        >
          <Icon name="Volume2" size={24} />
        </Button>
      </div>
    </div>
  );
}
