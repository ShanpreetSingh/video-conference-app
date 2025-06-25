import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, User } from 'lucide-react';

interface VideoPlayerProps {
  stream?: MediaStream;
  name: string;
  isLocal?: boolean;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  stream,
  name,
  isLocal = false,
  isAudioEnabled = true,
  isVideoEnabled = true,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().length > 0 && isVideoEnabled;

  return (
    <div className={`relative bg-gray-900 rounded-xl overflow-hidden group ${className}`}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <p className="text-white text-sm font-medium">{name}</p>
        </div>
      )}

      {/* Overlay with controls */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200">
        {/* Name badge */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 backdrop-blur-sm rounded-lg px-3 py-1">
          <span className="text-white text-sm font-medium">{name}</span>
        </div>

        {/* Status indicators */}
        <div className="absolute top-4 right-4 flex space-x-2">
          {!isAudioEnabled && (
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <MicOff className="w-4 h-4 text-white" />
            </div>
          )}
          {!isVideoEnabled && (
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <VideoOff className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Connection indicator */}
      {stream && (
        <div className="absolute top-4 left-4">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
};