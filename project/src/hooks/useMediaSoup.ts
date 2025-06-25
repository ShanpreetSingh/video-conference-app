import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MediaSoupClient } from '../lib/MediaSoupClient';
import { Peer, ChatMessage } from '../types/mediasoup';

export const useMediaSoup = (roomId: string, userName: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const clientRef = useRef<MediaSoupClient | null>(null);

  useEffect(() => {
    if (!roomId || !userName) return;

    const initializeConnection = async () => {
      try {
        // Initialize socket connection
        socketRef.current = io('http://localhost:3001', {
          transports: ['websocket']
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
          console.log('Connected to server');
          setIsConnected(true);
        });

        socket.on('disconnect', () => {
          console.log('Disconnected from server');
          setIsConnected(false);
          setIsInitialized(false);
        });

        socket.on('error', (error) => {
          console.error('Socket error:', error);
          setError(error.message || 'Connection error');
        });

        // MediaSoup events
        socket.on('router-rtp-capabilities', async (data) => {
          try {
            clientRef.current = new MediaSoupClient(socket);
            await clientRef.current.initialize();
            setIsInitialized(true);
            console.log('MediaSoup client initialized');
          } catch (error) {
            console.error('Failed to initialize MediaSoup client:', error);
            setError('Failed to initialize media connection');
          }
        });

        socket.on('peer-joined', ({ peerId, name }) => {
          console.log(`Peer joined: ${name} (${peerId})`);
          if (clientRef.current) {
            clientRef.current.addPeer(peerId, name);
            setPeers(clientRef.current.getPeers());
          }
        });

        socket.on('peer-left', ({ peerId }) => {
          console.log(`Peer left: ${peerId}`);
          if (clientRef.current) {
            clientRef.current.removePeer(peerId);
            setPeers(clientRef.current.getPeers());
          }
        });

        socket.on('existing-peers', (existingPeers) => {
          console.log('Existing peers:', existingPeers);
          if (clientRef.current) {
            existingPeers.forEach(({ id, name }: { id: string; name: string }) => {
              clientRef.current!.addPeer(id, name);
            });
            setPeers(clientRef.current.getPeers());
          }
        });

        socket.on('new-producer', async ({ peerId, producerId, kind }) => {
          console.log(`New producer: ${kind} from ${peerId}`);
          if (clientRef.current) {
            try {
              await clientRef.current.consume(peerId, producerId, kind);
              setPeers(clientRef.current.getPeers());
            } catch (error) {
              console.error('Failed to consume:', error);
            }
          }
        });

        socket.on('producer-paused', ({ peerId, kind }) => {
          console.log(`Producer paused: ${kind} from ${peerId}`);
          // Handle producer pause
        });

        socket.on('producer-resumed', ({ peerId, kind }) => {
          console.log(`Producer resumed: ${kind} from ${peerId}`);
          // Handle producer resume
        });

        socket.on('consumer-closed', ({ consumerId }) => {
          console.log(`Consumer closed: ${consumerId}`);
          // Handle consumer close
        });

        socket.on('chat-message', (message: ChatMessage) => {
          setChatMessages(prev => [...prev, message]);
        });

        // Join room
        socket.emit('join-room', { roomId, name: userName });

      } catch (error) {
        console.error('Failed to initialize connection:', error);
        setError('Failed to connect to server');
      }
    };

    initializeConnection();

    return () => {
      if (clientRef.current) {
        clientRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, userName]);

  const startLocalStream = async (audio = true, video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio,
        video: video ? { width: 1280, height: 720 } : false,
      });

      setLocalStream(stream);
      setIsAudioEnabled(audio);
      setIsVideoEnabled(video);

      if (clientRef.current && isInitialized) {
        await clientRef.current.startProducing(stream);
      }

      return stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      setError('Failed to access camera/microphone');
      throw error;
    }
  };

  const stopLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  const toggleAudio = async () => {
    if (!clientRef.current) return;

    try {
      if (isAudioEnabled) {
        await clientRef.current.pauseProducer('audio');
        if (localStream) {
          localStream.getAudioTracks().forEach(track => {
            track.enabled = false;
          });
        }
      } else {
        await clientRef.current.resumeProducer('audio');
        if (localStream) {
          localStream.getAudioTracks().forEach(track => {
            track.enabled = true;
          });
        }
      }
      setIsAudioEnabled(!isAudioEnabled);
    } catch (error) {
      console.error('Failed to toggle audio:', error);
    }
  };

  const toggleVideo = async () => {
    if (!clientRef.current) return;

    try {
      if (isVideoEnabled) {
        await clientRef.current.pauseProducer('video');
        if (localStream) {
          localStream.getVideoTracks().forEach(track => {
            track.enabled = false;
          });
        }
      } else {
        await clientRef.current.resumeProducer('video');
        if (localStream) {
          localStream.getVideoTracks().forEach(track => {
            track.enabled = true;
          });
        }
      }
      setIsVideoEnabled(!isVideoEnabled);
    } catch (error) {
      console.error('Failed to toggle video:', error);
    }
  };

  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Replace video track
      if (localStream && clientRef.current) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const audioTrack = screenStream.getAudioTracks()[0];

        // Stop current video track
        localStream.getVideoTracks().forEach(track => track.stop());
        localStream.removeTrack(localStream.getVideoTracks()[0]);

        // Add screen track
        localStream.addTrack(videoTrack);
        if (audioTrack) {
          localStream.addTrack(audioTrack);
        }

        setIsScreenSharing(true);

        videoTrack.onended = () => {
          setIsScreenSharing(false);
          // Restart camera
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(cameraStream => {
              const cameraTrack = cameraStream.getVideoTracks()[0];
              if (localStream) {
                localStream.removeTrack(localStream.getVideoTracks()[0]);
                localStream.addTrack(cameraTrack);
              }
            })
            .catch(console.error);
        };
      }
    } catch (error) {
      console.error('Failed to share screen:', error);
      setError('Failed to share screen');
    }
  };

  const sendChatMessage = (message: string) => {
    if (socketRef.current && message.trim()) {
      const timestamp = new Date().toISOString();
      socketRef.current.emit('chat-message', { message, timestamp });
      
      // Add to local messages
      setChatMessages(prev => [...prev, {
        peerId: socketRef.current!.id,
        name: userName,
        message,
        timestamp,
      }]);
    }
  };

  return {
    isConnected,
    isInitialized,
    peers,
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    chatMessages,
    error,
    startLocalStream,
    stopLocalStream,
    toggleAudio,
    toggleVideo,
    shareScreen,
    sendChatMessage,
  };
};