import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  isVideo: boolean;
  isOutgoing: boolean;
}

const SIGNALING_URL = 'https://functions.poehali.dev/6aa9c253-b235-495c-8e1d-9a3af7eb54c8';

export default function CallModal({ isOpen, onClose, contactName, isVideo, isOutgoing }: CallModalProps) {
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideo);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && callStatus === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isOpen, callStatus]);

  useEffect(() => {
    if (!isOpen) return;

    const initCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideo,
          audio: true
        });
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const config: RTCConfiguration = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        };
        
        const peerConnection = new RTCPeerConnection(config);
        peerConnectionRef.current = peerConnection;

        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });

        peerConnection.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        peerConnection.onicecandidate = async (event) => {
          if (event.candidate) {
            await fetch(SIGNALING_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'ice-candidate',
                from: 'current-user',
                to: contactName,
                data: event.candidate
              })
            });
          }
        };

        peerConnection.onconnectionstatechange = () => {
          if (peerConnection.connectionState === 'connected') {
            setCallStatus('connected');
          } else if (peerConnection.connectionState === 'failed' || 
                     peerConnection.connectionState === 'disconnected') {
            handleEndCall();
          }
        };

        if (isOutgoing) {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          
          await fetch(SIGNALING_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'offer',
              from: 'current-user',
              to: contactName,
              data: offer
            })
          });
        }

        setTimeout(() => setCallStatus('connected'), 2000);
        
      } catch (error) {
        console.error('Error initializing call:', error);
        handleEndCall();
      }
    };

    initCall();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [isOpen, isVideo, isOutgoing, contactName]);

  const handleEndCall = () => {
    setCallStatus('ended');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    setTimeout(() => {
      onClose();
      setCallDuration(0);
      setCallStatus('connecting');
    }, 1000);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[600px] p-0 overflow-hidden">
        <div className="relative h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex flex-col">
          {isVideo && (
            <div className="flex-1 relative">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-4 right-4 w-32 h-24 object-cover rounded-lg border-2 border-white shadow-lg"
              />
            </div>
          )}

          <div className={`${isVideo ? 'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent' : 'flex-1 flex flex-col justify-center'} p-8`}>
            <DialogHeader className="text-center text-white mb-6">
              <DialogTitle className="text-3xl font-bold">{contactName}</DialogTitle>
              <p className="text-lg mt-2">
                {callStatus === 'connecting' && (isOutgoing ? 'Вызов...' : 'Входящий вызов...')}
                {callStatus === 'connected' && formatDuration(callDuration)}
                {callStatus === 'ended' && 'Звонок завершен'}
              </p>
            </DialogHeader>

            <div className="flex justify-center gap-4">
              {callStatus === 'connecting' && !isOutgoing && (
                <>
                  <Button
                    size="lg"
                    className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
                    onClick={() => setCallStatus('connected')}
                  >
                    <Icon name="Phone" size={28} />
                  </Button>
                  <Button
                    size="lg"
                    className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"
                    onClick={handleEndCall}
                  >
                    <Icon name="PhoneOff" size={28} />
                  </Button>
                </>
              )}

              {(callStatus === 'connected' || (callStatus === 'connecting' && isOutgoing)) && (
                <>
                  <Button
                    size="lg"
                    variant={isMuted ? 'destructive' : 'secondary'}
                    className="rounded-full w-14 h-14"
                    onClick={toggleMute}
                  >
                    <Icon name={isMuted ? 'MicOff' : 'Mic'} size={24} />
                  </Button>

                  {isVideo && (
                    <Button
                      size="lg"
                      variant={isVideoEnabled ? 'secondary' : 'destructive'}
                      className="rounded-full w-14 h-14"
                      onClick={toggleVideo}
                    >
                      <Icon name={isVideoEnabled ? 'Video' : 'VideoOff'} size={24} />
                    </Button>
                  )}

                  <Button
                    size="lg"
                    className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"
                    onClick={handleEndCall}
                  >
                    <Icon name="PhoneOff" size={28} />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
